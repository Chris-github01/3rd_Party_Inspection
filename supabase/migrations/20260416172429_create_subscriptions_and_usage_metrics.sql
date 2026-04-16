/*
  # Create Subscriptions and Usage Metrics Tables

  ## What This Does
  Adds the commercial infrastructure for billing and per-tenant usage tracking.
  These tables are wired to organizations so each company has its own
  subscription record and daily usage ledger.

  ## New Table: subscriptions
  Tracks the billing relationship per organization. One row per org.
  - `id` — UUID PK
  - `organization_id` — FK to organizations (unique — one sub per org)
  - `stripe_customer_id` — Stripe customer ID for payment processing
  - `stripe_subscription_id` — Stripe subscription ID
  - `plan` — starter | pro | enterprise
  - `seats` — licensed user count
  - `status` — active | trialing | past_due | cancelled | suspended
  - `trial_ends_at` — end of free trial period
  - `current_period_start` / `current_period_end` — billing cycle bounds
  - `renews_at` — next renewal timestamp
  - `created_at` / `updated_at`

  ## New Table: usage_metrics
  Daily usage ledger per organization — one row per org per day.
  - `id` — bigint identity PK
  - `organization_id` — FK to organizations
  - `metric_date` — the calendar date (NOT NULL)
  - `ai_requests` — number of AI analysis calls
  - `images_processed` — number of images sent to AI
  - `reports_generated` — number of PDF reports exported
  - `storage_mb` — total storage consumed in MB
  - UNIQUE on (organization_id, metric_date) — upsert-safe

  ## Security
  - RLS enabled on both tables
  - Users can only view their own org's subscription and usage
  - Only org owners/admins can update subscription data
  - Usage inserts/updates handled by service_role (edge functions) only

  ## Indexes
  - subscriptions: organization_id, stripe_customer_id, stripe_subscription_id
  - usage_metrics: (organization_id, metric_date DESC) for dashboard queries
*/

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'starter',
  seats integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  renews_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('active','trialing','past_due','cancelled','suspended')
  ),
  CONSTRAINT subscriptions_plan_check CHECK (
    plan IN ('starter','pro','enterprise')
  )
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id
  ON subscriptions(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Org members can view their subscription
CREATE POLICY "Org members can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- Only owners/admins can update subscription details
CREATE POLICY "Org owners and admins can update subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = subscriptions.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_id = subscriptions.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- usage_metrics
CREATE TABLE IF NOT EXISTS usage_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  ai_requests integer NOT NULL DEFAULT 0,
  images_processed integer NOT NULL DEFAULT 0,
  reports_generated integer NOT NULL DEFAULT 0,
  storage_mb numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (organization_id, metric_date)
);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_date
  ON usage_metrics(organization_id, metric_date DESC);

-- Org members can view their usage
CREATE POLICY "Org members can view own usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));
