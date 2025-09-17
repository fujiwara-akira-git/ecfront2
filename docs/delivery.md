# Delivery - Implementation Notes

Overview:

This project implements a delivery provider abstraction under `lib/delivery`.

Key files:

- `lib/delivery/provider.ts` - shared types and Provider interface.
- `lib/delivery/providers/yamato.ts` - Yamato provider (test + production wrappers).
- `lib/delivery/providers/japanpost.ts` - Japan Post provider (test + production wrappers).
- `app/api/delivery/rates/route.ts` - calculates rates by calling providers.
- `app/api/delivery/create/route.ts` - creates shipments via provider, persists to DB.
- `app/api/delivery/webhook/route.ts` - webhook handler that routes events to providers.

Environment flags:

- `YAMATO_TEST_MODE` / `JAPANPOST_TEST_MODE` - when `true` providers use mock logic.
- `YAMATO_API_KEY`, `YAMATO_BASE_URL` - production Yamato API config.
- `JAPANPOST_API_KEY`, `JAPANPOST_CLIENT_SECRET`, `JAPANPOST_BASE_URL` - production Japan Post config.

Persistence:
- `prisma` is used to persist `Delivery` records when `DATABASE_URL` is set. Otherwise Firestore REST fallback is available.

Testing notes:
- Use `curl` or front-end flows to call `/api/delivery/rates` and `/api/delivery/create`.
- For webhook testing, use ngrok + provider sandbox/webhook feature or scripts/register-webhook.sh for Stripe.

Next steps:
- Consolidate env access into `lib/config.ts`.
- Add strict response parsing based on provider API samples.
