from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def normalize_usage(value: Any, today: date, retention_days: int = 31) -> dict[str, int]:
    """Return bounded, recent daily usage records safe to persist in student memory."""
    if not isinstance(value, dict):
        return {}
    cutoff = today - timedelta(days=max(1, retention_days))
    normalized: dict[str, int] = {}
    for raw_day, raw_count in value.items():
        try:
            day = date.fromisoformat(str(raw_day))
            count = max(0, int(raw_count or 0))
        except (TypeError, ValueError):
            continue
        if day >= cutoff and count:
            normalized[day.isoformat()] = count
    return normalized


def access_snapshot(value: Any, today: date, limit: int, premium: bool) -> dict[str, Any]:
    usage = normalize_usage(value, today)
    used = max(0, int(usage.get(today.isoformat(), 0)))
    return {
        "is_premium": premium,
        "daily_limit": None if premium else limit,
        "used_today": used,
        "remaining_today": None if premium else max(0, limit - used),
    }


def record_message(value: Any, today: date) -> dict[str, int]:
    usage = normalize_usage(value, today)
    key = today.isoformat()
    usage[key] = max(0, int(usage.get(key, 0))) + 1
    return usage


def release_message(value: Any, today: date) -> dict[str, int]:
    usage = normalize_usage(value, today)
    key = today.isoformat()
    remaining = max(0, int(usage.get(key, 0)) - 1)
    if remaining:
        usage[key] = remaining
    else:
        usage.pop(key, None)
    return usage
