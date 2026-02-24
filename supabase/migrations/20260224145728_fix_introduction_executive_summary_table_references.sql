-- Fix Introduction and Executive Summary RPC Functions
-- Problem: RPC functions reference non-existent tables
-- Solution: Update table names to match actual schema

-- Drop and recreate get_executive_summary_data with correct table names
DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  project_data jsonb;
  client_data jsonb;
  blocks_levels_data jsonb;
  materials_data jsonb;
  frr_data jsonb;
  fire_scenarios_data jsonb;
  inspection_stats_data jsonb;
  overall_result_value text;
BEGIN
  -- Get project and client data
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  SELECT jsonb_build_object(
    'name', c.name,
    'contact_name', c.contact_person
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  -- Get blocks and levels (using correct table names: blocks and levels)
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name))
       FROM blocks b
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'block_name', b.name))
       FROM levels l
       LEFT JOIN blocks b ON b.id = l.block_id
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  -- Get ACTUAL materials from members
  SELECT COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'material_id', fpm.id,
      'manufacturer', fpm.manufacturer,
      'product_name', fpm.product_name,
      'material_type', fpm.material_type
    )),
    '[]'::jsonb
  )
  INTO materials_data
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.coating_system::uuid
  WHERE m.project_id = p_project_id
    AND fpm.id IS NOT NULL;

  -- Get ACTUAL FRR ratings from members
  SELECT COALESCE(
    jsonb_agg(DISTINCT m.frr_minutes ORDER BY m.frr_minutes),
    '[]'::jsonb
  )
  INTO frr_data
  FROM members m
  WHERE m.project_id = p_project_id
    AND m.frr_minutes IS NOT NULL;

  -- Get fire scenarios (placeholder for now)
  fire_scenarios_data := '[]'::jsonb;

  -- Calculate inspection statistics
  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'completed_inspections', COUNT(*) FILTER (WHERE i.inspection_status != 'Draft'),
    'passed_inspections', COUNT(*) FILTER (WHERE i.result = 'pass'),
    'failed_inspections', COUNT(*) FILTER (WHERE i.result = 'fail'),
    'draft_inspections', COUNT(*) FILTER (WHERE i.inspection_status = 'Draft'),
    'min_date', MIN(i.inspection_date_time),
    'max_date', MAX(i.inspection_date_time)
  )
  INTO inspection_stats_data
  FROM inspections i
  WHERE i.project_id = p_project_id;

  -- Determine overall result
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE i.result = 'fail') > 0 THEN 'Non-Compliant'
    WHEN COUNT(*) FILTER (WHERE i.result = 'pass') > 0 THEN 'Compliant'
    ELSE 'Pending'
  END
  INTO overall_result_value
  FROM inspections i
  WHERE i.project_id = p_project_id
    AND i.inspection_status != 'Draft';

  -- Build complete result
  result := jsonb_build_object(
    'project', project_data,
    'client', COALESCE(client_data, '{}'::jsonb),
    'blocks_levels', blocks_levels_data,
    'materials', materials_data,
    'frr_ratings', frr_data,
    'fire_scenarios', fire_scenarios_data,
    'overall_result', overall_result_value,
    'inspection_stats', inspection_stats_data
  );

  RETURN result;
END;
$$;

-- Drop and recreate get_introduction_data with correct table names
DROP FUNCTION IF EXISTS get_introduction_data(uuid);

CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  company_data jsonb;
  project_data jsonb;
  client_data jsonb;
  scope_data jsonb;
  inspection_dates_data jsonb;
  blocks_levels_data jsonb;
  has_intumescent boolean;
  has_cementitious boolean;
  has_board boolean;
BEGIN
  -- Get company settings (using company_settings table, not organization_settings)
  SELECT jsonb_build_object(
    'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
    'address', cs.address,
    'phone', cs.phone,
    'email', cs.email,
    'website', cs.website
  )
  INTO company_data
  FROM company_settings cs
  LIMIT 1;

  -- Get project data
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client data (using correct column name: contact_person)
  SELECT jsonb_build_object(
    'name', c.name,
    'contact_name', c.contact_person
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  -- Detect ACTUAL material types from members
  SELECT
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%intumescent%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%cementitious%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%board%') > 0
  INTO
    has_intumescent,
    has_cementitious,
    has_board
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.coating_system::uuid
  WHERE m.project_id = p_project_id;

  -- Build scope data with actual detection
  scope_data := jsonb_build_object(
    'has_intumescent', COALESCE(has_intumescent, false),
    'has_cementitious', COALESCE(has_cementitious, false),
    'has_board', COALESCE(has_board, false)
  );

  -- Get inspection date range and failure status
  SELECT jsonb_build_object(
    'min_date', MIN(i.inspection_date_time),
    'max_date', MAX(i.inspection_date_time),
    'has_failures', COUNT(*) FILTER (WHERE i.result = 'fail') > 0
  )
  INTO inspection_dates_data
  FROM inspections i
  WHERE i.project_id = p_project_id;

  -- Get blocks and levels (using correct table names: blocks and levels)
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name))
       FROM blocks b
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'block_name', b.name))
       FROM levels l
       LEFT JOIN blocks b ON b.id = l.block_id
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  -- Build complete result
  result := jsonb_build_object(
    'company', company_data,
    'project', project_data,
    'client', COALESCE(client_data, '{}'::jsonb),
    'scope', scope_data,
    'inspection_dates', inspection_dates_data,
    'blocks_levels', blocks_levels_data
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;
