/*
  # Fix RLS Infinite Recursion

  1. Changes
    - Drop the recursive "Admins can read all profiles" policy
    - Replace with simpler policy that allows authenticated users to read profiles
    - This prevents infinite recursion when checking permissions
    
  2. Security
    - Authenticated users can read all user profiles (needed for permission checks)
    - Users can still only update their own profile
    - Admin checks in other tables will now work without recursion
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Allow authenticated users to read all profiles
-- This is safe because profiles only contain name and role, no sensitive data
CREATE POLICY "Authenticated users can read profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Also add a policy to allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
