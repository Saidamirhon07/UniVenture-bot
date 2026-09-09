# Premium V13.1 — Telegram shortcut and spacing hotfix

## Fixed

- Added a 14 px gap between the SAT/IELTS practice-focus selector and the primary action for free users.
- Changed Telegram hook-button destinations from server query strings to client-only URL fragments, preserving Telegram Mini App authentication.
- Added a brief production wait for Telegram's authentication bridge on slower mobile clients.
- Replaced the raw `Not found.` authentication failure with a clear close-and-reopen instruction.
- Kept all five app-first Telegram buttons and their intended destinations.

## Compatibility

- No database migration.
- No Railway variable changes.
- Payment receipts, admin approval, free limits, analytics, saved profiles, and Premium access are unchanged.

## Verification

- TypeScript project build passed.
- Vite production build passed.
- 33 runnable Python tests passed; 8 API tests were skipped because FastAPI is unavailable in this build environment.
- 8 JavaScript practice-selection checks passed.
- The 100-concurrent-user analytics write test passed.
- Live Telegram shortcut acceptance must be completed after deployment because Telegram-signed `initData` cannot be simulated by a normal browser.
