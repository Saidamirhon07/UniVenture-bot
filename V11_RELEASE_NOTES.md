# Premium V11 — Manual UZS Card Payments

## Payment flow

- The paywall shows one configured Uzbek card, cardholder, bank and UZS price.
- The student transfers the exact amount and taps **Send payment receipt**.
- The bot asks for a screenshot or document and forwards it to every configured admin.
- The admin notification includes the student's name, Telegram username, user ID, expected amount, campaign source and a unique reference.
- **Approve 30 days** records a verified UZS payment and extends access by 30 days.
- **Reject** records the decision without granting access.
- Review actions are idempotent: tapping a button twice cannot grant duplicate time or revenue.
- There is no automatic renewal. Existing profiles and saved work remain intact after access expires.

## Founder analytics

The private Founder Pulse dashboard remains admin-only and includes DAU, WAU, MAU, active/expired paid users, conversion, churn, most-used tools, SAT/IELTS completion, and approved UZS revenue by campaign.

Mini App visits are tracked even when a student does not send the bot a message. `/stats`, `/sales`, `/paidusers`, payment approval buttons, and `/activate` remain admin-only.

## Operational limit

This is a manual MVP payment process. A screenshot is evidence to review, not proof by itself. The admin must confirm the matching transfer in the banking app before approving it. Refunds must also be handled manually through the bank.

