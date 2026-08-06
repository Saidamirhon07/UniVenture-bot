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
from pathlib import Path
from typing import Any

from docx import Document as DocxDocument
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pdfminer.high_level import extract_text as extract_pdf_text

from . import legacy
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
    compact_evaluation_messages,
    full_review_messages,
    plan_messages,
    recommendation_builder_messages,
    refinement_messages,
    school_finder_messages,
)
from .schemas import (
    ApplicationPlanRequest,
    AuthRequest,
    BoostRequest,
    DevAuthRequest,
    ECEvaluationRequest,
    EssayEvaluationRequest,
    FullReviewRequest,
    IELTSEvaluationRequest,
    PortfolioEvaluationRequest,
    ProfileUpdateRequest,
    RecommendationRequest,
    RefineRequest,
    SaveSchoolRequest,
    SchoolFinderRequest,
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
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENABLE_API_DOCS", "0") == "1" else None,
    redoc_url=None,
    lifespan=lifespan,
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
    if not access["has_access"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "Your trial or subscription has ended.", "subscription": access},
        )
    return identity


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
    "academic_profile": {"grade", "country", "major", "target_countries"},
    "test_scores": {"gpa", "sat", "sat_breakdown", "act", "ielts", "toefl", "duolingo", "notes"},
    "essays": {"personal_statement", "supplementals", "common_app", "notes"},
    "extracurriculars": {"summary", "spike", "highlights", "notes"},
    "awards": {"items", "notes"},
    "projects": {"field", "items", "portfolio_url", "gaps", "notes"},
    "recommendations": {"teachers", "status", "stories", "notes"},
    "preferences": {"target_countries", "intended_major", "environment", "budget", "constraints", "notes"},
    "financial_aid": {"needs_aid", "budget", "max_family_contribution", "scholarship_priority", "notes"},
    "deadlines": {"items", "nearest_deadline", "application_round", "notes"},
    "wellness": {"stress_level", "hours_per_week", "sleep_hours", "support_needs", "notes"},
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
    miniapp.setdefault("updated_at", None)
    return application, miniapp


def _portfolio(memory: dict[str, Any]) -> dict[str, Any]:
    application, _ = _ensure_memory(memory)
    return {"profile": memory.get("profile", {}), "application": application}


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


def _dashboard(memory: dict[str, Any], identity: TelegramIdentity) -> dict[str, Any]:
    app_data, miniapp = _ensure_memory(memory)
    readiness = readiness_snapshot(memory)
    essays = app_data.get("essays", {}) or {}
    cards = [
        {"key": "essays", "label": "Essays", "value": essays.get("personal_statement") or "Not started", "progress": round(100 * _status_fraction(essays.get("personal_statement")))},
        {"key": "schools", "label": "School list", "value": f"{len(app_data.get('school_list', []))} saved", "progress": min(100, len(app_data.get("school_list", [])) * 16)},
        {"key": "ielts", "label": "IELTS", "value": app_data.get("test_scores", {}).get("ielts") or "Add score", "progress": 100 if app_data.get("test_scores", {}).get("ielts") else 10},
        {"key": "extracurriculars", "label": "ECs", "value": "Mapped" if app_data.get("ecs", {}).get("summary") else "Needs detail", "progress": 75 if app_data.get("ecs", {}).get("summary") else 15},
        {"key": "portfolio", "label": "Portfolio", "value": f"{len(app_data.get('projects', {}).get('items', []))} projects", "progress": min(100, len(app_data.get("projects", {}).get("items", [])) * 25)},
        {"key": "recommendations", "label": "Recommendations", "value": app_data.get("recommendations", {}).get("status") or "Not started", "progress": round(100 * _status_fraction(app_data.get("recommendations", {}).get("status")))},
    ]
    latest_plan = (miniapp.get("plans") or [])[-1] if miniapp.get("plans") else None
    today = (latest_plan or {}).get("result", {}).get("today_priority")
    if not today:
        today = {"title": f"Strengthen {readiness['blocker']['label'].lower()}", "why": readiness["blocker"]["message"], "effort": "20 min"}
    return {
        "name": identity.first_name,
        "readiness": readiness,
        "today_priority": today,
        "status_cards": cards,
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
    access = legacy.subscription_status(identity.user_id)
    token = issue_session_token(identity, _session_secret(), SESSION_TTL_SECONDS)
    return {"token": token, "user": {"id": identity.user_id, "name": identity.display_name, "username": identity.username, "photo_url": identity.photo_url}, "subscription": access}


@app.post("/api/auth/dev")
async def auth_dev(payload: DevAuthRequest) -> dict[str, Any]:
    if not DEV_AUTH_BYPASS:
        raise HTTPException(status_code=404, detail="Not found.")
    identity = TelegramIdentity(user_id=payload.user_id, first_name=payload.first_name, username=payload.username)
    legacy.ensure_user(identity)
    token = issue_session_token(identity, _session_secret(), SESSION_TTL_SECONDS)
    return {"token": token, "user": {"id": identity.user_id, "name": identity.display_name, "username": identity.username}, "subscription": legacy.subscription_status(identity.user_id)}


@app.get("/api/me")
async def me(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    memory = legacy.load_memory(identity.user_id)
    return {"user": {"id": identity.user_id, "name": identity.display_name, "username": identity.username}, "portfolio": _portfolio(memory), "readiness": readiness_snapshot(memory)}


@app.get("/api/dashboard")
async def dashboard(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return _dashboard(legacy.load_memory(identity.user_id), identity)


@app.get("/api/subscription")
async def subscription(identity: TelegramIdentity = Depends(current_identity)) -> dict[str, Any]:
    return legacy.subscription_status(identity.user_id)


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
async def evaluate_essay(payload: EssayEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    topic = "essays_personal" if payload.essay_type == "personal_statement" else "essays_supplemental"
    return await _run_compact_evaluation(identity, topic, payload.content, {"school_name": payload.school_name, "prompt": payload.prompt})


@app.post("/api/evaluate/ec")
async def evaluate_ec(payload: ECEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    return await _run_compact_evaluation(identity, "extracurriculars", payload.activity, payload.model_dump(exclude={"activity"}))


@app.post("/api/evaluate/ielts")
async def evaluate_ielts(payload: IELTSEvaluationRequest, identity: TelegramIdentity = Depends(active_identity)) -> dict[str, Any]:
    return await _run_compact_evaluation(identity, "ielts_writing", payload.content, {"task_type": payload.task_type, "question": payload.question})


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
    miniapp["plans"] = (miniapp["plans"] + [{"created_at": int(time.time()), "request": payload.model_dump(), "result": result}])[-5:]
    _save_memory(identity.user_id, memory)
    return {"result": result, "readiness": readiness}


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

