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

    def test_start_keyboard_has_one_direct_web_app_button(self):
        launcher = self.functions["main_menu_keyboard"]
        self.assertIn("rows = [[KeyboardButton(BTN_HUB, web_app=WebAppInfo(url=MINI_APP_URL))]]", launcher)
        self.assertNotIn("BTN_FREE_CHECK", launcher)
        self.assertNotIn("BTN_TRY_SAT", launcher)
        self.assertNotIn("BTN_TRY_IELTS", launcher)
        self.assertNotIn("BTN_PREMIUM", launcher)

    def test_old_text_launcher_remains_compatible(self):
        shortcut = self.functions["mini_app_shortcut"]
        self.assertIn("BTN_HUB: ('', False, 'UniVentureAI')", shortcut)


if __name__ == "__main__":
    unittest.main()
