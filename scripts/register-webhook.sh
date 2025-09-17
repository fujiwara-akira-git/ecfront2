#!/usr/bin/env bash
set -euo pipefail

# Usage:
# STRIPE_SECRET_KEY=sk_test_xxx WEBHOOK_URL=https://your.ngrok.app/api/stripe/webhook ./scripts/register-webhook.sh

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable is required"
  exit 1
fi
if [ -z "${WEBHOOK_URL:-}" ]; then
  echo "Error: WEBHOOK_URL environment variable is required"
  exit 1
fi

API_BASE="https://api.stripe.com/v1"
AUTH_HEADER="-u ${STRIPE_SECRET_KEY}:"

# Create a webhook endpoint for checkout.session.completed
echo "Creating webhook endpoint for: ${WEBHOOK_URL}"
create_resp=$(curl -s $AUTH_HEADER -X POST "${API_BASE}/webhook_endpoints" \
  -d "url=${WEBHOOK_URL}" \
  -d "enabled_events[]=$ {events}" || true)

# If create_resp is empty, try without events
if [ -z "$create_resp" ]; then
  create_resp=$(curl -s $AUTH_HEADER -X POST "${API_BASE}/webhook_endpoints" \
    -d "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=payment_intent.succeeded")
fi

# Parse response
webhook_id=$(echo "$create_resp" | jq -r '.id // empty')
if [ -z "$webhook_id" ]; then
  echo "Failed to create webhook endpoint. Response:" >&2
  echo "$create_resp" >&2
  exit 1
fi

echo "Created webhook endpoint id: $webhook_id"

# Create a signing secret for the endpoint (Stripe creates one automatically;
# we fetch the list of signing secrets and print the latest)
secret_resp=$(curl -s $AUTH_HEADER "${API_BASE}/webhook_endpoints/${webhook_id}/signing_secrets")

# Get the latest secret
signing_secret=$(echo "$secret_resp" | jq -r '.data[0].secret // empty')
if [ -z "$signing_secret" ]; then
  echo "Failed to retrieve signing secret. Response:" >&2
  echo "$secret_resp" >&2
  exit 1
fi

cat <<EOF
Webhook endpoint created: ${webhook_id}
Signing secret: ${signing_secret}

Copy the signing secret to your environment (e.g. .env.local or Vercel env var):
STRIPE_WEBHOOK_SECRET=${signing_secret}
EOF
