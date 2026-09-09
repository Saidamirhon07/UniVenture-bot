# Apply Premium V13.3

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V13_3_Correct_Telegram_Authentication_2026-09-09.zip -d .

git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3' ':!qa-v4' ':!qa-v12-mobile' ':!qa-v13' ':!qa-v13-1' ':!qa-v13-2'
git status
git diff --check
git commit -m "Fix Telegram Mini App authentication launch"
git push origin admissions-mini-app
```

Local `npm` is not required. Railway builds the frontend.

## Railway checks

Keep the existing variables and confirm:

```dotenv
DEV_AUTH_BYPASS=0
RUN_TELEGRAM_BOT=1
```

`MINI_APP_URL` must be the exact public Railway HTTPS origin, with no Telegram link and no extra route. Keep the Root Directory blank and `/data` volume mounted.

## Live acceptance test

After Railway reports **Deployed**:

1. Fully close Telegram and reopen it.
2. Send `/start` to replace the old keyboard.
3. Verify **Open UniVentureAI** no longer has the small Web App square icon.
4. Tap **Open UniVentureAI**. The bot should send **Open UniVentureAI** under a new message.
5. Tap that inline button and confirm Home opens.
6. Repeat with Free Check, SAT, IELTS, and Premium.
7. Verify the opened account has the correct Telegram identity—not a shared development account.

Do not invite public users until all seven checks pass.
