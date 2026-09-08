from __future__ import annotations

from datetime import datetime, timedelta
import re


PLAN_ID = "pro_monthly_v1"
PAYLOAD_PREFIX = "univenture"


def normalize_source(source: str) -> str | None:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "", str(source or ""))[:48]
    return cleaned if len(cleaned) >= 2 else None


def invoice_payload(user_id: int, plan_id: str = PLAN_ID) -> str:
    return f"{PAYLOAD_PREFIX}:{plan_id}:{int(user_id)}"


def payload_user_id(payload: str, plan_id: str = PLAN_ID) -> int | None:
    parts = str(payload or "").split(":")
    if len(parts) != 3 or parts[0] != PAYLOAD_PREFIX or parts[1] != plan_id:
        return None
    try:
        return int(parts[2])
    except (TypeError, ValueError):
        return None


def checkout_is_valid(
    *,
    payload: str,
    user_id: int,
    currency: str,
    total_amount: int,
    expected_amount: int,
) -> bool:
    return (
        payload_user_id(payload) == int(user_id)
        and currency == "XTR"
        and int(total_amount) == int(expected_amount)
        and int(expected_amount) > 0
    )


def extended_expiry(now: datetime, current_expiry: datetime | None, days: int = 30) -> datetime:
    base = current_expiry if current_expiry and current_expiry > now else now
    return base + timedelta(days=int(days))
