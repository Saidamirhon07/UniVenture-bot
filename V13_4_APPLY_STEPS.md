# Apply UniVentureAI V13.4

## 1. Install the ZIP

Open Terminal on your Mac:

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V13_4_Balanced_Freemium_2026-09-09.zip -d .

git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Add balanced free Venture essay and exam samples"
git push origin admissions-mini-app
```

If Terminal displays `(END)`, press `q`.

## 2. Add Railway variables

Open the Railway service, choose **Variables**, then **Raw Editor** and add:

```env
FREE_COPILOT_MESSAGES_PER_DAY=3
FREE_ESSAY_EVALUATIONS=1
```

Keep these existing values:

```env
FREE_PRACTICE_QUESTIONS_PER_DAY=3
AI_MAX_CONCURRENCY=10
DEV_AUTH_BYPASS=0
DATA_DIR=/data
PAID_DB_PATH=/data/paid_users.json
PRODUCT_ANALYTICS_PATH=/data/product_analytics.json
```

Do not replace your existing Telegram token, OpenAI key, card details, admin ID, Mini App URL or session secret. Railway should redeploy after the variables are saved.

## 3. Ten-step live acceptance test

Use a Telegram account that has never paid:

1. Open UniVentureAI and confirm the Venture bubble appears.
2. Ask 3 questions and confirm the counter reaches zero.
3. Attempt a fourth question and confirm the Premium sheet opens.
4. Open Essay Review and run one valid draft through the free review.
5. Attempt a second essay and confirm the Premium sheet opens.
6. Complete 3 IELTS questions.
7. Open SAT and confirm all 3 SAT questions are still available.
8. Complete the SAT sample and confirm both limits show zero for that day.
9. Sign in as the admin/Premium user and confirm Venture says “Profile-aware copilot” and has no daily counter.
10. Submit and approve one test receipt, then confirm the user immediately receives Premium access without losing existing work.

Also open `/founder` through the admin interface and confirm activity is recorded. Do not invite public users until all ten checks pass.
