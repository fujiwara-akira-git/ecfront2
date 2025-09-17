# Payments integration (Square-first, provider abstraction)

This document describes the minimal integration plan for Square-based POS and web checkout, with a provider abstraction so we can swap in Stripe later.

## Files added
- `lib/providers/provider.ts` - provider interface
- `lib/providers/square.ts` - Square provider stub
- `app/api/payments/checkout/route.ts` - create checkout session
- `app/api/payments/webhook/route.ts` - receive webhooks
- `app/api/inventory/sync/route.ts` - manual/cron inventory sync trigger

## Env
- SQUARE_ACCESS_TOKEN
- SQUARE_LOCATION_ID
- SQUARE_WEBHOOK_SIGNATURE_KEY
- NEXT_PUBLIC_APP_URL

## Local testing
Use ngrok to expose `config.getBaseUrl()` to Square sandbox and configure webhooks.

## Next steps
- Implement signature verification in `lib/providers/square.ts`
- Persist events and orders in DB
- Implement nightly cron to call `/api/inventory/sync`
