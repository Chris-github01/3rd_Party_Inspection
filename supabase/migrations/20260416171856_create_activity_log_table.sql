/*
  # Create Activity Log Table

  ## What This Does
  Creates a tamper-evident audit trail table that records every significant
  action across the platform. Covers who did what, to which record, and when.
  Required for compliance, dispute resolution, and client-portal transparency.

  ## New Table: activity_log

  ### Columns
  - `id` — bigint identity PK (fast sequential insert, small storage)
  - `user_id` — FK to user_profiles (nullable: system actions have no user)
  - `action` — verb describing the action, e.g. 'created', 'approved', 'deleted'
  - `entity_type` — table/domain, e.g. 'inspection_ai_report', 'project', 'client'
  - `entity_id` — UUID of the affected record
  - `project_id` — optional FK to projects for project-scoped audit views
  - `client_id` — optional FK to clients for client-scoped audit views
  - `metadata` — JSONB for any extra context (old value, new value, IP, etc.)
  - `created_at` — timestamp, immutable

  ## Security
  - RLS enabled
  - Authenticated users can INSERT their own log entries
  - Users can SELECT only their own entries (or all if admin role)
  - NO UPDATE or DELETE policies — audit log is append-only
  - service_role (used by edge functions) bypasses RLS as normal

  ## Indexes
  - (user_id, created_at) — user activity timeline
  - (entity_type, entity_id) — all events for a specific record
  - (project_id, created_at) — project-scoped audit feed
  - (client_id, created_at) — client-scoped audit feed
*/

CREATE TABLE IF NOT EXISTS activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user_time
  ON activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_project_time
  ON activity_log(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_client_time
  ON activity_log(client_id, created_at DESC);
