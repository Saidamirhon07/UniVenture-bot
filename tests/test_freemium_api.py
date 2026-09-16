"""Server-bound first-use checks. No production data or provider calls."""
import copy
import unittest
from unittest.mock import AsyncMock, patch

try:
    from fastapi.testclient import TestClient
    from backend import main
    from backend.auth import TelegramIdentity
    API_AVAILABLE = True
    API_ERROR = ""
except ImportError as exc:
    API_AVAILABLE = False
    API_ERROR = str(exc)


@unittest.skipUnless(API_AVAILABLE, "API runtime dependencies unavailable: " + API_ERROR)
class FreemiumAPITests(unittest.TestCase):
    def setUp(self):
        self.user = 404
        self.memories = {}
        self.patches = [
            patch.object(main.legacy, "load_memory", side_effect=lambda uid: copy.deepcopy(self.memories.get(uid, {}))),
            patch.object(main.legacy, "save_memory", side_effect=lambda uid, memory: self.memories.__setitem__(uid, copy.deepcopy(memory))),
            patch.object(main.legacy, "subscription_status", return_value={"has_access": True, "is_premium": False, "price_uzs": 249000}),
        ]
        for item in self.patches:
            item.start()
        main.app.dependency_overrides[main.current_identity] = lambda: TelegramIdentity(user_id=self.user, first_name="New", username="new")
        self.client = TestClient(main.app)

    def tearDown(self):
        self.client.close()
        main.app.dependency_overrides.clear()
        for item in reversed(self.patches):
            item.stop()

    def test_first_ec_result_is_free_and_second_is_payment_required(self):
        payload = {"activity": "I founded a school tutoring project and measured student progress over a full year.", "analysis_scope": "single"}
        with patch.object(main, "_run_compact_evaluation", new_callable=AsyncMock, return_value={"result": {"headline": "Good"}}) as ai:
            first = self.client.post("/api/evaluate/ec", json=payload)
            second = self.client.post("/api/evaluate/ec", json=payload)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 402, second.text)
        self.assertEqual(ai.await_count, 1)

    def test_failed_ai_call_refunds_the_free_result(self):
        payload = {"activity": "I founded a school tutoring project and measured student progress over a full year.", "analysis_scope": "single"}
        failure = main.HTTPException(status_code=503, detail="Temporary test failure")
        with patch.object(main, "_run_compact_evaluation", new_callable=AsyncMock, side_effect=[failure, {"result": {"headline": "Recovered"}}]):
            first = self.client.post("/api/evaluate/ec", json=payload)
            second = self.client.post("/api/evaluate/ec", json=payload)
        self.assertEqual(first.status_code, 503, first.text)
        self.assertEqual(second.status_code, 200, second.text)


if __name__ == "__main__":
    unittest.main()
