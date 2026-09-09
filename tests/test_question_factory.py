import tempfile
import unittest
from pathlib import Path

from backend.question_factory import add_reviewed_batch, decide, publish_verified, published_objective, published_prompts, snapshot, validate_candidate


class QuestionFactoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "bank.json"
        self.math = {
            "prompt": "If 4x + 3 = 19, what is the value of x?",
            "skill": "Algebra",
            "level": "easy",
            "options": ["2", "3", "4", "5"],
            "answer": 2,
            "explanation": "Subtract 3 from both sides to get 4x = 16, then divide by 4, so x = 4.",
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_validated_question_requires_four_unique_options(self):
        clean, error = validate_candidate("sat_math", self.math)
        self.assertFalse(error)
        self.assertEqual(clean["exam"], "sat")
        broken = {**self.math, "options": ["1", "1", "2", "3"]}
        self.assertIsNone(validate_candidate("sat_math", broken)[0])

    def test_two_pass_review_deduplicates_before_publication(self):
        reviews = [{"index": 0, "approved": True, "confidence": 0.97, "reason": "Correct and unambiguous"}]
        first = add_reviewed_batch("sat_math", [self.math], reviews, self.path)
        second = add_reviewed_batch("sat_math", [self.math], reviews, self.path)
        self.assertEqual(first["added"], 1)
        self.assertEqual(second["duplicates"], 1)
        self.assertEqual(published_objective(self.path), [])
        self.assertEqual(publish_verified(self.path), 1)
        self.assertEqual(len(published_objective(self.path)), 1)

    def test_low_confidence_review_is_rejected(self):
        result = add_reviewed_batch("sat_math", [self.math], [{"index": 0, "approved": True, "confidence": 0.75}], self.path)
        self.assertEqual(result["rejected"], 1)

    def test_founder_can_publish_or_reject_verified_item(self):
        review = [{"index": 0, "approved": True, "confidence": 0.98}]
        add_reviewed_batch("sat_math", [self.math], review, self.path)
        item_id = snapshot(self.path)["review_queue"][0]["id"]
        self.assertTrue(decide(item_id, "publish", self.path))
        self.assertEqual(len(published_objective(self.path)), 1)
        self.assertFalse(decide(item_id, "reject", self.path))

    def test_writing_and_speaking_prompts_route_to_correct_studio(self):
        writing = {"prompt": "Some people think public transport should be free. Discuss both views and give your opinion with reasons.", "task_type": "task_2", "level": "medium"}
        speaking = {"prompt": "Describe a useful object you use every day. Explain what it is, how you use it, and why it matters. Follow-up: Why do objects become meaningful?", "task_type": "speaking", "level": "medium"}
        review = [{"index": 0, "approved": True, "confidence": 0.96}]
        add_reviewed_batch("ielts_writing", [writing], review, self.path)
        add_reviewed_batch("ielts_speaking", [speaking], review, self.path)
        publish_verified(self.path)
        prompts = published_prompts(self.path)
        self.assertEqual(prompts["writing_task_2"], [writing["prompt"]])
        self.assertEqual(prompts["speaking"], [speaking["prompt"]])
        self.assertEqual(snapshot(self.path)["categories"]["ielts_writing"]["published"], 6)


if __name__ == "__main__":
    unittest.main()
