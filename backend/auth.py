from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import asdict, dataclass
from urllib.parse import parse_qsl


class AuthError(ValueError):
    """Raised when Telegram or application session authentication fails."""


@dataclass(frozen=True)
class TelegramIdentity:
    user_id: int
    first_name: str
    last_name: str = ""
    username: str = ""
    language_code: str = ""
    photo_url: str = ""

    @property
    def display_name(self) -> str:
        return " ".join(part for part in (self.first_name, self.last_name) if part).strip() or "Student"


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def validate_telegram_init_data(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = 21_600,
    now: int | None = None,
) -> TelegramIdentity:
    """Validate Telegram WebApp initData using Telegram's HMAC contract."""
    if not init_data or not bot_token:
        raise AuthError("Missing Telegram authentication data.")

    pairs = parse_qsl(init_data, keep_blank_values=True)
    keys = [key for key, _ in pairs]
    if len(keys) != len(set(keys)):
        raise AuthError("Duplicate Telegram authentication fields.")

    values = dict(pairs)
    received_hash = values.pop("hash", "")
    if len(received_hash) != 64:
        raise AuthError("Invalid Telegram authentication hash.")

    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(received_hash, expected_hash):
        raise AuthError("Telegram authentication signature does not match.")

    try:
        auth_date = int(values["auth_date"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AuthError("Telegram auth_date is missing or invalid.") from exc

    current_time = int(now if now is not None else time.time())
    if auth_date > current_time + 30:
        raise AuthError("Telegram authentication time is in the future.")
    if max_age_seconds > 0 and current_time - auth_date > max_age_seconds:
        raise AuthError("Telegram authentication has expired. Reopen the Mini App.")

    try:
        user = json.loads(values["user"])
        user_id = int(user["id"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise AuthError("Telegram user data is missing or invalid.") from exc

    return TelegramIdentity(
        user_id=user_id,
        first_name=str(user.get("first_name") or "Student")[:128],
        last_name=str(user.get("last_name") or "")[:128],
        username=str(user.get("username") or "")[:64],
        language_code=str(user.get("language_code") or "")[:16],
        photo_url=str(user.get("photo_url") or "")[:1024],
    )


def issue_session_token(identity: TelegramIdentity, secret: str, ttl_seconds: int = 21_600) -> str:
    if not secret:
        raise AuthError("Session signing secret is missing.")
    now = int(time.time())
    payload = {
        **asdict(identity),
        "iat": now,
        "exp": now + ttl_seconds,
        "v": 1,
    }
    encoded = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signature = _b64url_encode(hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest())
    return f"{encoded}.{signature}"


def decode_session_token(token: str, secret: str, now: int | None = None) -> TelegramIdentity:
    try:
        encoded, received_signature = token.split(".", 1)
    except ValueError as exc:
        raise AuthError("Invalid session token.") from exc

    expected_signature = _b64url_encode(
        hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(received_signature, expected_signature):
        raise AuthError("Session signature does not match.")

    try:
        payload = json.loads(_b64url_decode(encoded))
        expiry = int(payload["exp"])
        user_id = int(payload["user_id"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise AuthError("Invalid session payload.") from exc

    if expiry < int(now if now is not None else time.time()):
        raise AuthError("Session expired. Reopen the Mini App.")

    return TelegramIdentity(
        user_id=user_id,
        first_name=str(payload.get("first_name") or "Student"),
        last_name=str(payload.get("last_name") or ""),
        username=str(payload.get("username") or ""),
        language_code=str(payload.get("language_code") or ""),
        photo_url=str(payload.get("photo_url") or ""),
    )

