from __future__ import annotations

import asyncio
import importlib
import json
import re
from functools import lru_cache
from typing import Any


class AIRequestError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _valid_json_object(raw: str) -> bool:
    text = str(raw or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    try:
        return isinstance(json.loads(text), dict)
    except (TypeError, json.JSONDecodeError):
        return False


@lru_cache(maxsize=1)
def module():
    """Import the existing bot exactly once and expose its production services."""
    return importlib.import_module("AIBOT")


def ensure_user(identity) -> dict[str, Any]:
    bot = module()
    return bot._ensure_user_trial_record(
        identity.user_id,
        username=identity.username or None,
        first_name=identity.first_name or None,
    )


def load_memory(user_id: int) -> dict[str, Any]:
    return module().load_user_memory(user_id)


def save_memory(user_id: int, memory: dict[str, Any]) -> None:
    module().save_user_memory(user_id, memory)


def is_admin(user_id: int) -> bool:
    return int(user_id) in module().ADMIN_IDS


def paid_records() -> dict[str, Any]:
    return module()._paid_load()


def subscription_status(user_id: int) -> dict[str, Any]:
    bot = module()
    rec = bot.get_paid_record(user_id) or {}
    now = bot.datetime.utcnow()
    expires_at = bot._parse_iso(rec.get("expires_at", ""))
    first_seen = bot._parse_iso(rec.get("first_seen_at", ""))
    trial_ends_at = first_seen + bot.timedelta(days=bot.FREE_TRIAL_DAYS) if first_seen and bot.FREE_TRIAL_DAYS > 0 else None
    if int(user_id) in bot.ADMIN_IDS:
        access_type = "admin"
        is_premium = True
    elif not bot.PAYWALL_ENABLED:
        access_type = "unrestricted"
        is_premium = True
    elif expires_at and now <= expires_at:
        access_type = "paid"
        is_premium = True
    elif trial_ends_at and now <= trial_ends_at:
        access_type = "trial"
        is_premium = True
    else:
        access_type = "free"
        is_premium = False

    payment_ready = bot.payment_details_configured()
    return {
        "has_access": True,
        "is_premium": is_premium,
        "tier": "premium" if is_premium else "free",
        "access_type": access_type,
        "remaining_days": bot.remaining_days(user_id),
        "expires_at": expires_at.isoformat() if expires_at else None,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "price": f"{bot.PAYMENT_PRICE_UZS:,} UZS",
        "price_uzs": bot.PAYMENT_PRICE_UZS,
        "period_days": bot.DEFAULT_SUB_DAYS,
        "recurring": False,
        "support_handle": bot.SUPPORT_HANDLE,
        "auto_renews": False,
        "payment_method": "manual_card",
        "card_number": bot.PAYMENT_CARD if payment_ready else "",
        "card_holder": bot.PAYMENT_CARD_HOLDER if payment_ready else "",
        "bank_name": bot.PAYMENT_BANK if payment_ready else "",
        "payment_status": bot.latest_manual_payment_status(user_id),
    }


async def start_manual_payment(user_id: int) -> bool:
    bot = module()
    if not bot.payment_details_configured():
        raise RuntimeError("Payment card is not configured.")
    if bot.manual_payment_session_active(user_id):
        return False
    bot.begin_manual_payment_session(user_id)
    await bot.app.bot.send_message(
        chat_id=user_id,
        text=(
            bot._payment_instructions_text(user_id)
            + "\n\n📷 <b>Now upload your payment screenshot in this chat.</b>\n"
            "Receipt mode stays active for 30 minutes."
        ),
        parse_mode="HTML",
        reply_markup=bot.main_menu_keyboard(),
    )
    return True


async def ask_ai(
    messages: list[dict[str, str]],
    *,
    strong: bool = False,
    temperature: float = 0.35,
    max_tokens: int = 1_200,
    json_mode: bool = True,
) -> str:
    bot = module()
    primary_model = bot.STRONG_MODEL if strong else bot.FAST_MODEL

    async def call_model(model: str) -> str:
        raw = await bot.openai_chat(
            model,
            messages,
            temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"} if json_mode else None,
            raise_errors=True,
        )
        if not json_mode or _valid_json_object(raw):
            return raw
        repair_messages = list(messages) + [
            {
                "role": "system",
                "content": "Your previous response was not valid JSON. Return one complete valid JSON object only, with no markdown fences or commentary.",
            }
        ]
        bot.logging.warning("Retrying malformed Mini App JSON response model=%s", model)
        repaired = await bot.openai_chat(
            model,
            repair_messages,
            temperature,
            max_tokens=min(max(max_tokens * 2, 2_000), 8_000),
            response_format={"type": "json_object"},
            raise_errors=True,
        )
        if not _valid_json_object(repaired):
            raise AIRequestError("invalid_response")
        return repaired

    try:
        return await call_model(primary_model)
    except Exception as exc:
        code = str(getattr(exc, "code", "unknown"))
        fallback_model = str(getattr(bot, "FALLBACK_MODEL", "gpt-4o-mini"))
        if code == "model_unavailable" and fallback_model and fallback_model != primary_model:
            bot.logging.warning("Retrying Mini App AI request with fallback model=%s", fallback_model)
            try:
                return await call_model(fallback_model)
            except Exception as fallback_exc:
                raise AIRequestError(str(getattr(fallback_exc, "code", "unknown"))) from fallback_exc
        raise AIRequestError(code) from exc


def rag_context(topic: str, query: str, limit: int = 6) -> str:
    """Reuse the bot's global topic collection and embedding configuration."""
    bot = module()
    try:
        collection = bot.get_collection(0, topic)
        documents: list[str] = []
        for bucket in ("evaluation", "qa"):
            try:
                result = collection.query(
                    query_texts=[query],
                    where={"type": bucket},
                    n_results=max(1, limit // 2),
                )
                documents.extend((result.get("documents") or [[]])[0] or [])
            except Exception:
                continue
        if not documents:
            result = collection.query(query_texts=[query], n_results=limit)
            documents = (result.get("documents") or [[]])[0] or []
        return "\n\n---\n\n".join(documents[:limit])
    except Exception:
        bot.logging.exception("Mini App RAG lookup failed for %s", topic)
        return ""


async def start_bot() -> None:
    bot = module()
    await bot.app.initialize()
    if bot.app.post_init:
        await bot.app.post_init(bot.app)
    await bot.app.start()
    if bot.app.updater:
        await bot.app.updater.start_polling()


async def stop_bot() -> None:
    bot = module()
    if bot.app.updater and bot.app.updater.running:
        await bot.app.updater.stop()
    if bot.app.running:
        await bot.app.stop()
    await bot.app.shutdown()


async def load_rag(topic: str, query: str) -> str:
    return await asyncio.to_thread(rag_context, topic, query)
