# Apply V16 on your Mac

This ZIP contains the complete project at its root. Use your existing UniVenture-bot repository; keep Railway's root directory blank and its /data volume attached.

## 1. Back up and apply

Save the downloaded ZIP on your Desktop. In Terminal:

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status
```

If you have uncommitted work, commit or back it up before extracting. Record the current commit for rollback:

```bash
git rev-parse HEAD
unzip -o ~/Desktop/UniVentureAI_V16_Document_Reviews_2026-09-12.zip -d .
ls backend/documents.py frontend/src/components/SubmissionInput.tsx frontend/src/components/EvaluationChart.tsx
git diff --check
```

## 2. Check locally

Use Node.js 20 or newer. If Terminal reports `npm: command not found`, install Node.js LTS before running these checks.

```bash
npm --prefix frontend ci
npm --prefix frontend run build
node frontend/scripts/test-review.cjs
node frontend/scripts/test-practice.cjs
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
python3 -m unittest discover -s tests -v
```

The complete Python run should execute the API tests without skips. Tests use synthetic data and mocked AI; they do not start Telegram or charge your AI account.

Optional browser fixture, using two Terminal windows. In the first:

```bash
npm --prefix frontend run dev
```

In the second, from the repository:

```bash
npm --prefix frontend/qa install
cd frontend/qa
npx playwright install chromium
node review-checks.mjs
cd ../..
```

Inspect frontend/qa/output/review-320.png, review-390.png and review-768.png. These checks cover Clear/Undo, the dark caret, spacing, file retry, draft preservation, chart interaction and the main evaluation tools. They use mocked responses; they do not test the deployed server.

## 3. Commit and deploy

```bash
git add backend frontend/src frontend/scripts frontend/qa/review-fixture.html frontend/qa/review-fixture.tsx frontend/qa/review-checks.mjs tests V16_APPLY_STEPS.md V16_RELEASE_NOTES.md README.md
git diff --cached --stat
git commit -m "Add separate document analysis and visual evaluation reports"
git push origin admissions-mini-app
```

Press q if Git opens a pager. This release adds no Railway variables. Preserve your real secrets, card settings, SESSION_SECRET and /data volume. Do not enable DEV_AUTH_BYPASS in production.

## 4. Live acceptance checks

1. Confirm Railway's build/deployment is successful, then close and reopen the Mini App.
2. Type in Essay Review, EC and IELTS: caret and selection should be visible. Clear must empty the field; Undo clear must restore it.
3. Select Upload file; the old text should remain available when switching back. Select a file and confirm the Analyze button has visible separation.
4. Run one short TXT and one DOCX containing a table. Confirm feedback refers to the file's content, not the hidden draft.
5. Run one short PDF containing a meaningful visual or scanned page. Confirm feedback addresses the visual accurately. Check provider cost before encouraging large files.
6. Verify a fresh free account can use its remaining free essay credit with a file; an exhausted account is blocked. EC and other Premium file tools must stay protected.
7. Retry after a simulated network failure; the attachment and typed draft must remain available. Avoid repeated paid evaluations solely to test the UI.
8. Check radar scores against their explanations; open each criterion. An old saved response may not contain a radar chart until evaluated again.
9. Check PDF follow-up text says to re-upload. Confirm filenames, profile and feedback from one user never appear for another.
10. Verify Telegram login, manual receipt approval, the existing practice quotas, portfolio loading and Venture chat still work.

If a live check fails, capture the error's reference and relevant Railway traceback with secrets removed. Restore the prior Railway deployment if needed; do not delete the /data volume. This package is code-tested, not a guarantee of device compatibility, AI accuracy or capacity for a particular number of concurrent users.
