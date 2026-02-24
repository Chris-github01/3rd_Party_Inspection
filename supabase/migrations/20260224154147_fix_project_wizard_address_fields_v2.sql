/*
  # Fix Project Wizard Address Fields
  
  1. Schema Updates
    - Add missing address fields for project wizard
    - Add geographic location fields
    - Add project setup mode tracking fields
    
  2. New Columns Added
    - address_line: Street address line
    - suburb: Suburb/neighborhood
    - city: City name
    - postcode: Postal/ZIP code
    - country: Country name (default 'New Zealand')
    - latitude: Geographic latitude
    - longitude: Geographic longitude
    - what3words: What3Words location code
    - site_type: Site classification (default 'single_site')
    - package: Project package identifier
    - drawing_mode: Drawing availability mode
    - setup_mode: How project was created (template/duplicate/hybrid)
    - source_project_id: Reference to cloned/template project
    - cloned_elements_json: Tracks which elements were cloned
    
  3. Indexes
    - Performance indexes on lookup fields
    
  4. Important Notes
    - Uses IF NOT EXISTS to prevent errors on re-run
    - Maintains backward compatibility with existing site_address field
*/

-- Add address breakdown fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS suburb text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS country text DEFAULT 'New Zealand';

-- Add geographic coordinates
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS what3words text;

-- Add site classification
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_type text DEFAULT 'single_site';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS package text;

-- Add drawing mode with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'drawing_mode'
  ) THEN
    ALTER TABLE projects ADD COLUMN drawing_mode text 
      CHECK (drawing_mode IN ('with_drawings', 'without_drawings'));
  END IF;
END $$;

-- Add setup tracking fields with constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'setup_mode'
  ) THEN
    ALTER TABLE projects ADD COLUMN setup_mode text 
      CHECK (setup_mode IN ('template', 'duplicate', 'hybrid'));
  END IF;
END $$;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_project_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloned_elements_json jsonb DEFAULT '{}'::jsonb;

-- Add foreign key for source project
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_source_project_id_fkey'
    AND table_name = 'projects'
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
CREATE INDEX IF NOT EXISTS idx_projects_city ON projects(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_country ON projects(country);

-- Add helpful comments
COMMENT ON COLUMN projects.address_line IS 'Primary street address line';
COMMENT ON COLUMN projects.site_address IS 'Full combined address string (legacy/composite field)';
COMMENT ON COLUMN projects.setup_mode IS 'How project was created: template (from template), duplicate (cloned project), hybrid (template + settings import)';
COMMENT ON COLUMN projects.source_project_id IS 'Reference to project that was duplicated or used for settings import';
COMMENT ON COLUMN projects.cloned_elements_json IS 'Stores which elements were cloned: members, materials, templates, etc.';
COMMENT ON COLUMN projects.drawing_mode IS 'Whether project uses drawings: with_drawings or without_drawings';
