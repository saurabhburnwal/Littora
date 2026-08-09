-- Migration: Link public.system_settings.value directly to public.ai_models(id) via Foreign Key
-- Displays Foreign Key linkage icon in Supabase Dashboard and enforces referential integrity.

-- 1. Ensure existing value in system_settings references valid ai_models.id
UPDATE public.system_settings
SET value = 'yolov11m'
WHERE key = 'active_ai_model' AND (value IS NULL OR value IN ('YOLOv11 Medium', 'yolov11m'));

-- 2. Add Foreign Key constraint on public.system_settings.value -> public.ai_models.id
ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_value_ai_models_fkey;

ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_value_ai_models_fkey
  FOREIGN KEY (value) REFERENCES public.ai_models(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
