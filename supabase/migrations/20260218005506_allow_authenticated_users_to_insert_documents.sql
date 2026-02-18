/*
  # Allow Authenticated Users to Insert Documents

  1. Changes
    - Drop the restrictive INSERT policy that only allows admins/inspectors
    - Create new INSERT policy that allows all authenticated users
    - This is needed for Site Manager drawing uploads

  2. Security
    - All authenticated users can create documents (needed for normal workflow)
    - Only admins and inspectors can update or delete documents (existing policies remain)
    - All authenticated users can view documents (existing policy remains)
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins and inspectors can create documents" ON documents;

-- Create new INSERT policy that allows all authenticated users
CREATE POLICY "Authenticated users can insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);