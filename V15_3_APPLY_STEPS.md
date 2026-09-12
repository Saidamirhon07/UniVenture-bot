# Apply UniVentureAI V15.3 Critical AI Fix

V15.3 fixes the confirmed `NameError: name 'asyncio' is not defined` that caused AI tools to return HTTP 500 before calling OpenAI.

## 1. Install the hotfix

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V15_3_Critical_AI_Fix_2026-09-12.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Fix AI tool runtime crash"
git push origin admissions-mini-app
```

## 2. Rotate the exposed Telegram token

The Railway logs copied during diagnosis contained the bot token in request URLs. Treat it as compromised.

1. Open `@BotFather` in Telegram.
2. Use `/revoke`, select the UniVentureAI bot, and confirm.
3. Generate a new token for the same bot.
4. In Railway → service → Variables, replace `TELEGRAM_BOT_TOKEN` with the new token.
5. Redeploy and never paste the new token into messages or screenshots.

Existing profiles and subscriptions remain on `/data`. Users may need to close and reopen the Mini App because session signatures depend on the bot token when no separate `SESSION_SECRET` is configured.

## 3. Verify

After Railway says **Success**:

1. Send `/health` from the admin account.
2. Confirm fast JSON, strong JSON, Chroma, and Volume are healthy.
3. Test Brainstorm, Essay Review, and EC Evaluation.
4. Confirm Railway logs no longer print complete `api.telegram.org/bot...` request URLs.

No new Railway variable or data migration is required.
