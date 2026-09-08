# Apply and verify UniVentureAI V8 on your Mac

## 1. Open your existing repository

In Terminal, type `cd ` (including the space), drag your outer `UniVenture-bot` folder into Terminal, and press Enter.

```bash
pwd
git status
git switch admissions-mini-app
```

If you have unfinished local changes, stop and back them up or commit the intended changes before extracting. The ZIP overwrites matching project files. It does not remove unrelated files, contain real secrets, or replace your production data.

## 2. Extract the Desktop ZIP into the repository root

```bash
unzip -o ~/Desktop/UniVentureAI_Premium_V8_Practice_Studios_2026-09-08.zip -d .
ls AIBOT.py Dockerfile railway.json
ls backend/practice.py backend/practice_bank.json
ls frontend/src/components/PracticeStudio.tsx frontend/src/components/IELTSWorkbench.tsx
ls frontend/src/data/catalogs.ts
git check-ignore -v frontend/src/data/catalogs.ts backend/practice_bank.json frontend/qa/browser-checks.mjs
```

The `git check-ignore` command should print nothing (exit code 1 here means none of these files is ignored). Files belong beside `AIBOT.py`, not inside a new nested project folder.

## 3. Run code checks

Use Node 20+ and Python 3.11.

```bash
cd frontend
npm ci
npm run build
node scripts/test-practice.cjs
cd ..
python3 -m unittest discover -s tests -v
```

The six API tests need the full Python environment. To run them, create an isolated environment if you do not already have one:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python3 -m unittest discover -s tests -v
```

Expected with all dependencies: 27 tests pass, none skipped. Tests use synthetic in-memory accounts; no live Telegram polling, paid-user file, or AI request is involved. If anything fails, stop before pushing and share the error.

## 4. Run the included browser checks

Terminal A, from the repository root:

```bash
cd frontend
npm run dev
```

Terminal B, from the same repository root:

```bash
cd frontend/qa
npm install
npx playwright install chromium
npm test
```

The runner uses synthetic API responses and the local frontend, so it needs no API key or bot token. It checks Home at 360/390/430 px, all 12 tools, EC and recommendation navigation, SAT attempt/feedback/save/history, IELTS draft saving, speaking timers and listening entry. PNGs are saved in `frontend/qa/output`.

Inspect the images for cropped labels, overlapping controls, poor contrast and excess density. The runner was syntax-checked but could not run in the supplied environment; report failures before deploying. Fixture tests do not verify the real API, microphone, AI responses, or production payments.

## 5. Review, commit and push only after checks pass

Return to the repository root first:

```bash
git diff --check
git status --short
git add frontend/src frontend/scripts frontend/qa backend tests .gitignore .dockerignore README.md UPGRADE_SUMMARY.md design-qa.md V8_APPLY_STEPS.md V8_RELEASE_NOTES.md
git diff --cached --stat
git status
```

Review the staged files; do not commit credentials, runtime data or unrelated work. Then:

```bash
git commit -m "Add creative home and persistent SAT IELTS practice studios"
git push origin admissions-mini-app
```

## 6. Railway and real-device acceptance

Use the existing service. Keep branch `admissions-mini-app`, Root Directory blank, existing variables and `/data` volume unchanged. The Dockerfile rebuilds the frontend and includes the new backend JSON bank. Do not upload the ZIP to Railway.

After deployment, check your existing `/api/health` endpoint, completely reopen the Telegram Mini App, and test on an actual phone:

1. Daily-mission routing and reminder save still work.
2. Complete a SAT set, reopen the app, and confirm the result is still in My progress.
3. Miss a question, then find it in Review; a correct retry clears its missed state.
4. Save an IELTS draft, navigate away, reopen, and confirm the text is restored.
5. Test microphone permission accepted and denied. Stop recording, play it back and download it. Audio is local only; it is not automatically transcribed.
6. Test listening audio and transcript fallback on your Telegram version.
7. Check readable, relevant feedback on real essay, EC, SAT and IELTS examples.
8. Check trial and expired accounts plus the existing payment flow. Never use synthetic fixture results as evidence that payments or AI work in production.

Keep the prior commit available for a normal Git revert if needed; do not wipe `/data`. This release candidate is not a claim of guaranteed sales, funding or test-score improvement.
