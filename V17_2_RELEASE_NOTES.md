# UniVentureAI V17.2 — One-Tap App Launcher

V17.2 contains the complete V17.1 application and simplifies the Telegram `/start` experience.

## Changes

- `/start` now shows one full-width **🚀 Open UniVentureAI** keyboard button.
- Tapping it opens the authenticated Mini App directly in one tap.
- Removed the Free Check, SAT, IELTS and Premium shortcut buttons from the bot keyboard; those destinations remain available inside the Mini App.
- Old shortcut messages remain supported for compatibility.
- The persistent Telegram menu button and payment/receipt commands remain unchanged.

## Compatibility and verification

- No Railway variables, database changes or `/data` migration.
- Production frontend build, Python compilation and backend regression tests pass.
- Confirm the native button size and one-tap launch in the production Telegram client after Railway deploys.
