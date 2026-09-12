import unittest

from backend.prompts import EVALUATION_SPECS, compact_evaluation_messages, free_copilot_messages


class PromptContractTests(unittest.TestCase):
    def test_each_compact_evaluation_has_unique_section_keys(self):
        key_sets = [tuple(key for key, _ in spec["keys"]) for spec in EVALUATION_SPECS.values()]
        self.assertEqual(len(key_sets), len(set(key_sets)))

    def test_personal_and_supplemental_prompts_are_distinct(self):
        personal = compact_evaluation_messages("essays_personal", "x" * 100, "memory", "", {})[0]["content"]
        supplemental = compact_evaluation_messages("essays_supplemental", "x" * 100, "memory", "", {})[0]["content"]
        self.assertIn("vulnerability", personal)
        self.assertIn("school fit", supplemental)
        self.assertNotEqual(personal, supplemental)

    def test_free_copilot_explicitly_has_no_saved_profile(self):
        messages = free_copilot_messages("How do I start?", "home", [])
        self.assertIn("do not have access", messages[0]["content"])
        self.assertNotIn("portfolio", messages[-1]["content"])

    def test_extracurricular_single_and_full_list_contracts_are_distinct(self):
        single = compact_evaluation_messages(
            "extracurriculars", "One activity with evidence", "", "", {"analysis_scope": "single"}
        )[0]["content"]
        portfolio = compact_evaluation_messages(
            "extracurriculars", "Several activities with evidence", "", "", {"analysis_scope": "portfolio"}
        )[0]["content"]
        self.assertIn("Leadership & Initiative", single)
        self.assertNotIn("\"activity_reviews\"", single)
        self.assertIn("\"activity_reviews\"", portfolio)
        self.assertIn("\"recommended_order\"", portfolio)
        self.assertIn("every clearly distinct activity", portfolio)
        self.assertIn("Portfolio Balance", portfolio)


if __name__ == "__main__":
    unittest.main()
