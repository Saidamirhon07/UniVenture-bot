from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any


_LOCK = threading.RLock()
_ALLOWED_SCREENS = {"free-check", "sat", "ielts"}
_TTL_SECONDS = 600
_PATH = Path(os.getenv("LAUNCH_INTENT_PATH", Path(os.getenv("DATA_DIR", "./data")) / "launch_intents.json"))


def _load() -> dict[str, dict[str, Any]]:
    try:
        if not _PATH.exists():
            return {}
        data = json.loads(_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _save(data: dict[str, dict[str, Any]]) -> None:
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = _PATH.with_suffix(f"{_PATH.suffix}.tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, _PATH)


def set_launch_intent(user_id: int, *, screen: str = "", upgrade: bool = False, now: float | None = None) -> None:
    if screen and screen not in _ALLOWED_SCREENS:
        raise ValueError("Unsupported Mini App destination.")
    timestamp = float(time.time() if now is None else now)
    with _LOCK:
        data = _load()
        data = {key: value for key, value in data.items() if float(value.get("expires_at", 0)) > timestamp}
        data[str(int(user_id))] = {
            "screen": screen,
            "upgrade": bool(upgrade),
            "expires_at": timestamp + _TTL_SECONDS,
        }
        _save(data)


def consume_launch_intent(user_id: int, *, now: float | None = None) -> dict[str, Any] | None:
    timestamp = float(time.time() if now is None else now)
    with _LOCK:
        data = _load()
        intent = data.pop(str(int(user_id)), None)
        data = {key: value for key, value in data.items() if float(value.get("expires_at", 0)) > timestamp}
        _save(data)
    if not intent or float(intent.get("expires_at", 0)) <= timestamp:
        return None
    screen = str(intent.get("screen") or "")
    return {
        "screen": screen if screen in _ALLOWED_SCREENS else "",
        "upgrade": bool(intent.get("upgrade")),
    }
