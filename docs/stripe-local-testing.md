# Stripe Local Webhook Testing

This document explains how to test Stripe webhooks locally using the Stripe CLI and the project's webhook endpoint.

Prerequisites
- `node` and `npm` installed
- `stripe` CLI installed and logged in (https://stripe.com/docs/stripe-cli)
- Local dev server running at `http://localhost:3000` (or change the forward target)

1. Start the local server (production or dev)

```bash
# Using production build (already built)
npm run start
# or dev server
npm run dev
```

2. Start Stripe CLI and forward events to your webhook

```bash
# From repo root
./scripts/stripe-listen.sh http://localhost:3000/api/payments/webhook
```

The stripe CLI will print a line like:

> Ready! Your webhook signing secret is whsec_XXXX

Copy `whsec_XXXX` into your `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_XXXX` and restart your app if necessary.

3. Send a test event

```bash
# send a test checkout.session.completed event
stripe trigger checkout.session.completed

# or send a custom event using a sample payload
stripe events create --type=checkout.session.completed --data '{"id":"cs_test_123","data":{"object":{"id":"cs_test_123"}}}'
```

4. Observe logs

- The production server (`npm run start`) prints request logs and any console output from webhook handling.
- The stripe CLI also prints delivered events and signatures.

Notes
- If your local server is not reachable from the stripe CLI, use `ngrok` or ensure the server is listening on 0.0.0.0.
- Keep your `STRIPE_WEBHOOK_SECRET` secret.
- For CI or automated tests, consider mocking Stripe API responses instead of using the network.
