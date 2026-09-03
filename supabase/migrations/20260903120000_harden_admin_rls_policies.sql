-- Migration: 20260903120000_harden_admin_rls_policies.sql
-- Description: Revoke overly broad authenticated write permissions on administrative tables
-- Fixes OWASP Top 10 A01: Broken Access Control & MITRE ATT&CK T1078 (Valid Accounts / Data API Escalation)
-- Ensures ai_models, system_settings, waste_types, and locations are read-only for anon/authenticated,
-- with write operations (INSERT, UPDATE, DELETE) strictly restricted to service_role.

-- 1. Ensure Row Level Security is enabled on all administrative & reference tables
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 2. Drop overly permissive pseudo-RLS write policies that allowed any authenticated user to mutate rows
DROP POLICY IF EXISTS "Allow authenticated write on ai_models" ON public.ai_models;
DROP POLICY IF EXISTS "Allow authenticated write on system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated write on waste_types" ON public.waste_types;
DROP POLICY IF EXISTS "Allow authenticated update on locations" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated insert on locations" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated write on locations" ON public.locations;

-- 3. Revoke table-level DML privileges (INSERT, UPDATE, DELETE) from anon and authenticated roles
REVOKE INSERT, UPDATE, DELETE ON public.ai_models FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.system_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.waste_types FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.locations FROM anon, authenticated;

-- 4. Ensure SELECT permissions remain granted to anon and authenticated for read access
GRANT SELECT ON public.ai_models TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT SELECT ON public.waste_types TO anon, authenticated;
GRANT SELECT ON public.locations TO anon, authenticated;

-- 5. Restrict all write operations strictly to the backend service_role
GRANT ALL PRIVILEGES ON public.ai_models TO service_role;
GRANT ALL PRIVILEGES ON public.system_settings TO service_role;
GRANT ALL PRIVILEGES ON public.waste_types TO service_role;
GRANT ALL PRIVILEGES ON public.locations TO service_role;

-- 6. Guarantee explicit, safe public SELECT policies on all reference tables
DROP POLICY IF EXISTS "Allow public select on ai_models" ON public.ai_models;
CREATE POLICY "Allow public select on ai_models" ON public.ai_models
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public select on system_settings" ON public.system_settings;
CREATE POLICY "Allow public select on system_settings" ON public.system_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public select on waste_types" ON public.waste_types;
CREATE POLICY "Allow public select on waste_types" ON public.waste_types
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public select on locations" ON public.locations;
CREATE POLICY "Allow public select on locations" ON public.locations
  FOR SELECT TO public USING (true);
