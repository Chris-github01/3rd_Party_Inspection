/*
  # Link Drawing Pins to Inspection Readings

  1. Changes
    - Add inspection_reading_id column to drawing_pins table
    - Create foreign key relationship to inspection_readings
    - Allow pins to link to specific quantity reading instances

  2. Use Case
    - When a pin is created, it can be linked to a specific member instance (quantity reading)
    - Enables traceability: pin → inspection_reading → member
    - Supports workflow: Generate readings → Assign to drawing pins → Conduct inspections
*/

-- Add inspection_reading_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'inspection_reading_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN inspection_reading_id uuid REFERENCES inspection_readings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_drawing_pins_inspection_reading ON drawing_pins(inspection_reading_id);

-- Add helpful comment
COMMENT ON COLUMN drawing_pins.inspection_reading_id IS 'Links pin to a specific member instance (quantity reading) for inspection traceability';
