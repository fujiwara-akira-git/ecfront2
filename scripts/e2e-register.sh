#!/usr/bin/env bash
set -euo pipefail

# Simple E2E script: register a test user and verify session
# Usage: ./scripts/e2e-register.sh [baseUrl]
# baseUrl defaults to https://localhost:3000

BASE_URL=${1:-https://localhost:3000}
COOKIE_FILE="/tmp/e2e_register_cookies.txt"

EMAIL="e2e-script-$(date +%s)@example.com"
PASSWORD="TestPass123!"

echo "Registering user: $EMAIL at $BASE_URL"

# POST register
http_response=$(curl -k -s -w "\n%{http_code}" -o /tmp/e2e_register_response.json \
  -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Script\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"phone\":\"08000000000\",\"address\":\"テスト町1-2-3\",\"postalCode\":\"123-4567\",\"userType\":\"customer\"}" \
  -c "$COOKIE_FILE")

http_body=$(cat /tmp/e2e_register_response.json)
http_code=$(echo "$http_response" | tail -n1)

echo "Register response code: $http_code"
echo "$http_body"

if [ "$http_code" != "201" ]; then
  echo "Registration failed"
  exit 2
fi

# Verify session
echo "Checking session using saved cookie..."
session_response=$(curl -k -s -o /tmp/e2e_session.json -w "%{http_code}" "$BASE_URL/api/auth/session" -b "$COOKIE_FILE")

echo "Session response code: $session_response"
cat /tmp/e2e_session.json

if [ "$session_response" != "200" ]; then
  echo "Session check failed"
  exit 3
fi

echo "E2E register -> session check succeeded"
exit 0
