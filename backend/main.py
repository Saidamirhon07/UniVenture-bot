from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from docx import Document as DocxDocument
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pdfminer.high_level import extract_text as extract_pdf_text

from . import legacy
from .analytics import founder_snapshot, record_event as record_product_event
from .copilot_access import access_snapshot as copilot_access_snapshot, record_message, release_message
from .launch_intents import consume_launch_intent
from .practice import BANK as PRACTICE_BANK, record_session
from .question_factory import (
    add_reviewed_batch,
    generation_messages,
    publish_verified,
    decide as decide_question,
    published_objective,
    published_prompts,
    review_messages,
    snapshot as question_factory_snapshot,
)
from .auth import (
    AuthError,
    TelegramIdentity,
    decode_session_token,
    issue_session_token,
    validate_telegram_init_data,
)
from .prompts import (
    EVALUATION_SPECS,
    boost_messages,
    coach_messages,
    compact_evaluation_messages,
    copilot_messages,
    free_copilot_messages,
    full_review_messages,
    plan_messages,
    recommendation_builder_messages,
    refinement_messages,
    sat_coach_messages,
    school_finder_messages,
)
from .product_logic import practice_snapshot as build_practice_snapshot, task_action as _task_action
from .schemas import (
    ApplicationPlanRequest,
    AnalyticsEventRequest,
    AuthRequest,
    BoostRequest,
    CoachRequest,
    CopilotRequest,
    DevAuthRequest,
    ECEvaluationRequest,
    EssayEvaluationRequest,
    FullReviewRequest,
    FeedbackRequest,
    IELTSEvaluationRequest,
    NameUpdateRequest,
    NotificationsReadRequest,
    OnboardingRequest,
    PlanTaskStatusRequest,
    PortfolioEvaluationRequest,
    PracticeCompletionRequest,
    PracticeSessionRequest,
    PracticeDraftRequest,
    QuestionFactoryGenerateRequest,
    QuestionFactoryDecisionRequest,
    ProfileUpdateRequest,
    RecommendationRequest,
    ReminderCreateRequest,
    RefineRequest,
    SaveSchoolRequest,
    SchoolFinderRequest,
    SATCoachRequest,
)


load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("univenture.miniapp")

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "dist"
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", BOT_TOKEN)
AUTH_MAX_AGE_SECONDS = int(os.getenv("TELEGRAM_AUTH_MAX_AGE_SECONDS", "21600"))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "21600"))
RUN_TELEGRAM_BOT = os.getenv("RUN_TELEGRAM_BOT", "1") == "1"
DEV_AUTH_BYPASS = os.getenv("DEV_AUTH_BYPASS", "0") == "1"
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
FREE_PRACTICE_QUESTIONS_PER_DAY = max(1, min(10, int(os.getenv("FREE_PRACTICE_QUESTIONS_PER_DAY", "3"))))
FREE_COPILOT_MESSAGES_PER_DAY = max(1, min(10, int(os.getenv("FREE_COPILOT_MESSAGES_PER_DAY", "3"))))
FREE_ESSAY_EVALUATIONS = max(0, min(2, int(os.getenv("FREE_ESSAY_EVALUATIONS", "1"))))
TASHKENT = ZoneInfo("Asia/Tashkent")
_copilot_locks: dict[int, asyncio.Lock] = {}
_essay_locks: dict[int, asyncio.Lock] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    bot_started = False
    if RUN_TELEGRAM_BOT:
        try:
            await legacy.start_bot()
            bot_started = True
            logger.info("Telegram bot polling started inside FastAPI.")
        except Exception:
            logger.exception("Telegram bot failed to start.")
            raise
    try:
        yield
    finally:
        if bot_started:
            await legacy.stop_bot()


app = FastAPI(
    title="UniVentureAI Admissions Hub API",
    version="1.3.0",
    docs_url="/api/docs" if os.getenv("ENABLE_API_DOCS", "0") == "1" else None,
    redoc_url=None,
    lifespan=lifespan,
)


AI_ERROR_MESSAGES = {
    "configuration": "The AI service needs an account update. Please contact UniVentureAI support.",
    "capacity": "The AI service is temporarily at capacity. Please try again shortly.",
    "model_unavailable": "The selected AI model is temporarily unavailable. The team has been notified.",
    "request_rejected": "The AI could not process this request. Please shorten the text and try again.",
    "timeout": "The AI request timed out. Please try again.",
    "connection": "UniVentureAI could not reach the AI service. Please try again shortly.",
    "unknown": "The AI service is temporarily unavailable. Please try again shortly.",
}


@app.exception_handler(legacy.AIRequestError)
async def ai_request_error_handler(request: Request, exc: legacy.AIRequestError) -> JSONResponse:
    request_id = uuid.uuid4().hex[:10]
    code = exc.code if exc.code in AI_ERROR_MESSAGES else "unknown"
    logger.error("AI request failed path=%s code=%s request_id=%s", request.url.path, code, request_id)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": {"message": AI_ERROR_MESSAGES[code], "code": f"ai_{code}", "request_id": request_id}},
        headers={"Retry-After": "30", "X-Request-ID": request_id},
    )

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )


def _session_secret() -> str:
    if not SESSION_SECRET:
        raise HTTPException(status_code=500, detail="Server authentication is not configured.")
    return SESSION_SECRET


def current_identity(authorization: str | None = Header(default=None)) -> TelegramIdentity:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        return decode_session_token(authorization.split(" ", 1)[1].strip(), _session_secret())
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def active_identity(identity: TelegramIdentity = Depends(current_identity)) -> TelegramIdentity:
    access = legacy.subscription_status(identity.user_id)
    if not access["is_premium"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "This is a Premium feature.", "code": "premium_required", "subscription": access},
        )
    return identity


def _is_premium(user_id: int) -> bool:
    return bool(legacy.subscription_status(user_id)["is_premium"])


def _free_practice_used(practice: dict[str, Any], exam: str) -> int:
    today = _local_today().isoformat()
    usage = practice.get("free_usage") if isinstance(practice.get("free_usage"), dict) else {}
    today_usage = usage.get(today, {})
    if not isinstance(today_usage, dict):
        return 0
    return max(0, int(today_usage.get(exam, 0) or 0))


def _free_practice_bank() -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    bank = _practice_bank()
    for exam, sections in (("sat", ("math", "reading_writing")), ("ielts", ("reading", "listening"))):
        for section in sections:
            selected.extend([item for item in bank if item.get("exam") == exam and item.get("section") == section])
    return selected


def _practice_bank() -> list[dict[str, Any]]:
    generated = published_objective()
    known = {item["id"] for item in generated}
    return generated + [item for item in PRACTICE_BANK if item["id"] not in known]


