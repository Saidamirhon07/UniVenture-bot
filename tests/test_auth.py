import hashlib
import hmac
import json
import unittest
from unittest.mock import patch
from urllib.parse import urlencode

from backend.auth import AuthError, TelegramIdentity, decode_session_token, issue_session_token, validate_telegram_init_data


BOT_TOKEN = "123456789:test-token"


def signed_init_data(now: int = 1_800_000_000) -> str:
    fields = {
        "auth_date": str(now),
        "query_id": "AAExample",
        "user": json.dumps({"id": 8489671503, "first_name": "Saidamirkhon", "username": "student"}, separators=(",", ":")),
    }
    check_string = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


class TelegramAuthTests(unittest.TestCase):
    def test_validates_telegram_init_data(self):
        identity = validate_telegram_init_data(signed_init_data(), BOT_TOKEN, now=1_800_000_010)
        self.assertEqual(identity.user_id, 8489671503)
        self.assertEqual(identity.first_name, "Saidamirkhon")

    def test_rejects_tampered_init_data(self):
        tampered = signed_init_data().replace("Saidamirkhon", "Attacker")
        with self.assertRaises(AuthError):
            validate_telegram_init_data(tampered, BOT_TOKEN, now=1_800_000_010)

    def test_rejects_expired_init_data(self):
        with self.assertRaisesRegex(AuthError, "expired"):
            validate_telegram_init_data(signed_init_data(), BOT_TOKEN, max_age_seconds=60, now=1_800_000_061)

    def test_session_round_trip_and_tamper_detection(self):
        with patch("backend.auth.time.time", return_value=1_800_000_000):
            identity = TelegramIdentity(user_id=42, first_name="Student", username="uni")
            token = issue_session_token(identity, "session-secret", ttl_seconds=600)
        self.assertEqual(decode_session_token(token, "session-secret", now=1_800_000_100), identity)
        with self.assertRaises(AuthError):
            decode_session_token(token + "x", "session-secret", now=1_800_000_100)


if __name__ == "__main__":
    unittest.main()
