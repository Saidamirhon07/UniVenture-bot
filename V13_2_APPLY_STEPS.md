# Apply Premium V13.2

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V13_2_Reliable_Telegram_Shortcuts_2026-09-09.zip -d .

git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3' ':!qa-v4' ':!qa-v12-mobile' ':!qa-v13' ':!qa-v13-1' ':!qa-v13-2'
git status
git diff --check
git commit -m "Make Telegram Mini App shortcuts reliable"
git push origin admissions-mini-app
```

Local `npm` is not required. Railway performs the frontend build.

No new Railway variables are required. Keep the blank Root Directory and existing `/data` volume.

## Live acceptance test

After Railway reports **Deployed**:

1. Send `/start` to force Telegram to replace the old direct Web App keyboard.
2. Tap **Try SAT**. It should send a short bot message with **Open SAT Studio**.
3. Tap **Open SAT Studio**. SAT Studio should open without an authentication error.
4. Repeat with **Free Check**, **Try IELTS**, and **Premium**.
5. Confirm **Open UniVentureAI** still opens Home directly.
6. Confirm one user's shortcut does not change another user's destination.
7. Wait more than 10 minutes after a shortcut without opening it; Home should open instead of the expired destination.

If tapping a shortcut still immediately opens the old error page, Telegram still has the old keyboard. Fully close Telegram, reopen it, send `/start`, and verify that the four hook buttons no longer show the small Web App square icon. Do not invite users until all checks pass.
