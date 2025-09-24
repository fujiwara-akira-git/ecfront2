#!/usr/bin/env bash
set -euo pipefail

# Requires: .env.local containing STRIPE_SECRET_KEY
# Usage: ./tmp/fetch-sessions.sh

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SESSION_LIST="$ROOT_DIR/tmp/stripe-session-ids.txt"
OUT_FILE="$ROOT_DIR/tmp/stripe-sessions.jsonl"
CHECKER="$ROOT_DIR/tmp/check-stripe-session.js"

if [ ! -f "$SESSION_LIST" ]; then
  echo "session list not found: $SESSION_LIST" >&2
  exit 1
fi
if [ ! -f "$CHECKER" ]; then
  echo "checker script not found: $CHECKER" >&2
  exit 2
fi

# clear output
: > "$OUT_FILE"

while IFS= read -r sid; do
  sid_trimmed=$(echo "$sid" | tr -d '\r' | tr -d '\n' | xargs)
  if [ -z "$sid_trimmed" ]; then
    continue
  fi
  echo "fetching: $sid_trimmed"
  set +e
  node "$CHECKER" "$sid_trimmed" >> "$OUT_FILE" 2>> "$OUT_FILE.err" 
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    echo "ERROR fetching $sid_trimmed (rc=$rc)" >> "$OUT_FILE.err"
  else
    echo "OK $sid_trimmed" >> "$OUT_FILE.ok"
  fi
  # small delay to avoid rate limits
  sleep 0.3
done < "$SESSION_LIST"

echo "done. output: $OUT_FILE"