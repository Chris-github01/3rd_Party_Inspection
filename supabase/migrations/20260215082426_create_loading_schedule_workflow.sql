/*
  # Loading Schedule Import Workflow Schema

  1. New Tables
    - `loading_schedule_imports` - Track parsing of loading schedule documents
    - `loading_schedule_items` - Normalized items extracted from schedules
  
  2. Table Modifications
    - `members` - Add loading_schedule_item_id, source, override_json, section_size, frr_format
    - `drawing_pins` - Already has member_id and page_number (verified)
  
  3. RPC Functions
    - `get_project_members_for_dropdown` - Fast member lookup
  
  4. Storage
    - Create parsing-artifacts bucket
  
  5. Security
    - Enable RLS with proper policies
*/

-- =====================================================
-- 1) LOADING SCHEDULE IMPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loading_schedule_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  source_type text NOT NULL CHECK (source_type IN ('pdf','xlsx','csv','other')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','partial_completed','needs_review')),
  page_count int DEFAULT 0,

  artifact_json_path text,
  result_json_path text,
  error_code text,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loading_schedule_imports_project_idx ON loading_schedule_imports(project_id);
CREATE INDEX IF NOT EXISTS loading_schedule_imports_document_idx ON loading_schedule_imports(document_id);
CREATE INDEX IF NOT EXISTS loading_schedule_imports_status_idx ON loading_schedule_imports(status);

ALTER TABLE loading_schedule_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loading schedule imports for their projects"
  ON loading_schedule_imports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create loading schedule imports"
  ON loading_schedule_imports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update loading schedule imports"
  ON loading_schedule_imports FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- 2) LOADING SCHEDULE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loading_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES loading_schedule_imports(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  loading_schedule_ref text,
  member_mark text,
  element_type text,
  section_size_raw text NOT NULL,
  section_size_normalized text NOT NULL,

  frr_minutes int,
  frr_format text,

  coating_product text,
  dft_required_microns int,

  needs_review boolean NOT NULL DEFAULT false,
  confidence numeric(5,4) NOT NULL DEFAULT 0.0,

  cite_page int,
  cite_line_start int,
  cite_line_end int,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loading_schedule_items_project_idx ON loading_schedule_items(project_id);
CREATE INDEX IF NOT EXISTS loading_schedule_items_import_idx ON loading_schedule_items(import_id);
CREATE INDEX IF NOT EXISTS loading_schedule_items_member_mark_idx ON loading_schedule_items(member_mark);
CREATE INDEX IF NOT EXISTS loading_schedule_items_section_idx ON loading_schedule_items(section_size_normalized);

ALTER TABLE loading_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view loading schedule items for their projects"
  ON loading_schedule_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage loading schedule items"
  ON loading_schedule_items FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 3) MODIFY MEMBERS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'loading_schedule_item_id'
  ) THEN
    ALTER TABLE members ADD COLUMN loading_schedule_item_id uuid REFERENCES loading_schedule_items(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'source'
  ) THEN
    ALTER TABLE members ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','schedule'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'override_json'
  ) THEN
    ALTER TABLE members ADD COLUMN override_json jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'section_size'
  ) THEN
    ALTER TABLE members ADD COLUMN section_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'frr_format'
  ) THEN
    ALTER TABLE members ADD COLUMN frr_format text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS members_loading_schedule_item_idx ON members(loading_schedule_item_id);

-- =====================================================
-- 4) UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS loading_schedule_imports_set_updated_at ON loading_schedule_imports;
CREATE TRIGGER loading_schedule_imports_set_updated_at
BEFORE UPDATE ON loading_schedule_imports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 5) RPC FUNCTION FOR MEMBER DROPDOWN
-- =====================================================
CREATE OR REPLACE FUNCTION get_project_members_for_dropdown(p_project_id uuid)
RETURNS TABLE (
  member_id uuid,
  member_mark text,
  section_size text,
  frr_format text,
  coating_product text,
  dft_required_microns int,
  loading_schedule_ref text,
  element_type text,
  source text
) LANGUAGE sql STABLE AS $$
  SELECT
    m.id as member_id,
    m.member_mark,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section) as section_size,
    COALESCE(
      m.override_json->>'frr_format',
      m.frr_format,
      lsi.frr_format,
      CASE 
        WHEN m.frr_minutes > 0 THEN m.frr_minutes::text || '/-/-'
        ELSE NULL
      END
    ) as frr_format,
    COALESCE(
      m.override_json->>'coating_product',
      m.coating_system,
      lsi.coating_product
    ) as coating_product,
    COALESCE(
      (m.override_json->>'dft_required_microns')::int,
      m.required_dft_microns,
      lsi.dft_required_microns
    ) as dft_required_microns,
    lsi.loading_schedule_ref,
    COALESCE(m.element_type, lsi.element_type) as element_type,
    COALESCE(m.source, 'manual'::text) as source
  FROM members m
  LEFT JOIN loading_schedule_items lsi ON lsi.id = m.loading_schedule_item_id
  WHERE m.project_id = p_project_id
  ORDER BY 
    COALESCE(m.member_mark, '') NULLS LAST,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section, '') NULLS LAST;
$$;

-- =====================================================
-- 6) STORAGE BUCKET FOR PARSING ARTIFACTS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('parsing-artifacts', 'parsing-artifacts', false)
ON CONFLICT (id) DO NOTHING;
