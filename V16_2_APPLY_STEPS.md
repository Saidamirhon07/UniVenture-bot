# Apply UniVentureAI V16.2

Download `UniVentureAI_V16_2_Copyable_AI_Results_2026-09-12.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V16_2_Copyable_AI_Results_2026-09-12.zip -d .

ls frontend/src/components/ResultPanel.tsx
git diff --check

npm --prefix frontend ci
npm --prefix frontend run build
node frontend/scripts/test-review.cjs
node frontend/scripts/test-practice.cjs
```

Commit and deploy:

```bash
git add backend frontend/src frontend/scripts frontend/qa tests README.md V16_APPLY_STEPS.md V16_RELEASE_NOTES.md V16_1_APPLY_STEPS.md V16_1_RELEASE_NOTES.md V16_2_APPLY_STEPS.md V16_2_RELEASE_NOTES.md
git status
git diff --cached --stat
git commit -m "Add copy controls to AI results"
git push origin admissions-mini-app
```

Railway should deploy automatically. No Railway variable changes are needed.

After deployment, generate a Rewrite result and test **Copy** beside Elevated Version. Paste it into Telegram Notes to verify the complete rewrite was copied. Also test **Copy full feedback**, an EC rewritten description and one SAT or IELTS result on iPhone and Android. If a device blocks automatic copying, the button displays **Select manually** and the response remains selectable.
