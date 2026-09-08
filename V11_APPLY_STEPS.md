# Apply Premium V11

## 1. Extract into the repository

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status
unzip -o ~/Desktop/UniVentureAI_Premium_V11_Manual_Card_Analytics_2026-09-08.zip -d .
```

## 2. Verify and test

```bash
ls backend/analytics.py
ls frontend/src/components/PaywallScreen.tsx
ls frontend/src/screens/FounderAnalyticsScreen.tsx
git diff --check

cd frontend
npm ci
npm run build
cd ..
python3 -m unittest discover -s tests -v
python3 -m compileall -q AIBOT.py backend tests
```

## 3. Commit and deploy

```bash
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git diff --cached --stat
git commit -m "Add manual UZS card payments and admin approval"
git push origin admissions-mini-app
```

Press `q` if Terminal shows `(END)`.

## 4. Railway variables

```env
PAYWALL_ENABLED=1
FREE_TRIAL_DAYS=0
DEFAULT_SUB_DAYS=30
PAYMENT_PRICE_UZS=199000
PAYMENT_CARD=8600 0000 0000 0000
PAYMENT_CARD_HOLDER=YOUR FULL NAME
PAYMENT_BANK=YOUR BANK
PAYMENT_BOT_USERNAME=YourActualBotUsername
PAYMENT_NOTE=Send a clear screenshot showing the completed transfer.
SUPPORT_HANDLE=@UniVentureSupport_bot
ADMIN_IDS=886181760
DATA_DIR=/data
PAID_DB_PATH=/data/paid_users.json
PRODUCT_ANALYTICS_PATH=/data/product_analytics.json
```

Replace every example with your real details. `PAYMENT_BOT_USERNAME` is the username of this same UniVentureAI bot, without `@`. Keep Railway Root Directory blank and keep the existing `/data` volume.

## 5. Live acceptance test

1. Open the Mini App from a non-admin Telegram account and confirm it is locked.
2. Confirm the card, cardholder, bank and `199,000 UZS` price are correct.
3. Tap **Send payment receipt** and send a test screenshot.
4. Confirm the admin receives the receipt plus Approve/Reject buttons and the student's identity.
5. Check the actual bank transfer, then tap **Approve 30 days**.
6. Return to the Mini App and tap **Check approval status**; the app should unlock.
7. Open Founder Pulse from the admin account and verify active paid users and UZS revenue.
8. Repeat with another test request and tap **Reject**; access must remain locked.

