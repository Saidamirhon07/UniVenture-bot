import unittest

from backend.free_access import FREE_FEATURES, access_snapshot, release, reserve


class FreeAccessTests(unittest.TestCase):
    def test_every_major_feature_gets_an_independent_first_result(self):
        miniapp = {}
        for feature in FREE_FEATURES:
            self.assertTrue(reserve(miniapp, feature), feature)
            self.assertFalse(reserve(miniapp, feature), feature)
        snapshot = access_snapshot(miniapp, premium=False, essay_limit=1)
        self.assertTrue(all(item["remaining"] == 0 for key, item in snapshot.items() if key != "essay_review"))

    def test_failed_attempt_is_released_without_touching_other_tools(self):
        miniapp = {}
        self.assertTrue(reserve(miniapp, "ec_review"))
        self.assertTrue(reserve(miniapp, "rewrite"))
        release(miniapp, "ec_review")
        self.assertTrue(reserve(miniapp, "ec_review"))
        self.assertFalse(reserve(miniapp, "rewrite"))

    def test_premium_snapshot_has_no_limits_and_legacy_values_are_sanitized(self):
        miniapp = {"free_feature_uses": {"school_finder": "9", "essay_review": "2"}, "free_essay_evaluations_used": "99"}
        free = access_snapshot(miniapp, premium=False, essay_limit=1)
        self.assertEqual(free["school_finder"]["remaining"], 0)
        self.assertEqual(free["essay_review"]["remaining"], 0)
        premium = access_snapshot(miniapp, premium=True, essay_limit=1)
        self.assertIsNone(premium["school_finder"]["limit"])
        self.assertIsNone(premium["essay_review"]["remaining"])

    def test_old_essay_counter_does_not_consume_the_new_launch_credit(self):
        snapshot = access_snapshot({"free_essay_evaluations_used": 7}, premium=False, essay_limit=1)
        self.assertEqual(snapshot["essay_review"]["remaining"], 1)


if __name__ == "__main__":
    unittest.main()
