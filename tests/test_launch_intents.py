import importlib
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


class LaunchIntentTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        os.environ["LAUNCH_INTENT_PATH"] = str(Path(self.tempdir.name) / "intents.json")
        import backend.launch_intents as launch_intents
        self.module = importlib.reload(launch_intents)

    def tearDown(self):
        os.environ.pop("LAUNCH_INTENT_PATH", None)
        importlib.reload(self.module)
        self.tempdir.cleanup()

    def test_intent_is_bound_to_user_and_consumed_once(self):
        self.module.set_launch_intent(10, screen="sat", now=100)
        self.assertIsNone(self.module.consume_launch_intent(11, now=101))
        self.assertEqual(self.module.consume_launch_intent(10, now=101), {"screen": "sat", "upgrade": False})
        self.assertIsNone(self.module.consume_launch_intent(10, now=102))

    def test_expired_intent_is_rejected(self):
        self.module.set_launch_intent(10, upgrade=True, now=100)
        self.assertIsNone(self.module.consume_launch_intent(10, now=701))

    def test_unsupported_destination_is_rejected(self):
        with self.assertRaises(ValueError):
            self.module.set_launch_intent(10, screen="founder")

    def test_concurrent_users_remain_isolated(self):
        with ThreadPoolExecutor(max_workers=20) as pool:
            list(pool.map(lambda user_id: self.module.set_launch_intent(user_id, screen="ielts", now=100), range(100, 200)))
        for user_id in range(100, 200):
            self.assertEqual(self.module.consume_launch_intent(user_id, now=101), {"screen": "ielts", "upgrade": False})


if __name__ == "__main__":
    unittest.main()
