# Apply Premium V13

## Install and deploy

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V13_App_First_Market_Release_2026-09-09.zip -d .

git rm --ignore-unmatch frontend/src/components/PaywallScreen.tsx
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3' ':!qa-v4' ':!qa-v12-mobile' ':!qa-v13'
git status
git commit -m "Ship app-first Telegram launch experience"
git push origin admissions-mini-app
```

Local `npm` is not required; Railway runs the frontend build.

## Railway variables

Keep all existing variables and confirm:

```dotenv
APP_ONLY_MODE=1
PAYWALL_ENABLED=1
FREE_TRIAL_DAYS=0
DEFAULT_SUB_DAYS=30
FREE_PRACTICE_QUESTIONS_PER_DAY=3
AI_MAX_CONCURRENCY=10
RUN_TELEGRAM_BOT=1
```

The real `PAYMENT_CARD`, `PAYMENT_CARD_HOLDER`, `PAYMENT_BANK`, `SUPPORT_HANDLE`, and `ADMIN_IDS` values must already be configured. Never leave `YOUR_REAL_...` examples in Railway.

Keep Railway Root Directory blank and keep the existing volume mounted at `/data`.

## Production acceptance test

1. Send `/start` from a free test account. Confirm the old nine-button keyboard is replaced by five app-first buttons.
2. Tap **Open UniVentureAI** and confirm Home opens.
3. Reset or use a new account. Enter a name and confirm the blue **Continue** button is visible and works without pressing keyboard Enter.
4. Tap **Free Check**, **Try SAT**, and **Try IELTS** from Telegram and confirm each opens the intended screen.
5. Tap **Premium** and confirm the upgrade sheet opens for a free account.
6. Start payment and confirm the bot displays the compact instructions and waits for a receipt.
7. Upload a receipt, approve it as admin, and confirm the user receives an **Open UniVentureAI** button and Premium unlocks.
8. Send ordinary text to the bot as a student and confirm it redirects to the Mini App instead of opening legacy chatbot menus.
9. Confirm `/stats`, `/sales`, and approval buttons still reject non-admin users.
10. Confirm Founder Pulse records the new app open and payment funnel events.

Do not invite public users until all ten steps pass on the production bot.

