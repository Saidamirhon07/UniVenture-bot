# UniVentureAI V13.4 — Balanced Freemium

## What changed

- Venture is visible to free and Premium users inside the Mini App.
- Free users receive 3 general Venture questions per Tashkent day.
- Premium Venture remains profile-aware and unlimited.
- Free Venture usage is enforced on the server and failed AI calls restore the allowance.
- Every free account receives 1 complete Essay Review as a lifetime sample.
- Detailed essay reviews and AI revisions remain Premium.
- SAT and IELTS now have separate daily allowances: 3 SAT plus 3 IELTS questions per day.
- The free rotating pool now exposes up to 5 questions per supported section, reducing repetition.
- Existing Premium access, profiles, payments, receipt approval, analytics and saved practice are preserved.

## Freemium boundary

| Capability | Free | Premium |
|---|---|---|
| Venture copilot | 3 general questions/day | Unlimited and profile-aware |
| Essay Review | 1 complete review/account | Unlimited reviews and revisions |
| SAT | 3 questions/day | Unlimited modes and history |
| IELTS | 3 questions/day | Unlimited modes, writing, speaking and history |
| Saved profile and roadmap | Locked | Included |

The limits are checked by the backend. Changing frontend code or calling an endpoint directly does not unlock Premium access.

## Verification completed

- Frontend TypeScript production build passed.
- 42 executable Python tests passed; 9 API integration tests were included but skipped because FastAPI is not installed in this workspace runtime.
- 8 practice-selection checks passed.
- Python compilation passed.

## Still required before public traffic

Run the live acceptance steps in `V13_4_APPLY_STEPS.md` using one new free Telegram account and one Premium/admin account. A real Telegram session, real OpenAI response and real manual payment approval cannot be simulated by the local code tests.
