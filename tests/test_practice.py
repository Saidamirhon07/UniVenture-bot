import copy
import unittest
from datetime import date
from backend.practice import BANK, QUESTIONS, grade_session, record_session


class PracticeEngineTests(unittest.TestCase):
    def payload(self, **changes):
        data = {"session_id": "test-session-001", "exam": "sat", "mode": "learn", "seconds": 40,
                "answers": [{"question_id": "sm01", "choice": 1}, {"question_id": "sm02", "choice": 0}]}
        data.update(changes)
        return data

    def test_bank_unique_valid_and_explained(self):
        self.assertEqual(len(BANK), 36)
        self.assertEqual(len(QUESTIONS), len(BANK))
        self.assertEqual(sum(q["exam"] == "sat" for q in BANK), 24)
        self.assertEqual(sum(q["exam"] == "ielts" for q in BANK), 12)
        for q in BANK:
            self.assertTrue(0 <= q["answer"] < len(q["options"]))
            self.assertEqual(len(q["options"]), len(set(q["options"])))
            self.assertGreater(len(q["explanation"]), 40)
            if q["section"] == "listening":
                self.assertGreater(len(q["audio"]), 40)

    def test_math_answer_key(self):
        expected = ["8", "11", "3", "y = −3x + 11", "(x − 3)² − 4", "16", "200(1.05)ᵗ", "260", "$80", "10", "10", "4"]
        actual = [q["options"][q["answer"]] for q in BANK if q["section"] == "math"]
        self.assertEqual(actual, expected)

    def test_scores_on_server(self):
        result = grade_session("sat", self.payload()["answers"])
        self.assertEqual([r["correct"] for r in result], [True, False])

    def test_unknown_cross_exam_duplicate_and_invalid_choices_rejected(self):
        cases = [[{"question_id": "fake", "choice": 0}], [{"question_id": "ir01", "choice": 0}],
                 [{"question_id": "sm01", "choice": 1}] * 2,
                 [{"question_id": "sm01", "choice": True}], [{"question_id": "sm01", "choice": 4}],
                 [{"question_id": "sm01", "choice": -1}], []]
        for answers in cases:
            with self.subTest(answers=answers), self.assertRaises(ValueError):
                grade_session("sat", answers)

    def test_unanswered_is_incorrect(self):
        self.assertFalse(grade_session("sat", [{"question_id": "sm01", "choice": None}])[0]["correct"])

    def test_idempotent_save_does_not_inflate_history(self):
        practice = {}
        day = date(2026, 9, 8)
        first = record_session(practice, self.payload(), day, 1)
        second = record_session(practice, self.payload(), day, 2)
        self.assertEqual(first, second)
        self.assertEqual(len(practice["sessions"]), 1)
        self.assertEqual(practice["questions"]["sm01"]["attempts"], 1)

    def test_conflicting_session_id_rejected(self):
        practice = {}
        day = date(2026, 9, 8)
        record_session(practice, self.payload(), day, 1)
        changed = self.payload(answers=[{"question_id": "sm01", "choice": 0}])
        before = copy.deepcopy(practice)
        with self.assertRaises(ValueError): record_session(practice, changed, day, 2)
        self.assertEqual(practice, before)

    def test_mistake_repaired_and_spaced_review_scheduled(self):
        practice = {}
        day = date(2026, 9, 8)
        record_session(practice, self.payload(), day, 1)
        self.assertFalse(practice["questions"]["sm02"]["last_correct"])
        self.assertEqual(practice["questions"]["sm02"]["review_due"], "2026-09-09")
        record_session(practice, self.payload(session_id="second-session", answers=[{"question_id":"sm02","choice":2}]), day, 2)
        self.assertTrue(practice["questions"]["sm02"]["last_correct"])
        self.assertEqual(practice["questions"]["sm02"]["review_due"], "2026-09-11")
        self.assertEqual(practice["days"]["2026-09-08"], ["sat"])

    def test_empty_timed_session_cannot_earn_streak(self):
        practice = {}
        record_session(practice, self.payload(answers=[{"question_id":"sm01","choice":None}]), date(2026,9,8), 1)
        self.assertFalse(practice.get("days"))

    def test_history_bounded_and_legacy_data_preserved(self):
        practice = {"days":{"2026-09-07":["ielts"]},"drafts":{"speaking":{"content":"keep me"}}}
        for i in range(70):
            record_session(practice,self.payload(session_id=f"session-{i}"),date(2026,9,8),i)
        self.assertEqual(len(practice["sessions"]),60)
        self.assertEqual(practice["drafts"]["speaking"]["content"],"keep me")
        self.assertEqual(practice["days"]["2026-09-07"],["ielts"])

    def test_separate_users_do_not_share_practice(self):
        first, second = {}, {}
        record_session(first,self.payload(),date(2026,9,8),1)
        self.assertEqual(second,{})


if __name__ == "__main__": unittest.main()
