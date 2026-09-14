import ast
import unittest
from pathlib import Path


class BotLauncherTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = Path(__file__).resolve().parents[1].joinpath("AIBOT.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        cls.functions = {
            node.name: ast.unparse(node)
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

    def test_start_message_has_one_direct_web_app_button(self):
        launcher = self.functions["start_app_button"]
        self.assertIn("InlineKeyboardMarkup", launcher)
        self.assertIn("InlineKeyboardButton(BTN_HUB, web_app=WebAppInfo(url=MINI_APP_URL))", launcher)

    def test_previous_menu_shortcuts_are_preserved(self):
        menu = self.functions["main_menu_keyboard"]
        self.assertIn("BTN_FREE_CHECK", menu)
        self.assertIn("BTN_TRY_SAT", menu)
        self.assertIn("BTN_TRY_IELTS", menu)
        self.assertIn("BTN_PREMIUM", menu)

    def test_start_handler_attaches_in_chat_button(self):
        start = self.functions["start"]
        self.assertIn("reply_markup=start_app_button()", start)

    def test_old_text_launcher_remains_compatible(self):
        shortcut = self.functions["mini_app_shortcut"]
        self.assertIn("BTN_HUB: ('', False, 'UniVentureAI')", shortcut)


if __name__ == "__main__":
    unittest.main()
