#!/usr/bin/env bash
# Helper: create a test checkout session via Stripe CLI (requires stripe CLI and login)
# Usage: ./scripts/trigger-checkout.sh

if ! command -v stripe >/dev/null 2>&1; then
  echo "stripe CLI is not installed. Install from https://stripe.com/docs/stripe-cli"
  exit 1
fi

stripe checkout sessions create \
  --payment_method_types card \
  --mode payment \
  --line_items '[{"price_data":{"currency":"jpy","product_data":{"name":"Test"},"unit_amount":1000},"quantity":1}]' \
  --success_url "https://example.com/success" \
  --cancel_url "https://example.com/cancel" \
  --shipping_address_collection '{"allowed_countries":["JP"]}' \
  --metadata '{"deliveryService":"japanpost","weightGrams":"500","postalCode":"150-0001"}'
