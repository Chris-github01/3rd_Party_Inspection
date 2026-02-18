/*
  # Create Inspection Packages Table for Site Mode

  1. New Tables
    - `inspection_packages`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text) - Package display name
      - `material_id` (uuid, foreign key to fire_protection_materials)
      - `fire_scenario` (text) - Cellulosic, Hydrocarbon, etc.
      - `frr_minutes` (integer) - Fire resistance rating in minutes
      - `required_thickness_unit` (text) - microns or mm
      - `required_thickness_value` (numeric) - Required thickness value
      - `section_factor_required` (boolean) - Whether section factor is needed
      - `notes` (text) - Additional notes
      - `is_default` (boolean) - Whether this is the default package
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `inspection_packages` table
    - Add policies for authenticated users to manage packages for their projects
*/

CREATE TABLE IF NOT EXISTS inspection_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  material_id uuid REFERENCES fire_protection_materials(id) ON DELETE SET NULL,
  fire_scenario text NOT NULL DEFAULT 'Cellulosic',
  frr_minutes integer NOT NULL DEFAULT 120,
  required_thickness_unit text NOT NULL DEFAULT 'microns',
  required_thickness_value numeric NOT NULL DEFAULT 0,
  section_factor_required boolean NOT NULL DEFAULT false,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fire_scenario_check CHECK (fire_scenario IN ('Cellulosic', 'Hydrocarbon', 'Jet Fire', 'Tunnel', 'Mixed')),
  CONSTRAINT thickness_unit_check CHECK (required_thickness_unit IN ('microns', 'mm'))
);

ALTER TABLE inspection_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inspection packages"
  ON inspection_packages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inspection packages"
  ON inspection_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inspection packages"
  ON inspection_packages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inspection packages"
  ON inspection_packages
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_inspection_packages_project_id ON inspection_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_inspection_packages_is_default ON inspection_packages(project_id, is_default) WHERE is_default = true;