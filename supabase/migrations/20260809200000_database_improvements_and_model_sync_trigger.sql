-- Migration: Option 1 Model Sync Trigger & Database Performance Indexes
-- Enforces referential validation on active_ai_model setting, syncs model active flags, adds foreign key indexes, and creates a consolidated analysis view.

-- 1. Create model validation and active flag sync trigger on public.system_settings
CREATE OR REPLACE FUNCTION public.fn_sync_system_active_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.key = 'active_ai_model' THEN
    -- Validate that the model ID exists in public.ai_models
    IF NOT EXISTS (SELECT 1 FROM public.ai_models WHERE id = NEW.value) THEN
      RAISE EXCEPTION 'Invalid model ID "%". Must exist in public.ai_models(id).', NEW.value;
    END IF;

    -- Synchronize is_active flags across public.ai_models
    UPDATE public.ai_models
    SET is_active = (id = NEW.value);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_active_model ON public.system_settings;
CREATE TRIGGER trg_system_settings_active_model
BEFORE INSERT OR UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_system_active_model();

-- 2. Foreign Key & Performance Indexes for Fast Lookups & Joins
CREATE INDEX IF NOT EXISTS idx_detections_waste_type ON public.detections(waste_type);
CREATE INDEX IF NOT EXISTS idx_analyses_location_id ON public.analyses(location_id);
CREATE INDEX IF NOT EXISTS idx_analyses_model_used ON public.analyses(model_used);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON public.locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_waste_types_category ON public.waste_types(category);
CREATE INDEX IF NOT EXISTS idx_waste_types_recyclable ON public.waste_types(is_recyclable);

-- 3. Normalized Database View for Complete Analysis Details (WITH security_invoker = true to enforce RLS)
CREATE OR REPLACE VIEW public.vw_analysis_details
WITH (security_invoker = true) AS
SELECT 
  a.id,
  a.image_url,
  a.total_waste,
  a.pollution_score,
  a.severity,
  a.created_at,
  a.user_id,
  a.model_used,
  m.name AS model_name,
  m.architecture AS model_architecture,
  m.params AS model_params,
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
LEFT JOIN public.locations l ON a.location_id = l.id
LEFT JOIN public.ai_models m ON a.model_used = m.id;

-- Grant SELECT permissions on the view
GRANT SELECT ON public.vw_analysis_details TO public;
GRANT SELECT ON public.vw_analysis_details TO authenticated;
GRANT SELECT ON public.vw_analysis_details TO service_role;
