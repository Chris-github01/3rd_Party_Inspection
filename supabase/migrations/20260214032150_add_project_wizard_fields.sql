-- Add Project Wizard Fields
-- Adds fields to support 7-step project creation wizard with template, duplication, and hybrid modes

-- Add new fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_type text DEFAULT 'single_site';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS package text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drawing_mode text CHECK (drawing_mode IN ('with_drawings', 'without_drawings'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS country text DEFAULT 'New Zealand';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS suburb text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS what3words text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS setup_mode text CHECK (setup_mode IN ('template', 'duplicate', 'hybrid'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_project_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloned_elements_json jsonb DEFAULT '{}'::jsonb;

-- Add foreign key for source project
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_source_project_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_source_project_id_fkey
      FOREIGN KEY (source_project_id)
      REFERENCES projects(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_site_type ON projects(site_type);
CREATE INDEX IF NOT EXISTS idx_projects_drawing_mode ON projects(drawing_mode);
CREATE INDEX IF NOT EXISTS idx_projects_setup_mode ON projects(setup_mode);
CREATE INDEX IF NOT EXISTS idx_projects_source_project_id ON projects(source_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_what3words ON projects(what3words) WHERE what3words IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.setup_mode IS 'How project was created: template (from template), duplicate (cloned project), hybrid (template + settings import)';
COMMENT ON COLUMN projects.source_project_id IS 'Reference to project that was duplicated or used for settings import';
COMMENT ON COLUMN projects.cloned_elements_json IS 'Stores which elements were cloned: members, materials, templates, etc.';
