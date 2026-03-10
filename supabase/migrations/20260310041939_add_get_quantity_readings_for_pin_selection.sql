/*
  # Add RPC Function for Pin Selection with Quantity Readings

  1. New Function
    - `get_quantity_readings_for_pin_selection` - Returns all available quantity readings (generated IDs) for a project
    - Shows both the base member and individual generated readings
    - Includes all relevant metadata for display in dropdown

  2. Returns
    - reading_id: UUID of the inspection_reading
    - member_id: UUID of the parent member
    - generated_id: The auto-generated ID (e.g., "100EA8-001")
    - member_mark: Base member mark
    - section_size: Steel section size
    - element_type: Type of steel element
    - frr_format: Fire resistance rating
    - coating_product: Coating system name
    - dft_required_microns: Required DFT thickness
    - sequence_number: Position in quantity sequence
    - status: Reading status (pass/fail)
    - has_readings: Boolean indicating if inspection data exists

  3. Use Case
    - Site Manager tab: When adding a pin, users can select from quantity readings
    - Each pin links to a specific generated ID (member instance)
    - Enables traceability from pin → reading → member
*/

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
  has_readings boolean
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
      CASE 
        WHEN m.frr_minutes > 0 THEN m.frr_minutes::text || '/-/-'
        ELSE NULL
      END
    ) as frr_format,
    COALESCE(
      m.override_json->>'coating_product',
      m.coating_system,
      lsi.coating_product
    ) as coating_product,
    COALESCE(
      (m.override_json->>'dft_required_microns')::int,
      m.required_dft_microns,
      lsi.dft_required_microns
    ) as dft_required_microns,
    ir.sequence_number,
    ir.status,
    (ir.dft_reading_1 IS NOT NULL) as has_readings
  FROM members m
  LEFT JOIN loading_schedule_items lsi ON lsi.id = m.loading_schedule_item_id
  LEFT JOIN inspection_readings ir ON ir.member_id = m.id
  WHERE m.project_id = p_project_id
    AND ir.id IS NOT NULL  -- Only show members with generated readings
  ORDER BY 
    m.member_mark NULLS LAST,
    ir.sequence_number;
$$;
