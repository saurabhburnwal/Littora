-- Migration: Resolve all Supabase Security Advisor & Linter Warnings
-- Fixes Security Definer View, Function Search Path Mutable, and RLS Policy Always True warnings.

-- 1. Fix View Security Invoker (public.vw_analysis_details)
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

-- 2. Fix Function Search Path Mutable (public.fn_sync_system_active_model)
CREATE OR REPLACE FUNCTION public.fn_sync_system_active_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.key = 'active_ai_model' THEN
    IF NOT EXISTS (SELECT 1 FROM public.ai_models WHERE id = NEW.value) THEN
      RAISE EXCEPTION 'Invalid model ID "%". Must exist in public.ai_models(id).', NEW.value;
    END IF;

    UPDATE public.ai_models
    SET is_active = (id = NEW.value);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Fix RLS Policy Always True on public.ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Allow authenticated write on ai_models" ON public.ai_models;

CREATE POLICY "Allow public select on ai_models" ON public.ai_models
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated write on ai_models" ON public.ai_models
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 4. Fix RLS Policy Always True on public.locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on locations" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated insert on locations" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated write on locations" ON public.locations;

CREATE POLICY "Allow public select on locations" ON public.locations
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert on locations" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Allow authenticated update on locations" ON public.locations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 5. Fix RLS Policy Always True on public.system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated write on system_settings" ON public.system_settings;

CREATE POLICY "Allow public select on system_settings" ON public.system_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated write on system_settings" ON public.system_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 6. Fix RLS Policy Always True on public.waste_types
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on waste_types" ON public.waste_types;
DROP POLICY IF EXISTS "Allow authenticated write on waste_types" ON public.waste_types;

CREATE POLICY "Allow public select on waste_types" ON public.waste_types
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated write on waste_types" ON public.waste_types
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
