-- Baseline Schema Migration for Littora Beach Waste Platform

-- 1. Create public.analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  total_waste INT NOT NULL DEFAULT 0,
  pollution_score NUMERIC NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_label TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create public.detections table
CREATE TABLE IF NOT EXISTS public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

-- 4. Granular Production RLS Policies for Analyses
DROP POLICY IF EXISTS "Allow public select on analyses" ON public.analyses;
CREATE POLICY "Allow public select on analyses" ON public.analyses 
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on analyses" ON public.analyses;
CREATE POLICY "Allow authenticated insert on analyses" ON public.analyses 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow owner delete on analyses" ON public.analyses;
CREATE POLICY "Allow owner delete on analyses" ON public.analyses 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Granular Production RLS Policies for Detections
DROP POLICY IF EXISTS "Allow public select on detections" ON public.detections;
CREATE POLICY "Allow public select on detections" ON public.detections 
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on detections" ON public.detections;
CREATE POLICY "Allow authenticated insert on detections" ON public.detections 
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses 
      WHERE analyses.id = detections.analysis_id AND (analyses.user_id = auth.uid() OR analyses.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Allow owner delete on detections" ON public.detections;
CREATE POLICY "Allow owner delete on detections" ON public.detections 
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.analyses 
      WHERE analyses.id = detections.analysis_id AND analyses.user_id = auth.uid()
    )
  );

-- 6. Indexes for Performance Scaling
CREATE INDEX IF NOT EXISTS idx_analyses_coords ON public.analyses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
