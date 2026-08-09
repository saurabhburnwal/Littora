-- Migration: Revoke Direct RPC Execution on Trigger Functions
-- Resolves "Public Can Execute SECURITY DEFINER Function" and "Signed-In Users Can Execute SECURITY DEFINER Function" linter advisories.

-- 1. Ensure fn_sync_system_active_model function is secured
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

-- 2. Revoke direct RPC execution privileges from anon, authenticated, and PUBLIC roles
REVOKE EXECUTE ON FUNCTION public.fn_sync_system_active_model() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_sync_system_active_model() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_system_active_model() FROM authenticated;
