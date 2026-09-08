# Premium V12 — Freemium Release

## What changed

- The application no longer blocks every unpaid student at entry.
- Free students can use Home, Tools, Discover, a local 60-second readiness check, and a server-controlled sample of three SAT/IELTS questions per day.
- Profile setup, saved portfolio work, personalized roadmaps, school matching, essay/EC/recommendation evaluation, AI Coach, advanced practice, writing/speaking studios, history, and review mode require Premium.
- Locked actions open one compact upgrade sheet at the moment of intent. They no longer force every visitor through a tall paywall before the product can demonstrate value.
- The payment button calls the authenticated backend. The bot then sends a direct receipt-upload prompt to that exact Telegram user and keeps receipt mode active for 30 minutes.
- Photo and document receipts are forwarded to configured admins with the student's identity, expected price, campaign source, and unique reference.
- Approval is admin-only and idempotent. Access activates only after the admin confirms the transfer in the banking app.
- `/stats`, `/sales`, Founder Pulse, approval buttons, and activation commands remain admin-only.

## Free and Premium boundaries

| Area | Free | Premium |
|---|---|---|
| Home, Tools, Discover | Browse and use free entries | Full access |
| Readiness check | Local 60-second result | Personal roadmap and saved recommendations |
| SAT/IELTS | 3 server-enforced sample questions/day | Full bank, timed mode, review, history, writing/speaking, AI coaching |
| Profile | Preferred display name only | Full profile, portfolio, awards, projects, saved progress |
| Admissions tools | Visible with lock state | Essay, EC, recommendations, school fit, planning, Brainstorm, Rewrite, Quick Checks |
| Data after expiry | Preserved but locked | Available while entitlement is active |

The quota and protected routes are enforced by FastAPI, not only by hidden buttons. A modified browser cannot unlock premium APIs.

## Payment safety

- A receipt is evidence for manual review, not proof that money arrived.
- The admin must match the amount and sender in the banking app before tapping **Approve 30 days**.
- Repeated payment-button taps do not send repeated prompts during an active 30-minute receipt session.
- Repeated approval taps do not add time or revenue twice.
- Card number and merchant details stay in Railway variables and are not committed to Git.
- Manual UZS transfers have no automatic renewal. Refunds are handled manually through the bank.

## Capacity guardrails

- Telegram polling processes up to 32 updates concurrently.
- OpenAI calls share a configurable concurrency limit (`AI_MAX_CONCURRENCY`, default `10`) to reduce provider spikes and memory pressure.
- User memories remain separated by Telegram user ID.
- Product analytics writes are lock-protected and tested with 100 simultaneous user events.
- Practice completion uses idempotent session IDs; the free daily allowance is checked server-side.

This architecture is suitable for an initial cohort of 100+ registered users with moderate usage. It is not a guarantee of 100 simultaneous AI generations and is not a substitute for live load monitoring. If sustained simultaneous AI demand approaches the configured limit, move bot polling, API work, and durable storage to separately scaled services with a transactional database and job queue.

## Verification status

- Production React build: passed.
- JavaScript practice-selection checks: passed.
- Python compilation: passed.
- Available unit tests, including the 100-user analytics concurrency check: passed.
- API integration tests require the full development dependency set.
- Updated browser and real Telegram receipt/approval flows require the live-device checklist in `V12_APPLY_STEPS.md` before public launch.

