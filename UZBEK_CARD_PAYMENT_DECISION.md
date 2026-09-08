# Uzbek-card payment decision

## The selected combination is not deployable safely

The requested combination was:

- paid digital access inside a Telegram Mini App;
- CLICK and Payme instead of Telegram Stars;
- settlement to an ordinary personal Uzbek card.

Telegram requires Stars for digital goods and subscriptions sold inside Telegram apps. CLICK and Payme website integrations also require merchant onboarding and settle business collections through their merchant infrastructure, not an arbitrary personal-card transfer embedded as an automated subscription.

## Valid routes

### Route A — keep the Telegram Mini App

Use Telegram Stars. This is already implemented in V9/V10 and activates access automatically.

### Route B — accept UZCARD/HUMO in UZS

1. Register as self-employed, an individual entrepreneur, or a company as accepted by the chosen provider.
2. Obtain an eligible settlement account and complete fiscal/merchant onboarding.
3. Apply to CLICK Business and/or Payme Business.
4. Build a normal browser website/PWA with its own secure login and provider-hosted checkout.
5. Activate website entitlements only after signed provider callbacks are verified on the server.
6. Keep Telegram for notifications and support; do not advertise a non-Stars digital checkout inside the Mini App as a way around Telegram billing.

## Recommended next decision

CLICK Business is the simpler first application because its public merchant information explicitly includes self-employed businesses and UZCARD/HUMO. Add Payme after the first checkout is stable. Never place card details or merchant secrets in React; only Railway server variables may hold provider credentials.
