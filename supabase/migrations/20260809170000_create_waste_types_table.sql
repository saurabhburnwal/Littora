-- Migration: Create public.waste_types catalog table and link detection types
-- Relocates waste classifications, human-readable names, categories, and recyclability flags into Postgres.

-- 1. Create waste_types table
CREATE TABLE IF NOT EXISTS public.waste_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_recyclable BOOLEAN NOT NULL DEFAULT FALSE,
  color_hex TEXT NOT NULL DEFAULT '#0d9488',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed Waste Types Catalog
INSERT INTO public.waste_types (id, name, category, is_recyclable, color_hex)
VALUES
  ('bottle',         'Plastic Bottle', 'Plastic',  true,  '#0077B6'),
  ('plastic_bottle', 'Plastic Bottle', 'Plastic',  true,  '#0077B6'),
  ('bag',            'Plastic Bag',    'Plastic',  false, '#4CC9F0'),
  ('plastic_bag',    'Plastic Bag',    'Plastic',  false, '#4CC9F0'),
  ('can',            'Metal Can',      'Metal',    true,  '#90BE6D'),
  ('metal_can',      'Metal Can',      'Metal',    true,  '#90BE6D'),
  ('wrapper',        'Food Wrapper',   'Polymer',  false, '#F8961E'),
  ('styrofoam',      'Styrofoam/Foam', 'Foam',     false, '#F94144'),
  ('cigarette_butt', 'Cigarette Butt', 'Toxic',    false, '#D97706'),
  ('glass',          'Glass Bottle',   'Glass',    true,  '#577590'),
  ('glass_bottle',   'Glass Bottle',   'Glass',    true,  '#577590'),
  ('cardboard',      'Cardboard Box',  'Paper',    true,  '#9C89B8')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_recyclable = EXCLUDED.is_recyclable,
  color_hex = EXCLUDED.color_hex;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.waste_types ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow public select on waste_types" ON public.waste_types;
CREATE POLICY "Allow public select on waste_types" ON public.waste_types
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated write on waste_types" ON public.waste_types;
CREATE POLICY "Allow authenticated write on waste_types" ON public.waste_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
