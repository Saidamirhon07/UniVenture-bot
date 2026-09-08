"""Privacy-conscious product analytics stored on the existing Railway volume.

The store intentionally keeps Telegram user IDs and coarse product events only.
Essay text, answers, profile fields and chat messages are never copied here.
"""
from __future__ import annotations

import json
import os
import threading
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
ANALYTICS_PATH = Path(os.getenv("PRODUCT_ANALYTICS_PATH", str(DATA_DIR / "product_analytics.json")))
_lock = threading.RLock()

ALLOWED_EVENTS = {
    "app_open",
    "screen_view",
    "paywall_view",
    "checkout_started",
    "payment_success",
    "practice_completed",
    "onboarding_completed",
}
TOOL_LABELS = {
    "essay": "Essay Review",
    "brainstorm": "Brainstorm",
    "rewrite": "Rewrite",
    "ec": "EC Evaluation",
    "recommendation": "Recommendation Letters",
    "portfolio-builder": "Portfolio Review",
    "portfolio": "Profile & Awards",
    "sat": "SAT Practice",
    "ielts": "IELTS Practice",
    "school": "School Finder",
    "plan": "Application Plan",
    "boost": "Quick Checks",
    "coach": "AI Coach",
}


def _empty() -> dict[str, Any]:
    return {"version": 1, "users": {}, "events": []}


def _load(path: Path = ANALYTICS_PATH) -> dict[str, Any]:
    try:
        if not path.exists():
            return _empty()
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return _empty()
        payload.setdefault("users", {})
        payload.setdefault("events", [])
        return payload
    except Exception:
        return _empty()


def _save(payload: dict[str, Any], path: Path = ANALYTICS_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, path)


def _clean_properties(properties: dict[str, Any] | None) -> dict[str, Any]:
    clean: dict[str, Any] = {}
    for key, value in list((properties or {}).items())[:12]:
        safe_key = str(key)[:40]
        if isinstance(value, bool) or value is None:
            clean[safe_key] = value
        elif isinstance(value, (int, float)):
            clean[safe_key] = value
        else:
            clean[safe_key] = str(value)[:120]
    return clean


def _as_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def record_event(
    user_id: int,
    event: str,
    properties: dict[str, Any] | None = None,
    *,
    source: str | None = None,
    now: datetime | None = None,
    path: Path = ANALYTICS_PATH,
) -> None:
    if event not in ALLOWED_EVENTS:
        raise ValueError("Unsupported analytics event.")
    timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    iso = timestamp.isoformat()
    day = timestamp.date().isoformat()
    uid = str(int(user_id))
    with _lock:
        payload = _load(path)
        user = payload["users"].setdefault(uid, {"first_seen_at": iso, "last_seen_at": iso, "activity_days": []})
        user["last_seen_at"] = iso
        activity_days = [str(item) for item in user.get("activity_days", []) if isinstance(item, str)]
        if day not in activity_days:
            activity_days.append(day)
        cutoff_day = (timestamp.date() - timedelta(days=180)).isoformat()
        user["activity_days"] = [item for item in activity_days if item >= cutoff_day][-181:]
        if source and not user.get("source"):
            user["source"] = str(source)[:80]
        clean_properties = _clean_properties(properties)
        latest = payload["events"][-1] if payload["events"] else None
        latest_at = _as_utc(latest.get("occurred_at")) if latest else None
        if latest and latest.get("user_id") == uid and latest.get("event") == event and latest.get("properties") == clean_properties and latest_at and timedelta(0) <= timestamp - latest_at < timedelta(seconds=2):
            _save(payload, path)
            return
        payload["events"].append({
            "id": uuid.uuid4().hex,
            "user_id": uid,
            "event": event,
            "occurred_at": iso,
            "day": day,
            "properties": clean_properties,
        })
        cutoff = timestamp - timedelta(days=180)
        payload["events"] = [
            item for item in payload["events"][-50_000:]
            if (_as_utc(item.get("occurred_at")) or timestamp) >= cutoff
        ]
        _save(payload, path)


