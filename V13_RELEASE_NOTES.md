# Premium V13 — App-First Market Release

## Telegram entry experience

- The persistent bot keyboard now contains one primary **Open UniVentureAI** button and four short hooks: **Free Check**, **Try SAT**, **Try IELTS**, and **Premium**.
- Every public keyboard button opens the Mini App. Legacy essay, EC, recommendation, portfolio, plan, school finder, and boost keyboards are no longer shown from the main menu.
- Free Check, SAT, and IELTS buttons open the matching free screen directly.
- Premium opens the contextual upgrade sheet for unpaid users.
- The Telegram menu button is renamed **Open UniVentureAI**.
- The public slash-command menu is limited to `/start`, `/pay`, `/mysub`, `/paysupport`, and `/terms`. Admin commands remain functional but are not advertised to students.
- With `APP_ONLY_MODE=1`, ordinary user messages are redirected to the Mini App. Payment receipt uploads and public payment/status commands continue to work in chat.

## First-use experience

- The name-entry control is now a semantic form with a large visible **Continue** button.
- The missing theme-variable bug that made the icon and button nearly invisible outside the app shell is fixed at the root theme level.
- The button has clear enabled, disabled, loading, focus, and pressed states.
- Names are trimmed, limited to 40 characters, and protected from duplicate submission.
- The mobile keyboard Enter/Go action remains supported, but is no longer the only obvious way forward.
- Short-height layouts move to the top instead of hiding the form beneath the mobile keyboard.

## Payment and access

- Bot payment instructions are shorter and focused on transfer, receipt upload, and verification.
- Starting payment refreshes old Telegram keyboards to the new app-first launcher.
- Approved users receive an **Open UniVentureAI** button.
- V12 freemium limits, three-question daily sample, placeholder-card guard, admin receipt verification, analytics, and concurrency protections are unchanged.

## Verification

- Production frontend build, Python compilation, available Python tests, JavaScript practice checks, and archive integrity are required before handoff.
- The supplied iPhone screenshots were audited. Final iPhone/Telegram rendering must be checked after Railway deployment because this environment has no usable cloud browser.

