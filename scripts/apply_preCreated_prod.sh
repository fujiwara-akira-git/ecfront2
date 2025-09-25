#!/usr/bin/env bash
set -euo pipefail

# apply_preCreated_prod.sh
# Safe helper to back up a Postgres DB, apply a non-destructive ALTER to add
# the `preCreated` boolean column to the "Order" table, and run quick verifications.
#
# USAGE:
# 1. Copy this file to the server where you can reach the production DB, or run from CI with secrets configured.
# 2. Fill in the required environment variables below or export them before running.
# 3. Run with: ./scripts/apply_preCreated_prod.sh
#    To skip the interactive confirmation, pass --yes
#
# WARNING: This script will perform a full logical backup with pg_dump. Ensure you have sufficient disk space.

#########################

# Configuration (replace or export these in your environment)
# You can either supply a full connection URI in PROD_DATABASE_URL
# or set PROD_HOST/PROD_PORT/PROD_USER/PROD_DBNAME separately.
#########################
PROD_DATABASE_URL=${PROD_DATABASE_URL:-}
PROD_HOST=${PROD_HOST:-}
PROD_PORT=${PROD_PORT:-5432}
PROD_USER=${PROD_USER:-}
PROD_DBNAME=${PROD_DBNAME:-}
# Optional: provide PGPASSWORD separately (or include password in PROD_DATABASE_URL)
PROD_PGPASSWORD=${PROD_PGPASSWORD:-}

BACKUP_DIR=${BACKUP_DIR:-/tmp}
MIGRATION_NAME=${MIGRATION_NAME:-20250925_add_preCreated}

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
  echo "About to run a full pg_dump backup and ALTER TABLE against production DB"
  echo "Host: $PROD_HOST  DB: $PROD_DBNAME  User: $PROD_USER"
  read -rp "Continue? (type 'yes' to proceed): " ans
  if [ "$ans" != "yes" ]; then
    echo "Aborted by user."; exit 1
  fi
fi

# Prepare backup filename
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/prod-backup-${PROD_DBNAME}-${TS}.dump"


echo "Taking backup to: $BACKUP_FILE"

if [ -n "${PROD_PGPASSWORD:-}" ]; then
  export PGPASSWORD="$PROD_PGPASSWORD"
fi

# Run pg_dump using either full URL or components
## Helper: decide whether to use local pg_dump/psql or docker postgres:17
USE_DOCKER=0
if command -v pg_dump >/dev/null 2>&1; then
  # Example output: pg_dump (PostgreSQL) 14.19
  PG_DUMP_VER_RAW=$(pg_dump --version 2>/dev/null || true)
  PG_DUMP_MAJOR=$(echo "$PG_DUMP_VER_RAW" | sed -nE 's/.*\b([0-9]+)\.[0-9]+.*/\1/p') || PG_DUMP_MAJOR=0
  if [ -z "${PG_DUMP_MAJOR}" ] || [ "$PG_DUMP_MAJOR" -lt 17 ]; then
    echo "Local pg_dump major version is ${PG_DUMP_MAJOR:-unknown} (<17) — will attempt to use Docker postgres:17 client instead of local pg_dump/psql."
    USE_DOCKER=1
  else
    echo "Using local pg_dump (major=${PG_DUMP_MAJOR})."
  fi
else
  echo "pg_dump not found locally — will attempt to use Docker postgres:17 client."
  USE_DOCKER=1
fi

# Ensure docker is available if we plan to use it
if [ "$USE_DOCKER" -eq 1 ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found but required to emulate pg_dump/psql for Postgres 17."
    echo "Please either: (a) install postgresql@17 locally, or (b) install Docker, or (c) run this script on a host with a compatible pg_dump client."
    exit 2
  fi
fi

# Wrappers for pg_dump and psql that will use docker when requested
run_pg_dump() {
  local out_file="$1"
  if [ "$USE_DOCKER" -eq 1 ]; then
    echo "Running pg_dump inside docker: postgres:17"
    # mount backup dir into container as /backup
    if [ -n "${PROD_DATABASE_URL}" ]; then
      docker run --rm -v "$BACKUP_DIR":/backup postgres:17 \
        pg_dump -d "$PROD_DATABASE_URL" -Fc -f "/backup/$(basename "$out_file")"
    else
      # Using components: pass host/port/user/db and PGPASSWORD env if set
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

# Run the dump using wrapper
if [ -n "${PROD_DATABASE_URL}" ]; then
  run_pg_dump "$BACKUP_FILE"
else
  run_pg_dump "$BACKUP_FILE"
fi

echo "Backup complete. Size:" $(du -h "$BACKUP_FILE" | cut -f1)

echo "Applying ALTER TABLE to add preCreated column (IF NOT EXISTS, non-destructive)"

run_psql $'ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "preCreated" boolean NOT NULL DEFAULT false;'

echo "ALTER completed. Verifying column exists..."

run_psql $'SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = $$Order$$ AND column_name = $$preCreated$$;'

echo "Sampling some recent orders to ensure app-level compatibility (showing id, status, preCreated)"
run_psql $'SELECT id, status, "preCreated" FROM "Order" ORDER BY "createdAt" DESC LIMIT 10;'

echo "Done. If you use Prisma Migrate, consider marking the migration as applied in the Prisma migration history on the deploy host:"
echo "  npx prisma migrate resolve --applied $MIGRATION_NAME"

echo "Note: If you used PROD_PGPASSWORD environment variable, consider unsetting it now."
if [ -n "${PROD_PGPASSWORD:-}" ]; then
  unset PGPASSWORD
fi

echo "Script finished successfully."
