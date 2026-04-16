/*
  # Create organization_users Membership Table

  ## What This Does
  Creates the bridge table that maps users to organizations with role-based
  access. This is the heart of multi-tenancy: every RLS policy resolves
  "which organization does this user belong to" through this table.

  ## New Table: organization_users

  ### Columns
  - `id` — UUID PK
  - `organization_id` — FK to organizations (CASCADE delete)
  - `user_id` — FK to user_profiles (CASCADE delete)
  - `role` — owner | admin | manager | inspector | viewer
  - `invited_by` — FK to user_profiles (SET NULL on delete), nullable
  - `created_at` — timestamp
  - UNIQUE constraint on (organization_id, user_id) — one membership per org

  ## Security
  - RLS enabled
  - Users can SELECT memberships in any org they belong to
    (used to populate org switcher UI)
  - Only org owners/admins can INSERT new memberships
  - Only org owners/admins can DELETE memberships
  - Users can read their own membership records

  ## Indexes
  - (organization_id) — list all members of an org
  - (user_id) — list all orgs a user belongs to (for org switcher)

  ## Helper Function
  `get_user_org_ids()` — returns all organization IDs for the current user.
  Used in RLS policies on other tables to avoid recursive policy lookups.
  Declared as SECURITY DEFINER with a fixed search_path for safety.
*/

CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'inspector',
  invited_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (organization_id, user_id),
  CONSTRAINT org_users_role_check CHECK (role IN ('owner','admin','manager','inspector','viewer'))
);

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_org_users_org_id
  ON organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_users_user_id
  ON organization_users(user_id);

-- Users can view memberships within orgs they belong to (for member lists)
CREATE POLICY "Org members can view org memberships"
  ON organization_users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou2
      WHERE ou2.user_id = auth.uid()
    )
  );

-- Owners and admins can add new members
CREATE POLICY "Org owners and admins can insert members"
  ON organization_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update member roles
CREATE POLICY "Org owners and admins can update members"
  ON organization_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Org owners and admins can delete members"
  ON organization_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou2
      WHERE ou2.organization_id = organization_id
        AND ou2.user_id = auth.uid()
        AND ou2.role IN ('owner', 'admin')
    )
  );

-- Helper function: returns org IDs for current user (used in other RLS policies)
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid();
$$;
