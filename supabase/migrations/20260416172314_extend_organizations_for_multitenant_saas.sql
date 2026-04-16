/*
  # Extend Organizations for Multi-Tenant SaaS

  ## What This Does
  Promotes the existing `organizations` table into the full tenant anchor for
  multi-company SaaS mode. Adds plan/billing fields, a unique URL slug for
  future white-label routing, branding fields, and a slug index.

  ## Changes to organizations
  - `slug` (text, unique, nullable initially) — URL-safe tenant identifier
    e.g. "optimal-fire", "fr-coatings". Nullable now so existing rows
    are not broken; backfilled in a later migration.
  - `plan` (text, default 'starter') — starter | pro | enterprise
  - `plan_status` (text, default 'active') — active | suspended | cancelled
  - `primary_color` (text, nullable) — hex color for white-label branding
  - `report_footer_text` (text, nullable) — custom footer for PDF reports
  - `max_seats` (integer, default 5) — user seat limit for plan enforcement
  - `max_ai_images_monthly` (integer, default 100) — AI quota per billing cycle

  ## Indexes
  - Unique index on slug (when not null)

  ## Notes
  - No destructive changes — all new columns are nullable or have safe defaults
  - Existing `organizations` rows continue to work unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'slug'
  ) THEN
    ALTER TABLE organizations ADD COLUMN slug text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'plan'
  ) THEN
    ALTER TABLE organizations ADD COLUMN plan text DEFAULT 'starter';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'plan_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN plan_status text DEFAULT 'active';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE organizations ADD COLUMN primary_color text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'report_footer_text'
  ) THEN
    ALTER TABLE organizations ADD COLUMN report_footer_text text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'max_seats'
  ) THEN
    ALTER TABLE organizations ADD COLUMN max_seats integer DEFAULT 5;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'max_ai_images_monthly'
  ) THEN
    ALTER TABLE organizations ADD COLUMN max_ai_images_monthly integer DEFAULT 100;
  END IF;
END $$;

-- Partial unique index on slug (only enforced when slug is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON organizations(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_plan
  ON organizations(plan);
