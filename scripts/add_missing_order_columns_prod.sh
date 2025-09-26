#!/usr/bin/env bash
set -euo pipefail

# add_missing_order_columns_prod.sh
# Safely back up production Postgres DB and add missing columns to the "Order" table
# Non-destructive: uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS
# Usage: export PROD_DATABASE_URL or set PROD_HOST/PROD_USER/PROD_DBNAME and run this script.

PROD_DATABASE_URL=${PROD_DATABASE_URL:-}
PROD_HOST=${PROD_HOST:-}
PROD_PORT=${PROD_PORT:-5432}
PROD_USER=${PROD_USER:-}
PROD_DBNAME=${PROD_DBNAME:-}
PROD_PGPASSWORD=${PROD_PGPASSWORD:-}

BACKUP_DIR=${BACKUP_DIR:-/tmp}

INTERACTIVE=yes
if [ "${1:-}" = "--yes" ] || [ "${2:-}" = "--yes" ]; then
  INTERACTIVE=no
fi

function check_required() {
  if [ -n "${PROD_DATABASE_URL}" ]; then
    return 0
  fi
  local missing=()
  for v in PROD_HOST PROD_USER PROD_DBNAME; do
    if [ -z "${!v:-}" ]; then
      missing+=("$v")
    fi
  done
  if [ ${#missing[@]} -ne 0 ]; then
    echo "Missing required variables: ${missing[*]}"
    echo "Either export PROD_DATABASE_URL or set them in the environment." >&2
    exit 1
  fi
}

check_required

if [ "$INTERACTIVE" = "yes" ]; then
  echo "About to run a full pg_dump backup and non-destructive ALTER TABLE against production DB"
  echo "Host: $PROD_HOST  DB: $PROD_DBNAME  User: $PROD_USER"
  read -rp "Continue? (type 'yes' to proceed): " ans
  if [ "$ans" != "yes" ]; then
    echo "Aborted by user."; exit 1
  fi
fi

TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/prod-backup-${PROD_DBNAME}-${TS}.dump"

if [ -n "${PROD_PGPASSWORD:-}" ]; then
  export PGPASSWORD="$PROD_PGPASSWORD"
fi

USE_DOCKER=0
if command -v pg_dump >/dev/null 2>&1; then
  PG_DUMP_VER_RAW=$(pg_dump --version 2>/dev/null || true)
  PG_DUMP_MAJOR=$(echo "$PG_DUMP_VER_RAW" | sed -nE 's/.*\b([0-9]+)\.[0-9]+.*/\1/p') || PG_DUMP_MAJOR=0
  if [ -z "${PG_DUMP_MAJOR}" ] || [ "$PG_DUMP_MAJOR" -lt 17 ]; then
    echo "Local pg_dump major=${PG_DUMP_MAJOR:-unknown} (<17) — will use Docker postgres:17 client instead."
    USE_DOCKER=1
  else
    echo "Using local pg_dump (major=${PG_DUMP_MAJOR})."
  fi
else
  echo "pg_dump not found locally — will attempt to use Docker postgres:17 client."
  USE_DOCKER=1
fi

if [ "$USE_DOCKER" -eq 1 ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found but required to emulate pg_dump/psql for Postgres 17."
    echo "Please either: (a) install postgresql@17 locally, or (b) install Docker, or (c) run this script on a host with a compatible pg_dump client."
    exit 2
  fi
fi

run_pg_dump() {
  local out_file="$1"
  if [ "$USE_DOCKER" -eq 1 ]; then
    echo "Running pg_dump inside docker: postgres:17"
    if [ -n "${PROD_DATABASE_URL}" ]; then
      docker run --rm -v "$BACKUP_DIR":/backup postgres:17 \
        pg_dump -d "$PROD_DATABASE_URL" -Fc -f "/backup/$(basename "$out_file")"
    else
      if [ -n "${PROD_PGPASSWORD:-}" ]; then
        docker run --rm -e PGPASSWORD="$PROD_PGPASSWORD" -v "$BACKUP_DIR":/backup postgres:17 \
          pg_dump -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -Fc -f "/backup/$(basename "$out_file")" "$PROD_DBNAME"
      else
        docker run --rm -v "$BACKUP_DIR":/backup postgres:17 \
          pg_dump -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -Fc -f "/backup/$(basename "$out_file")" "$PROD_DBNAME"
      fi
    fi
  else
    if [ -n "${PROD_DATABASE_URL}" ]; then
      pg_dump -d "$PROD_DATABASE_URL" -Fc -f "$out_file"
    else
      pg_dump -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -Fc -f "$out_file" "$PROD_DBNAME"
    fi
  fi
}

run_psql() {
  local sql="$1"
  if [ "$USE_DOCKER" -eq 1 ]; then
    echo "Running psql inside docker: postgres:17"
    if [ -n "${PROD_DATABASE_URL}" ]; then
      docker run --rm postgres:17 psql "$PROD_DATABASE_URL" -c "$sql"
    else
      if [ -n "${PROD_PGPASSWORD:-}" ]; then
        docker run --rm -e PGPASSWORD="$PROD_PGPASSWORD" postgres:17 \
          psql "postgresql://${PROD_USER}@${PROD_HOST}:${PROD_PORT}/${PROD_DBNAME}" -c "$sql"
      else
        docker run --rm postgres:17 \
          psql "postgresql://${PROD_USER}@${PROD_HOST}:${PROD_PORT}/${PROD_DBNAME}" -c "$sql"
      fi
    fi
  else
    if [ -n "${PROD_DATABASE_URL}" ]; then
      psql "$PROD_DATABASE_URL" -c "$sql"
    else
      psql "postgresql://${PROD_USER}@${PROD_HOST}:${PROD_PORT}/${PROD_DBNAME}" -c "$sql"
    fi
  fi
}

echo "Taking backup to: $BACKUP_FILE"
run_pg_dump "$BACKUP_FILE"
echo "Backup complete. Size:" $(du -h "$BACKUP_FILE" | cut -f1)

echo "Applying non-destructive ALTER TABLE statements to add missing Order columns (IF NOT EXISTS)"

run_psql $'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPrefecture" text;'
run_psql $'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCity" text;'
run_psql $'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingRest" text;'

echo "ALTERs applied. Verifying columns exist:"
run_psql $'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $$Order$$ AND column_name IN ($$shippingPrefecture$$, $$shippingCity$$, $$shippingRest$$);'

echo "Sampling some recent orders (id, postalCode, shippingPrefecture, shippingCity, shippingRest)"
run_psql $'SELECT id, "postalCode", "shippingPrefecture", "shippingCity", "shippingRest" FROM "Order" ORDER BY "createdAt" DESC LIMIT 10;'

echo "Done. If you use Prisma Migrate, consider marking the migration as applied:"
echo "  npx prisma migrate resolve --applied <migration-name>"

if [ -n "${PROD_PGPASSWORD:-}" ]; then
  unset PGPASSWORD
fi

echo "Script finished successfully."
