/*
  # Add organization_id to All Tenant-Scoped Tables

  ## What This Does
  Adds the `organization_id` foreign key column to every table that needs
  tenant isolation. All columns are nullable initially so existing rows are
  not broken. A separate backfill migration will populate these values.

  ## Tables Modified
  - `clients` — add organization_id FK → organizations
  - `inspections` — add organization_id FK → organizations
  - `inspection_ai_projects` — add organization_id FK → organizations
  - `inspection_ai_reports` — add organization_id FK → organizations
  - `inspection_ai_items` — add organization_id FK → organizations
  - `drawings` — add organization_id FK → organizations
  - `members` — add organization_id FK → organizations
  - `ncrs` — add organization_id FK → organizations

  ## Indexes
  Added on each new organization_id column for join performance.

  ## Notes
  - All FK columns are nullable — no existing rows are affected
  - ON DELETE SET NULL — deleting an org doesn't cascade-delete operational data
  - projects already has organization_id — skipped
*/

-- clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE clients
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspections
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspection_ai_projects
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- inspection_ai_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE inspection_ai_items
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- drawings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE drawings
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE members
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ncrs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ncrs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE ncrs
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes on each new organization_id column
CREATE INDEX IF NOT EXISTS idx_clients_organization_id
  ON clients(organization_id);

CREATE INDEX IF NOT EXISTS idx_inspections_organization_id
  ON inspections(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_projects_organization_id
  ON inspection_ai_projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_reports_organization_id
  ON inspection_ai_reports(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_items_organization_id
  ON inspection_ai_items(organization_id);

CREATE INDEX IF NOT EXISTS idx_drawings_organization_id
  ON drawings(organization_id);

CREATE INDEX IF NOT EXISTS idx_members_organization_id
  ON members(organization_id);

CREATE INDEX IF NOT EXISTS idx_ncrs_organization_id
  ON ncrs(organization_id);
