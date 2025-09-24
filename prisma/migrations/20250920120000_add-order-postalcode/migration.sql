-- Migration: add-order-postalcode
-- SQL: add postalCode column to Order

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "postalCode" text;
