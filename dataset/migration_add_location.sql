-- ============================================================
-- Migration: add optional location columns to `analyses`
-- Run this in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/adfhubqrgunuuwcqssro/sql/new
-- ============================================================

-- 1. Add the three new nullable columns
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS latitude        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_label  TEXT;

-- 2. Partial index — only index rows that actually have coordinates
--    (keeps the index small while making map queries fast)
CREATE INDEX IF NOT EXISTS idx_analyses_coords
  ON analyses (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Ensure service_role has full access (safe to re-run)
GRANT ALL ON TABLE analyses   TO service_role;
GRANT ALL ON TABLE detections TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
