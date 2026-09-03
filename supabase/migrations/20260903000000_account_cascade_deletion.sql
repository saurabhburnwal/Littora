-- Migration: 20260903000000_account_cascade_deletion.sql
-- Description: Ensures cascading deletion from auth.users to public.analyses
-- When an account is deleted, foreign key constraints cleanly remove all orphaned analyses.

ALTER TABLE public.analyses
  DROP CONSTRAINT IF EXISTS analyses_user_id_fkey;

ALTER TABLE public.analyses
  ADD CONSTRAINT analyses_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
