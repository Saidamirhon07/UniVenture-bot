# V12 Payment and Access Review

## Evidence reviewed

The supplied production payment screenshot was reviewed on 8 September 2026. The current screen has a clear price, card number, benefit summary, three-step explanation, consent state, and prominent receipt action.

## Findings from the current screen

1. **Entry and context — Needs improvement.** The payment screen occupies the complete first experience, so an unpaid student cannot understand the product through use before deciding.
2. **Telegram safe area — Needs improvement.** The top headline is visibly cropped beneath the Telegram Mini App header in the supplied screenshot.
3. **Conversion path — Needs improvement.** The receipt button launches the bot but does not create a durable “waiting for receipt” state, so the bot can fall back to normal `/start` behavior.
4. **Payment details — Healthy.** Price, manual renewal, card, cardholder, benefits, and approval steps are understandable.
5. **Trust and review — Mixed.** Manual verification is disclosed, but the product needs clearer status states and server-enforced access boundaries.

## Implemented response

- Replaced the full-entry paywall with contextual upgrade sheets shown only after a locked action.
- Added a useful free tier so the product demonstrates value before asking for payment.
- Replaced the deep link with a backend-triggered bot message and persisted 30-minute receipt mode.
- Added server-enforced premium checks and a server-enforced free practice quota.
- Preserved clear UZS price, card copy, manual-renewal terms, approval status, and support access.
- Added duplicate-prompt and duplicate-approval protection.

The updated flow was code-tested, but a fresh rendered screenshot could not be captured in this environment. Visual safe-area, keyboard, close/reopen, and Telegram transition behavior remain part of the required live acceptance test.
