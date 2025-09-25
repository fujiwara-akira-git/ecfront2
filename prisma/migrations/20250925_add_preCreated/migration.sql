-- Migration: add preCreated column to Order if it doesn't exist
-- Non-destructive: uses IF NOT EXISTS to avoid errors on rerun
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "preCreated" boolean NOT NULL DEFAULT false;
