import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from backend import legacy


class ManualPaymentDeliveryTests(unittest.IsolatedAsyncioTestCase):
    def _bot(self, *, active: bool):
        send_message = AsyncMock()
        return SimpleNamespace(
            payment_details_configured=MagicMock(return_value=True),
            manual_payment_session_active=MagicMock(return_value=active),
            begin_manual_payment_session=MagicMock(),
            _payment_instructions_text=MagicMock(return_value="Payment details"),
            main_menu_keyboard=MagicMock(return_value="menu"),
            app=SimpleNamespace(bot=SimpleNamespace(send_message=send_message)),
        )

    async def test_first_tap_starts_session_and_sends_details(self):
        bot = self._bot(active=False)
        with patch.object(legacy, "module", return_value=bot):
            started = await legacy.start_manual_payment(42)
        self.assertTrue(started)
        bot.begin_manual_payment_session.assert_called_once_with(42)
        bot.app.bot.send_message.assert_awaited_once()

    async def test_repeat_tap_resends_details_during_active_session(self):
        bot = self._bot(active=True)
        with patch.object(legacy, "module", return_value=bot):
            started = await legacy.start_manual_payment(42)
        self.assertFalse(started)
        bot.begin_manual_payment_session.assert_called_once_with(42)
        bot.app.bot.send_message.assert_awaited_once_with(
            chat_id=42,
            text="Payment details\n\n📷 <b>Now upload your payment screenshot in this chat.</b>\nReceipt mode stays active for 30 minutes.",
            parse_mode="HTML",
            reply_markup="menu",
        )


if __name__ == "__main__":
    unittest.main()
