#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/stripe-listen.sh [--forward-to http://localhost:3000/api/payments/webhook]
# This helper starts stripe listen and prints guidance to copy the webhook secret to .env.local

FORWARD_TO=${1:-http://localhost:3000/api/payments/webhook}

if ! command -v stripe >/dev/null 2>&1; then
  echo "stripe CLI is not installed. Install from https://stripe.com/docs/stripe-cli"
  exit 1
fi

echo "Starting stripe listen and forwarding to: $FORWARD_TO"

echo "Run this in a separate terminal if you want to keep logs visible."

# Start stripe listen and extract the webhook signing secret from its output
stripe listen --forward-to "$FORWARD_TO"
