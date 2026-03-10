/*
  # Fix Member Instance Dropdown to Show Members Not Readings

  1. Problem
    - Current dropdown shows every individual inspection_reading
    - For a member with quantity=3 and 100 readings, shows 300 options
    - Should only show 3 member instances

  2. Solution
    - Create new RPC that returns MEMBERS (not readings)
    - Group by member_id to show one row per member instance
    - Show availability based on member.quantity vs pins created

  3. Changes
    - Drop old get_quantity_readings_for_pin_selection
    - Create new get_member_instances_for_pin_selection
    - Returns members with reading counts and availability
*/

-- Drop old function
DROP FUNCTION IF EXISTS get_quantity_readings_for_pin_selection(uuid);

-- Create new function that returns member instances
CREATE OR REPLACE FUNCTION get_member_instances_for_pin_selection(p_project_id uuid)
RETURNS TABLE (
  member_id uuid,
  member_mark text,
  section_size text,
  element_type text,
  frr_format text,
  coating_product text,
  dft_required_microns int,
  status text,
  loading_schedule_ref text,
  source text,
  readings_count bigint,
  has_readings boolean,
  pin_usage_count bigint,
  member_quantity int,
  remaining_quantity int,
  is_available boolean
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id as member_id,
    m.member_mark,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section) as section_size,
    COALESCE(m.element_type, lsi.element_type) as element_type,
    COALESCE(
      m.override_json->>'frr_format',
      m.frr_format,
      lsi.frr_format,
      'Not specified'
    ) as frr_format,
    COALESCE(
      m.override_json->>'coating_product',
      m.coating_system,
      lsi.coating_product,
      ''
    ) as coating_product,
    COALESCE(
      (m.override_json->>'dft_required_microns')::int,
      m.required_dft_microns,
      lsi.dft_required_microns
    ) as dft_required_microns,
    m.status,
    lsi.loading_schedule_ref,
    CASE
      WHEN lsi.loading_schedule_ref IS NOT NULL THEN 'schedule'
      ELSE 'manual'
    END as source,
    -- Count inspection readings for this member
    (
      SELECT COUNT(*)
      FROM inspection_readings ir
      WHERE ir.member_id = m.id
    ) as readings_count,
    -- Check if member has any readings
    (
      SELECT COUNT(*) > 0
      FROM inspection_readings ir
      WHERE ir.member_id = m.id
    ) as has_readings,
    -- Count how many pins reference this member
    (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.member_id = m.id
      AND dp.project_id = p_project_id
    ) as pin_usage_count,
    -- Get member quantity (default to 1 if null)
    COALESCE(m.quantity, 1) as member_quantity,
    -- Calculate remaining quantity
    COALESCE(m.quantity, 1) - (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.member_id = m.id
      AND dp.project_id = p_project_id
    ) as remaining_quantity,
    -- Check if still available for selection
    (
      COALESCE(m.quantity, 1) > (
        SELECT COUNT(*)
        FROM drawing_pins dp
        WHERE dp.member_id = m.id
        AND dp.project_id = p_project_id
      )
    ) as is_available
  FROM
    members m
  LEFT JOIN
    loading_schedule_items lsi ON m.loading_schedule_item_id = lsi.id
  WHERE
    m.project_id = p_project_id
    -- Only show members that have inspection readings
    AND EXISTS (
      SELECT 1
      FROM inspection_readings ir
      WHERE ir.member_id = m.id
    )
    -- Only show members that still have available quantity
    AND COALESCE(m.quantity, 1) > (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.member_id = m.id
      AND dp.project_id = p_project_id
    )
  ORDER BY
    m.member_mark NULLS LAST;
$$;

-- Add helpful comment
COMMENT ON FUNCTION get_member_instances_for_pin_selection IS
'Returns member instances (not individual readings) for pin selection. Shows one row per member with reading counts and availability tracking. Filters out members that have reached their quantity limit.';
