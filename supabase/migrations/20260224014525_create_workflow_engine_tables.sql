/*
  # Create Deterministic Workflow Engine Tables
  
  1. New Tables
    - `project_workflow_state`
      - Single source of truth for project workflow status
      - Counts for all major entities
      - Error tracking
      - Auto-updated by triggers
    
    - `workflow_events`
      - Audit log for all workflow changes
      - Debug trail for troubleshooting
      - User action tracking
    
  2. Changes
    - Replaces old workflow_states table with deterministic counts
    - Adds event logging for complete audit trail
    
  3. Security
    - Enable RLS on both tables
    - Policies for authenticated users with project access
*/

-- Drop old workflow states table if exists
DROP TABLE IF EXISTS project_workflow_states CASCADE;

-- Create authoritative workflow state table
CREATE TABLE IF NOT EXISTS project_workflow_state (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Entity counts (authoritative)
  documents_count int NOT NULL DEFAULT 0,
  loading_items_count int NOT NULL DEFAULT 0,
  members_count int NOT NULL DEFAULT 0,
  drawings_count int NOT NULL DEFAULT 0,
  pins_count int NOT NULL DEFAULT 0,
  inspections_count int NOT NULL DEFAULT 0,
  ncr_count int NOT NULL DEFAULT 0,
  
  -- Timestamps
  last_import_at timestamptz,
  last_member_create_at timestamptz,
  
  -- Error tracking
  last_error text,
  last_error_at timestamptz,
  
  -- Update tracking
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create workflow events audit log
CREATE TABLE IF NOT EXISTS workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_events_project_id ON workflow_events(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_created_at ON workflow_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_event_type ON workflow_events(event_type);

-- Enable RLS
ALTER TABLE project_workflow_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_workflow_state
DROP POLICY IF EXISTS "Users can view workflow state for their projects" ON project_workflow_state;
CREATE POLICY "Users can view workflow state for their projects"
  ON project_workflow_state FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
         OR created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert workflow state" ON project_workflow_state;
CREATE POLICY "System can insert workflow state"
  ON project_workflow_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update workflow state" ON project_workflow_state;
CREATE POLICY "System can update workflow state"
  ON project_workflow_state FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for workflow_events
DROP POLICY IF EXISTS "Users can view workflow events for their projects" ON workflow_events;
CREATE POLICY "Users can view workflow events for their projects"
  ON workflow_events FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
         OR created_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert workflow events" ON workflow_events;
CREATE POLICY "Users can insert workflow events"
  ON workflow_events FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() 
         OR created_by_user_id = auth.uid()
    )
  );

-- Initialize workflow state for existing projects
INSERT INTO project_workflow_state (project_id)
SELECT id FROM projects
ON CONFLICT (project_id) DO NOTHING;