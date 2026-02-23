/*
  # Create Project Workflow State System

  1. New Tables
    - `project_workflow_states`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `documents_ready` (boolean) - Has any documents
      - `drawings_ready` (boolean) - Has drawings uploaded
      - `locations_ready` (boolean) - Has pins/zones configured
      - `members_ready` (boolean) - Has members assigned to locations
      - `workflow_ready` (boolean) - Full workflow activated
      - `last_checked_at` (timestamptz) - Last state check
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `calculate_project_workflow_state(project_id)` - Calculates current state
    - `get_workflow_blocking_reasons(project_id, tab_name)` - Returns reasons for blocks

  3. Security
    - Enable RLS on project_workflow_states
    - Policies for authenticated users to read their projects' states

  4. Triggers
    - Auto-update workflow state when documents, drawings, pins, or members change
*/

-- Create project workflow states table
CREATE TABLE IF NOT EXISTS project_workflow_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  documents_ready boolean DEFAULT false,
  drawings_ready boolean DEFAULT false,
  locations_ready boolean DEFAULT false,
  members_ready boolean DEFAULT false,
  workflow_ready boolean DEFAULT false,
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_workflow_states ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view workflow states for accessible projects"
  ON project_workflow_states FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid() OR created_by_user_id = auth.uid()
    )
  );

-- Function to calculate project workflow state
CREATE OR REPLACE FUNCTION calculate_project_workflow_state(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  state jsonb;
  has_documents boolean;
  has_drawings boolean;
  has_locations boolean;
  has_members_with_locations boolean;
  full_workflow boolean;
  doc_count int;
  drawing_count int;
  pin_count int;
  zone_count int;
  member_count int;
BEGIN
  -- Check for any documents
  SELECT COUNT(*) INTO doc_count
  FROM documents
  WHERE project_id = p_project_id;
  
  has_documents := doc_count > 0;

  -- Check for drawings (documents with document_type = 'drawing')
  SELECT COUNT(*) INTO drawing_count
  FROM documents
  WHERE project_id = p_project_id
    AND document_type = 'drawing';
  
  has_drawings := drawing_count > 0;

  -- Check for spatial configuration (pins or zones/blocks)
  SELECT COUNT(*) INTO pin_count
  FROM drawing_pins
  WHERE project_id = p_project_id;

  SELECT COUNT(*) INTO zone_count
  FROM blocks
  WHERE project_id = p_project_id;
  
  has_locations := (pin_count > 0 OR zone_count > 0);

  -- Check for members with location assignments
  SELECT COUNT(*) INTO member_count
  FROM members m
  LEFT JOIN drawing_pins dp ON dp.member_id = m.id
  WHERE m.project_id = p_project_id
    AND (dp.id IS NOT NULL OR m.block IS NOT NULL OR m.level IS NOT NULL);
  
  has_members_with_locations := member_count > 0;

  -- Full workflow is ready when all dependencies are met
  full_workflow := has_documents AND has_drawings AND has_locations AND has_members_with_locations;

  -- Build state object
  state := jsonb_build_object(
    'documents_ready', has_documents,
    'drawings_ready', has_drawings,
    'locations_ready', has_locations,
    'members_ready', has_members_with_locations,
    'workflow_ready', full_workflow,
    'counts', jsonb_build_object(
      'documents', doc_count,
      'drawings', drawing_count,
      'pins', pin_count,
      'zones', zone_count,
      'members_with_locations', member_count
    )
  );

  -- Update or insert state
  INSERT INTO project_workflow_states (
    project_id,
    documents_ready,
    drawings_ready,
    locations_ready,
    members_ready,
    workflow_ready,
    last_checked_at,
    updated_at
  )
  VALUES (
    p_project_id,
    has_documents,
    has_drawings,
    has_locations,
    has_members_with_locations,
    full_workflow,
    now(),
    now()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    documents_ready = EXCLUDED.documents_ready,
    drawings_ready = EXCLUDED.drawings_ready,
    locations_ready = EXCLUDED.locations_ready,
    members_ready = EXCLUDED.members_ready,
    workflow_ready = EXCLUDED.workflow_ready,
    last_checked_at = now(),
    updated_at = now();

  RETURN state;
END;
$$;

-- Function to get blocking reasons for a tab
CREATE OR REPLACE FUNCTION get_workflow_blocking_reasons(
  p_project_id uuid,
  p_tab_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  state jsonb;
  reasons jsonb := '[]'::jsonb;
BEGIN
  -- Get current state
  state := calculate_project_workflow_state(p_project_id);

  -- Check dependencies based on tab
  CASE p_tab_name
    WHEN 'loading_schedule' THEN
      IF NOT (state->>'documents_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'documents_missing',
          'message', 'Upload drawings in Documents',
          'action', 'Go to Documents'
        );
      END IF;
      IF NOT (state->>'drawings_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'drawings_missing',
          'message', 'Ensure project documentation is configured',
          'action', 'Upload Drawings'
        );
      END IF;

    WHEN 'site_manager' THEN
      IF NOT (state->>'drawings_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'drawings_missing',
          'message', 'Upload Drawings in Documents',
          'action', 'Go to Documents'
        );
      END IF;

    WHEN 'members' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure Site Manager - Create Spatial Zones',
          'action', 'Go to Site Manager'
        );
      END IF;

    WHEN 'inspections' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure locations in Site Manager',
          'action', 'Go to Site Manager'
        );
      END IF;
      IF NOT (state->>'members_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'members_missing',
          'message', 'Assign members to locations',
          'action', 'Go to Member Register'
        );
      END IF;

    WHEN 'ncrs' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure locations in Site Manager',
          'action', 'Go to Site Manager'
        );
      END IF;
  END CASE;

  RETURN jsonb_build_object(
    'is_blocked', jsonb_array_length(reasons) > 0,
    'reasons', reasons,
    'state', state
  );
END;
$$;

-- Trigger function to auto-update workflow state
CREATE OR REPLACE FUNCTION trigger_update_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update workflow state for the affected project
  PERFORM calculate_project_workflow_state(COALESCE(NEW.project_id, OLD.project_id));
  RETURN NEW;
END;
$$;

-- Create triggers on relevant tables
DROP TRIGGER IF EXISTS update_workflow_state_on_document_change ON documents;
CREATE TRIGGER update_workflow_state_on_document_change
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workflow_state();

DROP TRIGGER IF EXISTS update_workflow_state_on_pin_change ON drawing_pins;
CREATE TRIGGER update_workflow_state_on_pin_change
  AFTER INSERT OR UPDATE OR DELETE ON drawing_pins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workflow_state();

DROP TRIGGER IF EXISTS update_workflow_state_on_block_change ON blocks;
CREATE TRIGGER update_workflow_state_on_block_change
  AFTER INSERT OR UPDATE OR DELETE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workflow_state();

DROP TRIGGER IF EXISTS update_workflow_state_on_member_change ON members;
CREATE TRIGGER update_workflow_state_on_member_change
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_workflow_state();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_project_workflow_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_blocking_reasons(uuid, text) TO authenticated;

-- Initialize states for existing projects
INSERT INTO project_workflow_states (project_id)
SELECT id FROM projects
ON CONFLICT (project_id) DO NOTHING;

-- Update all existing project states
DO $$
DECLARE
  proj record;
BEGIN
  FOR proj IN SELECT id FROM projects LOOP
    PERFORM calculate_project_workflow_state(proj.id);
  END LOOP;
END $$;
