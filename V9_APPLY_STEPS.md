# Apply UniVentureAI V9 on Mac and Railway

## 1. Extract into the existing repository

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status
unzip -o ~/Desktop/UniVentureAI_Premium_V9_Paid_Launch_2026-09-08.zip -d .
```

Verify the new files:

```bash
ls backend/billing.py
ls frontend/src/components/PaywallScreen.tsx
ls tests/test_billing.py
git diff --check
```

## 2. Build and test

```bash
cd frontend
npm ci
npm run build
cd ..
python3 -m unittest discover -s tests -v
python3 -m compileall -q AIBOT.py backend
```

## 3. Commit and push

```bash
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git diff --cached --stat
git commit -m "Add Telegram Stars subscription and paid access"
git push origin admissions-mini-app
```

If `(END)` appears, press `q` to leave the Git pager and allow the remaining commands to continue.

## 4. Set Railway variables

Keep the existing service, branch `admissions-mini-app`, blank Root Directory and `/data` volume. Add or update:

```dotenv
PAYWALL_ENABLED=1
FREE_TRIAL_DAYS=0
DEFAULT_SUB_DAYS=30
TELEGRAM_STARS_PRICE=799
SUPPORT_HANDLE=@UniVentureSupport_bot
```

Keep the existing `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, `SESSION_SECRET`, `MINI_APP_URL`, `DATA_DIR`, `PAID_DB_PATH`, `CHROMA_PATH`, and `RUN_TELEGRAM_BOT` values.

`PAYMENT_CARD`, `PAYMENT_CLICK`, `PAYMENT_PAYME`, and `PAYMENT_PRICE_USD` are no longer used by the Telegram checkout. They can be removed after the new payment flow is accepted.

## 5. Accept the live payment flow before launch

Use Telegram's payment test environment or a separate staging bot. For a staging smoke test, use a low Stars price, then restore `799` before launch.

1. Open the Mini App as an unpaid account and confirm the Pro screen appears before onboarding.
2. Accept the terms and open checkout.
3. Complete payment and confirm the app unlocks automatically.
4. Send `/mysub` and confirm the expiry date.
5. Confirm the admin receives the payer, amount and Telegram charge ID.
6. Reopen the app and confirm access persists.
7. Test `/paysupport`, `/terms`, and `/cancel` on the staging subscription.
8. Test `/refundstars <user_id> <charge_id>` with the staging transaction and confirm access closes.
9. Open `https://t.me/YOUR_BOT_USERNAME?start=ig_test`, pay with the test account, then confirm `/sales` shows `ig_test`.

Do not wipe or replace `/data`; that volume contains users, subscriptions, memory and Chroma sources.