def _payment_rows(paid_records: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for uid, record in paid_records.items():
        for payment in record.get("payments") or []:
            if payment.get("refunded_at"):
                continue
            paid_at = _as_utc(payment.get("paid_at"))
            if not paid_at:
                continue
            rows.append({
                "user_id": str(uid),
                "paid_at": paid_at,
                "amount": int(payment.get("amount", 0) or 0),
                "currency": str(payment.get("currency") or "UZS").upper(),
                "provider": str(payment.get("provider") or "manual"),
                "source": str(payment.get("acquisition_source") or record.get("acquisition_source") or "direct")[:80],
            })
    return rows


def founder_snapshot(
    paid_records: dict[str, Any],
    *,
    days: int = 30,
    now: datetime | None = None,
    path: Path = ANALYTICS_PATH,
) -> dict[str, Any]:
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    days = max(7, min(int(days), 90))
    with _lock:
        payload = _load(path)
    events = payload.get("events", [])
    users = payload.get("users", {})

    def active_since(window_days: int) -> set[str]:
        cutoff = (current.date() - timedelta(days=window_days - 1)).isoformat()
        return {
            uid for uid, record in users.items()
            if any(str(day) >= cutoff for day in record.get("activity_days", []))
        }

    dau, wau, mau = active_since(1), active_since(7), active_since(30)
    cutoff = current - timedelta(days=days)
    period_events = [item for item in events if (_as_utc(item.get("occurred_at")) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff]
    visitors = active_since(days)
    checkout_users = {item["user_id"] for item in period_events if item.get("event") == "checkout_started"}

    payments = _payment_rows(paid_records)
    period_payments = [item for item in payments if item["paid_at"] >= cutoff]
    period_payers = {item["user_id"] for item in period_payments}
    all_payers = {item["user_id"] for item in payments}
    active_paid: set[str] = set()
    cancelled_active = 0
    for uid, record in paid_records.items():
        expiry = _as_utc(record.get("expires_at"))
        if expiry and expiry >= current:
            active_paid.add(str(uid))
            charge_id = record.get("subscription_charge_id")
            charge = next((item for item in reversed(record.get("payments") or []) if item.get("charge_id") == charge_id), {})
            if charge.get("cancelled_at"):
                cancelled_active += 1
    churned = max(0, len(all_payers - active_paid))
    churn_rate = round(100 * churned / len(all_payers), 1) if all_payers else 0.0

    tool_counts: Counter[str] = Counter()
    exam_rows: dict[str, dict[str, int]] = {"sat": {"sessions": 0, "students": 0, "questions": 0, "correct": 0}, "ielts": {"sessions": 0, "students": 0, "questions": 0, "correct": 0}}
    exam_users: dict[str, set[str]] = defaultdict(set)
    for event in period_events:
        properties = event.get("properties") or {}
        if event.get("event") == "screen_view":
            screen = str(properties.get("screen") or "")
            if screen in TOOL_LABELS:
                tool_counts[TOOL_LABELS[screen]] += 1
        if event.get("event") == "practice_completed":
            exam = str(properties.get("exam") or "").lower()
            if exam in exam_rows:
                exam_rows[exam]["sessions"] += 1
                exam_rows[exam]["questions"] += int(properties.get("total", 0) or 0)
                exam_rows[exam]["correct"] += int(properties.get("correct", 0) or 0)
                exam_users[exam].add(str(event.get("user_id")))
    for exam in exam_rows:
        exam_rows[exam]["students"] = len(exam_users[exam])
        total = exam_rows[exam]["questions"]
        exam_rows[exam]["accuracy"] = round(100 * exam_rows[exam]["correct"] / total) if total else 0

    source_rows: dict[tuple[str, str], dict[str, Any]] = {}
    for payment in period_payments:
        key = (payment["source"], payment["currency"])
        row = source_rows.setdefault(key, {"source": payment["source"], "currency": payment["currency"], "amount": 0, "payments": 0, "buyers": set()})
        row["amount"] += payment["amount"]
        row["payments"] += 1
        row["buyers"].add(payment["user_id"])

    timeline = []
    for offset in range(min(days, 30) - 1, -1, -1):
        day = (current.date() - timedelta(days=offset)).isoformat()
        day_events = [item for item in period_events if item.get("day") == day]
        timeline.append({
            "date": day,
            "active_users": len({item.get("user_id") for item in day_events}),
            "opens": sum(item.get("event") == "app_open" for item in day_events),
            "tool_views": sum(item.get("event") == "screen_view" and str((item.get("properties") or {}).get("screen")) in TOOL_LABELS for item in day_events),
        })

    denominator = max(len(visitors), len(period_payers))
    return {
        "generated_at": current.isoformat(),
        "window_days": days,
        "audience": {"dau": len(dau), "wau": len(wau), "mau": len(mau), "total_users": len(users)},
        "subscriptions": {
            "active_paid": len(active_paid), "ever_paid": len(all_payers), "churned": churned,
            "churn_rate": churn_rate, "cancelled_active": cancelled_active,
        },
        "funnel": {
            "visitors": len(visitors), "checkout_started": len(checkout_users), "paid": len(period_payers),
            "visitor_to_paid": round(100 * len(period_payers) / denominator, 1) if denominator else 0.0,
            "visitor_to_checkout": round(100 * len(checkout_users) / len(visitors), 1) if visitors else 0.0,
        },
        "tools": [{"name": name, "views": count} for name, count in tool_counts.most_common(8)],
        "practice": exam_rows,
        "revenue_by_source": [
            {**{key: value for key, value in row.items() if key != "buyers"}, "buyers": len(row["buyers"])}
            for row in sorted(source_rows.values(), key=lambda item: item["amount"], reverse=True)
        ][:10],
        "timeline": timeline,
        "privacy": "Counts product events only. Essay text, answers, profile content and chats are not stored in analytics.",
    }
