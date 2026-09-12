# Apply UniVentureAI V15.1 AI Reliability Hotfix

This hotfix repairs shared AI error handling across Essay Review, EC Evaluation, Brainstorm, Rewrite, IELTS coaching, SAT coaching, recommendations, portfolio review, School Finder, Venture, and the Question Factory.

## Install

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V15_1_AI_Reliability_Hotfix_2026-09-12.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Fix shared AI reliability and diagnostics"
git push origin admissions-mini-app
```

If Terminal displays `(END)`, press `q`.

## Verify after Railway deploys

1. Wait until the new Railway deployment says **Success**.
2. Fully close and reopen UniVentureAI in Telegram.
3. In the bot, send `/health` from the account in `ADMIN_IDS`.
4. Confirm it reports `OpenAI: OK`, `Chroma: writable`, and `Volume: writable`.
5. Test Brainstorm with a short description.
6. Test EC Evaluation with at least 30 characters.
7. Test Venture and one additional AI tool.

If `/health` reports:

- `configuration`: replace `OPENAI_API_KEY` with a valid project API key, then redeploy.
- `capacity`: check that the OpenAI API project has available billing/credits and retry after updating it.
- `model_unavailable`: the app automatically attempts `gpt-4o-mini`; check the Railway logs if both models fail.
- `timeout` or `connection`: retry once, then inspect Railway networking and logs.

The OpenAI API is billed separately from a ChatGPT subscription.

## Railway variables

No new variable is required. Optional override:

```env
OPENAI_FALLBACK_MODEL=gpt-4o-mini
```

Keep the existing `OPENAI_API_KEY`, `OPENAI_FAST_MODEL`, `OPENAI_STRONG_MODEL`, `/data` volume, and all payment variables.
