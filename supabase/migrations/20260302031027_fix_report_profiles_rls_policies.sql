/*
  # Fix Report Profiles RLS Policies

  ## Problem
  The report_profiles table has RLS enabled but is missing INSERT, UPDATE, and DELETE policies.
  Only the SELECT policy exists, which prevents users (including admins) from creating new report profiles.

  ## Root Cause
  The "Admins can manage report profiles" policy with FOR ALL was never created or was dropped.

  ## Solution
  Add proper RLS policies for INSERT, UPDATE, and DELETE operations:
  - Admins can perform all operations (INSERT, UPDATE, DELETE)
  - Regular authenticated users can only read (SELECT policy already exists)

  ## Security Verification
  - Uses proper authentication checks via auth.uid()
  - Verifies admin role from user_profiles table
  - Separate policies for each operation for clarity and maintainability
*/

-- Drop any existing policies to start fresh (except SELECT which works)
DO $$ 
BEGIN
  -- Drop old "Admins can manage report profiles" policy if it exists
  DROP POLICY IF EXISTS "Admins can manage report profiles" ON report_profiles;
  DROP POLICY IF EXISTS "Admins can insert report profiles" ON report_profiles;
  DROP POLICY IF EXISTS "Admins can update report profiles" ON report_profiles;
  DROP POLICY IF EXISTS "Admins can delete report profiles" ON report_profiles;
END $$;

-- Create separate policies for each operation (clearer and more maintainable)

-- INSERT policy: Only admins can create new report profiles
CREATE POLICY "Admins can insert report profiles"
  ON report_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- UPDATE policy: Only admins can update report profiles
CREATE POLICY "Admins can update report profiles"
  ON report_profiles FOR UPDATE
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

-- DELETE policy: Only admins can delete report profiles
CREATE POLICY "Admins can delete report profiles"
  ON report_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );
