/*
  # Backfill Tenant Data and Seed Optimal Fire as Primary Tenant

  ## What This Does
  1. Sets the slug and plan fields on existing organizations so they work as
     proper tenants in the new multi-tenant system.
  2. Backfills organization_id = Optimal Fire on all existing clients,
     inspections, AI projects, AI reports, AI items, drawings, members, NCRs
     that currently have no organization_id.
  3. Creates a starter subscription record for each organization that doesn't
     have one yet.

  ## Optimal Fire Tenant ID
  5c9092b4-9f54-43d0-a2e6-57bf210a63f0

  ## Notes
  - All UPDATEs use WHERE organization_id IS NULL to be safe — existing org
    assignments are never overwritten
  - Subscription rows use INSERT ... ON CONFLICT DO NOTHING
  - All existing data is preserved exactly as-is; only the org linkage is added
*/

-- Step 1: Set slugs on existing organizations
UPDATE organizations SET
  slug = 'optimal-fire',
  plan = 'pro',
  plan_status = 'active',
  max_seats = 10,
  max_ai_images_monthly = 500
WHERE id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0' AND slug IS NULL;

UPDATE organizations SET
  slug = 'pr-consulting-verifytrade',
  plan = 'enterprise',
  plan_status = 'active',
  max_seats = 25,
  max_ai_images_monthly = 1000
WHERE id = 'd56b30cb-82f8-49dc-8c4f-9f4837f89c0f' AND slug IS NULL;

UPDATE organizations SET
  slug = 'pr-consulting',
  plan = 'pro',
  plan_status = 'active',
  max_seats = 10,
  max_ai_images_monthly = 500
WHERE id = 'bffb5cde-58d8-4a59-9aef-7844225bdce0' AND slug IS NULL;

-- Step 2: Backfill organization_id on all unscoped rows
-- Use Optimal Fire as the default owner of unscoped data

UPDATE clients
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE inspections
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE inspection_ai_projects
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE inspection_ai_reports
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE inspection_ai_items
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE drawings
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE members
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

UPDATE ncrs
  SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
  WHERE organization_id IS NULL;

-- Step 3: Create starter subscription records for each organization
INSERT INTO subscriptions (organization_id, plan, seats, status, trial_ends_at)
VALUES
  ('5c9092b4-9f54-43d0-a2e6-57bf210a63f0', 'pro', 10, 'active', NULL),
  ('d56b30cb-82f8-49dc-8c4f-9f4837f89c0f', 'enterprise', 25, 'active', NULL),
  ('bffb5cde-58d8-4a59-9aef-7844225bdce0', 'pro', 10, 'active', NULL)
ON CONFLICT (organization_id) DO NOTHING;

-- Step 4: Seed today's usage_metrics baseline row for Optimal Fire
INSERT INTO usage_metrics (organization_id, metric_date, ai_requests, images_processed, reports_generated, storage_mb)
VALUES ('5c9092b4-9f54-43d0-a2e6-57bf210a63f0', CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (organization_id, metric_date) DO NOTHING;
