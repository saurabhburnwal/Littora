-- Migration: Grant Table & View Permissions for public.vw_analysis_details Security Invoker View

-- 1. Grant schema usage and table privileges to API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detections TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_types TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO anon, authenticated, service_role;

-- 2. Drop existing view if present so column schema can be updated cleanly without SQLSTATE 42P16 error
DROP VIEW IF EXISTS public.vw_analysis_details CASCADE;

-- 3. Create public.vw_analysis_details view with security_invoker = true
CREATE VIEW public.vw_analysis_details
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.pollution_score,
  a.severity,
  a.created_at,
  a.user_id,
  a.model_used,
  a.image_url,
  a.location_id,
  COALESCE(a.location_label, l.location_label) AS location_label,
  COALESCE(a.latitude, l.latitude) AS latitude,
  COALESCE(a.longitude, l.longitude) AS longitude,
  m.name AS model_name,
  COALESCE(a.total_waste, 0) AS total_waste,
  (
    SELECT jsonb_object_agg(d.waste_type, d.count)
    FROM public.detections d
    WHERE d.analysis_id = a.id
  ) AS detections_map
FROM public.analyses a
LEFT JOIN public.locations l ON a.location_id = l.id
LEFT JOIN public.ai_models m ON a.model_used = m.id;

-- 4. Grant SELECT on public.vw_analysis_details to API roles
GRANT SELECT ON public.vw_analysis_details TO anon, authenticated, service_role;

-- 5. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
