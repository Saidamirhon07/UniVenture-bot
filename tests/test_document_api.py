"""Multipart API checks. No real provider calls or production data."""
import unittest
from unittest.mock import AsyncMock, patch
from test_documents import pdf_fixture
try:
    from fastapi.testclient import TestClient
    from backend import main
    from backend.auth import TelegramIdentity
    API_AVAILABLE=True
    API_ERROR=''
except ImportError as exc:
    API_AVAILABLE=False
    API_ERROR=str(exc)

@unittest.skipUnless(API_AVAILABLE, 'API dependencies unavailable: '+API_ERROR)
class DocumentAPITests(unittest.TestCase):
    def setUp(self):
        self.identity=TelegramIdentity(user_id=101,first_name='Fixture',username='fixture')
        main.app.dependency_overrides[main.current_identity]=lambda:self.identity
        self.client=TestClient(main.app)
        self.premium=patch.object(main.legacy,'subscription_status',return_value={'is_premium':True})
        self.premium.start()
    def tearDown(self):
        self.client.close();main.app.dependency_overrides.clear();self.premium.stop()
    def send(self, target='/api/evaluate/ec', filename='work.txt', content=b'Evidence of initiating a useful school project and its outcomes.', payload='{}'):
        return self.client.post('/api/files/analyze',data={'target':target,'payload':payload},files={'file':(filename,content)})
    def test_file_submits_server_text_not_hidden_draft(self):
        with patch.object(main,'evaluate_ec',new_callable=AsyncMock,return_value={'result':{}}) as handler:
            response=self.send(payload='{"activity":"hidden draft"}')
        self.assertEqual(response.status_code,200,response.text)
        self.assertIn('Evidence of',handler.call_args.args[0].activity)
        self.assertNotIn('hidden draft',handler.call_args.args[0].activity)
        self.assertIsNone(main.current_document.get())
    def test_pdf_is_attached_during_handler_and_reset_after_failure(self):
        async def fail(payload, identity):
            self.assertIsNotNone(main.current_document.get().pdf_data)
            raise main.HTTPException(status_code=503,detail='Temporary fixture error')
        with patch.object(main,'evaluate_ec',side_effect=fail):
            response=self.send(filename='work.pdf',content=pdf_fixture())
        self.assertEqual(response.status_code,503)
        self.assertIsNone(main.current_document.get())
    def test_authentication_required(self):
        main.app.dependency_overrides.clear()
        self.assertEqual(self.send().status_code,401)
    def test_premium_cannot_be_bypassed_by_multipart(self):
        with patch.object(main.legacy,'subscription_status',return_value={'is_premium':False}):
            self.assertEqual(self.send().status_code,402)
    def test_free_essay_routes_through_existing_allowance_handler(self):
        with patch.object(main.legacy,'subscription_status',return_value={'is_premium':False}), patch.object(main,'evaluate_essay',new_callable=AsyncMock,side_effect=main.HTTPException(status_code=402,detail='Free allowance used')) as handler:
            result=self.send(target='/api/evaluate/essay',content=b'A real student essay. '*10,payload='{"essay_type":"personal_statement"}')
        self.assertEqual(result.status_code,402)
        handler.assert_awaited_once()
    def test_invalid_files_and_targets_never_reach_ai(self):
        with patch.object(main,'evaluate_ec',new_callable=AsyncMock) as handler:
            for args in [{'target':'/api/admin/analytics'},{'filename':'bad.exe'},{'content':b''},{'payload':'[]'},{'payload':'not json'}]:
                with self.subTest(args=args):self.assertEqual(self.send(**args).status_code,422)
            handler.assert_not_awaited()

if __name__=='__main__':unittest.main()
