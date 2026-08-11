-- Migration: Convert public.analyses to 5NF
-- Removes redundant latitude, longitude, location_label columns from analyses.
-- These facts now live exclusively in public.locations, accessed via location_id FK.
--
-- Root cause: Migration 20260809000000 stored coordinates directly on analyses.
-- Migration 20260809180000 introduced the locations table and added location_id,
-- but never dropped the original columns — creating a transitive dependency
-- (5NF violation): analyses.location_id → locations.(latitude, longitude, location_label)
-- while the same data also existed on analyses directly.

-- ============================================================
-- STEP 1: Drop the view FIRST — it references a.latitude / a.longitude /
-- a.location_label via COALESCE. PostgreSQL raises SQLSTATE 2BP01 if we
-- attempt to DROP COLUMN while any view depends on that column.
-- ============================================================
DROP VIEW IF EXISTS public.vw_analysis_details CASCADE;

-- ============================================================
-- STEP 2: Backfill — ensure every analyses row with coordinates
-- has a corresponding location_id before we drop the raw columns.
-- ============================================================

-- 2a. Upsert any unique lat/lng pairs not yet in locations
INSERT INTO public.locations (location_label, latitude, longitude)
SELECT DISTINCT
  COALESCE(NULLIF(TRIM(location_label), ''), ROUND(latitude::numeric, 4)::text || ', ' || ROUND(longitude::numeric, 4)::text),
  latitude,
  longitude
FROM public.analyses
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location_id IS NULL
ON CONFLICT (latitude, longitude) DO UPDATE SET
  location_label = COALESCE(
    NULLIF(TRIM(EXCLUDED.location_label), ''),
    public.locations.location_label
  );

-- 2b. Backfill location_id on any remaining analyses rows
UPDATE public.analyses a
SET location_id = l.id
FROM public.locations l
WHERE a.latitude = l.latitude
  AND a.longitude = l.longitude
  AND a.location_id IS NULL;

-- ============================================================
-- STEP 3: Drop redundant columns from public.analyses
-- View was dropped in Step 1, so no dependent objects remain.
-- ============================================================
ALTER TABLE public.analyses DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.analyses DROP COLUMN IF EXISTS longitude;
ALTER TABLE public.analyses DROP COLUMN IF EXISTS location_label;

-- ============================================================
-- STEP 4: Recreate public.vw_analysis_details without the
-- COALESCE on deleted columns — reads lat/lng/label from
-- public.locations via location_id JOIN only.
-- ============================================================
CREATE VIEW public.vw_analysis_details
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.image_url,
  COALESCE(a.total_waste, 0) AS total_waste,
  a.pollution_score,
  a.severity,
  a.created_at,
  a.user_id,
  a.model_used,
  m.name           AS model_name,
  m.architecture   AS model_architecture,
  m.params         AS model_params,
  a.location_id,
  l.location_label,
  l.latitude,
  l.longitude,
  COALESCE(
    (
      SELECT jsonb_object_agg(d.waste_type, d.count)
      FROM public.detections d
      WHERE d.analysis_id = a.id
    ),
    '{}'::jsonb
  ) AS detections_map
FROM public.analyses a
LEFT JOIN public.locations l  ON a.location_id = l.id
LEFT JOIN public.ai_models  m ON a.model_used  = m.id;

-- ============================================================
-- STEP 5: Re-grant permissions on updated view
-- ============================================================
GRANT SELECT ON public.vw_analysis_details TO anon, authenticated, service_role;
