/*
  # Link Inspection AI to Core Projects & Clients

  ## What This Does
  Connects the AI inspection module to the app's existing clients and projects
  tables via optional foreign keys. No data is deleted or modified — all new
  columns are nullable so existing rows continue to work unchanged.

  ## Changes

  ### inspection_ai_projects
  - Add `client_id` (nullable FK → clients.id) — links to the real client record
  - Add `linked_project_id` (nullable FK → projects.id) — links to a core project
  - Add index on `client_id` for fast client-scoped queries
  - Add index on `linked_project_id`

  ### inspection_ai_reports
  - Add `client_id` (nullable FK → clients.id)
  - Add `linked_project_id` (nullable FK → projects.id)
  - Add index on `client_id`

  ## Notes
  - All FK columns are nullable — backward compatible, no migration of old data needed
  - ON DELETE SET NULL so deleting a client/project does not cascade-delete AI data
*/

-- inspection_ai_projects: add client_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_projects' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE inspection_ai_projects
      ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_projects: add linked_project_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_projects' AND column_name = 'linked_project_id'
  ) THEN
    ALTER TABLE inspection_ai_projects
      ADD COLUMN linked_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_reports: add client_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_reports: add linked_project_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'linked_project_id'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN linked_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_projects_client_id
  ON inspection_ai_projects(client_id);

CREATE INDEX IF NOT EXISTS idx_ai_projects_linked_project_id
  ON inspection_ai_projects(linked_project_id);

CREATE INDEX IF NOT EXISTS idx_ai_reports_client_id
  ON inspection_ai_reports(client_id);

CREATE INDEX IF NOT EXISTS idx_ai_reports_linked_project_id
  ON inspection_ai_reports(linked_project_id);
