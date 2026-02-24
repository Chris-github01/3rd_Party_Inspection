/*
  # Fix Organization Settings RLS Policies

  ## Problem
  The `organization_settings` table had its UPDATE/INSERT/DELETE policy removed in a previous migration,
  preventing users from updating organization name and logo through the UI.

  ## Changes
  1. Restore the policy to allow authenticated users to update organization settings
  2. Keep the existing SELECT policy for reading settings

  ## Security
  - All authenticated users can update organization settings (suitable for single-org applications)
*/

-- Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can manage organization settings" ON organization_settings;
DROP POLICY IF EXISTS "Admins can manage organization settings" ON organization_settings;

-- Recreate the management policy for authenticated users
-- This allows INSERT, UPDATE, DELETE operations
CREATE POLICY "Authenticated users can manage organization settings"
  ON organization_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
