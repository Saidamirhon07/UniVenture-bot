"""API integration checks with in-memory users; never starts Telegram or calls AI.
Install requirements-dev.txt to run these checks when runtime packages are absent.
"""
import copy
import unittest
from datetime import date
from unittest.mock import patch

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
            patch.object(main.legacy,"subscription_status",side_effect=lambda uid:{"has_access":self.paid}),
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

    def test_expired_access_blocks_practice_content_and_writes(self):
        self.paid = False
        self.assertEqual(self.client.post("/api/practice/session",json=self.payload).status_code,402)
        self.assertEqual(self.client.post("/api/practice/draft",json={"key":"speaking","prompt":"Example","content":"Draft"}).status_code,402)
        self.assertEqual(self.client.get("/api/practice/library").status_code,402)

    def test_invalid_questions_and_boolean_answers(self):
        for answers in [[{"question_id":"unknown","choice":1}],[{"question_id":"ir01","choice":1}],[{"question_id":"sm01","choice":True}],[]]:
            result = self.client.post("/api/practice/session",json={**self.payload,"answers":answers})
            self.assertEqual(result.status_code,422,result.text)

    def test_draft_round_trip(self):
        draft = {"key":"writing_task_2","prompt":"Original prompt","content":"My private draft"}
        self.assertEqual(self.client.post("/api/practice/draft",json=draft).status_code,200)
        self.assertEqual(self.client.get("/api/practice/library").json()["drafts"][draft["key"]]["content"],draft["content"])


if __name__ == "__main__": unittest.main()
