# UniVentureAI V10 — Verification status

## Founder analytics update

- TypeScript/Vite production build passes with the new Founder Pulse screen.
- Analytics aggregation tests cover DAU/WAU/MAU, tool views, SAT accuracy, subscriptions, churn, conversion, campaign revenue and event allow-list privacy.
- The admin-only API uses the signed Telegram identity and the same configured `ADMIN_IDS` as the bot.
- `/stats` now rejects non-admin users.
- Browser fixture coverage was updated for the dashboard. Playwright could not run in this workspace because its package was not locally resolvable, so a fresh pixel-level screenshot is not claimed.

## Paid-entry update

- Added a dedicated mobile-first Pro screen before onboarding and product navigation for accounts without access.
- Kept the decision compact: one plan, three benefit groups, proof counts, terms consent, one checkout action, access restoration and support.
- TypeScript/Vite production build passes. The Telegram `openInvoice` callback is typed and the non-Telegram fallback is explicit.
- Real Telegram checkout, renewal, cancellation and refund require the staging acceptance steps in `V9_APPLY_STEPS.md`; fixture or local browser checks cannot prove them.

## Scope and consent

The user requested a richer Home and stronger SAT/IELTS flows, then approved a code-tested deliverable with browser verification pending after the Chromium download was blocked by network policy (HTTP 403). No current screenshot-based audit or pixel comparison is claimed.

The available source at the beginning of this pass was the V6 simplified frontend. V8 builds on that source and the existing cream/navy/cobalt/teal/gold visual system. Earlier V3 screenshots are historical, not evidence for V8.

## Code checks completed

- TypeScript check and Vite production build: passed.
- Python compilation: passed.
- Python unit tests: 26 passed (including billing, auth, routing, prompts and practice engine); six API integration tests require the full runtime.
- JavaScript practice-selection checks: 8 passed.
- Browser smoke-runner syntax: passed.
- Original question inventory: 24 SAT, 6 IELTS Reading, 6 IELTS Listening.
- Original workbench prompts: 2 Academic Task 1, 3 Task 2, 3 Speaking Part 2.
- Catalog inventory preserved: 36 opportunities and 30 universities.
- New practice save routes use the existing active-access dependency; history/library uses authentication.
- Existing bot commands and Railway storage remain compatible; payment handlers and the paid-entry frontend are additive.

## Pending checks — do not treat as passed

- Six API integration tests were skipped because full Python runtime dependencies are absent here. The tests and installation steps are included.
- Playwright browser execution, fresh screenshots and visual comparison.
- Real Telegram/WebKit rendering and responsive checks at 360, 390 and 430 px.
- Real microphone permission/recording/playback and device text-to-speech availability.
- Screen-reader and keyboard flow evaluation; reduced-motion behavior and contrast measurements.
- Real AI response quality, expert scoring calibration, payment acceptance and production deployment.

## Required inspection

1. Home: verify the mission title and CTA remain readable next to the artwork, including long generated titles. Confirm action routing and reminder flow.
2. Tools: check 12 visible entries, especially the two-line Recommendation Letters label and plain-language search.
3. SAT: complete Learn and Timed sets, test timer expiry/unanswered questions/flags, simulate a save failure, retry, and reopen history.
4. IELTS: save and restore Task 1/2 and Speaking drafts; test unsaved-leave confirmation; test recording allowed/denied/unavailable and local download.
5. Reading/Listening: complete a set, review explanations, confirm transcript fallback, and revisit missed items.
6. Access: verify two accounts remain isolated and expired accounts cannot save or invoke AI.

See V8_APPLY_STEPS.md for the Mac fixture-browser runner and separate real-device acceptance checklist. Fixture screenshots are not evidence for live AI, backend persistence or payments.

Release status: code-tested release candidate; browser and full-runtime acceptance pending.

## V14.1 founder discoverability hotfix

- Source evidence: the supplied Telegram Tools screenshot shows the search field and founder card touching, and the card only advertises growth analytics.
- Implemented: 14px separation below search, an explicit **Analytics & Question Factory** founder entry, and **Reviewed Question Factory** as the first Founder Pulse panel.
- Production TypeScript build: passed.
- Live Telegram WebView capture and interaction comparison: unavailable in this session because no cloud browser is exposed.

Final result: blocked pending the six-step Telegram device check in `V14_1_APPLY_STEPS.md`.
