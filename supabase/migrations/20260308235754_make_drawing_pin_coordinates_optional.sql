/*
  # Make Drawing Pin Coordinates Optional

  1. Changes
    - Make x and y columns nullable on drawing_pins table
    - Coordinates are set when user clicks on drawing, not required at pin creation
    - Allows pins to be created and linked to members before placement

  2. Security
    - Maintains existing RLS policies
    - No changes to access control

  3. Notes
    - Fixes the "record 'new' has no field 'x_coordinate'" error
    - Allows flexible pin creation workflow
*/

-- Make x and y coordinates optional
ALTER TABLE drawing_pins 
  ALTER COLUMN x DROP NOT NULL,
  ALTER COLUMN y DROP NOT NULL;

-- Update the normalize_pin_coordinates trigger to handle null coordinates
DROP FUNCTION IF EXISTS public.normalize_pin_coordinates() CASCADE;
CREATE FUNCTION public.normalize_pin_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only normalize if coordinates and canvas dimensions are provided
  IF NEW.x IS NOT NULL AND NEW.y IS NOT NULL AND 
     NEW.canvas_width IS NOT NULL AND NEW.canvas_height IS NOT NULL THEN
    NEW.x_normalized := NEW.x / NEW.canvas_width;
    NEW.y_normalized := NEW.y / NEW.canvas_height;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS normalize_pin_coordinates_trigger ON drawing_pins;
CREATE TRIGGER normalize_pin_coordinates_trigger
  BEFORE INSERT OR UPDATE ON drawing_pins
  FOR EACH ROW
  EXECUTE FUNCTION normalize_pin_coordinates();
