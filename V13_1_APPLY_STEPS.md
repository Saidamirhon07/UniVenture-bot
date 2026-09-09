# Apply Premium V13.1

## Install and deploy

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V13_1_Routing_Spacing_Fix_2026-09-09.zip -d .

git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3' ':!qa-v4' ':!qa-v12-mobile' ':!qa-v13' ':!qa-v13-1'
git status
git diff --check
git commit -m "Fix Telegram shortcuts and practice spacing"
git push origin admissions-mini-app
```

Local `npm` is not required. Railway runs the frontend build.

No new Railway variables are needed. Keep the current variables, blank Root Directory, and `/data` volume unchanged.

## Required live check

After Railway reports **Deployed**:

1. Open the bot and send `/start` once. This refreshes the old keyboard stored by Telegram.
2. Tap **Open UniVentureAI** and confirm Home opens.
3. Close the Mini App. Tap **Free Check** and confirm the Readiness Check opens.
4. Close it. Tap **Try SAT** and confirm SAT Studio opens.
5. Close it. Tap **Try IELTS** and confirm IELTS Studio opens.
6. Close it. Tap **Premium** from a free account and confirm the upgrade sheet opens.
7. In SAT Studio, confirm a visible gap separates **Practice focus** from the purple action button.
8. Confirm the browser never shows the old raw `Not found.` message.

If an old shortcut still fails, fully close Telegram, reopen it, send `/start` again, and retest. Do not invite users until all eight checks pass.
