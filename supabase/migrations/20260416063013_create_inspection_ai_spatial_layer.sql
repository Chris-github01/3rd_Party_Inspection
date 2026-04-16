/*
  # Inspection AI — Spatial Layer (Blocks, Levels, Drawings, Pins)

  ## Summary
  Adds a full spatial hierarchy to the Inspection AI module so every defect
  finding can be located exactly on a drawing, with percentage-based pin
  coordinates that work across all screen sizes.

  ## New Tables

  ### inspection_ai_blocks
  - A physical block or zone within a project (e.g. "Block A", "Tower 1")
  - Fields: id, project_id (FK → inspection_ai_projects), name, created_at

  ### inspection_ai_levels
  - A floor or level within a block (e.g. "Level 3", "Basement", "Roof")
  - Fields: id, block_id (FK → inspection_ai_blocks), name, created_at

  ### inspection_ai_drawings
  - A drawing (floor plan / structural drawing) uploaded for a level
  - Fields: id, level_id (FK → inspection_ai_levels), name, file_url,
            file_type ('image' | 'pdf'), created_at

  ### inspection_ai_pins
  - A spatial pin placed on a drawing, linked to an inspection item
  - Fields: id, drawing_id (FK → inspection_ai_drawings), item_id
            (FK → inspection_ai_items, nullable), x_percent, y_percent,
            severity (cached for colouring), created_at

  ## Security
  - RLS enabled on all four tables
  - Access controlled through the project ownership chain (user_id checks
    walk the FK chain back to inspection_ai_projects.user_id)

  ## Storage
  - New bucket: inspection-ai-drawings (PDF + image uploads)

  ## Notes
  1. Pins use x_percent / y_percent (0-100) so they render correctly
     regardless of screen or zoom level
  2. item_id on pins is nullable so a pin can be placed before an
     inspection item is created (placeholder workflow)
  3. severity is denormalised onto pins to allow colour-coding without
     a join at render time
*/

-- ─────────────────────────────────────────────
-- Blocks
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_blocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES inspection_ai_projects(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai blocks"
  ON inspection_ai_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_projects p
      WHERE p.id = inspection_ai_blocks.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai blocks"
  ON inspection_ai_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_projects p
      WHERE p.id = inspection_ai_blocks.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai blocks"
  ON inspection_ai_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_projects p
      WHERE p.id = inspection_ai_blocks.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_projects p
      WHERE p.id = inspection_ai_blocks.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai blocks"
  ON inspection_ai_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_projects p
      WHERE p.id = inspection_ai_blocks.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_blocks_project_id ON inspection_ai_blocks(project_id);

-- ─────────────────────────────────────────────
-- Levels
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_levels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id   uuid NOT NULL REFERENCES inspection_ai_blocks(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai levels"
  ON inspection_ai_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_blocks b
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE b.id = inspection_ai_levels.block_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai levels"
  ON inspection_ai_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_blocks b
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE b.id = inspection_ai_levels.block_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai levels"
  ON inspection_ai_levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_blocks b
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE b.id = inspection_ai_levels.block_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_blocks b
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE b.id = inspection_ai_levels.block_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai levels"
  ON inspection_ai_levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_blocks b
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE b.id = inspection_ai_levels.block_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_levels_block_id ON inspection_ai_levels(block_id);

-- ─────────────────────────────────────────────
-- Drawings
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_drawings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id   uuid NOT NULL REFERENCES inspection_ai_levels(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  file_url   text NOT NULL DEFAULT '',
  file_type  text NOT NULL DEFAULT 'image',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai drawings"
  ON inspection_ai_drawings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_levels l
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE l.id = inspection_ai_drawings.level_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai drawings"
  ON inspection_ai_drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_levels l
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE l.id = inspection_ai_drawings.level_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai drawings"
  ON inspection_ai_drawings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_levels l
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE l.id = inspection_ai_drawings.level_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_levels l
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE l.id = inspection_ai_drawings.level_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai drawings"
  ON inspection_ai_drawings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_levels l
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE l.id = inspection_ai_drawings.level_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_drawings_level_id ON inspection_ai_drawings(level_id);

-- ─────────────────────────────────────────────
-- Pins
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_pins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id  uuid NOT NULL REFERENCES inspection_ai_drawings(id) ON DELETE CASCADE,
  item_id     uuid REFERENCES inspection_ai_items(id) ON DELETE SET NULL,
  x_percent   numeric NOT NULL DEFAULT 50,
  y_percent   numeric NOT NULL DEFAULT 50,
  severity    text NOT NULL DEFAULT 'Medium',
  label       text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai pins"
  ON inspection_ai_pins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_drawings d
      JOIN inspection_ai_levels l ON l.id = d.level_id
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE d.id = inspection_ai_pins.drawing_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai pins"
  ON inspection_ai_pins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_drawings d
      JOIN inspection_ai_levels l ON l.id = d.level_id
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE d.id = inspection_ai_pins.drawing_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai pins"
  ON inspection_ai_pins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_drawings d
      JOIN inspection_ai_levels l ON l.id = d.level_id
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE d.id = inspection_ai_pins.drawing_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_drawings d
      JOIN inspection_ai_levels l ON l.id = d.level_id
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE d.id = inspection_ai_pins.drawing_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai pins"
  ON inspection_ai_pins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_drawings d
      JOIN inspection_ai_levels l ON l.id = d.level_id
      JOIN inspection_ai_blocks b ON b.id = l.block_id
      JOIN inspection_ai_projects p ON p.id = b.project_id
      WHERE d.id = inspection_ai_pins.drawing_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_pins_drawing_id ON inspection_ai_pins(drawing_id);
CREATE INDEX IF NOT EXISTS idx_ai_pins_item_id    ON inspection_ai_pins(item_id);

-- ─────────────────────────────────────────────
-- Drawing storage bucket
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-ai-drawings',
  'inspection-ai-drawings',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload ai drawings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-ai-drawings');

CREATE POLICY "Anyone can read ai drawings"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'inspection-ai-drawings');

CREATE POLICY "Authenticated users can delete own ai drawings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inspection-ai-drawings');
