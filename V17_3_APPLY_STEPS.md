# Apply UniVentureAI V17.3

Download `UniVentureAI_V17_3_In_Chat_App_Launcher_2026-09-14.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V17_3_In_Chat_App_Launcher_2026-09-14.zip -d .

git diff --check
git add -A ':!qa' ':!qa-v2' ':!qa-v3' ':!frontend/qa/output'
git status
git commit -m "Add app launcher to Telegram start message"
git push origin admissions-mini-app
```

No Railway variables need to change. After deployment, send `/start` from a new account and confirm the large button appears directly below the welcome message and opens the Mini App in one tap.
