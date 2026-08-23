-- ============================================================
-- Migration: 20260823220000_database_cleanup_and_optimizations.sql
-- Description: Clean up schema inconsistencies, remove duplicate indexes,
--              align column defaults, and optimize key-value extensibility.
-- ============================================================

-- 1. Align column default with CHECK constraint on public.analyses (Title Case)
ALTER TABLE public.analyses ALTER COLUMN severity SET DEFAULT 'Low';

-- 2. Drop duplicate index on public.locations (covered by UNIQUE CONSTRAINT unique_location_coords)
DROP INDEX IF EXISTS public.idx_locations_coords;

-- 3. Drop low-value indexes on tiny static table public.waste_types (<15 rows)
DROP INDEX IF EXISTS public.idx_waste_types_category;
DROP INDEX IF EXISTS public.idx_waste_types_recyclable;

-- 4. Remove restrictive foreign key on generic key-value store public.system_settings
-- Active AI model synchronization remains enforced by trigger trg_system_settings_active_model
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_value_ai_models_fkey;
