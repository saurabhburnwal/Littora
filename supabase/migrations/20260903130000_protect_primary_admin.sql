-- Migration: 20260903130000_protect_primary_admin.sql
-- Description: Implement database-level trigger protecting primary administrator from deletion
-- Fixes MITRE ATT&CK T1505 / OWASP Top 10 A04 (Insecure Design / Broken Access Control)
-- Prevents accidental or unauthorized deletion of the primary administrator account in auth.users.

-- 1. Ensure system_settings has a configurable entry for primary_admin_email
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'primary_admin_email',
  'admin@littora.app',
  'Primary system administrator email protected from account deletion'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Create guard function with secure search_path and error message
CREATE OR REPLACE FUNCTION public.fn_protect_primary_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_email text;
BEGIN
  -- Retrieve configured primary admin email, fallback to default if unset
  SELECT value INTO v_admin_email
  FROM public.system_settings
  WHERE key = 'primary_admin_email';

  IF v_admin_email IS NULL OR TRIM(v_admin_email) = '' THEN
    v_admin_email := 'admin@littora.app';
  END IF;

  -- Block deletion if targeted user email matches primary administrator
  IF LOWER(TRIM(COALESCE(OLD.email, ''))) = LOWER(TRIM(v_admin_email)) THEN
    RAISE EXCEPTION 'Primary administrator account cannot be deleted: %', OLD.email;
  END IF;

  RETURN OLD;
END;
$$;

-- 3. Revoke public execution of administrative trigger function
REVOKE EXECUTE ON FUNCTION public.fn_protect_primary_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_protect_primary_admin() TO postgres, service_role;

-- 4. Attach BEFORE DELETE trigger on auth.users
DROP TRIGGER IF EXISTS trg_protect_primary_admin ON auth.users;
CREATE TRIGGER trg_protect_primary_admin
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_primary_admin();
