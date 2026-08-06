#!/usr/bin/env python3
"""Generate valid Telegram initData for local signature testing only."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlencode


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        raise SystemExit("Set TELEGRAM_BOT_TOKEN first.")
    user = {
        "id": int(os.environ.get("DEV_TELEGRAM_USER_ID", "8489671503")),
        "first_name": os.environ.get("DEV_TELEGRAM_FIRST_NAME", "Local Student"),
        "username": os.environ.get("DEV_TELEGRAM_USERNAME", "local_student"),
        "language_code": "en",
    }
    fields = {
        "auth_date": str(int(time.time())),
        "query_id": "LOCAL_TEST_QUERY",
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
    }
    check_string = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    print(urlencode(fields))


if __name__ == "__main__":
    main()

