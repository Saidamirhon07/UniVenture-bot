# Apply Premium V12

## 1. Back up and extract

Run these commands on your Mac:

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V12_Freemium_Release_2026-09-08.zip -d .

ls frontend/src/components/UpgradeSheet.tsx
ls frontend/src/screens/FreeReadinessCheck.tsx
ls backend/analytics.py
git diff --check
```

Do not delete or replace the Railway `/data` volume. Existing users, approved subscriptions, profiles, practice history, and analytics are additive and remain compatible.

## 2. Set Railway variables

Keep all existing secret values and set or confirm:

```dotenv
PAYWALL_ENABLED=1
FREE_TRIAL_DAYS=0
DEFAULT_SUB_DAYS=30
PAYMENT_PRICE_UZS=199000
PAYMENT_CARD=YOUR_REAL_UZBEK_CARD
PAYMENT_CARD_HOLDER=YOUR_REAL_CARDHOLDER_NAME
PAYMENT_BANK=YOUR_REAL_BANK
PAYMENT_NOTE=Send a clear screenshot showing the completed transfer.
SUPPORT_HANDLE=@YOUR_SUPPORT_USERNAME
ADMIN_IDS=886181760
DATA_DIR=/data
PAID_DB_PATH=/data/paid_users.json
PRODUCT_ANALYTICS_PATH=/data/product_analytics.json
FREE_PRACTICE_QUESTIONS_PER_DAY=3
AI_MAX_CONCURRENCY=10
RUN_TELEGRAM_BOT=1
```

Replace all examples with real values. `ADMIN_IDS` can contain comma-separated numeric Telegram IDs. Do not add `PAYMENT_BOT_USERNAME`; V12 sends the prompt through the authenticated backend and does not rely on a deep link.

Keep Railway Root Directory blank and the existing volume mounted at `/data`.

## 3. Test locally if the full runtime is installed

```bash
python3 -m compileall -q AIBOT.py backend tests
python3 -m unittest discover -s tests -v
npm --prefix frontend run build
node frontend/scripts/test-practice.cjs
```

## 4. Commit and deploy

```bash
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3' ':!qa-v4'
git status
git diff --cached --stat
git commit -m "Add freemium access and direct receipt handoff"
git push origin admissions-mini-app
```

If Terminal shows `(END)`, press `q`.

## 5. Required live acceptance test

Use one unpaid test account and one configured admin account:

1. Open the Mini App and enter a preferred display name.
2. Confirm Home, Tools, Discover, and the readiness check open without payment.
3. Complete three free SAT/IELTS questions. Confirm a fourth attempt asks for Premium.
4. Tap a locked feature. Confirm the upgrade sheet appears and the protected request returns no premium data.
5. Tap **I paid — ask me for the receipt**. Confirm the Mini App closes and the bot directly sends payment instructions plus a request to upload a screenshot.
6. Send a receipt photo. Confirm every configured admin receives the photo, student identity, expected amount, source, reference, and Approve/Reject controls.
7. Check the real bank transfer, then approve. Reopen the app and confirm full profile onboarding and premium tools unlock.
8. Tap approval again and confirm the bot reports it was already reviewed without extending access or revenue.
9. Repeat with a rejected test receipt and confirm no access is granted.
10. Open Founder Pulse and run `/sales`; confirm conversion, approved UZS revenue, and campaign source update.

Do not invite public users until steps 1–10 pass on the production Telegram bot.

