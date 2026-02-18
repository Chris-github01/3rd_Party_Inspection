/*
  # Create Pin Photos System

  1. New Tables
    - `pin_photos` - Store photo metadata for pins
      - `id` (uuid, primary key)
      - `pin_id` (uuid, foreign key to drawing_pins)
      - `project_id` (uuid, foreign key to projects)
      - `file_path` (text) - Storage path in Supabase
      - `file_name` (text) - Original filename
      - `file_size` (integer) - File size in bytes
      - `mime_type` (text) - Image MIME type
      - `caption` (text) - Optional photo caption
      - `sort_order` (integer) - Display order
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create storage bucket for pin photos
    - Set up RLS policies for secure access

  3. Security
    - Enable RLS on pin_photos table
    - Add policies for authenticated users
    - Restrict access based on project ownership

  4. Indexes
    - Index on pin_id for fast photo retrieval
    - Index on project_id for project-level queries
*/

-- Create pin_photos table
CREATE TABLE IF NOT EXISTS pin_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES drawing_pins(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT 'image/jpeg',
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pin_photos_pin_id ON pin_photos(pin_id);
CREATE INDEX IF NOT EXISTS idx_pin_photos_project_id ON pin_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_pin_photos_created_at ON pin_photos(created_at DESC);

-- Enable RLS
ALTER TABLE pin_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pin_photos
CREATE POLICY "Users can view pin photos in their projects"
  ON pin_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = pin_photos.project_id
      AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pin photos in their projects"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = pin_photos.project_id
      AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pin photos in their projects"
  ON pin_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = pin_photos.project_id
      AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pin photos in their projects"
  ON pin_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = pin_photos.project_id
      AND p.created_by_user_id = auth.uid()
    )
  );

-- Create storage bucket for pin photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pin-photos', 'pin-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pin-photos bucket
CREATE POLICY "Users can view pin photos in their projects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND
    EXISTS (
      SELECT 1 FROM pin_photos pp
      JOIN projects p ON p.id = pp.project_id
      WHERE pp.file_path = storage.objects.name
      AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload pin photos to their projects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pin-photos'
  );

CREATE POLICY "Users can update pin photos in their projects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND
    EXISTS (
      SELECT 1 FROM pin_photos pp
      JOIN projects p ON p.id = pp.project_id
      WHERE pp.file_path = storage.objects.name
      AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pin photos in their projects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND
    EXISTS (
      SELECT 1 FROM pin_photos pp
      JOIN projects p ON p.id = pp.project_id
      WHERE pp.file_path = storage.objects.name
      AND p.created_by_user_id = auth.uid()
    )
  );

-- Function to get pin photos with URLs
CREATE OR REPLACE FUNCTION get_pin_photos_with_urls(p_pin_id uuid)
RETURNS TABLE (
  id uuid,
  pin_id uuid,
  file_path text,
  file_name text,
  file_size integer,
  mime_type text,
  caption text,
  sort_order integer,
  created_at timestamptz,
  storage_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.pin_id,
    pp.file_path,
    pp.file_name,
    pp.file_size,
    pp.mime_type,
    pp.caption,
    pp.sort_order,
    pp.created_at,
    pp.file_path as storage_url
  FROM pin_photos pp
  WHERE pp.pin_id = p_pin_id
  ORDER BY pp.sort_order ASC, pp.created_at ASC;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pin_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pin_photos_updated_at_trigger
  BEFORE UPDATE ON pin_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_pin_photos_updated_at();