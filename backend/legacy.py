from __future__ import annotations

import asyncio
import importlib
from functools import lru_cache
from typing import Any


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
        has_access = True
    elif not bot.PAYWALL_ENABLED:
        access_type = "unrestricted"
        has_access = True
    elif expires_at and now <= expires_at:
        access_type = "paid"
        has_access = True
    elif trial_ends_at and now <= trial_ends_at:
        access_type = "trial"
        has_access = True
    else:
        access_type = "expired"
        has_access = False

    return {
        "has_access": has_access,
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
        "card_number": bot.PAYMENT_CARD,
        "card_holder": bot.PAYMENT_CARD_HOLDER,
        "bank_name": bot.PAYMENT_BANK,
        "payment_bot_url": f"https://t.me/{bot.PAYMENT_BOT_USERNAME}?start=pay" if bot.PAYMENT_BOT_USERNAME else None,
        "payment_status": bot.latest_manual_payment_status(user_id),
    }


async def ask_ai(
    messages: list[dict[str, str]],
    *,
    strong: bool = False,
    temperature: float = 0.35,
    max_tokens: int = 1_200,
    json_mode: bool = True,
) -> str:
    bot = module()
    return await bot.openai_chat(
        bot.STRONG_MODEL if strong else bot.FAST_MODEL,
        messages,
        temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"} if json_mode else None,
    )


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
