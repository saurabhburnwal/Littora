-- Migration: Create public.system_settings and public.ai_models tables
-- Relocates all system configuration and available AI model data into the Postgres database.

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create ai_models table
CREATE TABLE IF NOT EXISTS public.ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  architecture TEXT NOT NULL,
  params TEXT NOT NULL,
  description TEXT NOT NULL,
  badge TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Pre-populate available AI models
INSERT INTO public.ai_models (id, name, tag, architecture, params, description, badge, is_active)
VALUES 
  ('yolov8m',  'YOLOv8 Medium',  'Standard Baseline', 'YOLOv8m',  '25.9M', 'Balanced speed & precision for general coastal debris detection.', 'Default', false),
  ('yolov11m', 'YOLOv11 Medium', 'Enhanced Accuracy', 'YOLOv11m', '20.1M', 'Enhanced feature extraction & attention mechanisms for complex or occluded waste.', 'High Precision', true),
  ('yolov26s', 'YOLOv26 Small',  'Ultra-Fast Edge',   'YOLOv26s',  '9.6M',  'Lightweight, low-latency inference optimized for real-time mobile & drone feeds.', 'Fastest', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tag = EXCLUDED.tag,
  architecture = EXCLUDED.architecture,
  params = EXCLUDED.params,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge;

-- 4. Pre-populate default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES ('active_ai_model', 'yolov11m', 'System-wide active YOLO AI model used for waste detection')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for system_settings
DROP POLICY IF EXISTS "Allow public select on system_settings" ON public.system_settings;
CREATE POLICY "Allow public select on system_settings" ON public.system_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated write on system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated write on system_settings" ON public.system_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. RLS Policies for ai_models
DROP POLICY IF EXISTS "Allow public select on ai_models" ON public.ai_models;
CREATE POLICY "Allow public select on ai_models" ON public.ai_models
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated write on ai_models" ON public.ai_models;
CREATE POLICY "Allow authenticated write on ai_models" ON public.ai_models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
