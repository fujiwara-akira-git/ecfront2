#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL="..." ./scripts/apply_prod_migration.sh 20250919144100_add_user_state
# or export DATABASE_URL then run without prefix.

MIGRATION_FOLDER=${1:-}
if [ -z "$MIGRATION_FOLDER" ]; then
  echo "Usage: $0 <migration_folder_name>"
  echo "Example: $0 20250919144100_add_user_state"
  exit 1
fi

MIGRATION_SQL="prisma/migrations/$MIGRATION_FOLDER/migration.sql"
if [ ! -f "$MIGRATION_SQL" ]; then
  echo "Migration SQL not found: $MIGRATION_SQL"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f ".env.local" ]; then
    echo "Loading .env.local to read DATABASE_URL (for convenience)"
    # shellcheck disable=SC1091
    set -o allexport
    source .env.local
    set +o allexport
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or put it into .env.local and try again."
  exit 1
fi

echo "About to apply migration: $MIGRATION_FOLDER"
echo "Migration SQL: $MIGRATION_SQL"
echo "This will run the SQL directly against the DATABASE_URL you provided."
echo "Make sure you are targeting the correct production database."
read -p "Type 'APPLY' to continue: " CONFIRM
if [ "$CONFIRM" != "APPLY" ]; then
  echo "Aborted by user."
  exit 1
fi

echo "Applying SQL..."
if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found in PATH. Attempting to use node to run SQL via 'psql' is not supported by this script." 
  echo "Install psql client or run the migration SQL manually: $MIGRATION_SQL"
  exit 1
fi

psql "$DATABASE_URL" -f "$MIGRATION_SQL"

echo "Marking migration as applied in Prisma migration history..."
if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found in PATH. Please run 'npx prisma migrate resolve --applied $MIGRATION_FOLDER' using Node environment where Prisma CLI is available."
  echo "If you have Node installed but not npx, use 'npm exec -- prisma migrate resolve --applied $MIGRATION_FOLDER'"
  exit 1
fi

npx prisma migrate resolve --applied "$MIGRATION_FOLDER"

echo "Done. You can verify with: npx prisma migrate status"
