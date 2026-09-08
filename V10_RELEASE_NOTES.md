# UniVentureAI Premium V10 — Founder Pulse

## Delivered

- Real Mini App activity tracking for authenticated opens and screen views.
- DAU, WAU, MAU and a daily activity graph.
- Active/ever-paid subscribers, cancellations, expired subscribers and churn.
- Visitor → checkout → confirmed payer conversion.
- Most-used tool ranking.
- SAT and IELTS completed sessions, unique students and objective-question accuracy.
- Revenue grouped by campaign source and currency.
- Admin-only Founder Pulse entry inside Tools.
- Admin-only `/stats`.
- Admin paywall bypass.

## Privacy design

The analytics file stores Telegram user ID, timestamps, allow-listed event names, screen names and coarse counts. It does not store essays, IELTS writing, test answers, profiles, chat messages, uploaded files or AI responses.

## Payment decision

Telegram Stars remain in the code because Telegram requires them for digital subscriptions sold inside bots and Mini Apps. CLICK/Payme were not falsely wired to a personal card. Automated Uzbek-card settlement requires merchant onboarding and a separate website/PWA checkout architecture.

If Stars are not wanted during this transition, set `PAYWALL_ENABLED=0`. That makes access free until a compliant website checkout is deployed.
