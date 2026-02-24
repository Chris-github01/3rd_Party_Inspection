/*
  # Add Missing Template Columns to Projects Table

  ## Problem
  The project creation wizard expects template reference columns that are missing from the projects table,
  causing "Could not find the 'intumescent_template_id' column" errors.

  ## Changes
  1. Add template reference columns to projects table
     - intumescent_template_id: Reference to intumescent fire protection template
     - cementitious_template_id: Reference to cementitious fire protection template
     - ncr_template_id: Reference to non-conformance report template
     - default_report_profile_id: Reference to default report profile
  
  2. Add foreign key constraints linking to form_templates and report_profiles tables
  
  ## Security
  - Uses IF NOT EXISTS to prevent errors on re-run
  - Foreign keys ensure referential integrity
*/

-- Add template reference columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intumescent_template_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cementitious_template_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncr_template_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_report_profile_id uuid;

-- Add foreign key constraints
DO $$
BEGIN
  -- Link to form_templates for intumescent template
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_intumescent_template_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_intumescent_template_id_fkey
      FOREIGN KEY (intumescent_template_id)
      REFERENCES form_templates(id)
      ON DELETE SET NULL;
  END IF;

  -- Link to form_templates for cementitious template
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_cementitious_template_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_cementitious_template_id_fkey
      FOREIGN KEY (cementitious_template_id)
      REFERENCES form_templates(id)
      ON DELETE SET NULL;
  END IF;

  -- Link to form_templates for NCR template
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_ncr_template_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_ncr_template_id_fkey
      FOREIGN KEY (ncr_template_id)
      REFERENCES form_templates(id)
      ON DELETE SET NULL;
  END IF;

  -- Link to report_profiles for default report profile
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_default_report_profile_id_fkey'
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_default_report_profile_id_fkey
      FOREIGN KEY (default_report_profile_id)
      REFERENCES report_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_intumescent_template_id ON projects(intumescent_template_id);
CREATE INDEX IF NOT EXISTS idx_projects_cementitious_template_id ON projects(cementitious_template_id);
CREATE INDEX IF NOT EXISTS idx_projects_ncr_template_id ON projects(ncr_template_id);
CREATE INDEX IF NOT EXISTS idx_projects_default_report_profile_id ON projects(default_report_profile_id);

-- Add comments for documentation
COMMENT ON COLUMN projects.intumescent_template_id IS 'Reference to the intumescent fire protection inspection template used for this project';
COMMENT ON COLUMN projects.cementitious_template_id IS 'Reference to the cementitious fire protection inspection template used for this project';
COMMENT ON COLUMN projects.ncr_template_id IS 'Reference to the non-conformance report template used for this project';
COMMENT ON COLUMN projects.default_report_profile_id IS 'Reference to the default report profile configuration for this project';
