-- Migration: Link public.analyses.model_used to public.ai_models(id) via Foreign Key
-- Establishes referential integrity and historical audit protection for model inference records.

-- 1. Update existing model_used values in public.analyses to match public.ai_models.id
UPDATE public.analyses
SET model_used = 'yolov11m'
WHERE model_used IS NULL OR model_used IN ('YOLOv11 Medium', 'yolov11m');

UPDATE public.analyses
SET model_used = 'yolov8m'
WHERE model_used IN ('YOLOv8 Medium', 'yolov8m');

UPDATE public.analyses
SET model_used = 'yolov26s'
WHERE model_used IN ('YOLOv26 Small', 'yolov26s');

-- Fallback for any remaining unmapped values
UPDATE public.analyses
SET model_used = 'yolov11m'
WHERE model_used NOT IN (SELECT id FROM public.ai_models);

-- 2. Set default value for model_used column
ALTER TABLE public.analyses
  ALTER COLUMN model_used SET DEFAULT 'yolov11m';

-- 3. Add Foreign Key constraint (ON UPDATE CASCADE ON DELETE RESTRICT)
ALTER TABLE public.analyses
  DROP CONSTRAINT IF EXISTS analyses_model_used_fkey;

ALTER TABLE public.analyses
  ADD CONSTRAINT analyses_model_used_fkey
  FOREIGN KEY (model_used) REFERENCES public.ai_models(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
