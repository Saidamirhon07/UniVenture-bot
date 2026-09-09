import unittest
from datetime import date, timedelta

from backend.copilot_access import access_snapshot, normalize_usage, record_message, release_message


class CopilotAccessTests(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 9, 9)

    def test_free_user_stops_at_daily_limit(self):
        usage = {}
        for _ in range(3):
            usage = record_message(usage, self.today)
        snapshot = access_snapshot(usage, self.today, 3, False)
        self.assertEqual(snapshot["used_today"], 3)
        self.assertEqual(snapshot["remaining_today"], 0)

    def test_premium_has_no_daily_limit(self):
        snapshot = access_snapshot({self.today.isoformat(): 99}, self.today, 3, True)
        self.assertIsNone(snapshot["daily_limit"])
        self.assertIsNone(snapshot["remaining_today"])

    def test_failed_message_can_be_released(self):
        usage = record_message({}, self.today)
        self.assertEqual(release_message(usage, self.today), {})

    def test_old_and_invalid_usage_is_pruned(self):
        old = (self.today - timedelta(days=40)).isoformat()
        usage = normalize_usage({old: 4, "invalid": 5, self.today.isoformat(): "2"}, self.today)
        self.assertEqual(usage, {self.today.isoformat(): 2})


if __name__ == "__main__":
    unittest.main()
