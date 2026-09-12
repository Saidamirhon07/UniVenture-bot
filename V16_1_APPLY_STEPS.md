# Apply UniVentureAI V16.1

Download `UniVentureAI_V16_1_Complete_EC_Review_2026-09-12.zip` to your Desktop.

## Apply and check

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status
git rev-parse HEAD

unzip -o ~/Desktop/UniVentureAI_V16_1_Complete_EC_Review_2026-09-12.zip -d .

ls frontend/src/screens/FocusedTools.tsx
ls frontend/src/components/EvaluationChart.tsx
ls backend/prompts.py backend/schemas.py
git diff --check
```

If `npm` is installed, verify the production frontend:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
node frontend/scripts/test-review.cjs
node frontend/scripts/test-practice.cjs
```

For the complete Python suite:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
python3 -m unittest discover -s tests -v
```

## Commit and deploy

```bash
git add backend frontend/src frontend/scripts frontend/qa tests README.md V16_APPLY_STEPS.md V16_RELEASE_NOTES.md V16_1_APPLY_STEPS.md V16_1_RELEASE_NOTES.md
git status
git diff --cached --stat
git commit -m "Add complete extracurricular portfolio review"
git push origin admissions-mini-app
```

Railway should deploy automatically. Keep its Root Directory blank and keep the existing `/data` volume and variables.

## Live checks before launch

1. Open EC Evaluation and confirm both **One activity** and **Full activities list** appear.
2. Confirm one-activity review still accepts role, hours and weeks.
3. Save at least two activities in Profile, tap **Load saved activities**, and confirm both appear without changing the saved Profile.
4. Analyze the saved list and confirm every activity has its own result card.
5. Confirm the radar chart says **Leadership & Initiative** and no result says only “Ownership.”
6. Confirm the report contains portfolio balance, strongest activity, gap and recommended order.
7. Switch back to One activity and confirm the earlier single-activity draft is still there.
8. Test one full-list PDF or DOCX and confirm file mode still works.
9. Confirm a free account cannot bypass Premium EC access by uploading a file.
10. Recheck payment receipt approval, Venture, Portfolio, Essay Review, SAT and IELTS after deployment.

If any check fails, keep the previous Railway deployment available for rollback and send the relevant Railway traceback with secrets removed.
