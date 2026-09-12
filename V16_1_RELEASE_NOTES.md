# UniVentureAI V16.1 — Complete Activities Review

V16.1 contains the full V16 document-review release plus a larger EC Evaluation workspace.

## What changed

- The EC chart now uses **Leadership & Initiative** instead of Ownership.
- EC Evaluation has **One activity** and **Full activities list** modes.
- Full-list mode accepts typed/pasted activities or one PDF, DOCX, TXT or Markdown file.
- Premium students can load up to 10 activities already saved in Profile.
- Typed content is preserved when students switch between the two review modes.
- Full-list results include an overall radar chart, portfolio story, balance, strongest activity, biggest gap, ordering strategy, one review card per recognized activity, truthful description rewrites and a recommended order.
- The AI prompt explicitly requires every distinct activity to be reviewed and forbids invented roles, results, dates, awards and numbers.
- If the AI omits the activity-by-activity section, the server requests one corrected result before returning an error.
- Older AI output using “Ownership” is renamed to “Leadership & Initiative” before display.

## Verification

- Production TypeScript/Vite build passed.
- Python compilation passed.
- 72 Python tests were discovered: 56 passed and 16 API integration tests were skipped because this environment does not contain FastAPI test dependencies.
- Prompt tests confirm that single and full-list EC reviews have different result contracts.
- Frontend result tests confirm the activity review cards and Leadership & Initiative label render.
- Live Telegram, AI and browser-device checks remain required after deployment.

No Railway variables or database migration are required. Existing profiles, payments, analytics, question banks and `/data` contents are preserved.
