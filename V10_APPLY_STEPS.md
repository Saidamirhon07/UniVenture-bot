# Apply Premium V10

## 1. Extract into the existing repository root

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status
unzip -o ~/Desktop/UniVentureAI_Premium_V10_Founder_Analytics_2026-09-08.zip -d .
```

## 2. Verify and test

```bash
ls backend/analytics.py
ls frontend/src/screens/FounderAnalyticsScreen.tsx
ls tests/test_analytics.py
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
git commit -m "Add private founder product analytics"
git push origin admissions-mini-app
```

Press `q` if Terminal shows `(END)`.

## 4. Railway variables

Add or confirm:

```env
DATA_DIR=/data
PRODUCT_ANALYTICS_PATH=/data/product_analytics.json
ADMIN_IDS=886181760
```

Replace `886181760` with your actual numeric Telegram ID if different. Multiple admins use commas. Keep Root Directory blank and keep the existing `/data` volume.

If you do not want Telegram Stars while preparing a standalone card-payment website, use:

```env
PAYWALL_ENABLED=0
```

Do not set `PAYWALL_ENABLED=1` without a working allowed payment route.

## 5. Acceptance

1. Open the Mini App from the admin Telegram account.
2. Open Tools → **Open growth analytics**.
3. Navigate through student screens from a second account.
4. Refresh Founder Pulse and confirm DAU/tool views change.
5. Send `/stats` from a non-admin account and confirm it receives `⛔ Admin only.`
6. Confirm `/api/admin/analytics` returns `403` for the non-admin session.

Analytics begin accumulating after V10 is deployed; historical Mini App opens were not available to reconstruct.
