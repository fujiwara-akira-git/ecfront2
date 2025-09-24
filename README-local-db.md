Local Postgres for development

This project uses Neon in production (Vercel). To run locally with a Docker Postgres and migrate data from Neon, follow these steps.

1. Start local Postgres

```bash
docker-compose up -d
# Wait until Postgres is healthy
docker-compose ps
```

2. Export from Neon and import to local

```bash
# Set NEON_DATABASE_URL environment variable (or copy from your .env.production)
./scripts/migrate-neon-to-local.sh --source "$NEON_DATABASE_URL"
# If you only want schema without data:
# ./scripts/migrate-neon-to-local.sh --source "$NEON_DATABASE_URL" --no-data
```

3. Switch `.env.local` to use local DB

Edit `.env.local` and set:

```
DATABASE_URL="postgresql://dev:dev@localhost:5432/dev"
```

Or start dev with temporary override:

```bash
NEXTAUTH_URL="http://localhost:3000" DATABASE_URL="postgresql://dev:dev@localhost:5432/dev" npm run dev
```

4. Run Prisma steps

```bash
npx prisma generate
npx prisma migrate dev # if using migration files and you want to apply locally
# or npx prisma db push to sync schema without migrations
```

5. Optional: Seed

If the repo contains seed scripts (check `prisma/seed.ts` or `scripts/seed-products.js`), run them after migrating.

Notes

- The script will overwrite the `public` schema on the local DB to avoid conflicts. Back up local data if needed.
- If Neon requires additional connection flags, ensure `pg_dump` and `psql` are available locally and support SSL connections. On macOS, you can install via `brew install libpq` (then `brew link --force libpq` if necessary).
- For webhook testing, use Stripe CLI:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```
