# Apply UniVentureAI V17.1

Download `UniVentureAI_V17_1_Reliable_Payment_Handoff_2026-09-12.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V17_1_Reliable_Payment_Handoff_2026-09-12.zip -d .

git diff --check
npm --prefix frontend ci
npm --prefix frontend run build
python -m unittest tests.test_manual_payment_delivery -v

git add -A ':!qa' ':!qa-v2' ':!qa-v3' ':!frontend/qa/output'
git status
git commit -m "Fix payment details handoff to Telegram bot"
git push origin admissions-mini-app
```

No new Railway variables are required. Confirm Railway contains:

```env
PAYMENT_PRICE_UZS=249000
```

After deployment, fully close the Mini App, reopen it from the bot, accept the terms and tap **Send payment receipt** twice. Both taps should produce a fresh payment-details message in the bot chat; approving one receipt must still grant access only once.