def admin_identity(identity: TelegramIdentity = Depends(current_identity)) -> TelegramIdentity:
    if not legacy.is_admin(identity.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Founder access only.")
    return identity


def _track_product_event(user_id: int, event: str, properties: dict[str, Any] | None = None, source: str | None = None) -> None:
    try:
        record_product_event(user_id, event, properties, source=source)
    except Exception:
        logger.exception("Could not record product analytics event")


def _parse_ai_json(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if not text or text.startswith("⚠️"):
        raise HTTPException(status_code=503, detail="The AI coach is temporarily busy. Please try again.")
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise HTTPException(status_code=502, detail="The AI response could not be structured. Please retry.")
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="The AI response could not be structured. Please retry.") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response.")
    return parsed


def _clean_value(value: Any, depth: int = 0) -> Any:
    if depth > 4:
        return None
    if isinstance(value, str):
        return value.strip()[:5_000]
    if isinstance(value, list):
        return [_clean_value(item, depth + 1) for item in value[:40]]
    if isinstance(value, dict):
        return {str(key)[:80]: _clean_value(item, depth + 1) for key, item in list(value.items())[:60]}
    if isinstance(value, (bool, int, float)) or value is None:
        return value
    return str(value)[:500]


SECTION_FIELDS: dict[str, set[str]] = {
    "academic_profile": {"preferred_name", "grade", "graduation_year", "country", "citizenship", "curriculum", "major", "target_countries", "career_goal"},
    "test_scores": {"gpa", "sat", "sat_breakdown", "act", "ielts", "toefl", "duolingo", "notes"},
    "essays": {"personal_statement", "supplementals", "common_app", "notes"},
    "extracurriculars": {"summary", "spike", "highlights", "activities", "notes"},
    "awards": {"items", "notes"},
    "projects": {"field", "items", "portfolio_url", "gaps", "notes"},
    "recommendations": {"teachers", "status", "stories", "notes"},
    "preferences": {"target_countries", "intended_major", "environment", "campus_size", "budget", "constraints", "career_goal", "notes"},
    "financial_aid": {"needs_aid", "budget", "max_family_contribution", "scholarship_priority", "notes"},
    "deadlines": {"items", "nearest_deadline", "application_round", "target_intake", "exam_dates", "notes"},
    "wellness": {"stress_level", "hours_per_week", "available_days", "energy_pattern", "sleep_hours", "support_needs", "notes"},
}


def _ensure_memory(memory: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    memory.setdefault("profile", {})
    application = legacy.module()._ensure_application_defaults(memory)
    application.setdefault("profile", {})
    application.setdefault("projects", {"items": [], "notes": ""})
    application.setdefault("recommendations", {"teachers": [], "status": "not started", "stories": []})
    application.setdefault("deadlines", {"items": [], "nearest_deadline": None})
    application.setdefault("school_list", [])
    miniapp = memory.setdefault("miniapp", {})
    miniapp.setdefault("evaluations", {})
    miniapp.setdefault("evaluation_order", [])
    miniapp.setdefault("plans", [])
    miniapp.setdefault("school_finder_runs", [])
    miniapp.setdefault("feedback", [])
    if not isinstance(miniapp.get("practice"), dict):
        miniapp["practice"] = {"days": {}}
    if not isinstance(miniapp.get("reminders"), list):
        miniapp["reminders"] = []
    if not isinstance(miniapp.get("seen_notifications"), list):
        miniapp["seen_notifications"] = []
    if not isinstance(miniapp.get("copilot_free_usage"), dict):
        miniapp["copilot_free_usage"] = {}
    miniapp.setdefault("onboarding_complete", False)
    miniapp.setdefault("updated_at", None)
    return application, miniapp


def _local_today() -> date:
    return datetime.now(TASHKENT).date()


def _practice_snapshot(memory: dict[str, Any]) -> dict[str, Any]:
    _, miniapp = _ensure_memory(memory)
    practice = miniapp.get("practice") or {}
    days = practice.get("days") if isinstance(practice, dict) else {}
    if not isinstance(days, dict):
        days = {}
    return build_practice_snapshot(days, _local_today())


def _parse_due_at(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=TASHKENT)
    return parsed.astimezone(TASHKENT)


def _dashboard_notifications(
    memory: dict[str, Any],
    today_task: dict[str, Any],
    today_action: dict[str, Any],
    profile_completeness: dict[str, Any],
    deadline_label: str,
    intended_major: str,
) -> list[dict[str, Any]]:
    _, miniapp = _ensure_memory(memory)
    seen = {str(item) for item in miniapp.get("seen_notifications", [])}
    today_key = _local_today().isoformat()
    practice = _practice_snapshot(memory)
    notifications: list[dict[str, Any]] = [
        {
            "id": f"priority:{today_key}",
            "kind": "task",
            "title": "Today’s highest-impact move",
            "body": str(today_task.get("title") or "Open your application plan"),
            "screen": str(today_action.get("screen") or "plan"),
            "action_label": str(today_action.get("secondary_label") or today_action.get("label") or "Open"),
        }
    ]
    if not practice["completed_today"]:
        streak_copy = f"Protect your {practice['current_streak']}-day streak" if practice["current_streak"] else "Start a daily prep streak"
        notifications.append({
            "id": f"practice:{today_key}",
            "kind": "streak",
            "title": streak_copy,
            "body": "Finish one short SAT or IELTS quest today. One focused attempt counts.",
            "screen": "prep",
            "action_label": "Choose a quest",
        })
    if deadline_label and deadline_label != "Add your nearest deadline":
        notifications.append({
            "id": f"deadline:{deadline_label}",
            "kind": "deadline",
            "title": "Deadline check",
            "body": f"Your saved nearest deadline is {deadline_label}. Verify the official source and protect review time.",
            "screen": "plan",
            "action_label": "Review Flight Plan",
        })
    if profile_completeness.get("percent", 0) < 100:
        missing = (profile_completeness.get("missing") or [{}])[0].get("label", "profile detail")
        notifications.append({
            "id": f"profile:{missing}",
            "kind": "profile",
            "title": "Make your guidance more precise",
            "body": f"Add your {missing}; it changes school fit and plan recommendations.",
            "screen": "portfolio",
            "action_label": "Complete profile",
        })
    notifications.append({
        "id": "opportunities:36:v1",
        "kind": "opportunity",
        "title": "36 verified opportunities are ready",
        "body": f"Explore official-source programs matched to {intended_major or 'your interests'}.",
        "screen": "discover",
        "action_label": "Explore opportunities",
    })

    now = datetime.now(TASHKENT)
    for reminder in miniapp.get("reminders", []):
        if not isinstance(reminder, dict) or reminder.get("done"):
            continue
        due = _parse_due_at(reminder.get("due_at"))
        if not due or due > now + timedelta(days=7):
            continue
        when = "overdue" if due < now else f"due {due.strftime('%a, %b %d at %H:%M')}"
        notifications.insert(0, {
            "id": f"reminder:{reminder.get('id')}",
            "kind": "reminder",
            "title": str(reminder.get("title") or "Application reminder"),
            "body": when.capitalize(),
            "screen": str(reminder.get("screen") or "plan"),
            "action_label": "Open task",
        })

    for item in notifications:
        item["unread"] = item["id"] not in seen
    return notifications[:8]


def _portfolio(memory: dict[str, Any]) -> dict[str, Any]:
    application, _ = _ensure_memory(memory)
    return {"profile": memory.get("profile", {}), "application": application}


def _profile_completeness(memory: dict[str, Any]) -> dict[str, Any]:
    application, _ = _ensure_memory(memory)
    profile = memory.get("profile", {}) or {}
    tests = application.get("test_scores", {}) or {}
    preferences = application.get("preferences", {}) or {}
    wellness = application.get("wellness", {}) or {}
    deadlines = application.get("deadlines", {}) or {}
    fields = [
        ("grade", profile.get("grade"), "grade"),
        ("graduation_year", profile.get("graduation_year"), "graduation year"),
        ("country", profile.get("country"), "home country"),
        ("curriculum", profile.get("curriculum"), "school curriculum"),
        ("major", profile.get("major") or preferences.get("intended_major"), "target major"),
        ("target_countries", profile.get("target_countries") or preferences.get("target_countries"), "target countries"),
        ("gpa", tests.get("gpa") or profile.get("gpa"), "GPA or school average"),
        ("budget", preferences.get("budget") or profile.get("budget"), "annual family budget"),
        ("hours", wellness.get("hours_per_week"), "weekly application time"),
        ("deadline", deadlines.get("nearest_deadline"), "nearest deadline"),
    ]
    missing = [{"key": key, "label": label} for key, value, label in fields if not value]
    filled = len(fields) - len(missing)
    return {"percent": round(100 * filled / len(fields)), "filled": filled, "total": len(fields), "missing": missing}


def _status_fraction(value: Any) -> float:
    text = str(value or "").lower()
    if "final" in text or "done" in text or "complete" in text:
        return 1.0
    if "revised" in text:
        return 0.75
    if "draft" in text:
        return 0.5
    if "outline" in text or "started" in text:
        return 0.25
    return 0.0


def readiness_snapshot(memory: dict[str, Any]) -> dict[str, Any]:
    app_data, miniapp = _ensure_memory(memory)
    profile = memory.get("profile", {}) or {}
    tests = app_data.get("test_scores", {}) or {}
    essays = app_data.get("essays", {}) or {}
    ecs = app_data.get("ecs", {}) or {}
    awards = app_data.get("awards", {}) or {}
    projects = app_data.get("projects", {}) or {}
    recommendations = app_data.get("recommendations", {}) or {}
    deadlines = app_data.get("deadlines", {}) or {}
    wellness = app_data.get("wellness", {}) or {}
    schools = app_data.get("school_list", []) or []

    academics = min(20, (12 if tests.get("gpa") or profile.get("gpa") else 0) + (4 if profile.get("major") else 0) + (4 if profile.get("target_countries") else 0))
    testing = min(10, (6 if tests.get("sat") or tests.get("act") else 0) + (4 if tests.get("ielts") or tests.get("toefl") or tests.get("duolingo") else 0))
    essay_score = round(15 * _status_fraction(essays.get("personal_statement"))) + round(10 * _status_fraction(essays.get("supplementals")))
    activities = min(15, (8 if str(ecs.get("summary") or "").strip() else 0) + (3 if ecs.get("highlights") else 0) + (2 if awards.get("items") else 0) + (2 if projects.get("items") else 0))
    school_score = min(12, len(schools) * 2)
    rec_score = min(8, (4 if recommendations.get("teachers") else 0) + round(4 * _status_fraction(recommendations.get("status"))))
    planning = min(15, (6 if deadlines.get("items") or deadlines.get("nearest_deadline") else 0) + (4 if miniapp.get("plans") else 0) + (3 if wellness.get("hours_per_week") else 0) + (2 if wellness.get("stress_level") else 0))

    categories = [
        {"key": "academics", "label": "Academic profile", "score": academics, "max": 20},
        {"key": "testing", "label": "Testing", "score": testing, "max": 10},
        {"key": "essays", "label": "Essays", "score": essay_score, "max": 25},
        {"key": "activities", "label": "Activities & proof", "score": activities, "max": 15},
        {"key": "schools", "label": "School list", "score": school_score, "max": 12},
        {"key": "recommendations", "label": "Recommendations", "score": rec_score, "max": 8},
        {"key": "planning", "label": "Plan & workload", "score": planning, "max": 15},
    ]
    score = min(100, sum(item["score"] for item in categories))
    blocker = min(categories, key=lambda item: item["score"] / item["max"])
    blocker_copy = dict(blocker)
    blocker_copy["message"] = f"Your biggest blocker is {blocker['label'].lower()}."
    return {"score": score, "categories": categories, "blocker": blocker_copy}


def _preferred_name(memory: dict[str, Any]) -> str:
    return str((memory.get("profile", {}) or {}).get("preferred_name") or "").strip()[:80]


def _public_user(identity: TelegramIdentity, memory: dict[str, Any]) -> dict[str, Any]:
    _, miniapp = _ensure_memory(memory)
    return {
        "id": identity.user_id,
        "name": _preferred_name(memory),
        "has_manual_name": bool(_preferred_name(memory)),
        "onboarding_complete": bool(miniapp.get("onboarding_complete")),
        "is_admin": legacy.is_admin(identity.user_id),
    }


def _dashboard(memory: dict[str, Any], identity: TelegramIdentity) -> dict[str, Any]:
    app_data, miniapp = _ensure_memory(memory)
    profile = memory.get("profile", {}) or {}
    readiness = readiness_snapshot(memory)
    essays = app_data.get("essays", {}) or {}
    deadlines = app_data.get("deadlines", {}) or {}
    cards = [
        {"key": "essays", "label": "Essays", "value": essays.get("personal_statement") or "Not started", "progress": round(100 * _status_fraction(essays.get("personal_statement")))},
        {"key": "schools", "label": "School list", "value": f"{len(app_data.get('school_list', []))} saved", "progress": min(100, len(app_data.get("school_list", [])) * 16)},
        {"key": "ielts", "label": "IELTS", "value": app_data.get("test_scores", {}).get("ielts") or "Add score", "progress": 100 if app_data.get("test_scores", {}).get("ielts") else 10},
        {"key": "extracurriculars", "label": "ECs", "value": "Mapped" if app_data.get("ecs", {}).get("summary") else "Needs detail", "progress": 75 if app_data.get("ecs", {}).get("summary") else 15},
        {"key": "portfolio", "label": "Portfolio", "value": f"{len(app_data.get('projects', {}).get('items', []))} projects", "progress": min(100, len(app_data.get("projects", {}).get("items", [])) * 25)},
        {"key": "recommendations", "label": "Recommendations", "value": app_data.get("recommendations", {}).get("status") or "Not started", "progress": round(100 * _status_fraction(app_data.get("recommendations", {}).get("status")))},
    ]
    latest_plan = (miniapp.get("plans") or [])[-1] if miniapp.get("plans") else None
    latest_result = (latest_plan or {}).get("result", {}) or {}
    completion = (latest_plan or {}).get("completion", {}) or {}
    ordered_tasks = [latest_result.get("today_priority")] + list(latest_result.get("this_week") or [])
    today = next((task for task in ordered_tasks if task and not completion.get(str(task.get("key", "")))), None)
    if not today:
        today = {"title": f"Strengthen {readiness['blocker']['label'].lower()}", "why": readiness["blocker"]["message"], "effort": "20 min"}
    today_action = _task_action(today, readiness["blocker"]["key"])
    blocker_next_steps = {
        "academics": "Document academic context",
        "testing": "Complete a focused score sprint",
        "essays": "Test the story with feedback",
        "activities": "Secure proof & feedback",
        "schools": "Verify fit and affordability",
        "recommendations": "Confirm two strong recommenders",
        "planning": "Lock the next weekly milestone",
    }
    deadline_label = str(deadlines.get("nearest_deadline") or "Add your nearest deadline").strip()[:80]
    application_round = str(deadlines.get("application_round") or "Deadline").strip()[:40]
    weekly_path = [task for task in (latest_result.get("this_week") or []) if task][:3]
    if not weekly_path:
        weekly_path = [
            {"title": today["title"], "effort": today.get("effort", "20 min"), "category": readiness["blocker"]["label"], "key": "fallback-now"},
            {"title": blocker_next_steps.get(readiness["blocker"]["key"], "Build supporting evidence"), "effort": "35 min", "category": "Next", "key": "fallback-next"},
            {"title": "Verify your nearest deadline", "effort": "10 min", "category": "Planning", "key": "fallback-deadline"},
        ]
    profile_completeness = _profile_completeness(memory)
    intended_major = str(profile.get("major") or (app_data.get("preferences", {}) or {}).get("intended_major") or "")[:160]
    notifications = _dashboard_notifications(
        memory,
        today,
        today_action,
        profile_completeness,
        deadline_label,
        intended_major,
    )
    return {
        "name": _preferred_name(memory) or "Student",
        "location": str(profile.get("city") or profile.get("country") or "Central Asia")[:100],
        "intended_major": intended_major,
        "readiness": readiness,
        "profile_completeness": profile_completeness,
        "today_priority": today,
        "today_action": today_action,
        "weekly_path": weekly_path,
        "trajectory": {
            "now": f"Strengthen {readiness['blocker']['label'].lower()}",
            "next": blocker_next_steps.get(readiness["blocker"]["key"], "Secure proof & feedback"),
            "deadline": f"{application_round} · {deadline_label}",
        },
        "status_cards": cards,
        "practice_streak": _practice_snapshot(memory),
        "notifications": notifications,
        "unread_notifications": sum(1 for item in notifications if item.get("unread")),
        "subscription": legacy.subscription_status(identity.user_id),
    }


def _save_memory(user_id: int, memory: dict[str, Any]) -> None:
    _, miniapp = _ensure_memory(memory)
    miniapp["updated_at"] = int(time.time())
    legacy.save_memory(user_id, memory)


def _record_evaluation(user_id: int, memory: dict[str, Any], topic: str, content: str, result: dict[str, Any], extra: dict[str, Any]) -> str:
    _, miniapp = _ensure_memory(memory)
    evaluation_id = uuid.uuid4().hex
    miniapp["evaluations"][evaluation_id] = {
        "id": evaluation_id,
        "topic": topic,
        "content": content[:30_000],
        "result": result,
        "extra": extra,
        "created_at": int(time.time()),
    }
    order = [item for item in miniapp["evaluation_order"] if item != evaluation_id]
    order.append(evaluation_id)
    while len(order) > 20:
        removed = order.pop(0)
        miniapp["evaluations"].pop(removed, None)
    miniapp["evaluation_order"] = order
    history = memory.setdefault("history", {})
    history["eval_count"] = int(history.get("eval_count", 0) or 0) + 1
    history["last_topic"] = topic
    history["last_active"] = int(time.time())
    memory.setdefault("drafts", {}).setdefault("last_eval", {}).update(
        {"topic": topic, "date": time.strftime("%Y-%m-%d"), "summary": result.get("headline", "")[:800]}
    )
    _save_memory(user_id, memory)
    return evaluation_id


async def _run_compact_evaluation(identity: TelegramIdentity, topic: str, content: str, extra: dict[str, Any]) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    memory_summary = legacy.module().memory_summary_for_prompt(memory)
    rag = await legacy.load_rag(topic, content[:4_000])
    raw = await legacy.ask_ai(
        compact_evaluation_messages(topic, content, memory_summary, rag, extra),
        strong=True,
        max_tokens=1_100,
    )
    result = _parse_ai_json(raw)
    evaluation_id = _record_evaluation(identity.user_id, memory, topic, content, result, extra)
    return {"evaluation_id": evaluation_id, "topic": topic, "result": result, "can_full_review": True}


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "univenture-admissions-hub"}


@app.post("/api/auth/telegram")
async def auth_telegram(payload: AuthRequest) -> dict[str, Any]:
    try:
        identity = validate_telegram_init_data(payload.init_data, BOT_TOKEN, AUTH_MAX_AGE_SECONDS)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    legacy.ensure_user(identity)
    memory = legacy.load_memory(identity.user_id)
    access = legacy.subscription_status(identity.user_id)
    token = issue_session_token(identity, _session_secret(), SESSION_TTL_SECONDS)
    return {"token": token, "user": _public_user(identity, memory), "subscription": access}


@app.post("/api/auth/dev")
async def auth_dev(payload: DevAuthRequest) -> dict[str, Any]:
    if not DEV_AUTH_BYPASS:
        raise HTTPException(status_code=404, detail="Not found.")
    identity = TelegramIdentity(user_id=payload.user_id, first_name=payload.first_name, username=payload.username)
    legacy.ensure_user(identity)
    memory = legacy.load_memory(identity.user_id)
    token = issue_session_token(identity, _session_secret(), SESSION_TTL_SECONDS)
    return {"token": token, "user": _public_user(identity, memory), "subscription": legacy.subscription_status(identity.user_id)}


@app.get("/api/me")
async def me(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    return {
        "user": _public_user(identity, memory),
        "subscription": legacy.subscription_status(identity.user_id),
    }


@app.get("/api/portfolio")
async def portfolio(identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    return {"portfolio": _portfolio(memory), "readiness": readiness_snapshot(memory)}


@app.get("/api/launch-intent")
async def launch_intent(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return {"intent": consume_launch_intent(identity.user_id)}


@app.post("/api/analytics/event")
async def analytics_event(payload: AnalyticsEventRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, bool]:
    _track_product_event(identity.user_id, payload.event, payload.properties, payload.source)
    return {"recorded": True}


@app.get("/api/admin/analytics")
async def admin_analytics(days: int = 30, _: TelegramIdentity = Depends(admin_identity)) -> dict[str, Any]:
    return founder_snapshot(legacy.paid_records(), days=days)


@app.get("/api/admin/question-factory")
async def admin_question_factory(_: TelegramIdentity = Depends(admin_identity)) -> dict[str, Any]:
    return question_factory_snapshot()


@app.post("/api/admin/question-factory/generate")
async def admin_generate_questions(payload: QuestionFactoryGenerateRequest, _: TelegramIdentity = Depends(admin_identity)) -> dict[str, Any]:
    remaining = question_factory_snapshot()["categories"][payload.category]["remaining"]
    count = min(payload.count, remaining)
    if count <= 0:
        return {"batch": {"added": 0, "rejected": 0, "duplicates": 0}, "factory": question_factory_snapshot()}
    raw_candidates = await legacy.ask_ai(generation_messages(payload.category, count), strong=True, max_tokens=7_000)
    candidate_payload = _parse_ai_json(raw_candidates)
    candidates = candidate_payload.get("questions") or []
    if not isinstance(candidates, list) or not candidates:
        raise HTTPException(status_code=503, detail="The generator returned no usable questions. Try this batch again.")
    raw_reviews = await legacy.ask_ai(review_messages(payload.category, candidates), strong=True, max_tokens=3_500)
    review_payload = _parse_ai_json(raw_reviews)
    reviews = review_payload.get("reviews") or []
    if not isinstance(reviews, list):
        reviews = []
    result = add_reviewed_batch(payload.category, candidates[:count], reviews)
    return {"batch": result, "factory": question_factory_snapshot()}


@app.post("/api/admin/question-factory/publish")
async def admin_publish_questions(_: TelegramIdentity = Depends(admin_identity)) -> dict[str, Any]:
    published = publish_verified()
    return {"published": published, "factory": question_factory_snapshot()}


@app.post("/api/admin/question-factory/decision")
async def admin_question_decision(payload: QuestionFactoryDecisionRequest, _: TelegramIdentity = Depends(admin_identity)) -> dict[str, Any]:
    if not decide_question(payload.item_id, payload.action):
        raise HTTPException(status_code=404, detail="Verified question was not found.")
    return {"saved": True, "factory": question_factory_snapshot()}


@app.post("/api/profile/name")
async def profile_name(payload: NameUpdateRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    memory.setdefault("profile", {})["preferred_name"] = payload.name
    _save_memory(identity.user_id, memory)
    return {"saved": True, "user": _public_user(identity, memory)}


@app.post("/api/profile/onboarding")
async def profile_onboarding(payload: OnboardingRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    application, miniapp = _ensure_memory(memory)
    data = payload.model_dump()
    profile = memory.setdefault("profile", {})
    profile.update({
        "grade": data["grade"],
        "graduation_year": data["graduation_year"],
        "country": data["country"],
        "curriculum": data["curriculum"],
        "major": data["intended_major"],
        "target_countries": data["target_countries"],
        "gpa": data["gpa"],
        "needs_aid": data["needs_aid"],
        "budget": data["annual_budget"],
    })
    application["profile"].update({"grade": data["grade"], "country": data["country"]})
    application["test_scores"].update({key: data[key] for key in ("gpa", "sat", "ielts") if data.get(key)})
    application["preferences"].update({
        "intended_major": data["intended_major"],
        "target_countries": data["target_countries"],
        "budget": data["annual_budget"],
        "needs_aid": data["needs_aid"],
    })
    application["wellness"].update({"hours_per_week": data["weekly_hours"]})
    application["deadlines"].update({
        "nearest_deadline": data.get("nearest_deadline"),
        "application_round": data["application_round"],
    })
    miniapp["onboarding_complete"] = True
    _save_memory(identity.user_id, memory)
    _track_product_event(identity.user_id, "onboarding_completed")
    return {
        "saved": True,
        "user": _public_user(identity, memory),
        "profile_completeness": _profile_completeness(memory),
        "readiness": readiness_snapshot(memory),
    }


@app.post("/api/profile/onboarding/skip")
async def profile_onboarding_skip(identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    miniapp["onboarding_complete"] = True
    _save_memory(identity.user_id, memory)
    return {"saved": True, "user": _public_user(identity, memory)}


@app.get("/api/dashboard")
async def dashboard(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return _dashboard(legacy.load_memory(identity.user_id), identity)


@app.get("/api/subscription")
async def subscription(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return legacy.subscription_status(identity.user_id)


@app.post("/api/payment/start")
async def payment_start(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    access = legacy.subscription_status(identity.user_id)
    if access["is_premium"]:
        return {"started": False, "already_premium": True, "message": "Premium is already active."}
    try:
        started = await legacy.start_manual_payment(identity.user_id)
    except Exception as exc:
        logger.exception("Could not start manual payment for user %s", identity.user_id)
        raise HTTPException(status_code=503, detail="Could not open receipt mode. Please try again or contact support.") from exc
    if started:
        _track_product_event(identity.user_id, "checkout_started", {
            "plan": "pro_30_days", "price": access["price_uzs"], "currency": "UZS", "method": "manual_card",
        })
    return {"started": started, "already_premium": False, "message": "Receipt mode is ready in the bot."}


@app.post("/api/profile/update")
async def profile_update(payload: ProfileUpdateRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    application, _ = _ensure_memory(memory)
    allowed = SECTION_FIELDS[payload.section]
    cleaned = {key: _clean_value(value) for key, value in payload.data.items() if key in allowed}
    if not cleaned:
        raise HTTPException(status_code=422, detail="No supported fields were provided for this section.")

    profile = memory.setdefault("profile", {})
    if payload.section == "academic_profile":
        profile.update(cleaned)
        application["profile"].update({key: value for key, value in cleaned.items() if key in {"grade", "country"}})
        if cleaned.get("major"):
            application["preferences"]["intended_major"] = cleaned["major"]
        if cleaned.get("target_countries"):
            application["preferences"]["target_countries"] = cleaned["target_countries"]
    elif payload.section == "extracurriculars":
        application["ecs"].update(cleaned)
    elif payload.section == "financial_aid":
        application["preferences"].update(cleaned)
        if "needs_aid" in cleaned:
            profile["needs_aid"] = cleaned["needs_aid"]
        if "budget" in cleaned:
            profile["budget"] = cleaned["budget"]
    else:
        target = payload.section
        application[target].update(cleaned)
        if payload.section == "test_scores":
            for key in ("gpa", "sat", "act", "ielts", "toefl", "duolingo", "sat_breakdown"):
                if key in cleaned:
                    profile[key] = cleaned[key]
        if payload.section == "preferences":
            if cleaned.get("intended_major"):
                profile["major"] = cleaned["intended_major"]
            if cleaned.get("target_countries"):
                profile["target_countries"] = cleaned["target_countries"]

    _save_memory(identity.user_id, memory)
    return {"saved": True, "portfolio": _portfolio(memory), "readiness": readiness_snapshot(memory)}


@app.post("/api/evaluate/essay")
async def evaluate_essay(payload: EssayEvaluationRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    topic = "essays_personal" if payload.essay_type == "personal_statement" else "essays_supplemental"
    premium = _is_premium(identity.user_id)
    reserved = False
    if not premium:
        lock = _essay_locks.setdefault(identity.user_id, asyncio.Lock())
        async with lock:
            memory = legacy.load_memory(identity.user_id)
            _, miniapp = _ensure_memory(memory)
            used = max(0, int(miniapp.get("free_essay_evaluations_used", 0) or 0))
            if used >= FREE_ESSAY_EVALUATIONS:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={"message": "Your free Essay Review has been used. Premium unlocks unlimited reviews and revisions.", "code": "free_essay_limit"},
                )
            miniapp["free_essay_evaluations_used"] = used + 1
            _save_memory(identity.user_id, memory)
            reserved = True
    try:
        response = await _run_compact_evaluation(identity, topic, payload.content, {"school_name": payload.school_name, "prompt": payload.prompt})
    except Exception:
        if reserved:
            async with _essay_locks[identity.user_id]:
                memory = legacy.load_memory(identity.user_id)
                _, miniapp = _ensure_memory(memory)
                miniapp["free_essay_evaluations_used"] = max(0, int(miniapp.get("free_essay_evaluations_used", 1) or 1) - 1)
                _save_memory(identity.user_id, memory)
        raise
    response["can_full_review"] = premium
    response["essay_access"] = {"is_premium": premium, "free_limit": None if premium else FREE_ESSAY_EVALUATIONS, "remaining": None if premium else 0}
    return response


@app.get("/api/evaluate/essay/access")
async def essay_access(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    premium = _is_premium(identity.user_id)
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    used = max(0, int(miniapp.get("free_essay_evaluations_used", 0) or 0))
    return {"is_premium": premium, "free_limit": None if premium else FREE_ESSAY_EVALUATIONS, "remaining": None if premium else max(0, FREE_ESSAY_EVALUATIONS - used)}


@app.post("/api/evaluate/ec")
async def evaluate_ec(payload: ECEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    return await _run_compact_evaluation(identity, "extracurriculars", payload.activity, payload.model_dump(exclude={"activity"}))


@app.post("/api/evaluate/ielts")
async def evaluate_ielts(payload: IELTSEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    topic = f"ielts_{payload.skill}"
    return await _run_compact_evaluation(identity, topic, payload.content, {"task_type": payload.task_type, "question": payload.question, "target_band": payload.target_band})


@app.post("/api/evaluate/recommendation")
async def evaluate_recommendation(payload: RecommendationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    if payload.mode == "evaluate":
        return await _run_compact_evaluation(identity, "recommendations", payload.content, {"teacher_subject": payload.teacher_subject})
    memory = legacy.load_memory(identity.user_id)
    raw = await legacy.ask_ai(
        recommendation_builder_messages(payload.mode, payload.content, legacy.module().memory_summary_for_prompt(memory), payload.teacher_subject),
        strong=True,
        max_tokens=1_400,
    )
    return {"mode": payload.mode, "result": _parse_ai_json(raw), "can_full_review": False}


@app.post("/api/evaluate/portfolio")
async def evaluate_portfolio(payload: PortfolioEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    return await _run_compact_evaluation(identity, "portfolio", payload.projects, {"field": payload.field, "target_program": payload.target_program})


@app.post("/api/full-review")
async def full_review(payload: FullReviewRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    record = miniapp["evaluations"].get(payload.evaluation_id)
    if not record:
        raise HTTPException(status_code=404, detail="This evaluation is no longer available.")
    if record.get("full_review"):
        return {"evaluation_id": payload.evaluation_id, "result": record["full_review"], "cached": True}
    rag = await legacy.load_rag(record["topic"], record["content"][:4_000])
    raw = await legacy.ask_ai(
        full_review_messages(record, legacy.module().memory_summary_for_prompt(memory), rag),
        strong=True,
        max_tokens=2_000,
    )
    result = _parse_ai_json(raw)
    record["full_review"] = result
    _save_memory(identity.user_id, memory)
    return {"evaluation_id": payload.evaluation_id, "result": result}


@app.post("/api/evaluate/refine")
async def refine(payload: RefineRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    record = miniapp["evaluations"].get(payload.evaluation_id)
    if not record:
        raise HTTPException(status_code=404, detail="This evaluation is no longer available.")
    raw = await legacy.ask_ai(refinement_messages(record, payload.action, payload.selected_text), strong=True, max_tokens=1_300)
    return {"evaluation_id": payload.evaluation_id, "action": payload.action, "result": _parse_ai_json(raw)}


@app.post("/api/school-finder")
async def school_finder(payload: SchoolFinderRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    query = json.dumps(payload.model_dump(), ensure_ascii=False)
    rag = await legacy.load_rag("school_finder", query)
    raw = await legacy.ask_ai(
        school_finder_messages(payload.model_dump(), legacy.module().memory_summary_for_prompt(memory), rag),
        strong=True,
        max_tokens=2_300,
    )
    result = _parse_ai_json(raw)
    application, miniapp = _ensure_memory(memory)
    memory["profile"].update({"major": payload.intended_major, "gpa": payload.gpa, "target_countries": payload.target_countries, "budget": payload.budget, "needs_aid": payload.needs_aid})
    application["preferences"].update({"intended_major": payload.intended_major, "target_countries": payload.target_countries, "budget": payload.budget, "needs_aid": payload.needs_aid, "environment": payload.environment})
    miniapp["school_finder_runs"] = (miniapp["school_finder_runs"] + [{"created_at": int(time.time()), "request": payload.model_dump(), "result": result}])[-5:]
    _save_memory(identity.user_id, memory)
    return {"result": result}


@app.post("/api/schools/save")
async def save_school(payload: SaveSchoolRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    application, _ = _ensure_memory(memory)
    schools = application.setdefault("school_list", [])
    normalized = payload.name.strip().lower()
    item = {**payload.model_dump(), "saved_at": int(time.time())}
    schools[:] = [school for school in schools if str(school.get("name", "")).strip().lower() != normalized]
    schools.append(item)
    application["school_list"] = schools[-40:]
    _save_memory(identity.user_id, memory)
    return {"saved": True, "school_list": application["school_list"], "readiness": readiness_snapshot(memory)}


@app.post("/api/application-plan")
async def application_plan(payload: ApplicationPlanRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    readiness = readiness_snapshot(memory)
    raw = await legacy.ask_ai(
        plan_messages(payload.model_dump(), _portfolio(memory), readiness),
        strong=True,
        max_tokens=2_100,
    )
    result = _parse_ai_json(raw)
    _, miniapp = _ensure_memory(memory)
    plan_id = uuid.uuid4().hex
    for section in ("today_priority", "this_week", "this_month", "before_deadline"):
        tasks = [result.get(section)] if section == "today_priority" else list(result.get(section) or [])
        for index, task in enumerate(tasks):
            if isinstance(task, dict):
                task["key"] = f"{section}-{index}"
    record = {"id": plan_id, "created_at": int(time.time()), "request": payload.model_dump(), "result": result, "completion": {}}
    miniapp["plans"] = (miniapp["plans"] + [record])[-5:]
    _save_memory(identity.user_id, memory)
    return {"plan_id": plan_id, "result": result, "readiness": readiness, "profile_completeness": _profile_completeness(memory)}


@app.post("/api/application-plan/task-status")
async def application_plan_task_status(payload: PlanTaskStatusRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    plan = next((item for item in miniapp.get("plans", []) if item.get("id") == payload.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="This roadmap is no longer available.")
    completion = plan.setdefault("completion", {})
    completion[payload.task_key] = payload.done
    _save_memory(identity.user_id, memory)
    done_count = sum(1 for value in completion.values() if value)
    return {"saved": True, "task_key": payload.task_key, "done": payload.done, "done_count": done_count}


@app.get("/api/practice/library")
async def practice_library(exam: str = "sat", identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    if exam not in {"sat", "ielts"}:
        raise HTTPException(status_code=422, detail="Practice exam must be sat or ielts.")
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    practice = miniapp.get("practice", {})
    premium = _is_premium(identity.user_id)
    used = _free_practice_used(practice, exam)
    return {
        "questions": _practice_bank() if premium else _free_practice_bank(),
        "prompts": published_prompts() if premium else {"writing_task_1": [], "writing_task_2": [], "speaking": []},
        "records": practice.get("questions", {}) if premium else {},
        "selection_records": practice.get("questions", {}),
        "sessions": practice.get("sessions", []) if premium else [],
        "drafts": practice.get("drafts", {}) if premium else {},
        "streak": _practice_snapshot(memory),
        "access": {
            "is_premium": premium,
            "daily_limit": None if premium else FREE_PRACTICE_QUESTIONS_PER_DAY,
            "used_today": 0 if premium else used,
            "remaining_today": None if premium else max(0, FREE_PRACTICE_QUESTIONS_PER_DAY - used),
        },
    }


@app.post("/api/practice/session")
async def practice_session(payload: PracticeSessionRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    practice = miniapp.setdefault("practice", {"days": {}})
    premium = _is_premium(identity.user_id)
    existing = next((item for item in practice.get("sessions", []) if item.get("id") == payload.session_id), None)
    used = _free_practice_used(practice, payload.exam)
    if not premium and not existing:
        if payload.mode != "learn":
            raise HTTPException(status_code=402, detail={"message": "Timed sets and mistake review are Premium features.", "code": "premium_required"})
        if len(payload.answers) > 3 or used + len(payload.answers) > FREE_PRACTICE_QUESTIONS_PER_DAY:
            _track_product_event(identity.user_id, "free_limit_reached", {"feature": "practice", "used": used})
            raise HTTPException(status_code=402, detail={"message": "You completed today's free practice. Premium unlocks unlimited sets and saved review.", "code": "free_limit_reached"})
    try:
        bank = _practice_bank()
        session = record_session(practice, payload.model_dump(), _local_today(), int(time.time()), {item["id"]: item for item in bank})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not premium and not existing:
        today_key = _local_today().isoformat()
        usage = practice.setdefault("free_usage", {})
        today_usage = usage.get(today_key, {})
        if not isinstance(today_usage, dict):
            today_usage = {}
        today_usage[payload.exam] = used + len(payload.answers)
        usage[today_key] = today_usage
        cutoff = (_local_today() - timedelta(days=31)).isoformat()
        practice["free_usage"] = {day: count for day, count in usage.items() if day >= cutoff}
    _save_memory(identity.user_id, memory)
    _track_product_event(identity.user_id, "practice_completed", {
        "exam": session["exam"], "mode": session["mode"], "correct": session["correct"], "total": session["total"], "session_id": session["id"],
    })
    next_used = _free_practice_used(practice, payload.exam)
    return {
        "session": session,
        "records": practice.get("questions", {}),
        "streak": _practice_snapshot(memory),
        "access": {
            "is_premium": premium,
            "daily_limit": None if premium else FREE_PRACTICE_QUESTIONS_PER_DAY,
            "used_today": 0 if premium else next_used,
            "remaining_today": None if premium else max(0, FREE_PRACTICE_QUESTIONS_PER_DAY - next_used),
        },
    }


@app.post("/api/practice/draft")
async def practice_draft(payload: PracticeDraftRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    draft = {"prompt": payload.prompt, "content": payload.content, "updated_at": int(time.time())}
    miniapp.setdefault("practice", {}).setdefault("drafts", {})[payload.key] = draft
    _save_memory(identity.user_id, memory)
    return {"saved": True, "draft": draft}


@app.post("/api/practice/complete")
async def practice_complete(payload: PracticeCompletionRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    practice = miniapp.setdefault("practice", {"days": {}})
    if not isinstance(practice.get("days"), dict):
        practice["days"] = {}
    days = practice["days"]
    today_key = _local_today().isoformat()
    skills = days.setdefault(today_key, [])
    if payload.skill not in skills:
        skills.append(payload.skill)
    cutoff = (_local_today() - timedelta(days=180)).isoformat()
    practice["days"] = {key: value for key, value in days.items() if key >= cutoff}
    _save_memory(identity.user_id, memory)
    _track_product_event(identity.user_id, "practice_completed", {"exam": payload.skill, "mode": "workbench", "correct": 0, "total": 0})
    window = _practice_snapshot(memory)
    window["just_recorded"] = payload.skill
    return window


@app.get("/api/practice/streak")
async def practice_streak(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return _practice_snapshot(legacy.load_memory(identity.user_id))


@app.post("/api/reminders")
async def create_reminder(payload: ReminderCreateRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    due = _parse_due_at(payload.due_at)
    if not due:
        raise HTTPException(status_code=422, detail="Choose a valid reminder time.")
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    reminder = {
        "id": uuid.uuid4().hex,
        "title": " ".join(payload.title.split())[:240],
        "due_at": due.isoformat(),
        "screen": payload.screen or "plan",
        "created_at": int(time.time()),
        "done": False,
    }
    miniapp["reminders"] = (miniapp.get("reminders", []) + [reminder])[-40:]
    _save_memory(identity.user_id, memory)
    return {"saved": True, "reminder": reminder}


@app.post("/api/notifications/read")
async def notifications_read(payload: NotificationsReadRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    seen = [str(item) for item in miniapp.get("seen_notifications", [])]
    for item_id in payload.ids:
        if item_id not in seen:
            seen.append(item_id)
    miniapp["seen_notifications"] = seen[-120:]
    _save_memory(identity.user_id, memory)
    return {"saved": True, "read": len(payload.ids)}


@app.post("/api/boost")
async def boost(payload: BoostRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    if payload.tool == "readiness":
        return {"tool": payload.tool, "result": readiness_snapshot(memory)}
    raw = await legacy.ask_ai(
        boost_messages(payload.tool, payload.content or "", payload.context or "", legacy.module().memory_summary_for_prompt(memory)),
        strong=False,
        max_tokens=1_100,
    )
    return {"tool": payload.tool, "result": _parse_ai_json(raw)}


@app.post("/api/coach")
async def coach(payload: CoachRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    rag_topic = {
        "personal_statement": "essays_personal",
        "supplemental": "essays_supplemental",
        "extracurricular": "extracurriculars",
        "portfolio": "portfolio",
        "general": "general",
    }[payload.topic]
    rag = await legacy.load_rag(rag_topic, payload.content[:4_000])
    raw = await legacy.ask_ai(
        coach_messages(payload.mode, payload.topic, payload.content, payload.goal or "", legacy.module().memory_summary_for_prompt(memory), rag),
        strong=payload.mode == "rewrite",
        max_tokens=2_000 if payload.mode == "rewrite" else 1_500,
    )
    return {"mode": payload.mode, "result": _parse_ai_json(raw)}


def _copilot_access(memory: dict[str, Any], premium: bool) -> dict[str, Any]:
    _, miniapp = _ensure_memory(memory)
    return copilot_access_snapshot(
        miniapp.get("copilot_free_usage"), _local_today(), FREE_COPILOT_MESSAGES_PER_DAY, premium
    )


@app.get("/api/copilot/access")
async def copilot_access(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    return _copilot_access(memory, _is_premium(identity.user_id))


@app.post("/api/copilot")
async def copilot(payload: CopilotRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    premium = _is_premium(identity.user_id)
    reserved = False
    if not premium:
        lock = _copilot_locks.setdefault(identity.user_id, asyncio.Lock())
        async with lock:
            memory = legacy.load_memory(identity.user_id)
            access = _copilot_access(memory, False)
            if access["remaining_today"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "message": "You used today's 3 free Venture questions. Unlock Premium for profile-aware guidance.",
                        "code": "free_copilot_limit",
                        "access": access,
                    },
                )
            _, miniapp = _ensure_memory(memory)
            miniapp["copilot_free_usage"] = record_message(miniapp.get("copilot_free_usage"), _local_today())
            _save_memory(identity.user_id, memory)
            reserved = True
    history = [item.model_dump() for item in payload.history]
    messages = (
        copilot_messages(payload.question, payload.current_screen, history, _portfolio(memory), readiness_snapshot(memory))
        if premium
        else free_copilot_messages(payload.question, payload.current_screen, history)
    )
    try:
        raw = await legacy.ask_ai(messages, strong=False, max_tokens=650)
    except Exception:
        if reserved:
            async with _copilot_locks[identity.user_id]:
                latest = legacy.load_memory(identity.user_id)
                _, miniapp = _ensure_memory(latest)
                miniapp["copilot_free_usage"] = release_message(miniapp.get("copilot_free_usage"), _local_today())
                _save_memory(identity.user_id, latest)
        raise
    raw_answer = str(raw or "").strip()
    if not raw_answer:
        if reserved:
            async with _copilot_locks[identity.user_id]:
                latest = legacy.load_memory(identity.user_id)
                _, miniapp = _ensure_memory(latest)
                miniapp["copilot_free_usage"] = release_message(miniapp.get("copilot_free_usage"), _local_today())
                _save_memory(identity.user_id, latest)
        raise HTTPException(status_code=503, detail="Your copilot is temporarily busy. Please try again.")
    answer = raw_answer
    bullets: list[str] = []
    next_action = ""
    try:
        parsed = _parse_ai_json(raw_answer)
    except HTTPException:
        parsed = {}
    if parsed:
        answer = str(parsed.get("answer") or parsed.get("headline") or parsed.get("summary") or "").strip()
        raw_bullets = parsed.get("bullets") or parsed.get("moves") or parsed.get("actions") or []
        if isinstance(raw_bullets, list):
            for item in raw_bullets[:3]:
                if isinstance(item, dict):
                    value = item.get("title") or item.get("action") or item.get("text")
                else:
                    value = item
                if value:
                    bullets.append(str(value).strip()[:260])
        next_action = str(parsed.get("next_action") or parsed.get("next_step") or "").strip()[:300]
    if not answer:
        answer = "I found the useful next step, but the explanation needs a quick retry. Ask the question once more."
    return {
        "answer": answer[:1_200],
        "bullets": bullets,
        "next_action": next_action,
        "profile_completeness": _profile_completeness(memory) if premium else None,
        "access": _copilot_access(legacy.load_memory(identity.user_id), premium),
    }


@app.post("/api/sat/coach")
async def sat_coach(payload: SATCoachRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    raw = await legacy.ask_ai(
        sat_coach_messages(payload.model_dump(), legacy.module().memory_summary_for_prompt(memory)),
        strong=False,
        max_tokens=1_700,
    )
    return {"result": _parse_ai_json(raw)}


@app.post("/api/feedback")
async def submit_feedback(payload: FeedbackRequest, identity: TelegramIdentity = Depends(current_identity)) -> dict[str, bool]:
    memory = legacy.load_memory(identity.user_id)
    _, miniapp = _ensure_memory(memory)
    entry = {**payload.model_dump(), "created_at": int(time.time())}
    miniapp["feedback"] = (miniapp.get("feedback", []) + [entry])[-20:]
    _save_memory(identity.user_id, memory)
    bot = legacy.module()
    for admin_id in getattr(bot, "ADMIN_IDS", set()):
        try:
            await bot.app.bot.send_message(
                chat_id=admin_id,
                text=f"💬 Mini App feedback\n\nUser ID: {identity.user_id}\nCategory: {payload.category}\nRating: {payload.rating}/5\n\n{payload.message}",
            )
        except Exception:
            logger.warning("Could not forward Mini App feedback to admin %s", admin_id)
    return {"saved": True}


def _extract_uploaded_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return extract_pdf_text(io.BytesIO(content))
    if suffix == ".docx":
        document = DocxDocument(io.BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    if suffix in {".txt", ".md"}:
        return content.decode("utf-8", errors="replace")
    raise HTTPException(status_code=415, detail="Upload a PDF, DOCX, TXT, or Markdown file.")


@app.post("/api/files/extract")
async def extract_file(file: UploadFile = File(...), identity: TelegramIdentity = Depends(active_identity)) -> dict[str, str]:
    del identity
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large.")
    text = await asyncio.to_thread(_extract_uploaded_text, file.filename or "upload.txt", content)
    text = text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="No readable text was found in this file.")
    return {"filename": file.filename or "upload", "text": text[:30_000]}


if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and STATIC_DIR.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
