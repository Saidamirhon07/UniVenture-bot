from __future__ import annotations

from urllib.parse import urlencode


def build_mini_app_url(base_url: str, *, screen: str = "", upgrade: bool = False) -> str:
    """Build a Telegram Web App URL without sending routing data to the server."""
    base = (base_url or "").strip().rstrip("/")
    if not base:
        return ""
    params: dict[str, str] = {}
    if screen:
        params["screen"] = screen
    if upgrade:
        params["upgrade"] = "premium"
    if not params:
        return base
    separator = "&" if "#" in base else "#"
    return f"{base}{separator}{urlencode(params)}"
