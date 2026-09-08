# UniVentureAI Premium V9 — Paid Launch

## What changed

- Unpaid users now see one focused Pro screen before onboarding or product navigation.
- Backend read and write routes for product content use the paid-access dependency; unpaid sessions retain only authentication, status, checkout and support access.
- The Mini App creates a recurring 30-day Telegram Stars invoice tied to the authenticated Telegram user.
- `/pay` creates the same Stars checkout inside the bot.
- Pre-checkout validates the user, `XTR` currency, plan payload and configured price.
- Access is granted only after Telegram sends `successful_payment`.
- Telegram charge IDs are stored in the existing `/data/paid_users.json` record. Duplicate updates are idempotent.
- Renewals extend the current paid period. Existing paid users and saved work remain compatible.
- `/terms`, `/paysupport`, `/mysub`, user `/cancel`, and admin `/refundstars <user_id> <charge_id>` are available.
- Telegram `start` parameters save a first-touch campaign source, and admin `/sales` reports 1-, 7- and 30-day Stars sales by source.
- `FREE_TRIAL_DAYS=0` makes the product paid-only. `TELEGRAM_STARS_PRICE=799` is the launch default.

## Why Stars

UniVentureAI sells digital access inside Telegram. Telegram requires digital goods and services sold in bots and Mini Apps to use Telegram Stars (`XTR`). Click, Payme and card checkout should be reserved for a future standalone website outside the Telegram app.

## Storage and migration

No database migration is required. Payment history is added as `payments` inside each existing paid-user record. Keep the same Railway volume at `/data` and the same `PAID_DB_PATH=/data/paid_users.json`.

Setting `FREE_TRIAL_DAYS=0` ends access for existing trial-only users at the next subscription check. Existing users with a future `expires_at` remain active.

## Verification completed

- TypeScript and Vite production build passed.
- Python compilation passed.
- Billing, auth, product-flow and practice unit tests passed.
- Invoice payload binding, wrong-user rejection, wrong-currency rejection, wrong-amount rejection and renewal expiry behavior are covered.

## Required live acceptance

The supplied environment cannot make a real Telegram payment. Before marketing, run one end-to-end transaction in Telegram's test environment or a separate staging bot. Confirm invoice opening, pre-checkout, automatic activation, app refresh, renewal metadata, `/mysub`, support and refund. A successful local build does not prove that Telegram accepted a real transaction.
