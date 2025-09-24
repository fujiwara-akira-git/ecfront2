#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./scripts/migrate-neon-to-local.sh --source "$NEON_DATABASE_URL" --target "postgresql://dev:dev@localhost:5432/dev"

print_usage() {
  echo "Usage: $0 --source <NEON_DATABASE_URL> [--target <LOCAL_DATABASE_URL>] [--no-data]"
  echo "  --source    The Neon DATABASE_URL (required)"
  echo "  --target    The local target DATABASE_URL (default: postgresql://dev:dev@localhost:5432/dev)"
  echo "  --no-data   Only migrate schema (no data)"
}

SOURCE_URL=""
TARGET_URL="postgresql://dev:dev@localhost:5432/dev"
NO_DATA="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_URL="$2"; shift 2;;
    --target)
      TARGET_URL="$2"; shift 2;;
    --no-data)
      NO_DATA="true"; shift 1;;
    -h|--help)
      print_usage; exit 0;;
    *)
      echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

if [[ -z "$SOURCE_URL" ]]; then
  echo "Error: --source is required"
  print_usage
  exit 1
fi

TMP_DUMP="/tmp/neon_dump.sql"

echo "Dumping schema from Neon..."
# Dump schema and data by default, but allow --no-data
if [[ "$NO_DATA" == "true" ]]; then
  pg_dump --schema-only --no-owner --no-privileges --dbname="$SOURCE_URL" -f "$TMP_DUMP"
else
  pg_dump --no-owner --no-privileges --dbname="$SOURCE_URL" -f "$TMP_DUMP"
fi

echo "Restoring to local Postgres..."
# Drop and recreate public schema to avoid conflicts
psql "$TARGET_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$TARGET_URL" -f "$TMP_DUMP"

echo "Migration complete."
echo "You may need to run:"
echo "  npx prisma generate"
echo "  npx prisma migrate deploy  # if using migrations"

exit 0
