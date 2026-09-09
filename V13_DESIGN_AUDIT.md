# V13 First-Use Audit

## Evidence

Two user-supplied iPhone screenshots were reviewed on 9 September 2026: the Telegram bot/payment state and the first-name entry state.

## Findings

1. **Bot entry — Needs improvement in the current screenshot.** Nine secondary feature buttons compete with the primary app launcher, several labels truncate, and the bot still presents itself as the main product.
2. **Payment handoff — Mixed in the current screenshot.** Receipt mode and the attachment control are understandable, but the instruction message is longer than necessary and the large legacy keyboard remains visible.
3. **Name entry — Blocked in the current screenshot.** A button exists in the source but appears nearly white on the cream card because its theme variable is undefined outside the app shell. Users therefore discover keyboard Enter by accident.
4. **Mobile completion — Accessibility risk in the current screenshot.** The visible interface does not provide a clearly perceivable next action. Keyboard-only completion is not an acceptable primary path for a touch interface.

## Implemented response

- Replaced the main keyboard with one primary launcher and four short, non-truncating app hooks.
- Added safe direct app destinations for Free Check, SAT, IELTS, and Premium.
- Converted name entry into a form with a high-contrast Continue button and explicit mobile sizing.
- Added root theme defaults, validation, loading protection, focus state, and short-height reflow.
- Shortened payment copy and refreshed the new keyboard during payment handoff.

Code-level verification is complete in the release process. Fresh rendered screenshots and touch/keyboard behavior must be verified on the production iPhone after deployment.
