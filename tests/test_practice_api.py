"""API integration checks with in-memory users; never starts Telegram or calls AI.
Install requirements-dev.txt to run these checks when runtime packages are absent.
"""
import copy
import unittest
from datetime import date
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
class PracticeAPITests(unittest.TestCase):
    def setUp(self):
        self.user = 101
        self.paid = True
        self.memories = {}
        self.patches = [
            patch.object(main.legacy,"load_memory",side_effect=lambda uid: copy.deepcopy(self.memories.get(uid,{}))),
            patch.object(main.legacy,"save_memory",side_effect=lambda uid,memory: self.memories.__setitem__(uid,copy.deepcopy(memory))),
            patch.object(main.legacy,"subscription_status",side_effect=lambda uid:{"has_access":True,"is_premium":self.paid,"price_uzs":199000}),
            patch.object(main,"_ensure_memory",side_effect=lambda memory: ({},memory.setdefault("miniapp",{}))),
            patch.object(main,"_local_today",return_value=date(2026,9,8)),
            patch.object(main,"_track_product_event"),
        ]
        for p in self.patches: p.start()
        main.app.dependency_overrides[main.current_identity] = lambda: TelegramIdentity(user_id=self.user,first_name="Fixture",username="fixture")
        # Not used as a context manager: production lifespan must not run here.
        self.client = TestClient(main.app)
        self.payload = {"session_id":"fixture-session-001","exam":"sat","mode":"learn","seconds":20,"answers":[{"question_id":"sm01","choice":1}]}

    def tearDown(self):
        self.client.close()
        main.app.dependency_overrides.clear()
        for p in reversed(self.patches): p.stop()

    def test_auth_required(self):
        main.app.dependency_overrides.clear()
        self.assertEqual(self.client.get("/api/practice/library").status_code,401)
        self.assertEqual(self.client.post("/api/practice/session",json=self.payload).status_code,401)

    def test_save_grade_reload_and_idempotency(self):
        for _ in range(2):
            result = self.client.post("/api/practice/session",json=self.payload)
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(result.json()["session"]["correct"],1)
        library = self.client.get("/api/practice/library").json()
        self.assertEqual(len(library["sessions"]),1)
        self.assertEqual(library["records"]["sm01"]["attempts"],1)

    def test_users_are_isolated(self):
        self.client.post("/api/practice/session",json=self.payload)
        self.user = 202
        self.assertEqual(self.client.get("/api/practice/library").json()["sessions"],[])

    def test_free_access_gets_daily_sample_but_not_premium_drafts(self):
        self.paid = False
        library = self.client.get("/api/practice/library")
        self.assertEqual(library.status_code,200,library.text)
        self.assertFalse(library.json()["access"]["is_premium"])
        self.assertEqual(library.json()["access"]["daily_limit"],3)
        self.assertLessEqual(len(library.json()["questions"]),12)
        self.assertEqual(self.client.post("/api/practice/session",json=self.payload).status_code,200)
        self.assertEqual(self.client.post("/api/practice/draft",json={"key":"speaking","prompt":"Example","content":"Draft"}).status_code,402)

    def test_free_daily_practice_limit_is_server_enforced(self):
        self.paid = False
        first = {**self.payload, "answers": [{"question_id":"sm01","choice":1},{"question_id":"sm02","choice":2},{"question_id":"sm03","choice":0}]}
        self.assertEqual(self.client.post("/api/practice/session",json=first).status_code,200)
        second = {**self.payload, "session_id":"fixture-session-002", "answers":[{"question_id":"sm04","choice":0}]}
        self.assertEqual(self.client.post("/api/practice/session",json=second).status_code,402)

    def test_invalid_questions_and_boolean_answers(self):
        for answers in [[{"question_id":"unknown","choice":1}],[{"question_id":"ir01","choice":1}],[{"question_id":"sm01","choice":True}],[]]:
            result = self.client.post("/api/practice/session",json={**self.payload,"answers":answers})
            self.assertEqual(result.status_code,422,result.text)

    def test_draft_round_trip(self):
        draft = {"key":"writing_task_2","prompt":"Original prompt","content":"My private draft"}
        self.assertEqual(self.client.post("/api/practice/draft",json=draft).status_code,200)
        self.assertEqual(self.client.get("/api/practice/library").json()["drafts"][draft["key"]]["content"],draft["content"])

    def test_payment_start_sends_receipt_prompt_for_free_user(self):
        self.paid = False
        with patch.object(main.legacy, "start_manual_payment", new_callable=AsyncMock) as start_payment:
            start_payment.return_value = True
            response = self.client.post("/api/payment/start", json={})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(response.json()["started"])
        start_payment.assert_awaited_once_with(self.user)


if __name__ == "__main__": unittest.main()
