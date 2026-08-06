import unittest

from backend.prompts import EVALUATION_SPECS, compact_evaluation_messages


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


if __name__ == "__main__":
    unittest.main()
