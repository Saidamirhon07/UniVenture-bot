# UniVentureAI V17 — Mission-Control Plan

V17 contains the complete V16.2 application and redesigns the student-facing Plan page around decisions instead of unexplained percentages.

## Changes

- Added a **Current chapter** hero that names the active stage and explains its purpose.
- Kept overall readiness, XP, level progress and streak together as compact supporting signals.
- Reframed Today as **Your next best move**, including its reason, effort and one direct action.
- Replaced the flat five-row list with a connected five-chapter journey.
- Each chapter now explains the outcome and has an explicit state: **Complete**, **Focus now**, **In progress**, or **Up next**.
- The active chapter is visually expanded and shows its recommended action.
- The weekly section now shows up to three tasks, including category and estimated effort.
- Added a stronger route into the detailed Application Plan builder.
- Kept the preparation disclaimer: readiness and XP are not admission probabilities.

## Compatibility

- No Railway variable changes.
- No database or `/data` migration.
- Existing profiles, plans, payments, analytics, freemium rules, question bank and Telegram flows are unchanged.

## Verification

- Production TypeScript and Vite build passed.
- Nine journey-state and XP-level checks passed.
- Existing review and practice JavaScript checks passed.
- Python compilation and the available backend test suite passed/skipped as recorded during packaging.
- Live Telegram WebView visual verification remains pending because this workspace has no compatible browser executable. Use the device checks in `V17_APPLY_STEPS.md` before inviting users.
