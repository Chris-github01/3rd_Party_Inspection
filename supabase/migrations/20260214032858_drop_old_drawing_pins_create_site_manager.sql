/*
  # Drop Old Drawing Pins and Create Complete Site Manager Schema
  
  1. Drop existing drawing_pins table (from old schema)
  2. Create complete Site Manager hierarchy:
     Blocks → Levels → Drawings → Drawing Pins
  
  1. New Tables
    - `blocks` - Building blocks/sections
    - `levels` - Floors/levels within blocks
    - `drawings` - Drawing documents per level
    - `drawing_pins` - Pin locations on drawings
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on project access
*/

-- Drop old drawing_pins table if it exists
DROP TABLE IF EXISTS drawing_pins CASCADE;

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create levels table
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  page_number integer DEFAULT 1,
  preview_image_path text,
  scale_factor numeric,
  created_at timestamptz DEFAULT now()
);

-- Create drawing_pins table
CREATE TABLE IF NOT EXISTS drawing_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id uuid NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  level_id uuid NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL,
  x numeric NOT NULL CHECK (x >= 0 AND x <= 1),
  y numeric NOT NULL CHECK (y >= 0 AND y <= 1),
  label text NOT NULL,
  pin_type text NOT NULL CHECK (pin_type IN ('inspection', 'member', 'ncr', 'note')),
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pass', 'repair_required')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_levels_block_id ON levels(block_id);
CREATE INDEX IF NOT EXISTS idx_levels_order ON levels(block_id, order_index);
CREATE INDEX IF NOT EXISTS idx_drawings_level_id ON drawings(level_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_drawing_id ON drawing_pins(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_project_id ON drawing_pins(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_member_id ON drawing_pins(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drawing_pins_inspection_id ON drawing_pins(inspection_id) WHERE inspection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drawing_pins_status ON drawing_pins(status);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_type ON drawing_pins(pin_type);

-- Enable Row Level Security
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_pins ENABLE ROW LEVEL SECURITY;

-- Blocks policies
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

-- Levels policies
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

-- Drawings policies
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

-- Drawing pins policies
CREATE POLICY "Users can view pins for their projects"
  ON drawing_pins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );

CREATE POLICY "Users can create pins for their projects"
  ON drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );

CREATE POLICY "Users can update pins for their projects"
  ON drawing_pins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );

CREATE POLICY "Users can delete pins for their projects"
  ON drawing_pins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );
