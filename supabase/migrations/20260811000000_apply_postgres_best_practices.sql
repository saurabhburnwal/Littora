-- Migration: Apply Supabase Postgres Best Practices Recommendations
-- Fixes two CRITICAL violations identified in the schema audit:
--   1. security-rls-performance: Wrap auth.uid() in (SELECT auth.uid()) on analyses and detections RLS policies
--   2. query-missing-indexes: Add dedicated B-tree index on detections.analysis_id FK column

-- ============================================================
-- FIX 1: security-rls-performance
-- auth.uid() called directly in RLS policies causes the function
-- to be re-evaluated for every row scanned. Wrapping in (SELECT auth.uid())
-- causes Postgres to evaluate it once per statement and cache the result.
-- This is critical for query performance at scale.
-- ============================================================

-- Fix RLS policies on public.analyses
DROP POLICY IF EXISTS "Allow authenticated insert on analyses" ON public.analyses;
CREATE POLICY "Allow authenticated insert on analyses" ON public.analyses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Allow owner delete on analyses" ON public.analyses;
CREATE POLICY "Allow owner delete on analyses" ON public.analyses
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Fix RLS policies on public.detections
DROP POLICY IF EXISTS "Allow authenticated insert on detections" ON public.detections;
CREATE POLICY "Allow authenticated insert on detections" ON public.detections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = detections.analysis_id
        AND (analyses.user_id = (SELECT auth.uid()) OR analyses.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Allow owner delete on detections" ON public.detections;
CREATE POLICY "Allow owner delete on detections" ON public.detections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses
      WHERE analyses.id = detections.analysis_id
        AND analyses.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- FIX 2: query-missing-indexes
-- detections.analysis_id is a FK with ON DELETE CASCADE but has
-- no dedicated B-tree index. Without this index, cascade deletes
-- on analyses must perform a full sequential scan of detections,
-- causing unnecessary table locks and slow deletes at scale.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_detections_analysis_id ON public.detections(analysis_id);
