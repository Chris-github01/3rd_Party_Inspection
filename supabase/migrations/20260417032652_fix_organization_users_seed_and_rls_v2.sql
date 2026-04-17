/*
  # Fix organization_users: Seed memberships and repair circular RLS

  ## Problem
  The organization_users table is completely empty. All existing RLS policies create
  a circular deadlock: INSERT requires existing membership to authorize it, and SELECT
  only returns rows if you are already a member. Nobody can ever bootstrap a membership.

  ## Changes

  ### 1. Seed all existing users into their correct organisations
  - admin@burnrate.com → P&R Consulting Limited (owner)
  - pieter@ + chris@ → Optimal Fire Limited (owner)
  - All other @optimalfire.co.nz users → Optimal Fire Limited (inspector)
    Role must be one of: owner | admin | manager | inspector | viewer

  ### 2. Fix SELECT RLS — add direct self-read policy (breaks recursive deadlock)

  ### 3. Fix INSERT RLS — allow self-bootstrapping as owner when org has no owners

  ### 4. Create SECURITY DEFINER RPC get_my_org_memberships()
  - Always readable by the authenticated user regardless of RLS state
  - Used by the frontend as a reliable fallback for org resolution
*/

-- ─── 1. Seed memberships ────────────────────────────────────────────────────

INSERT INTO organization_users (id, organization_id, user_id, role, created_at)
VALUES
  -- admin@burnrate.com → P&R Consulting Limited
  (gen_random_uuid(), 'bffb5cde-58d8-4a59-9aef-7844225bdce0', '4f289042-5c23-48e5-bedb-04d018a7a845', 'owner', now()),

  -- Optimal Fire — owners
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', 'd03769de-ab0a-4451-a72c-9ae2299c8062', 'owner',     now()),  -- pieter@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '507aea46-4351-4499-9200-0cc20df93721', 'owner',     now()),  -- chris@

  -- Optimal Fire — inspectors
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '89e5779a-af00-4cf9-8b92-f9f3b657e457', 'inspector', now()),  -- denver@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '2f0f2894-d242-404a-944d-188873d6fcde', 'inspector', now()),  -- reegan@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '08c99881-b0e8-45c1-8868-560ecb18a30b', 'inspector', now()),  -- carien@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '7d82ee8f-271e-4d66-a107-4c4804b982c2', 'inspector', now()),  -- pedro@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '9afe32b6-4e61-44f2-9e25-7c29c74e7b21', 'inspector', now()),  -- contracts@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '0ef077a7-decf-4ed6-a89a-47151d7ee890', 'inspector', now()),  -- zach@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', 'a11a69c5-e1a5-41a1-9a6f-727df311f701', 'inspector', now()),  -- ali@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '292b9204-7e0e-4a50-a86d-5f84877880a4', 'inspector', now()),  -- ray@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', 'eab8c147-3415-4b4d-9a59-16a294e792df', 'inspector', now()),  -- salman@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', 'd5b2fb81-b2e9-4de1-bd9f-6a091e3cda4c', 'inspector', now()),  -- alfie@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '32e6b2a0-b973-4d1c-b796-8325830e9eac', 'inspector', now()),  -- sanet@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '778ded9a-038a-4fcc-a5b1-c32a920c2d5c', 'inspector', now()),  -- karel@
  (gen_random_uuid(), '5c9092b4-9f54-43d0-a2e6-57bf210a63f0', '9865c0fa-cda4-4a72-8675-2ec449f909ff', 'inspector', now())   -- okkie@
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ─── 2. Fix SELECT policy — direct self-read (breaks recursive deadlock) ─────

DROP POLICY IF EXISTS "Users can read own membership" ON organization_users;
CREATE POLICY "Users can read own membership"
  ON organization_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─── 3. Fix INSERT policy — allow self-bootstrap as owner when org has none ──

DROP POLICY IF EXISTS "User can self-join org as owner if no owners exist" ON organization_users;
CREATE POLICY "User can self-join org as owner if no owners exist"
  ON organization_users FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM organization_users existing
      WHERE existing.organization_id = organization_users.organization_id
        AND existing.role = 'owner'
    )
  );

-- ─── 4. SECURITY DEFINER RPC — always readable by authenticated user ─────────

CREATE OR REPLACE FUNCTION get_my_org_memberships()
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
