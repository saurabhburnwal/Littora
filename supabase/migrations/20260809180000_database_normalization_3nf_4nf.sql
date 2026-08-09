-- Migration: Database Normalization to 3NF / 4NF
-- Enforces referential integrity, unique constraints, and spatial location normalization.

-- 1. Create normalized public.locations table (4NF spatial decoupling)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_label TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_location_coords UNIQUE (latitude, longitude)
);

-- Enable RLS on public.locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on locations" ON public.locations;
CREATE POLICY "Allow public select on locations" ON public.locations
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on locations" ON public.locations;
CREATE POLICY "Allow authenticated insert on locations" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Populate locations from existing distinct coordinates in analyses
INSERT INTO public.locations (location_label, latitude, longitude)
SELECT DISTINCT location_label, latitude, longitude
FROM public.analyses
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ON CONFLICT (latitude, longitude) DO UPDATE SET
  location_label = EXCLUDED.location_label;

-- Add location_id foreign key column to public.analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Backfill location_id in public.analyses
UPDATE public.analyses a
SET location_id = l.id
FROM public.locations l
WHERE a.latitude = l.latitude AND a.longitude = l.longitude
  AND a.location_id IS NULL;

-- 2. Add severity check constraint on public.analyses (3NF integrity)
ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS chk_analyses_severity;
ALTER TABLE public.analyses ADD CONSTRAINT chk_analyses_severity 
  CHECK (severity IN ('Low', 'Moderate', 'High', 'Severe'));

-- 3. Add foreign key constraint on public.detections.waste_type -> public.waste_types.id
ALTER TABLE public.detections DROP CONSTRAINT IF EXISTS detections_waste_type_fkey;
ALTER TABLE public.detections ADD CONSTRAINT detections_waste_type_fkey
  FOREIGN KEY (waste_type) REFERENCES public.waste_types(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4. Add unique composite constraint on public.detections (4NF non-redundancy)
ALTER TABLE public.detections DROP CONSTRAINT IF EXISTS unique_analysis_waste_type;
ALTER TABLE public.detections ADD CONSTRAINT unique_analysis_waste_type
  UNIQUE (analysis_id, waste_type);
