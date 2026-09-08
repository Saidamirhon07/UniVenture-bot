import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.analytics import founder_snapshot, record_event


class ProductAnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "analytics.json"
        self.now = datetime(2026, 9, 8, 9, 0, tzinfo=timezone.utc)

    def tearDown(self):
        self.temp.cleanup()

    def test_dau_wau_mau_tool_and_practice_counts(self):
        record_event(1, "app_open", now=self.now, path=self.path)
        record_event(1, "screen_view", {"screen": "essay"}, now=self.now, path=self.path)
        record_event(2, "screen_view", {"screen": "sat"}, now=self.now - timedelta(days=4), path=self.path)
        record_event(2, "practice_completed", {"exam": "sat", "correct": 8, "total": 10}, now=self.now - timedelta(days=4), path=self.path)
        snapshot = founder_snapshot({}, now=self.now, path=self.path)
        self.assertEqual(snapshot["audience"]["dau"], 1)
        self.assertEqual(snapshot["audience"]["wau"], 2)
        self.assertEqual(snapshot["audience"]["mau"], 2)
        self.assertEqual(snapshot["tools"][0]["name"], "Essay Review")
        self.assertEqual(snapshot["practice"]["sat"]["accuracy"], 80)

    def test_subscription_churn_conversion_and_campaign_revenue(self):
        record_event(1, "app_open", now=self.now, path=self.path)
        record_event(2, "checkout_started", now=self.now, path=self.path)
        paid = {
            "1": {"expires_at": (self.now + timedelta(days=20)).isoformat(), "acquisition_source": "ig_reel01", "payments": [{"paid_at": self.now.isoformat(), "amount": 199000, "currency": "UZS", "provider": "manual_card"}]},
            "3": {"expires_at": (self.now - timedelta(days=1)).isoformat(), "payments": [{"paid_at": (self.now - timedelta(days=20)).isoformat(), "amount": 199000, "currency": "UZS", "provider": "manual_card"}]},
        }
        snapshot = founder_snapshot(paid, now=self.now, path=self.path)
        self.assertEqual(snapshot["subscriptions"]["active_paid"], 1)
        self.assertEqual(snapshot["subscriptions"]["churned"], 1)
        self.assertEqual(snapshot["funnel"]["paid"], 2)
        self.assertEqual(snapshot["revenue_by_source"][0]["source"], "ig_reel01")
        self.assertEqual(snapshot["revenue_by_source"][0]["currency"], "UZS")
        self.assertEqual(snapshot["revenue_by_source"][0]["amount"], 199000)

    def test_rejects_unapproved_event_names(self):
        with self.assertRaises(ValueError):
            record_event(1, "essay_text", {"content": "private"}, now=self.now, path=self.path)


if __name__ == "__main__":
    unittest.main()
