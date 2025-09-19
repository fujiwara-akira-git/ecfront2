-- Migration: add_user_state
-- This migration adds nullable state column to User table.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS state TEXT;
