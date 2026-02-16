/*
  # Create Site Manager Tables (Blocks, Levels, Drawings)

  ## Overview
  Creates the complete Site Manager hierarchy for organizing project drawings
  and inspection pins by building blocks and levels.

  ## Tables Created
  1. **blocks** - Building blocks/sections within a project
  2. **levels** - Floors/levels within each block
  3. **drawings** - Drawing documents uploaded per level

  ## Structure
  - Projects → Blocks → Levels → Drawings → Drawing Pins
  - Allows hierarchical organization of construction sites
  - Supports multiple drawings per level

  ## Security
  - RLS enabled on all tables
  - Access controlled via project membership
  - Users can manage blocks/levels/drawings for their projects
*/

-- =====================================================
-- 1) BLOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocks for their projects"
  ON blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
    )
  );

CREATE POLICY "Users can create blocks for their projects"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
    )
  );

CREATE POLICY "Users can update blocks for their projects"
  ON blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
    )
  );

CREATE POLICY "Users can delete blocks for their projects"
  ON blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = blocks.project_id
    )
  );

-- =====================================================
-- 2) LEVELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_levels_block_id ON levels(block_id);
CREATE INDEX IF NOT EXISTS idx_levels_order ON levels(block_id, order_index);

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view levels for their projects"
  ON levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = levels.block_id
    )
  );

CREATE POLICY "Users can create levels for their projects"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = levels.block_id
    )
  );

CREATE POLICY "Users can update levels for their projects"
  ON levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = levels.block_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = levels.block_id
    )
  );

CREATE POLICY "Users can delete levels for their projects"
  ON levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blocks
      JOIN projects ON projects.id = blocks.project_id
      WHERE blocks.id = levels.block_id
    )
  );

-- =====================================================
-- 3) DRAWINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  page_number integer DEFAULT 1,
  preview_image_path text,
  scale_factor numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawings_level_id ON drawings(level_id);
CREATE INDEX IF NOT EXISTS idx_drawings_document_id ON drawings(document_id);

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drawings for their projects"
  ON drawings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

CREATE POLICY "Users can create drawings for their projects"
  ON drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

CREATE POLICY "Users can update drawings for their projects"
  ON drawings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

CREATE POLICY "Users can delete drawings for their projects"
  ON drawings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );