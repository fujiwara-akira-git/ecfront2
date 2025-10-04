#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/start-dev-bg.sh [port]
PORT=${1:-3000}
LOGDIR="./tmp/dev-logs"
PIDFILE="$LOGDIR/next-dev.pid"
OUTLOG="$LOGDIR/next-dev.out.log"
ERRLOG="$LOGDIR/next-dev.err.log"

mkdir -p "$LOGDIR"

if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Next dev already running (PID=$OLD_PID). Exiting."
    exit 0
  else
    echo "Stale PID file found. Removing."
    rm -f "$PIDFILE"
  fi
fi

# Start Next dev in background
PORT=$PORT nohup npm run dev > "$OUTLOG" 2>"$ERRLOG" &
NEW_PID=$!

echo $NEW_PID > "$PIDFILE"
echo "Started Next dev (PID=$NEW_PID) on port $PORT"

echo "Logs: $OUTLOG, $ERRLOG"

echo "To stop: kill \\$(cat $PIDFILE) && rm -f $PIDFILE"
