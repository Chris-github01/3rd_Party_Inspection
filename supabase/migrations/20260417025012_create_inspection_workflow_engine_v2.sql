/*
  # Inspection Workflow Engine v2

  ## Purpose
  Upgrades the Inspection AI module from a simple photo-capture tool into a full
  project-centric inspection workflow system. Every finding is traceable to:
    Organization → Client → Project → Block → Level → Drawing → Pin → Item → Evidence

  ## New Tables

  ### inspection_sessions
  - A single visit/inspection run within a project
  - inspector_name, started_at, status (draft | completed)
  - Links to project, block, level

  ### inspection_workflow_items
  - Core finding record (replaces the old inspection_ai_items pattern)
  - Linked to session, drawing_pin (nullable), system_type, element
  - AI result stored as JSONB
  - status: draft | saved | reviewed | pass | fail | defect
  - Has sequential item_number per project

  ### inspection_evidence_photos
  - Supporting photos attached to a workflow item
  - NOT re-analysed by AI
  - caption, sort_order

  ## Modified Tables
  - inspection_ai_projects: add block_count, level_count, item_count computed columns (views)

  ## Security
  - Full RLS on all new tables scoped to authenticated users via organization_id
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. inspection_sessions
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES inspection_ai_projects(id) ON DELETE CASCADE NOT NULL,
  block_id        uuid REFERENCES inspection_ai_blocks(id) ON DELETE SET NULL,
  level_id        uuid REFERENCES inspection_ai_levels(id) ON DELETE SET NULL,
  inspector_name  text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  notes           text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspection_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own org sessions"
  ON inspection_sessions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own org sessions"
  ON inspection_sessions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own org sessions"
  ON inspection_sessions FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own org sessions"
  ON inspection_sessions FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. inspection_workflow_items
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_workflow_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES inspection_ai_projects(id) ON DELETE CASCADE NOT NULL,
  session_id      uuid REFERENCES inspection_sessions(id) ON DELETE SET NULL,
  drawing_pin_id  uuid REFERENCES inspection_ai_pins(id) ON DELETE SET NULL,
  drawing_id      uuid REFERENCES inspection_ai_drawings(id) ON DELETE SET NULL,
  item_number     integer NOT NULL DEFAULT 1,
  -- Intake context
  system_type     text NOT NULL DEFAULT '',
  element_type    text NOT NULL DEFAULT '',
  environment     text NOT NULL DEFAULT 'Internal',
  observed_concern text NOT NULL DEFAULT '',
  is_new_install  boolean NOT NULL DEFAULT false,
  -- Location
  location_level  text NOT NULL DEFAULT '',
  location_grid   text NOT NULL DEFAULT '',
  location_description text NOT NULL DEFAULT '',
  extent          text NOT NULL DEFAULT 'Localised',
  -- Primary photo
  image_url       text,
  -- AI outputs
  ai_result       jsonb,
  defect_type     text NOT NULL DEFAULT '',
  severity        text NOT NULL DEFAULT 'Medium',
  observation     text NOT NULL DEFAULT '',
  non_conformance text NOT NULL DEFAULT '',
  recommendation  text NOT NULL DEFAULT '',
  risk            text NOT NULL DEFAULT '',
  confidence      numeric(5,2) DEFAULT 0,
  -- Overrides
  defect_type_override  text,
  severity_override     text,
  observation_override  text,
  inspector_override    boolean NOT NULL DEFAULT false,
  -- Status
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','saved','reviewed','pass','fail','defect')),
  annotated_image_url text,
  -- Timestamps
  inspector_name  text NOT NULL DEFAULT '',
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspection_workflow_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own org items"
  ON inspection_workflow_items FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own org items"
  ON inspection_workflow_items FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own org items"
  ON inspection_workflow_items FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own org items"
  ON inspection_workflow_items FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. inspection_evidence_photos
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_evidence_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES inspection_workflow_items(id) ON DELETE CASCADE NOT NULL,
  image_url       text NOT NULL,
  caption         text NOT NULL DEFAULT '',
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspection_evidence_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own org evidence"
  ON inspection_evidence_photos FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own org evidence"
  ON inspection_evidence_photos FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own org evidence"
  ON inspection_evidence_photos FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own org evidence"
  ON inspection_evidence_photos FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_project_id
  ON inspection_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_inspection_workflow_items_project_id
  ON inspection_workflow_items(project_id);

CREATE INDEX IF NOT EXISTS idx_inspection_workflow_items_session_id
  ON inspection_workflow_items(session_id);

CREATE INDEX IF NOT EXISTS idx_inspection_workflow_items_drawing_pin_id
  ON inspection_workflow_items(drawing_pin_id);

CREATE INDEX IF NOT EXISTS idx_inspection_workflow_items_status
  ON inspection_workflow_items(status);

CREATE INDEX IF NOT EXISTS idx_inspection_evidence_photos_item_id
  ON inspection_evidence_photos(item_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Project summary view
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW inspection_project_summary AS
SELECT
  p.id,
  p.organization_id,
  p.project_name,
  p.client_name,
  p.site_location,
  p.created_at,
  COUNT(DISTINCT b.id) AS block_count,
  COUNT(DISTINCT l.id) AS level_count,
  COUNT(DISTINCT d.id) AS drawing_count,
  COUNT(DISTINCT wi.id) AS item_count,
  COUNT(DISTINCT wi.id) FILTER (WHERE wi.severity = 'High') AS high_count,
  COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'defect') AS defect_count,
  COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'pass') AS pass_count,
  MAX(wi.created_at) AS last_inspection_at
FROM inspection_ai_projects p
LEFT JOIN inspection_ai_blocks b ON b.project_id = p.id
LEFT JOIN inspection_ai_levels l ON l.block_id = b.id
LEFT JOIN inspection_ai_drawings d ON d.level_id = l.id
LEFT JOIN inspection_workflow_items wi ON wi.project_id = p.id
GROUP BY p.id, p.organization_id, p.project_name, p.client_name, p.site_location, p.created_at;
