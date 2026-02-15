/*
  # Add Logo and Image Fields

  1. Changes to Tables
    - `clients`
      - Add `logo_path` (text, nullable) - Path to client company logo in storage
    - `projects`
      - Add `project_image_path` (text, nullable) - Path to project image in storage
    - Create new `organization_settings` table
      - `id` (uuid, primary key)
      - `organization_name` (text)
      - `logo_path` (text, nullable) - Path to P&R Consulting logo
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `organization_settings` table
    - Add policies for authenticated users to read/update settings

  3. Data
    - Insert default organization settings for P&R Consulting
*/

-- Add logo field to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'logo_path'
  ) THEN
    ALTER TABLE clients ADD COLUMN logo_path text;
  END IF;
END $$;

-- Add project image field to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_image_path'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_image_path text;
  END IF;
END $$;

-- Create organization settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL DEFAULT 'P&R Consulting Limited',
  logo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Policies for organization settings
CREATE POLICY "Anyone can read organization settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update organization settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default organization settings if not exists
INSERT INTO organization_settings (organization_name)
SELECT 'P&R Consulting Limited'
WHERE NOT EXISTS (SELECT 1 FROM organization_settings);
