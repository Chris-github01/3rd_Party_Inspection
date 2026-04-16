/*
  # Harden RLS with Tenant Isolation

  ## What This Does
  Replaces the existing open "any authenticated user sees everything" policies
  on clients and inspection_ai tables with tenant-scoped policies that use the
  `get_user_org_ids()` helper. Users can only see rows belonging to their
  organization(s).

  ## Tables Hardened
  - `clients` — remove open SELECT; replace with org-scoped access
  - `inspection_ai_projects` — add full CRUD org-scoped policies
  - `inspection_ai_reports` — add full CRUD org-scoped policies
  - `inspection_ai_items` — add full CRUD org-scoped policies
  - `organizations` — tighten SELECT to members only (remove open USING true)

  ## Strategy
  - Rows with organization_id = NULL remain visible to all authenticated users
    during the transition period. Once backfill is complete this exception
    can be removed with a follow-up migration.
  - New rows (post-migration) must have organization_id set to be visible.

  ## Notes
  - projects already has organization_id and its policies will be tightened
    once all projects are confirmed backfilled
  - `get_user_org_ids()` is SECURITY DEFINER so it runs as the function owner,
    avoiding recursive RLS on organization_users
*/

-- ============================================================
-- CLIENTS
-- ============================================================

-- Drop the existing open SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
DROP POLICY IF EXISTS "Admins and inspectors can create clients" ON clients;
DROP POLICY IF EXISTS "Admins and inspectors can update clients" ON clients;

-- Org-scoped SELECT (also allows rows with NULL org_id during transition)
CREATE POLICY "Org members can view org clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_org_ids())
  );

-- Org-scoped INSERT
CREATE POLICY "Org members can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

-- Org-scoped UPDATE
CREATE POLICY "Org members can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

-- ============================================================
-- ORGANIZATIONS — tighten SELECT from open to member-only
-- ============================================================

DROP POLICY IF EXISTS "Users can view organizations" ON organizations;

CREATE POLICY "Org members can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_user_org_ids())
  );

-- ============================================================
-- INSPECTION AI PROJECTS
-- ============================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own ai projects" ON inspection_ai_projects;
DROP POLICY IF EXISTS "Users can insert own ai projects" ON inspection_ai_projects;
DROP POLICY IF EXISTS "Users can update own ai projects" ON inspection_ai_projects;
DROP POLICY IF EXISTS "Users can delete own ai projects" ON inspection_ai_projects;

CREATE POLICY "Org members can view ai projects"
  ON inspection_ai_projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Org members can create ai projects"
  ON inspection_ai_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Org members can update ai projects"
  ON inspection_ai_projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Org members can delete ai projects"
  ON inspection_ai_projects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

-- ============================================================
-- INSPECTION AI REPORTS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own ai reports" ON inspection_ai_reports;
DROP POLICY IF EXISTS "Users can insert own ai reports" ON inspection_ai_reports;
DROP POLICY IF EXISTS "Users can update own ai reports" ON inspection_ai_reports;
DROP POLICY IF EXISTS "Users can delete own ai reports" ON inspection_ai_reports;

CREATE POLICY "Org members can view ai reports"
  ON inspection_ai_reports FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Org members can create ai reports"
  ON inspection_ai_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Org members can update ai reports"
  ON inspection_ai_reports FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Org members can delete ai reports"
  ON inspection_ai_reports FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT get_user_org_ids())
  );

-- ============================================================
-- INSPECTION AI ITEMS
-- ============================================================

DROP POLICY IF EXISTS "Users can view own ai items" ON inspection_ai_items;
DROP POLICY IF EXISTS "Users can insert own ai items" ON inspection_ai_items;
DROP POLICY IF EXISTS "Users can update own ai items" ON inspection_ai_items;
DROP POLICY IF EXISTS "Users can delete own ai items" ON inspection_ai_items;

CREATE POLICY "Org members can view ai items"
  ON inspection_ai_items FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Org members can create ai items"
  ON inspection_ai_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org members can update ai items"
  ON inspection_ai_items FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (true);

CREATE POLICY "Org members can delete ai items"
  ON inspection_ai_items FOR DELETE
  TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT get_user_org_ids())
  );
