/*
  # Fix Introduction RPC Column Names

  ## Overview
  Fixes the get_introduction_data RPC function to use correct column names from the projects table.

  ## Changes
  - Replace project_name with name
  - Ensure all column references match actual schema
  
  ## Notes
  This fixes a bug where the RPC function was referencing non-existent columns.
*/

-- Drop and recreate the RPC function with correct column names
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

  -- Get project information (FIXED: using 'name' instead of 'project_name')
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information
  SELECT jsonb_build_object(
    'client_name', c.client_name,
    'contact_name', c.contact_name
  )
  INTO client_info
  FROM clients c
  WHERE c.id = (project_info->>'client_id')::uuid;

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

  -- Get scope data (material types and application categories)
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
    'application_categories', (
      SELECT jsonb_agg(DISTINCT ip.application_category)
      FROM inspection_packages ip
      WHERE ip.project_id = p_project_id
        AND ip.application_category IS NOT NULL
        AND ip.application_category != ''
    ),
    'fire_scenarios', (
      SELECT jsonb_agg(DISTINCT ip.fire_scenario)
      FROM inspection_packages ip
      WHERE ip.project_id = p_project_id
        AND ip.fire_scenario IS NOT NULL
        AND ip.fire_scenario != ''
    ),
    'material_types', (
      SELECT jsonb_agg(DISTINCT m.material_type)
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND m.material_type IS NOT NULL
    )
  )
  INTO scope_data;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', jsonb_agg(DISTINCT jsonb_build_object(
      'id', b.id,
      'name', b.name
    )),
    'levels', jsonb_agg(DISTINCT jsonb_build_object(
      'id', l.id,
      'name', l.name
    ))
  )
  INTO blocks_levels_list
  FROM pin_inspections pi
  LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
  LEFT JOIN blocks b ON b.id = dp.block_id
  LEFT JOIN levels l ON l.id = dp.level_id
  WHERE pi.project_id = p_project_id
    AND (b.id IS NOT NULL OR l.id IS NOT NULL);

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

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;