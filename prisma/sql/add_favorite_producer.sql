-- SQL to add FavoriteProducer table for Prisma model FavoriteProducer
BEGIN;

CREATE TABLE IF NOT EXISTS "FavoriteProducer" (
  "id" varchar(255) NOT NULL PRIMARY KEY,
  "userId" varchar(255) NOT NULL,
  "producerId" varchar(255) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "FavoriteProducer_userId_producerId_key" ON "FavoriteProducer" ("userId", "producerId");
CREATE INDEX IF NOT EXISTS "FavoriteProducer_userId_idx" ON "FavoriteProducer" ("userId");
CREATE INDEX IF NOT EXISTS "FavoriteProducer_producerId_idx" ON "FavoriteProducer" ("producerId");

ALTER TABLE "FavoriteProducer"
  ADD CONSTRAINT "FavoriteProducer_user_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE;

ALTER TABLE "FavoriteProducer"
  ADD CONSTRAINT "FavoriteProducer_producer_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer" ("id") ON DELETE CASCADE;

COMMIT;

-- Rollback (if needed): DROP TABLE IF EXISTS "FavoriteProducer" CASCADE;
