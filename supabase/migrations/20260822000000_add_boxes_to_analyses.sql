-- Migration: Add boxes column to public.analyses and update public.vw_analysis_details
-- Stores YOLO detection bounding box annotations ([{class_name, confidence, box_normalized, ...}])
-- so that past analysis modal popups and detail tiles can overlay detection bounding boxes on uncropped images.

-- 1. Add boxes JSONB column to public.analyses
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS boxes JSONB DEFAULT '[]'::jsonb;

-- 2. Drop and Recreate public.vw_analysis_details to expose boxes
DROP VIEW IF EXISTS public.vw_analysis_details CASCADE;

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
  COALESCE(a.boxes, '[]'::jsonb) AS boxes,
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

-- 3. Re-grant permissions on updated view
GRANT SELECT ON public.vw_analysis_details TO anon, authenticated, service_role;
