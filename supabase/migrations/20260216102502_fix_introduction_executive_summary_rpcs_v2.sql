/*
  # Fix Introduction and Executive Summary RPC Functions

  ## Overview
  Fixes column name mismatches and NULL safety issues in the introduction and executive summary RPC functions.

  ## Issues Fixed
  1. Executive Summary: Uses wrong column names (project_name vs name, project_number vs project_ref)
  2. Both RPCs: Client lookup fails when client_id is NULL
  3. Both RPCs: Return field names don't match frontend expectations

  ## Changes
  - Fix column references to match actual projects table schema
  - Add NULL safety for client lookups with fallback to denormalized client_name
  - Correct return JSON field names to match frontend TypeScript interfaces
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_introduction_data(uuid);
DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

-- Recreate get_introduction_data function with fixes
CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  company_info jsonb;
  project_info jsonb;
  client_info jsonb;
  scope_data jsonb;
  inspection_dates jsonb;
  blocks_levels_list jsonb;
BEGIN
  -- Get company settings
  SELECT jsonb_build_object(
    'company_name', cs.company_name,
    'company_logo_url', cs.company_logo_url,
    'address', cs.address,
    'phone', cs.phone,
    'email', cs.email,
    'website', cs.website
  )
  INTO company_info
  FROM company_settings cs
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- Get project information (using correct column names)
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information with NULL safety
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'name', c.client_name,
      'contact_name', c.contact_name
    )
    FROM clients c
    WHERE c.id = (project_info->>'client_id')::uuid
    LIMIT 1),
    jsonb_build_object(
      'name', COALESCE((SELECT p.client_name FROM projects p WHERE p.id = p_project_id), 'Unknown Client'),
      'contact_name', NULL
    )
  )
  INTO client_info;

  -- Get inspection date range
  SELECT jsonb_build_object(
    'min_date', MIN(pi.completed_at),
    'max_date', MAX(pi.completed_at),
    'has_failures', EXISTS(
      SELECT 1
      FROM pin_inspections pi2
      WHERE pi2.project_id = p_project_id
        AND pi2.inspection_status IN ('Failed', 'Rectification_Required')
    )
  )
  INTO inspection_dates
  FROM pin_inspections pi
  WHERE pi.project_id = p_project_id
    AND pi.completed_at IS NOT NULL;

  -- Get scope data
  SELECT jsonb_build_object(
    'has_intumescent', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND (
          m.material_type ILIKE '%intumescent%'
          OR m.material_type ILIKE '%thin film%'
        )
    ),
    'has_cementitious', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND m.material_type ILIKE '%cementitious%'
    ),
    'has_board', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND (
          m.material_type ILIKE '%board%'
          OR m.material_type ILIKE '%panel%'
        )
    ),
    'application_categories', '[]'::jsonb,
    'fire_scenarios', (
      SELECT COALESCE(jsonb_agg(DISTINCT ip.fire_scenario), '[]'::jsonb)
      FROM inspection_packages ip
      WHERE ip.project_id = p_project_id
        AND ip.fire_scenario IS NOT NULL
        AND ip.fire_scenario != ''
    ),
    'material_types', (
      SELECT COALESCE(jsonb_agg(DISTINCT m.material_type), '[]'::jsonb)
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND m.material_type IS NOT NULL
    )
  )
  INTO scope_data;

  -- Get blocks and levels with NULL safety
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
       FROM pin_inspections pi
       LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
       LEFT JOIN blocks b ON b.id = dp.block_id
       WHERE pi.project_id = p_project_id AND b.id IS NOT NULL),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name))
       FROM pin_inspections pi
       LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
       LEFT JOIN levels l ON l.id = dp.level_id
       WHERE pi.project_id = p_project_id AND l.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_list;

  -- Build final result
  result := jsonb_build_object(
    'company', COALESCE(company_info, '{"company_name": "P&R Consulting Limited"}'::jsonb),
    'project', project_info,
    'client', client_info,
    'scope', scope_data,
    'inspection_dates', inspection_dates,
    'blocks_levels', blocks_levels_list
  );

  RETURN result;
END;
$$;

-- Recreate get_executive_summary_data function with fixes
CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  project_info jsonb;
  client_info jsonb;
  blocks_levels jsonb;
  materials_list jsonb;
  frr_list jsonb;
  fire_scenarios jsonb;
  inspection_stats jsonb;
  overall_result text;
  has_failed boolean;
BEGIN
  -- Get project information (using correct column names)
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information with NULL safety
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'name', c.client_name,
      'contact_name', c.contact_name
    )
    FROM clients c
    WHERE c.id = (project_info->>'client_id')::uuid
    LIMIT 1),
    jsonb_build_object(
      'name', COALESCE((SELECT p.client_name FROM projects p WHERE p.id = p_project_id), 'Unknown Client'),
      'contact_name', NULL
    )
  )
  INTO client_info;

  -- Get unique blocks and levels inspected with NULL safety
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
       FROM pin_inspections pi
       LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
       LEFT JOIN blocks b ON b.id = dp.block_id
       WHERE pi.project_id = p_project_id AND b.id IS NOT NULL),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name, 'block_name', b.name))
       FROM pin_inspections pi
       LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
       LEFT JOIN levels l ON l.id = dp.level_id
       LEFT JOIN blocks b ON b.id = dp.block_id
       WHERE pi.project_id = p_project_id AND l.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  INTO blocks_levels;

  -- Get unique materials with full details
  SELECT COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'material_id', m.id,
      'manufacturer', m.manufacturer,
      'product_name', m.product_name,
      'material_type', m.material_type,
      'certification_standard', m.certification_standard,
      'application_type', m.application_type
    )),
    '[]'::jsonb
  )
  INTO materials_list
  FROM inspection_packages ip
  LEFT JOIN materials m ON m.id = ip.material_id
  WHERE ip.project_id = p_project_id
    AND m.id IS NOT NULL;

  -- Get unique FRR ratings
  SELECT COALESCE(
    jsonb_agg(DISTINCT ip.frr_minutes ORDER BY ip.frr_minutes),
    '[]'::jsonb
  )
  INTO frr_list
  FROM inspection_packages ip
  WHERE ip.project_id = p_project_id
    AND ip.frr_minutes IS NOT NULL;

  -- Get unique fire scenarios
  SELECT COALESCE(
    jsonb_agg(DISTINCT ip.fire_scenario),
    '[]'::jsonb
  )
  INTO fire_scenarios
  FROM inspection_packages ip
  WHERE ip.project_id = p_project_id
    AND ip.fire_scenario IS NOT NULL
    AND ip.fire_scenario != '';

  -- Check if any inspections have failed
  SELECT EXISTS(
    SELECT 1
    FROM pin_inspections pi
    WHERE pi.project_id = p_project_id
      AND pi.inspection_status IN ('Failed', 'Rectification_Required')
  )
  INTO has_failed;

  -- Determine overall result
  IF has_failed THEN
    overall_result := 'Non-Compliant';
  ELSE
    overall_result := 'Compliant';
  END IF;

  -- Get inspection statistics
  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'completed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Completed'),
    'passed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Completed'),
    'failed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status IN ('Failed', 'Rectification_Required')),
    'draft_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Draft'),
    'min_date', MIN(pi.completed_at),
    'max_date', MAX(pi.completed_at)
  )
  INTO inspection_stats
  FROM pin_inspections pi
  WHERE pi.project_id = p_project_id;

  -- Build final result
  result := jsonb_build_object(
    'project', project_info,
    'client', client_info,
    'blocks_levels', blocks_levels,
    'materials', materials_list,
    'frr_ratings', frr_list,
    'fire_scenarios', fire_scenarios,
    'overall_result', overall_result,
    'inspection_stats', inspection_stats
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;