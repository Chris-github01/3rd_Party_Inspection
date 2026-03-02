/*
  # Fix Missing RLS Policies for Materials and Other Tables

  ## Problem
  Several tables have RLS enabled but are missing INSERT, UPDATE, or DELETE policies,
  which prevents users from performing these operations even when they should be allowed.

  ## Tables Fixed
  1. materials - Missing INSERT, UPDATE, DELETE policies (used by Materials settings page)
  2. organization_settings - Missing INSERT, UPDATE, DELETE policies (may be needed in future)

  ## Tables NOT Fixed (Read-Only by Design)
  These tables are intentionally read-only and should only be modified by admins via SQL:
  - fire_protection_materials (master data)
  - material_library (master data)
  - steel_member_library (master data)
  - system_dictionary (system data)
  - system_recipes (system data)
  - installation_times (system data)
  - jobs (system data)
  - rate_cache (cache table)
  - ryanfire_solutions (legacy/external data)
  - sku_catalog (master data)

  ## Tables NOT Fixed (Join Tables/System Generated)
  These are managed by the system or through other means:
  - inspection_dynamic_fields (managed through templates)
  - ncr_dynamic_fields (managed through templates)
  - material_docs (join table, managed through materials UI)
  - member_templates (system templates)
  - user_profiles (created on registration, INSERT handled by trigger)

  ## Solution
  Add proper RLS policies for INSERT, UPDATE, and DELETE operations where needed.
*/

-- =====================================================
-- MATERIALS TABLE POLICIES
-- =====================================================

-- Allow admins and inspectors to insert materials
CREATE POLICY "Admins and inspectors can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'inspector')
    )
  );

-- Allow admins and inspectors to update materials
CREATE POLICY "Admins and inspectors can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'inspector')
    )
  );

-- Allow admins to delete materials
CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- ORGANIZATION_SETTINGS TABLE POLICIES
-- =====================================================

-- Allow admins to insert organization settings (first-time setup)
CREATE POLICY "Admins can insert organization settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to update organization settings
CREATE POLICY "Admins can update organization settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to delete organization settings
CREATE POLICY "Admins can delete organization settings"
  ON organization_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );
