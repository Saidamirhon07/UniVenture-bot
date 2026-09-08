from datetime import datetime, timedelta
import unittest

from backend.billing import checkout_is_valid, extended_expiry, invoice_payload, normalize_source, payload_user_id


class BillingTests(unittest.TestCase):
    def test_invoice_payload_is_bound_to_user(self):
        payload = invoice_payload(8489671503)
        self.assertEqual(payload_user_id(payload), 8489671503)
        self.assertTrue(
            checkout_is_valid(
                payload=payload,
                user_id=8489671503,
                currency="XTR",
                total_amount=799,
                expected_amount=799,
            )
        )

    def test_checkout_rejects_wrong_user_currency_or_amount(self):
        payload = invoice_payload(42)
        base = {"payload": payload, "user_id": 42, "currency": "XTR", "total_amount": 799, "expected_amount": 799}
        self.assertFalse(checkout_is_valid(**{**base, "user_id": 43}))
        self.assertFalse(checkout_is_valid(**{**base, "currency": "USD"}))
        self.assertFalse(checkout_is_valid(**{**base, "total_amount": 1}))

    def test_renewal_extends_current_paid_period(self):
        now = datetime(2026, 9, 8, 12, 0, 0)
        current = now + timedelta(days=10)
        self.assertEqual(extended_expiry(now, current), now + timedelta(days=40))

    def test_expired_subscription_restarts_from_payment_time(self):
        now = datetime(2026, 9, 8, 12, 0, 0)
        expired = now - timedelta(days=2)
        self.assertEqual(extended_expiry(now, expired), now + timedelta(days=30))

    def test_campaign_source_is_safe_for_telegram_deep_links(self):
        self.assertEqual(normalize_source("partner_school-1"), "partner_school-1")
        self.assertEqual(normalize_source("ig reel 01!?"), "igreel01")
        self.assertIsNone(normalize_source("!"))


if __name__ == "__main__":
    unittest.main()
