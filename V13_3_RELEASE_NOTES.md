# Premium V13.3 — Correct Telegram authentication launch

## Root cause

The persistent **Open UniVentureAI** control was a reply-keyboard `web_app` button. Telegram documents reply-keyboard Mini Apps mainly as data-input interfaces, while Mini Apps launched from inline buttons receive the user and session information required for authenticated web services.

## Fix

- Removed every reply-keyboard Web App launcher, including **Open UniVentureAI**.
- Reply-keyboard controls now send ordinary bot actions.
- The bot responds with a secure inline **Open ...** button using the exact configured Mini App URL.
- Updated Telegram's official Web App script from version 59 to version 63.
- Added a fallback reader for Telegram's signed `tgWebAppData` launch parameter.
- The backend still validates the signature, age, and user before issuing a session.
- Development authentication remains unavailable in production when `DEV_AUTH_BYPASS=0`.

## User flow

1. Tap **Open UniVentureAI**, **Free Check**, **Try SAT**, **Try IELTS**, or **Premium**.
2. Tap the secure inline **Open ...** button sent by the bot.
3. Telegram provides signed authentication and the app opens the correct destination.

## Verification

- TypeScript and Vite production builds passed.
- 37 runnable Python tests passed; 8 integration tests were skipped because FastAPI is unavailable in this build environment.
- 8 JavaScript checks passed.
- Static verification confirms no reply-keyboard Web App launchers remain.
- User-bound launch intents passed one-time, expiry, invalid-destination, isolation, and 100-concurrent-user tests.
- A real Telegram acceptance test is required after deployment.
