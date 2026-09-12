# UniVentureAI V16 — Document Reviews & Visual Feedback

Built from V15.3, including its critical missing-asyncio fix. This is an implemented, code-tested release candidate. Live checks below must pass before treating it as verified for public use.

## Changes

- Dark text caret and blue selection highlight on writing surfaces. Native iOS selection handles remain controlled by Telegram/iOS.
- Clear and Undo clear controls on shared writing fields.
- Separate Write or paste / Upload file modes in Essay Review, EC Evaluation, IELTS coaching/workbench, Recommendation Letters, Portfolio Review, Brainstorm, Rewrite, SAT Mistake Lab and applicable Quick Checks.
- Switching input modes preserves the typed draft. File mode sends only the attachment and tool context, not the hidden draft. Failed analysis keeps the file selected for retry.
- Visible spacing before Analyze, readable error text, and keyboard focus outlines.
- Original PDFs are submitted using OpenAI's native file input. This includes PDF text and page images. DOCX analysis includes paragraphs and tables on the server; embedded artwork, text boxes and page layout are not faithfully included. Export visual work as PDF. TXT/Markdown files are decoded on the server. File contents are never pasted into the writing box.
- Limits: 5 MB per file; PDF 20 pages; text maximum also depends on each tool's existing validation (12,000–30,000 characters). Long documents are rejected with an explanation rather than silently truncated. Password-protected/corrupt files must be re-exported. DOCX decompressed contents are bounded to 20 MB.
- New compact evaluations request evidence-backed criterion scores. Results show a radar chart, exact scores, selectable explanations, all-criteria details and numbered review sections.
- Scores are approximate AI coaching judgments, not official IELTS bands, admission probabilities, or validated measurements. Missing/invalid criterion scores are marked Not assessed and do not become zeroes on a radar chart. Older saved reviews remain readable; rerun an evaluation for the new criterion breakdown.

## Data and access

- Existing free-essay allowance and Premium authorization are used for file requests as well as text. Uploading does not bypass the paywall.
- Attachments are isolated per request, including AI retries. Original bytes are transient, not retained on /data or added to Chroma. Feedback, filename and extracted readable text can be saved with the account under the existing history retention.
- PDFs must be re-uploaded for another review. Full-review/rewrite follow-ups that would lack the original page images are disabled and rejected by the server. Initial PDF analysis includes the new detailed criteria and explanations.
- Original files are sent to the AI provider during processing; this is not a claim of zero retention by the provider. Existing provider data policies apply.
- No database migration, Railway variable changes, bot-token changes or volume reset are required for this release. The bot and runtime requirements match V15.3. The default gpt-4.1 model supports PDFs; custom model overrides must support native PDF inputs.

OpenAI file-input format: https://developers.openai.com/api/docs/guides/file-inputs

## Verification performed here

- Production frontend: TypeScript and Vite build passed.
- Python syntax compilation passed.
- Python unittest discovery: 70 discovered; 55 passed, 15 API tests skipped because FastAPI runtime dependencies are unavailable here. Attempts to install those dependencies failed.
- New document tests cover original PDF bytes, DOCX table ordering, oversized/malformed files, DOCX expansion bounds, page limits, request isolation, file retention across JSON repair, and criterion prompt contracts.
- Frontend review checks passed for chart rendering/score validation and separate text/file payloads. Eight existing practice-selection checks passed.
- Browser setup blocked: Chromium download returned HTTP 403. No browser screenshots or live Telegram checks are claimed.
- No live OpenAI PDF call was made. Provider credentials, model access and costs must be checked in staging.

Included regression suites: tests/test_documents.py, tests/test_document_api.py, frontend/scripts/test-review.cjs, frontend/qa/review-checks.mjs.
