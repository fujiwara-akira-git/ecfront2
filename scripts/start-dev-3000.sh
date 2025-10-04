#!/usr/bin/env bash
set -euo pipefail

# Kills process listening on port 3000 (if any), then starts Next.js dev on port 3000
# Usage: ./scripts/start-dev-3000.sh [--env-file path_to_env]

ENV_FILE=".env.local"
if [[ $# -ge 2 && ( "$1" == "--env-file" ) ]]; then
  ENV_FILE="$2"
fi

echo "Killing process on port 3000 (if present)..."
# Find PID listening on 3000 and kill it
PID=$(lsof -t -i :3000 || true)
if [[ -n "$PID" ]]; then
  echo "Killing PID(s): $PID"
  kill -9 $PID || true
else
  echo "No process was listening on port 3000"
fi

# Start with environment override to ensure local DB used
export NEXTAUTH_URL="http://localhost:3000"
export DATABASE_URL="postgresql://dev:dev@localhost:5432/dev"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"

echo "Starting Next dev on port 3000... (logs -> tmp/server.stdout.log)"
mkdir -p tmp
npm run dev > tmp/server.stdout.log 2>&1 &
echo "Started. Tail logs with: tail -f tmp/server.stdout.log"

exit 0
