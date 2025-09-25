-- Migration: add-shipping-fields
-- Adds shippingPrefecture, shippingCity, shippingRest to the Order table
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingPrefecture" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingCity" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingRest" TEXT;
