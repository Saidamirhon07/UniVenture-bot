# Apply UniVentureAI V17.2

Download `UniVentureAI_V17_2_One_Tap_App_Launcher_2026-09-14.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V17_2_One_Tap_App_Launcher_2026-09-14.zip -d .

git diff --check
git add -A ':!qa' ':!qa-v2' ':!qa-v3' ':!frontend/qa/output'
git status
git commit -m "Simplify Telegram start to one app button"
git push origin admissions-mini-app
```

No Railway variables need to change. After Railway deploys, open a private chat with the bot, send `/start`, and tap **🚀 Open UniVentureAI**. It should open the Mini App immediately without sending another bot message.
