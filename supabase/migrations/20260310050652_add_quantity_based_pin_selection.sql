/*
  # Add Quantity-Based Pin Selection System

  1. Changes
    - Update get_quantity_readings_for_pin_selection to include usage tracking
    - Show how many times each reading instance has been used as a pin
    - Calculate remaining available selections based on member quantity
    - Filter out fully-used instances from dropdown

  2. New Columns Returned
    - pin_usage_count: Number of pins already created for this reading
    - member_quantity: Total quantity from members table
    - remaining_quantity: How many more pins can be created
    - is_available: Boolean indicating if instance can still be selected

  3. Logic
    - Each member has a quantity (default 1 if not set)
    - Each quantity reading can be selected as many times as the member's quantity
    - Once pin_usage_count reaches member_quantity, instance is filtered out
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_quantity_readings_for_pin_selection(uuid);

-- Recreate with quantity tracking
CREATE OR REPLACE FUNCTION get_quantity_readings_for_pin_selection(p_project_id uuid)
RETURNS TABLE (
  reading_id uuid,
  member_id uuid,
  generated_id text,
  member_mark text,
  section_size text,
  element_type text,
  frr_format text,
  coating_product text,
  dft_required_microns int,
  sequence_number int,
  status text,
  has_readings boolean,
  loading_schedule_ref text,
  source text,
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
    ir.id as reading_id,
    m.id as member_id,
    ir.generated_id,
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
    ir.sequence_number,
    COALESCE(ir.status, 'pass') as status,
    (
      ir.dft_reading_1 IS NOT NULL OR
      ir.dft_reading_2 IS NOT NULL OR
      ir.dft_reading_3 IS NOT NULL
    ) as has_readings,
    lsi.loading_schedule_ref,
    CASE
      WHEN lsi.loading_schedule_ref IS NOT NULL THEN 'schedule'
      ELSE 'manual'
    END as source,
    -- Count how many pins are using this reading
    (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.inspection_reading_id = ir.id
      AND dp.project_id = p_project_id
    ) as pin_usage_count,
    -- Get member quantity (default to 1 if null)
    COALESCE(m.quantity, 1) as member_quantity,
    -- Calculate remaining quantity
    COALESCE(m.quantity, 1) - (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.inspection_reading_id = ir.id
      AND dp.project_id = p_project_id
    ) as remaining_quantity,
    -- Check if still available for selection
    (
      COALESCE(m.quantity, 1) > (
        SELECT COUNT(*)
        FROM drawing_pins dp
        WHERE dp.inspection_reading_id = ir.id
        AND dp.project_id = p_project_id
      )
    ) as is_available
  FROM
    inspection_readings ir
  INNER JOIN
    members m ON ir.member_id = m.id
  LEFT JOIN
    loading_schedule_items lsi ON m.loading_schedule_item_id = lsi.id
  WHERE
    ir.project_id = p_project_id
    -- Only show readings that still have available quantity
    AND COALESCE(m.quantity, 1) > (
      SELECT COUNT(*)
      FROM drawing_pins dp
      WHERE dp.inspection_reading_id = ir.id
      AND dp.project_id = p_project_id
    )
  ORDER BY
    m.member_mark NULLS LAST,
    ir.sequence_number ASC;
$$;

-- Add helpful comment
COMMENT ON FUNCTION get_quantity_readings_for_pin_selection IS
'Returns available quantity reading instances for pin selection, filtered by remaining quantity. Only shows instances that can still be selected based on member quantity limits.';
