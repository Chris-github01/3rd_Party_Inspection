/*
  # Add Drawing Preview Storage System

  This migration adds support for pre-generated drawing page previews to ensure
  reliable PDF export rendering without relying on live canvas capture.

  ## Changes to `drawings` table

  ### New Columns
  - `preview_bucket` (text) - Storage bucket name for previews
  - `preview_paths` (jsonb) - Array of storage paths for each page preview
  - `page_count` (integer) - Total number of pages in the drawing
  - `preview_generated_at` (timestamptz) - When previews were generated
  - `preview_width` (integer) - Width of generated preview images
  - `preview_height` (integer) - Height of generated preview images

  ## Changes to `drawing_pins` table

  ### New Columns
  - `x_normalized` (numeric) - Normalized x coordinate (0-1 range)
  - `y_normalized` (numeric) - Normalized y coordinate (0-1 range)
  - `canvas_width` (integer) - Width of canvas when pin was placed
  - `canvas_height` (integer) - Height of canvas when pin was placed

  ## Security
  - No RLS changes needed (inherited from existing policies)
*/

-- Add preview storage columns to drawings table
ALTER TABLE drawings
ADD COLUMN IF NOT EXISTS preview_bucket text DEFAULT 'drawing-previews',
ADD COLUMN IF NOT EXISTS preview_paths jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS page_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS preview_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS preview_width integer,
ADD COLUMN IF NOT EXISTS preview_height integer;

-- Add normalized coordinate columns to drawing_pins table
ALTER TABLE drawing_pins
ADD COLUMN IF NOT EXISTS x_normalized numeric,
ADD COLUMN IF NOT EXISTS y_normalized numeric,
ADD COLUMN IF NOT EXISTS canvas_width integer,
ADD COLUMN IF NOT EXISTS canvas_height integer;

-- Create index for faster preview lookups
CREATE INDEX IF NOT EXISTS idx_drawings_preview_generated 
ON drawings(preview_generated_at) 
WHERE preview_generated_at IS NOT NULL;

-- Function to migrate existing pixel coordinates to normalized
CREATE OR REPLACE FUNCTION normalize_pin_coordinates()
RETURNS void AS $$
BEGIN
  -- Update pins that have pixel coordinates but no normalized coordinates
  UPDATE drawing_pins
  SET 
    x_normalized = CASE 
      WHEN canvas_width > 0 THEN x / canvas_width 
      ELSE x 
    END,
    y_normalized = CASE 
      WHEN canvas_height > 0 THEN y / canvas_height 
      ELSE y 
    END
  WHERE x_normalized IS NULL 
    AND y_normalized IS NULL
    AND x IS NOT NULL 
    AND y IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Populate page_count from existing page_number data
UPDATE drawings d
SET page_count = (
  SELECT COALESCE(MAX(dp.page_number), 1)
  FROM drawing_pins dp
  WHERE dp.drawing_id = d.id
)
WHERE page_count = 1;

COMMENT ON COLUMN drawings.preview_bucket IS 'Supabase Storage bucket name for preview images';
COMMENT ON COLUMN drawings.preview_paths IS 'JSON array of preview image paths, one per page';
COMMENT ON COLUMN drawings.page_count IS 'Total number of pages in the drawing document';
COMMENT ON COLUMN drawings.preview_generated_at IS 'Timestamp when preview images were last generated';
COMMENT ON COLUMN drawing_pins.x_normalized IS 'X coordinate normalized to 0-1 range for resolution-independent positioning';
COMMENT ON COLUMN drawing_pins.y_normalized IS 'Y coordinate normalized to 0-1 range for resolution-independent positioning';
