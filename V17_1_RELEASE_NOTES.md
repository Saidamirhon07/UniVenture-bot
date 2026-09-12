# UniVentureAI V17.1 — Reliable Payment Handoff

V17.1 contains the complete V17 application and fixes the Mini App-to-bot payment handoff.

## Fix

- Every tap on **Send payment receipt** now sends the configured price, cardholder, card number, bank and receipt-upload instructions into that same student's bot chat.
- Repeated taps during an existing 30-minute receipt session resend the instructions instead of silently closing the Mini App.
- The receipt window is refreshed for 30 minutes on each successful handoff.
- Repeat taps do not create a second checkout-start analytics event while the same session remains active.

## Compatibility

- No Railway variable or `/data` migration is required.
- `PAYMENT_PRICE_UZS=249000` is read dynamically after Railway restarts.
- V17 Plan redesign and all existing product functionality are included.

## Verification

- First-tap and repeat-tap payment-delivery tests pass.
- Production frontend build passes.
- Python compilation and the complete available backend test suite pass, with API tests skipped only where the local FastAPI runtime is unavailable.
- A real Telegram acceptance check is still required because local tests cannot prove bot delivery to Telegram's production service.
