# UniVentureAI V18 — Free First Result

V18 changes the free tier from a small partially locked demo into a real product trial.

## Free experience

- One successful Essay Review.
- One successful EC Evaluation.
- One successful IELTS AI Feedback result.
- One Recommendation Letters result.
- One Portfolio Review.
- One School Finder result.
- One personalized Application Plan.
- One Brainstorm result and one Rewrite result.
- One SAT Coach result.
- One result from each AI Quick Check.
- Separate daily SAT and IELTS practice allowances.
- Free profile viewing, editing, file selection, draft saving, plan completion and reminders.
- Venture keeps its existing daily free-question allowance.

Full review follow-ups, AI refinements, unlimited use, timed/review practice modes and saved premium practice history remain Premium. This preserves a meaningful paid upgrade after the student has experienced the core value.

## Enforcement and reliability

- Credits are stored server-side in the existing user memory on `/data` and cannot be reset by refreshing, reinstalling Telegram or changing devices.
- Credits are independent: using IELTS does not consume SAT, and using EC Evaluation does not consume Essay Review.
- A credit is refunded when the AI call fails or returns an invalid result.
- Same-user free AI transactions are serialized to prevent double taps and concurrent tools from overwriting saved credits or results.
- Direct API calls and file uploads use the same server checks as the visible interface.
- The Tools directory reports free, daily-free and already-used states from the server.
- A `402` limit response opens the existing Premium payment sheet automatically.

## Capacity

This update adds only small counters to each user's existing JSON record. It is suitable for the current 100+ user target on the existing Railway volume; OpenAI latency and spend remain more important constraints than storage for this feature.

## Verification

- Production TypeScript/Vite build passes.
- Python compilation passes.
- 65 locally runnable backend tests pass, including new independent-credit and failed-attempt refund tests.
- 18 API/browser-dependent tests are included but skipped in this workspace because its Python runtime lacks FastAPI and no compatible Telegram browser is available.
- Real Telegram, live OpenAI, manual payment and admin approval still require the ten-step acceptance test in `V18_APPLY_STEPS.md` before public launch.
