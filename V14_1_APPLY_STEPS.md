# Apply UniVentureAI V14.1

This hotfix makes the Reviewed Question Factory immediately visible to the founder and adds clear spacing between the Tools search field and the founder card.

## Install

Open Terminal and run:

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V14_1_Visible_Question_Factory_2026-09-09.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Make founder question factory easy to find"
git push origin admissions-mini-app
```

If Terminal displays `(END)`, press `q`.

## Verify after Railway succeeds

1. Fully close the Mini App and reopen it from the bot.
2. Open **Tools** as the account listed in `ADMIN_IDS`.
3. Confirm there is visible space below Search.
4. Confirm the private card says **Analytics & Question Factory**.
5. Open the card and confirm **Reviewed Question Factory** is the first panel.
6. Confirm a non-admin account cannot see the founder card or call founder endpoints.

If the card still says **Open growth analytics**, Railway is serving an older commit. Check that the latest deployment succeeded, then close and reopen Telegram to clear the cached Mini App.
