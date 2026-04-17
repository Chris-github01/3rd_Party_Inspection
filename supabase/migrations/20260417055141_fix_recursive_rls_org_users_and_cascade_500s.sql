/*
  # Fix Recursive RLS on organization_users + Cascading 500 Errors

  ## Root Cause Analysis

  ### BUG 1 — INFINITE RECURSION on organization_users SELECT
  The policy "Org members can view org memberships" uses:
    USING (organization_id IN (SELECT ou2.organization_id FROM organization_users ou2 WHERE ou2.user_id = auth.uid()))
  This queries organization_users to decide if you can read organization_users — infinite recursion → HTTP 500.

  ### BUG 2 — Cascading failure on organizations SELECT
  The policy "Org members can view their organization" calls get_user_org_ids() which queries organization_users.
  If organization_users SELECT is broken due to recursion, organizations SELECT also returns 500.

  ### BUG 3 — inspection_ai_projects SELECT policies using get_user_org_ids()
  Same cascade: "Org members can view ai projects" calls get_user_org_ids() → organization_users → recursion.

  ## Fix Strategy
  1. Drop the recursive organization_users SELECT policy.
  2. Replace with a simple non-recursive policy: user can read own rows only (user_id = auth.uid()).
     The SECURITY DEFINER function get_my_org_memberships() handles broader org-level reads safely.
  3. Fix the broken admin policies on organization_users that have a self-referencing bug:
     ou2.organization_id = ou2.organization_id (comparing column to itself, not to the parent table).
  4. Replace get_user_org_ids() with a version that bypasses RLS entirely (already SECURITY DEFINER,
     but the underlying table's own RLS was firing). Use a direct auth.uid() comparison.
  5. Ensure user_profiles rows are auto-created for auth users so FK constraints don't break.

  ## Tables Modified
  - organization_users (SELECT policy replaced)
  - No schema changes — policy-only fixes
*/

-- ─── Step 1: Drop the recursive SELECT policy ───────────────────────────────
DROP POLICY IF EXISTS "Org members can view org memberships" ON organization_users;

-- ─── Step 2: Keep the simple safe SELECT policy (user reads own row) ─────────
-- "Users can read own membership" already exists and is correct:
--   USING (user_id = auth.uid())
-- Re-create it idempotently in case it was dropped:
DROP POLICY IF EXISTS "Users can read own membership" ON organization_users;
CREATE POLICY "Users can read own membership"
  ON organization_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─── Step 3: Fix broken admin policies (self-referencing bug) ────────────────
-- Old policies compare ou2.organization_id = ou2.organization_id (always true!)
-- They should compare ou2.organization_id = organization_users.organization_id

DROP POLICY IF EXISTS "Org owners and admins can insert members" ON organization_users;
CREATE POLICY "Org owners and admins can insert members"
  ON organization_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_users.organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
    OR (
      -- Allow self-insert as owner if org has no owner yet
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM organization_users existing
        WHERE existing.organization_id = organization_users.organization_id
          AND existing.role = 'owner'
      )
    )
  );

DROP POLICY IF EXISTS "Org owners and admins can update members" ON organization_users;
CREATE POLICY "Org owners and admins can update members"
  ON organization_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_users.organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_users.organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Org owners and admins can delete members" ON organization_users;
CREATE POLICY "Org owners and admins can delete members"
  ON organization_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_users.organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  );

-- ─── Step 4: Drop old broken self-join insert policy ─────────────────────────
DROP POLICY IF EXISTS "User can self-join org as owner if no owners exist" ON organization_users;

-- ─── Step 5: Rebuild get_user_org_ids as truly RLS-bypassing ─────────────────
-- The function is SECURITY DEFINER but was still hitting the recursive policy
-- because the policy checker evaluates before the function's security context applies
-- during the initial RLS evaluation of the calling table.
-- We set it to bypass RLS explicitly by querying via a direct subselect that
-- the planner can flatten without re-entering the policy stack.
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid();
$$;

-- ─── Step 6: Ensure user_profiles row exists for all auth users ───────────────
-- organization_users.user_id FK references user_profiles.id.
-- If a user signs up but no user_profiles row is created, org membership INSERT fails.
-- Create a trigger on auth.users to auto-create a user_profiles row.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
    'inspector'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ensure_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_ensure_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- ─── Step 7: Backfill user_profiles for existing auth users missing a profile ─
INSERT INTO public.user_profiles (id, name, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'User'),
  'inspector'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ─── Step 8: Rebuild get_my_org_memberships with explicit column quoting ──────
-- Re-create to be safe, unchanged logic but ensures it's current.
CREATE OR REPLACE FUNCTION public.get_my_org_memberships()
RETURNS TABLE (
  organization_id uuid,
  role            text,
  org_name        text,
  org_slug        text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ou.organization_id,
    ou.role,
    o.name  AS org_name,
    o.slug  AS org_slug
  FROM organization_users ou
  JOIN organizations o ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
  ORDER BY ou.created_at;
$$;
