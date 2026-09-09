# V13.4.1 — Free Essay Route Fix

This hotfix corrects two frontend gates left in V13.4:

- Essay Review is now included in the free-screen allowlist.
- The Tools directory labels Essay Review as `FREE SAMPLE` rather than `PREMIUM`.

The server still allows exactly one completed free Essay Review per account. A second review, detailed follow-up review, or AI revision opens Premium.

## Install

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V13_4_1_Free_Essay_Fix_2026-09-09.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git commit -m "Fix free Essay Review route"
git push origin admissions-mini-app
```

No Railway variable changes are required if `FREE_ESSAY_EVALUATIONS=1` is already present.
