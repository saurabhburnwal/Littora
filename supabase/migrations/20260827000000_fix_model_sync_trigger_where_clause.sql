-- Migration: Fix Function fn_sync_system_active_model WHERE clause for safeupdate compatibility
-- Adds WHERE id IS NOT NULL so PostgreSQL safeupdate extension allows the bulk status update.

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
    SET is_active = (id = NEW.value)
    WHERE id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;
