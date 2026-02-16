/*
  # Comprehensive Security & Performance Optimization

  1. Performance Improvements
    - Add missing foreign key indexes for optimal query performance
    - Total of 20 foreign key indexes being added

  2. Security Policy Consolidation
    - Remove duplicate SELECT policies (keeping the most permissive one)
    - Consolidate 19 tables with multiple permissive policies
    - Add missing RLS policies for 3 tables

  3. Tables with Missing Policies
    - installers
    - quotes  
    - travel_calculations

  ## Foreign Key Indexes Being Added
  - documents: project_id
  - drawing_pins: document_id, member_id, project_id
  - drawings: document_id
  - export_attachments: project_id
  - inspection_dynamic_fields: inspection_id
  - inspections: member_id
  - loading_schedule_imports: document_id
  - loading_schedule_items: project_id
  - material_docs: material_id
  - ncr_dynamic_fields: ncr_id
  - projects: assigned_installer_id, client_id, created_by, created_by_user_id, quote_id
  - quotes: client_id, created_by
  - travel_calculations: installer_id
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

DO $$ 
BEGIN
  -- documents table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_project_id') THEN
    CREATE INDEX idx_documents_project_id ON documents(project_id);
  END IF;

  -- drawing_pins table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'drawing_pins' AND indexname = 'idx_drawing_pins_document_id') THEN
    CREATE INDEX idx_drawing_pins_document_id ON drawing_pins(document_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'drawing_pins' AND indexname = 'idx_drawing_pins_member_id') THEN
    CREATE INDEX idx_drawing_pins_member_id ON drawing_pins(member_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'drawing_pins' AND indexname = 'idx_drawing_pins_project_id') THEN
    CREATE INDEX idx_drawing_pins_project_id ON drawing_pins(project_id);
  END IF;

  -- drawings table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'drawings' AND indexname = 'idx_drawings_document_id') THEN
    CREATE INDEX idx_drawings_document_id ON drawings(document_id);
  END IF;

  -- export_attachments table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'export_attachments' AND indexname = 'idx_export_attachments_project_id') THEN
    CREATE INDEX idx_export_attachments_project_id ON export_attachments(project_id);
  END IF;

  -- inspection_dynamic_fields table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'inspection_dynamic_fields' AND indexname = 'idx_inspection_dynamic_fields_inspection_id') THEN
    CREATE INDEX idx_inspection_dynamic_fields_inspection_id ON inspection_dynamic_fields(inspection_id);
  END IF;

  -- inspections table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'inspections' AND indexname = 'idx_inspections_member_id') THEN
    CREATE INDEX idx_inspections_member_id ON inspections(member_id);
  END IF;

  -- loading_schedule_imports table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'loading_schedule_imports' AND indexname = 'idx_loading_schedule_imports_document_id') THEN
    CREATE INDEX idx_loading_schedule_imports_document_id ON loading_schedule_imports(document_id);
  END IF;

  -- loading_schedule_items table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'loading_schedule_items' AND indexname = 'idx_loading_schedule_items_project_id') THEN
    CREATE INDEX idx_loading_schedule_items_project_id ON loading_schedule_items(project_id);
  END IF;

  -- material_docs table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'material_docs' AND indexname = 'idx_material_docs_material_id') THEN
    CREATE INDEX idx_material_docs_material_id ON material_docs(material_id);
  END IF;

  -- ncr_dynamic_fields table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'ncr_dynamic_fields' AND indexname = 'idx_ncr_dynamic_fields_ncr_id') THEN
    CREATE INDEX idx_ncr_dynamic_fields_ncr_id ON ncr_dynamic_fields(ncr_id);
  END IF;

  -- projects table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname = 'idx_projects_assigned_installer_id') THEN
    CREATE INDEX idx_projects_assigned_installer_id ON projects(assigned_installer_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname = 'idx_projects_client_id') THEN
    CREATE INDEX idx_projects_client_id ON projects(client_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname = 'idx_projects_created_by') THEN
    CREATE INDEX idx_projects_created_by ON projects(created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname = 'idx_projects_created_by_user_id') THEN
    CREATE INDEX idx_projects_created_by_user_id ON projects(created_by_user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname = 'idx_projects_quote_id') THEN
    CREATE INDEX idx_projects_quote_id ON projects(quote_id);
  END IF;

  -- quotes table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quotes' AND indexname = 'idx_quotes_client_id') THEN
    CREATE INDEX idx_quotes_client_id ON quotes(client_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quotes' AND indexname = 'idx_quotes_created_by') THEN
    CREATE INDEX idx_quotes_created_by ON quotes(created_by);
  END IF;

  -- travel_calculations table
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'travel_calculations' AND indexname = 'idx_travel_calculations_installer_id') THEN
    CREATE INDEX idx_travel_calculations_installer_id ON travel_calculations(installer_id);
  END IF;
END $$;

-- =====================================================
-- PART 2: CONSOLIDATE DUPLICATE RLS POLICIES
-- =====================================================

-- company_settings: Remove duplicate, keep most permissive
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;

-- documents: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Authenticated users can view project documents" ON documents;

-- export_attachments: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Authenticated users can read export attachments" ON export_attachments;

-- fire_protection_materials: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage fire protection materials" ON fire_protection_materials;

-- form_templates: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage form templates" ON form_templates;

-- inspection_dynamic_fields: Consolidate
DROP POLICY IF EXISTS "Admins and inspectors can manage inspection dynamic fields" ON inspection_dynamic_fields;

-- inspections: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Authenticated users can view project inspections" ON inspections;

-- loading_schedule_imports: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Users can view loading schedule imports for their projects" ON loading_schedule_imports;

-- loading_schedule_items: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Users can view loading schedule items for their projects" ON loading_schedule_items;

-- material_docs: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage material docs" ON material_docs;

-- material_library: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage materials" ON material_library;

-- member_templates: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage member templates" ON member_templates;

-- members: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Authenticated users can view project members" ON members;

-- ncr_dynamic_fields: Consolidate
DROP POLICY IF EXISTS "Admins and inspectors can manage ncr dynamic fields" ON ncr_dynamic_fields;

-- ncrs: Remove duplicate, keep general view policy
DROP POLICY IF EXISTS "Authenticated users can view project NCRs" ON ncrs;

-- organization_settings: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage organization settings" ON organization_settings;

-- report_profiles: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage report profiles" ON report_profiles;

-- steel_member_library: Remove duplicate, keep read policy
DROP POLICY IF EXISTS "Admins can manage steel member library" ON steel_member_library;

-- user_profiles: Remove duplicate admin policy (keep own profile access)
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- =====================================================
-- PART 3: ADD MISSING RLS POLICIES
-- =====================================================

-- installers table policies
CREATE POLICY "Authenticated users can view installers"
  ON installers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can create installers"
  ON installers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update installers"
  ON installers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete installers"
  ON installers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- quotes table policies
CREATE POLICY "Authenticated users can view quotes"
  ON quotes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can create quotes"
  ON quotes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update quotes"
  ON quotes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete quotes"
  ON quotes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- travel_calculations table policies
CREATE POLICY "Authenticated users can view travel calculations"
  ON travel_calculations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can create travel calculations"
  ON travel_calculations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update travel calculations"
  ON travel_calculations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete travel calculations"
  ON travel_calculations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );
