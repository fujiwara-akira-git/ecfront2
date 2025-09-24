#!/usr/bin/env bash
set -euo pipefail
SESSION_ID=${1:-cs_test_a1NltyyP3DbdQuJDuh91VTjpSSByXEqSTnDAgGY4WbN}
ORDER_ID=${2:-6093c5c3-b5de-40d0-a6ed-5517e1dee65f}
WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_21990249793fd68bda66ea30265a08384ddd1f232abeca3921150ec7a673afe5}

PAYLOAD=$(cat <<EOF
{
  "id": "evt_manual_cs_test",
  "object": "event",
  "type": "checkout.session.completed",
  "data": { "object": {
    "id": "${SESSION_ID}",
    "metadata": { "orderId": "${ORDER_ID}" },
    "amount_total": 2780,
    "currency": "jpy",
    "payment_status": "paid",
    "payment_intent": "pi_manual_for_test",
    "customer_details": { "name": "Test User", "email": "test@example.com", "address": { "line1": "1-2-3", "city": "Chiyoda", "state": "Tokyo", "postal_code": "100-0001", "country": "JP" } }
  }}
}
EOF
)

TS=$(date +%s)
SIGNED_PAYLOAD="$TS.$PAYLOAD"
SIG=$(printf "%s" "$SIGNED_PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | sed 's/^.* //')
HEADER="t=$TS,v1=$SIG"

curl -s -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: $HEADER" \
  -d "$PAYLOAD" -w "\nHTTP_STATUS:%{http_code}\n" 
