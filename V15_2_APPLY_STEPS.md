# Apply UniVentureAI V15.2 Structured AI Hotfix

V15.2 makes AI tool requests resilient to truncated or malformed structured responses and upgrades `/health` to test the same JSON modes used by the application.

## Install

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V15_2_Structured_AI_Hotfix_2026-09-12.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Repair structured AI responses"
git push origin admissions-mini-app
```

## Required check

After Railway says **Success**, fully close and reopen Telegram, then send `/health` from the admin account.

The new output must include both:

```text
✅ OpenAI fast JSON: OK
✅ OpenAI strong JSON: OK
```

Then test Brainstorm and EC Evaluation again. If either line fails, copy the complete `/health` result and the newest Railway log line containing `AI request failed`.

No new Railway variables or data migration are required.
