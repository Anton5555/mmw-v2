-- Migration: Remove year column from YearTopParticipant
-- This migration assumes data consolidation has been completed via consolidate-year-top-participants.ts
-- 
-- Steps:
-- 1. Drop old unique constraints that include year
-- 2. Drop the year column
-- 3. Add new unique constraints on slug and userId
-- 4. Drop the year index

-- Step 1: Drop old unique constraints
DO $$ 
BEGIN
  -- Drop unique constraint on (year, slug) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'YearTopParticipant_year_slug_key'
  ) THEN
    ALTER TABLE "YearTopParticipant" DROP CONSTRAINT "YearTopParticipant_year_slug_key";
  END IF;

  -- Drop unique constraint on (userId, year) if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'YearTopParticipant_userId_year_key'
  ) THEN
    ALTER TABLE "YearTopParticipant" DROP CONSTRAINT "YearTopParticipant_userId_year_key";
  END IF;
END $$;

-- Step 2: Drop the year index if it exists
DROP INDEX IF EXISTS "YearTopParticipant_year_idx";

-- Step 3: Drop the year column
ALTER TABLE "YearTopParticipant" DROP COLUMN IF EXISTS "year";

-- Step 4: Add new unique constraint on slug
-- Check if constraint already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'YearTopParticipant_slug_key'
  ) THEN
    ALTER TABLE "YearTopParticipant" ADD CONSTRAINT "YearTopParticipant_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- Step 5: Add new unique constraint on userId
-- PostgreSQL unique constraints allow multiple NULLs, so this works for nullable userId
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'YearTopParticipant_userId_key'
  ) THEN
    ALTER TABLE "YearTopParticipant" ADD CONSTRAINT "YearTopParticipant_userId_key" UNIQUE ("userId");
  END IF;
END $$;
