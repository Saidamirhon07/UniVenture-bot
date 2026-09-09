# Apply V12.1 Mobile Payment Sheet Fix

This hotfix applies only after Premium V12.

## Install

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app

unzip -o ~/Desktop/UniVentureAI_V12_1_Mobile_Payment_Fix_2026-09-09.zip -d .

git add AIBOT.py backend/legacy.py frontend/src/components/UpgradeSheet.tsx frontend/src/index.css V12_1_APPLY_STEPS.md
git status
git commit -m "Fix mobile payment sheet alignment"
git push origin admissions-mini-app
```

Railway will build and deploy automatically. Local `npm` is not required.

## Required Railway correction

The values below are examples and must not appear literally in production:

```text
YOUR_REAL_UZBEK_CARD
YOUR_REAL_CARDHOLDER_NAME
YOUR_REAL_BANK
YOUR_SUPPORT_USERNAME
```

Open Railway → service → Variables and replace them with the real card, cardholder, bank, and support username. V12.1 refuses to start receipt mode when example card values are detected.

## Verify on iPhone

1. Open a Premium-locked feature.
2. Confirm the empty checkbox sits left of both consent lines without overlap.
3. Tap anywhere on the consent row and confirm the checkmark appears.
4. Confirm **Send payment receipt** becomes enabled.
5. Confirm the card shown is real—not an example value—before testing a transfer.
