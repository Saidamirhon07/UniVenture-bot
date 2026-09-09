import unittest

from backend.launch_links import build_mini_app_url


class TelegramLaunchLinkTests(unittest.TestCase):
    def test_plain_launcher_uses_exact_configured_url(self):
        self.assertEqual(build_mini_app_url("https://example.app/"), "https://example.app")

    def test_shortcuts_use_client_only_fragment(self):
        self.assertEqual(build_mini_app_url("https://example.app", screen="sat"), "https://example.app#screen=sat")
        self.assertEqual(build_mini_app_url("https://example.app", upgrade=True), "https://example.app#upgrade=premium")

    def test_existing_fragment_is_preserved(self):
        self.assertEqual(
            build_mini_app_url("https://example.app#campaign=launch", screen="ielts"),
            "https://example.app#campaign=launch&screen=ielts",
        )


if __name__ == "__main__":
    unittest.main()
