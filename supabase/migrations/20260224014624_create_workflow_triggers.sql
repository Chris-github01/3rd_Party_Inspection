/*
  # Create Workflow Auto-Update Triggers
  
  1. Trigger Function
    - Generic trigger function that extracts project_id and calls recompute
    
  2. Triggers
    - documents: INSERT, UPDATE, DELETE
    - loading_schedule_imports: INSERT, UPDATE, DELETE
    - loading_schedule_items: INSERT, UPDATE, DELETE
    - members: INSERT, UPDATE, DELETE
    - drawing_pins: INSERT, UPDATE, DELETE
    - inspections: INSERT, UPDATE, DELETE
    - ncrs: INSERT, UPDATE, DELETE
    
  3. Purpose
    - Keep workflow_state automatically synchronized
    - No manual refresh needed
    - Real-time state updates
*/

-- Generic trigger function for workflow state updates
CREATE OR REPLACE FUNCTION trigger_recompute_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  -- Extract project_id from NEW or OLD record
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Recompute workflow state
  IF v_project_id IS NOT NULL THEN
    PERFORM recompute_project_workflow_state(v_project_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on documents table
DROP TRIGGER IF EXISTS trigger_documents_workflow_update ON documents;
CREATE TRIGGER trigger_documents_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on loading_schedule_imports table
DROP TRIGGER IF EXISTS trigger_loading_imports_workflow_update ON loading_schedule_imports;
CREATE TRIGGER trigger_loading_imports_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON loading_schedule_imports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on loading_schedule_items table
DROP TRIGGER IF EXISTS trigger_loading_items_workflow_update ON loading_schedule_items;
CREATE TRIGGER trigger_loading_items_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON loading_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on members table
DROP TRIGGER IF EXISTS trigger_members_workflow_update ON members;
CREATE TRIGGER trigger_members_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on drawing_pins table
DROP TRIGGER IF EXISTS trigger_pins_workflow_update ON drawing_pins;
CREATE TRIGGER trigger_pins_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON drawing_pins
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on inspections table
DROP TRIGGER IF EXISTS trigger_inspections_workflow_update ON inspections;
CREATE TRIGGER trigger_inspections_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();

-- Trigger on ncrs table
DROP TRIGGER IF EXISTS trigger_ncrs_workflow_update ON ncrs;
CREATE TRIGGER trigger_ncrs_workflow_update
  AFTER INSERT OR UPDATE OR DELETE ON ncrs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recompute_workflow_state();