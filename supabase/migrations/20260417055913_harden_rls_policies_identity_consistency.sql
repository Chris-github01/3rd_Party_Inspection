/*
  # Harden RLS Policies – Identity Consistency & Regression Prevention

  ## Summary
  Post-fix hardening pass following the recursive RLS repair.

  ## Problems Fixed

  ### 1. organisations admin policies reference wrong identity table
  The INSERT/UPDATE/DELETE policies on `organizations` check
  `FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','super_admin')`.
  `public.users` has `role = 'admin'` for EVERY row (seeded by the `handle_new_user` trigger),
  meaning any authenticated user could create/update/delete organisations.
  Fix: rewrite these policies to check `public.user_profiles.role` which is correctly seeded
  with 'inspector' by default and is the canonical role store used throughout the app.

  ### 2. Duplicate overlapping SELECT policies on inspection_ai_projects
  Three SELECT policies existed:
    - "Org members can view ai projects"          → uses get_user_org_ids() SECURITY DEFINER ✓
    - "Users can select own ai projects"          → auth.uid() = user_id ✓
    - "Users can view inspection projects in their org" → inline EXISTS on organization_users ✓
  All three are permissive and PostgreSQL ORs them. Redundant. Consolidate to two clean policies:
    - own rows: auth.uid() = user_id
    - org rows: organization_id IN (SELECT get_user_org_ids()) via SECURITY DEFINER (no recursion)

  ### 3. Duplicate INSERT policies on inspection_ai_projects
  Two INSERT policies with identical logic. Drop the redundant one.

  ## Security Notes
  - organization_users SELECT policy remains: `user_id = auth.uid()` — no recursion possible.
  - get_user_org_ids() is SECURITY DEFINER — bypasses RLS on organization_users when called
    from within a policy on a DIFFERENT table, so it cannot trigger the organization_users
    SELECT policy recursively.
  - get_my_org_memberships() is SECURITY DEFINER — safe for modal use.
  - public.users.role = 'admin' for all rows (trigger artifact). Never use it for authz checks.
  - public.user_profiles.role is the authoritative role column.

  ## Regression Tests
  Inline diagnostic views added at the end for manual verification.
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 1. FIX: organizations admin policies — use user_profiles.role, not users.role
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON organizations;

CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. FIX: inspection_ai_projects — remove duplicate/redundant SELECT policies,
--    consolidate to two clean non-recursive policies.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Org members can view ai projects" ON inspection_ai_projects;
DROP POLICY IF EXISTS "Users can select own ai projects" ON inspection_ai_projects;
DROP POLICY IF EXISTS "Users can view inspection projects in their org" ON inspection_ai_projects;

-- Own rows
CREATE POLICY "Users can view own ai projects"
  ON inspection_ai_projects FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Org rows — via SECURITY DEFINER function, no inline table scan that could recurse
CREATE POLICY "Org members can view org ai projects"
  ON inspection_ai_projects FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT get_user_org_ids())
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. FIX: inspection_ai_projects — remove duplicate INSERT policy
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert inspection projects" ON inspection_ai_projects;
-- Keep: "Org members can create ai projects" (user_id = auth.uid())

-- ────────────────────────────────────────────────────────────────────────────
-- 4. HARDENING: Ensure user_profiles.role default is 'inspector', not 'admin'
--    The handle_new_user trigger seeds public.users with role='admin' for everyone,
--    which is a known issue. Make sure user_profiles has the correct safe default.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Set column default if not already set correctly
  ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'inspector';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set user_profiles.role default: %', SQLERRM;
END $$;

-- Ensure no user_profiles rows have NULL role (safe fallback)
UPDATE user_profiles SET role = 'inspector' WHERE role IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. DIAGNOSTIC: Create a validation function for regression testing
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rls_regression_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_recursive_policies int;
  v_org_users_select_count int;
  v_users_role_pollution int;
  v_orphaned_org_members int;
  v_auth_missing_profiles int;
  v_duplicate_insert_policies int;
BEGIN
  -- Check 1: Count SELECT policies on organization_users (should be exactly 1)
  SELECT count(*) INTO v_org_users_select_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'organization_users' AND cmd = 'SELECT';

  -- Check 2: Detect any remaining recursive pattern (policy on table X queries table X)
  SELECT count(*) INTO v_recursive_policies
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.cmd = 'SELECT'
    AND p.qual LIKE '%FROM ' || p.tablename || '%';

  -- Check 3: Detect public.users role pollution (all rows having 'admin' role)
  SELECT count(*) INTO v_users_role_pollution
  FROM public.users WHERE role = 'admin';

  -- Check 4: Orphaned organization_users (user_id not in user_profiles)
  SELECT count(*) INTO v_orphaned_org_members
  FROM organization_users ou
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = ou.user_id);

  -- Check 5: auth.users with no user_profiles row
  SELECT count(*) INTO v_auth_missing_profiles
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = au.id);

  -- Check 6: duplicate INSERT policies on inspection_ai_projects
  SELECT count(*) INTO v_duplicate_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'inspection_ai_projects' AND cmd = 'INSERT';

  v_result := jsonb_build_object(
    'org_users_select_policy_count',    v_org_users_select_count,
    'org_users_select_policy_safe',     (v_org_users_select_count = 1),
    'recursive_select_policies',        v_recursive_policies,
    'no_recursive_policies',            (v_recursive_policies = 0),
    'public_users_role_pollution_rows', v_users_role_pollution,
    'orphaned_org_members',             v_orphaned_org_members,
    'auth_users_missing_profiles',      v_auth_missing_profiles,
    'identity_sync_healthy',            (v_auth_missing_profiles = 0 AND v_orphaned_org_members = 0),
    'inspection_ai_projects_insert_policy_count', v_duplicate_insert_policies,
    'checked_at',                       now()
  );

  RETURN v_result;
END;
$$;

-- Run diagnostics immediately so the result is captured in migration logs
DO $$
DECLARE v jsonb;
BEGIN
  v := public.rls_regression_diagnostics();
  RAISE NOTICE 'RLS Regression Diagnostics: %', v::text;
END $$;
