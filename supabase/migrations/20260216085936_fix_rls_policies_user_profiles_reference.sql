/*
  # Fix RLS Policies - User Profiles Table Reference
  
  ## Overview
  Fixes RLS policies that reference `user_profiles` table when it should be `users` table.
  
  ## Changes
  - Drop and recreate RLS policies on clients table to use `users` instead of `user_profiles`
  
  ## Security
  - Maintains the same access control logic
  - Authenticated users can read clients
  - Only admins and inspectors can create/update clients
*/

-- Drop existing policies on clients table
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
DROP POLICY IF EXISTS "Admins and inspectors can create clients" ON clients;
DROP POLICY IF EXISTS "Admins and inspectors can update clients" ON clients;

-- Recreate policies with correct table reference
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );