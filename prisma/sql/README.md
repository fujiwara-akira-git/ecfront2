Manual migration: add_favorite_producer

1. Review `add_favorite_producer.sql` to confirm changes.
2. Connect to your Postgres database as an administrator or a user with migration privileges.
3. Run the SQL file:

```bash
# Example using psql:
psql "$DATABASE_URL" -f prisma/sql/add_favorite_producer.sql
```

4. Verify the table and constraints:

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'FavoriteProducer';
-- Check indexes and foreign keys as needed
```

5. If you need to roll back:

```sql
DROP TABLE IF EXISTS "FavoriteProducer" CASCADE;
```

Notes:
- This manual migration avoids `prisma migrate` reset operations and preserves existing data.
- After applying the SQL, run `npx prisma db pull` to update the Prisma schema's introspected state, then `npx prisma generate`.
