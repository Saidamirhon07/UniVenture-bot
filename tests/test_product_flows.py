from datetime import date
import unittest
from backend.product_logic import practice_snapshot, task_action
from backend.prompts import copilot_messages


class ProductFlowTests(unittest.TestCase):
    def test_sat_logistics_becomes_a_reminder_with_sat_fallback(self):
        task = {
            "title": "Finalize SAT retake logistics (test date, registration, study plan)",
            "why": "Testing must be scheduled before other tasks.",
            "category": "Testing",
        }
        action = task_action(task, "essays")
        self.assertEqual(action["mode"], "reminder")
        self.assertEqual(action["screen"], "sat")
        self.assertEqual(action["secondary_label"], "Open SAT Quest")

    def test_essay_task_routes_to_essay_lab_even_when_another_blocker_is_weaker(self):
        action = task_action({"title": "Draft the personal statement opening", "category": "Essays"}, "testing")
        self.assertEqual(action, {"mode": "navigate", "label": "Open Essay Lab", "screen": "essay"})

    def test_practice_streak_counts_consecutive_days_and_today(self):
        days = {"2026-08-05": ["sat"], "2026-08-06": ["ielts"], "2026-08-07": ["sat", "ielts"]}
        snapshot = practice_snapshot(days, date(2026, 8, 7))
        self.assertEqual(snapshot["current_streak"], 3)
        self.assertTrue(snapshot["completed_today"])
        self.assertEqual(snapshot["total_sessions"], 4)

    def test_copilot_contract_requires_student_friendly_structured_content(self):
        system = copilot_messages("What should I do today?", "home", [], {}, {"score": 40})[0]["content"]
        self.assertIn('"answer"', system)
        self.assertIn('"bullets"', system)
        self.assertIn('"next_action"', system)
        self.assertIn("plain language", system)


if __name__ == "__main__":
    unittest.main()
