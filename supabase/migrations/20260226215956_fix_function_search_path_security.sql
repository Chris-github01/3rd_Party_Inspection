/*
  # Fix Function Search Path Security Vulnerabilities
  
  1. Security Issue
    - Multiple functions have role-mutable search_path, creating security vulnerability (CWE-426)
    - Attackers could exploit this by creating malicious schema/functions
    - PostgreSQL functions with SECURITY DEFINER need explicit search_path
  
  2. Changes
    - Set explicit search_path to 'public, pg_catalog' for all affected functions
    - Prevents search_path injection attacks
    - Ensures functions only access trusted schemas
  
  3. Affected Functions (10 total)
    - approve_loading_and_create_members
    - calculate_project_workflow_state
    - get_executive_summary_data
    - get_introduction_data
    - get_next_pin_number
    - get_pin_photos_with_urls
    - get_workflow_blocking_reasons
    - get_workflow_diagnostics
    - log_workflow_event
    - recompute_project_workflow_state
  
  4. Security Impact
    - BEFORE: Functions vulnerable to search_path manipulation
    - AFTER: Functions use fixed, secure search_path
    - Prevents privilege escalation and SQL injection via search_path
*/

-- Fix approve_loading_and_create_members
ALTER FUNCTION public.approve_loading_and_create_members(p_project_id uuid, p_import_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix calculate_project_workflow_state
ALTER FUNCTION public.calculate_project_workflow_state(p_project_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix get_executive_summary_data
ALTER FUNCTION public.get_executive_summary_data(p_project_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix get_introduction_data
ALTER FUNCTION public.get_introduction_data(p_project_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix get_next_pin_number
ALTER FUNCTION public.get_next_pin_number(p_project_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix get_pin_photos_with_urls
ALTER FUNCTION public.get_pin_photos_with_urls(p_pin_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix get_workflow_blocking_reasons
ALTER FUNCTION public.get_workflow_blocking_reasons(p_project_id uuid, p_tab_name text) 
  SET search_path = public, pg_catalog;

-- Fix get_workflow_diagnostics
ALTER FUNCTION public.get_workflow_diagnostics(p_project_id uuid) 
  SET search_path = public, pg_catalog;

-- Fix log_workflow_event
ALTER FUNCTION public.log_workflow_event(p_project_id uuid, p_event_type text, p_payload jsonb) 
  SET search_path = public, pg_catalog;

-- Fix recompute_project_workflow_state
ALTER FUNCTION public.recompute_project_workflow_state(p_project_id uuid) 
  SET search_path = public, pg_catalog;