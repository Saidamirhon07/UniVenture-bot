# UniVentureAI V8 — Verification status

## Scope and consent

The user requested a richer Home and stronger SAT/IELTS flows, then approved a code-tested deliverable with browser verification pending after the Chromium download was blocked by network policy (HTTP 403). No current screenshot-based audit or pixel comparison is claimed.

The available source at the beginning of this pass was the V6 simplified frontend. V8 builds on that source and the existing cream/navy/cobalt/teal/gold visual system. Earlier V3 screenshots are historical, not evidence for V8.

## Code checks completed

- TypeScript check and Vite production build: passed.
- Python compilation: passed.
- Python unit tests: 21 passed (including original auth/routing/prompt tests and 11 practice-engine tests).
- JavaScript practice-selection checks: 8 passed.
- Browser smoke-runner syntax: passed.
- Original question inventory: 24 SAT, 6 IELTS Reading, 6 IELTS Listening.
- Original workbench prompts: 2 Academic Task 1, 3 Task 2, 3 Speaking Part 2.
- Catalog inventory preserved: 36 opportunities and 30 universities.
- New practice save routes use the existing active-access dependency; history/library uses authentication.
- Existing bot, requirements, Dockerfile and Railway configuration are unchanged.

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
