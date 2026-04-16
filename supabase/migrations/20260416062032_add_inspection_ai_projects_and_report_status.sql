/*
  # Inspection AI — Project Layer + Report Status

  ## Summary
  Adds a project persistence layer to the Inspection AI module so that
  inspections can be saved, reopened, and managed across sessions.

  ## New Tables

  ### inspection_ai_projects
  - Top-level project record (a real-world site / contract)
  - Fields: id, user_id, project_name, client_name, site_location, created_at

  ## Modified Tables

  ### inspection_ai_reports
  - ADD project_id (uuid FK → inspection_ai_projects, nullable for backwards-compat)
  - ADD status (text) — 'draft' | 'completed'
  - ADD item_count (integer) — cached count, updated via trigger

  ## Security
  - RLS enabled on inspection_ai_projects
  - Authenticated users can CRUD their own projects
  - Reports gain an optional project_id FK — existing rows are unaffected

  ## Notes
  1. project_id is nullable to keep backwards compatibility with existing reports
  2. status defaults to 'draft'
  3. A trigger updates item_count on inspection_ai_reports whenever items are inserted/deleted
*/

-- ─────────────────────────────────────────────
-- 1. Projects table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name  text NOT NULL DEFAULT '',
  client_name   text NOT NULL DEFAULT '',
  site_location text NOT NULL DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai projects"
  ON inspection_ai_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai projects"
  ON inspection_ai_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai projects"
  ON inspection_ai_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai projects"
  ON inspection_ai_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inspection_ai_projects_user_id ON inspection_ai_projects(user_id);

-- ─────────────────────────────────────────────
-- 2. Add columns to inspection_ai_reports
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN project_id uuid REFERENCES inspection_ai_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'status'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_reports' AND column_name = 'item_count'
  ) THEN
    ALTER TABLE inspection_ai_reports
      ADD COLUMN item_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inspection_ai_reports_project_id ON inspection_ai_reports(project_id);

-- ─────────────────────────────────────────────
-- 3. Trigger: keep item_count in sync
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_ai_report_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE inspection_ai_reports
    SET item_count = item_count + 1
    WHERE id = NEW.report_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE inspection_ai_reports
    SET item_count = GREATEST(0, item_count - 1)
    WHERE id = OLD.report_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_item_count ON inspection_ai_items;
CREATE TRIGGER trg_ai_item_count
  AFTER INSERT OR DELETE ON inspection_ai_items
  FOR EACH ROW EXECUTE FUNCTION sync_ai_report_item_count();
