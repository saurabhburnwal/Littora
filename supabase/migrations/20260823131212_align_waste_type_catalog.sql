-- Align the waste catalog with the four classes emitted by the deployed model.
-- Historical unsupported classes remain available to satisfy existing detection FKs,
-- but are marked inactive and are not returned through the active catalog API.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.waste_types
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Fail safely if a new, unaccounted-for table also references the catalog.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'public.waste_types'::regclass
      AND conrelid <> 'public.detections'::regclass
  ) THEN
    RAISE EXCEPTION
      'waste_types has foreign-key dependents other than public.detections; inspect and migrate them before catalog consolidation';
  END IF;
END
$$;

INSERT INTO public.waste_types (id, name, category, is_recyclable, color_hex, is_active)
VALUES
  ('bottle',  'Plastic Bottle', 'Plastic', TRUE,  '#0077B6', TRUE),
  ('can',     'Metal Can',      'Metal',   TRUE,  '#90BE6D', TRUE),
  ('bag',     'Plastic Bag',    'Plastic', FALSE, '#4CC9F0', TRUE),
  ('wrapper', 'Food Wrapper',   'Polymer', FALSE, '#F8961E', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_recyclable = EXCLUDED.is_recyclable,
  color_hex = EXCLUDED.color_hex,
  is_active = TRUE;

-- Preserve an alias row's identity/timestamp when no target row exists.
WITH aliases (old_id, canonical_id) AS (
  VALUES
    ('plastic_bottle'::TEXT, 'bottle'::TEXT),
    ('plastic_bag'::TEXT,    'bag'::TEXT),
    ('metal_can'::TEXT,      'can'::TEXT),
    ('glass_bottle'::TEXT,   'glass'::TEXT)
)
UPDATE public.detections AS alias_detection
SET waste_type = aliases.canonical_id
FROM aliases
WHERE alias_detection.waste_type = aliases.old_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.detections AS canonical_detection
    WHERE canonical_detection.analysis_id = alias_detection.analysis_id
      AND canonical_detection.waste_type = aliases.canonical_id
  );

-- Merge counts when an analysis already has its canonical class.
WITH aliases (old_id, canonical_id) AS (
  VALUES
    ('plastic_bottle'::TEXT, 'bottle'::TEXT),
    ('plastic_bag'::TEXT,    'bag'::TEXT),
    ('metal_can'::TEXT,      'can'::TEXT),
    ('glass_bottle'::TEXT,   'glass'::TEXT)
)
UPDATE public.detections AS canonical_detection
SET count = canonical_detection.count + alias_detection.count
FROM public.detections AS alias_detection
JOIN aliases ON aliases.old_id = alias_detection.waste_type
WHERE canonical_detection.analysis_id = alias_detection.analysis_id
  AND canonical_detection.waste_type = aliases.canonical_id;

DELETE FROM public.detections
WHERE waste_type IN ('plastic_bottle', 'plastic_bag', 'metal_can', 'glass_bottle');

-- The current model only emits these four IDs. Referenced unsupported types
-- remain in the table as inactive historical metadata.
UPDATE public.waste_types
SET is_active = id IN ('bottle', 'can', 'bag', 'wrapper');

DELETE FROM public.waste_types AS waste_type
WHERE waste_type.id NOT IN ('bottle', 'can', 'bag', 'wrapper')
  AND NOT EXISTS (
    SELECT 1
    FROM public.detections AS detection
    WHERE detection.waste_type = waste_type.id
  );

COMMIT;
