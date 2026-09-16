# Apply UniVentureAI V18.1

V18.1 corrects the Essay Review launch credit. Download `UniVentureAI_V18_1_Essay_Free_Result_Fix_2026-09-16.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V18_1_Essay_Free_Result_Fix_2026-09-16.zip -d .

git diff --check
git add -A ':!qa' ':!qa-v2' ':!qa-v3' ':!frontend/qa/output'
git status
git commit -m "Give every user a fresh free Essay Review"
git push origin admissions-mini-app
```

No Railway variables or volume migration are required. After Railway deploys, close the Mini App completely, reopen it from the bot, and confirm **Essay Review** says **1 FREE RESULT**. Run it once; after a successful result, return to Tools and confirm it changes to **PREMIUM**.
