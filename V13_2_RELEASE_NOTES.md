# Premium V13.2 — Reliable Telegram shortcuts

## Why V13.1 was not enough

On the tested Telegram iPhone flow, Web App keyboard buttons using alternate URLs could open the Mini App without signed Telegram authentication. The base **Open UniVentureAI** URL continued to authenticate correctly.

## New shortcut flow

1. The user taps **Free Check**, **Try SAT**, **Try IELTS**, or **Premium**.
2. The bot stores a private, one-time destination for that Telegram user for up to 10 minutes.
3. The bot replies with an **Open ...** button that uses the exact trusted base Mini App URL.
4. After normal Telegram authentication, the app consumes the destination and opens the requested screen.

This deliberately adds one confirmation tap. It removes the alternate Web App URL that caused the production authentication failure.

## Safety and compatibility

- Launch intents are user-bound, expire after 10 minutes, allow only public destinations, and are consumed once.
- Concurrent intent writes are locked and saved atomically.
- No database migration and no new required Railway variables.
- The default intent file is `/data/launch_intents.json`, using the existing Railway volume.
- Payment approval, free limits, analytics, profiles, and Premium entitlements are unchanged.

## Verification

- TypeScript and Vite production builds passed.
- 37 runnable Python tests passed; 8 API tests were skipped because FastAPI is unavailable in this build environment.
- 8 JavaScript practice-selection checks passed.
- Tests cover expiry, one-time consumption, user isolation, invalid destinations, and concurrent intent writes for 100 users.
- A live Telegram test remains required because only Telegram can supply signed Mini App authentication data.
