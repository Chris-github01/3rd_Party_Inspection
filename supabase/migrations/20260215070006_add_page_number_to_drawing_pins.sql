/*
  # Add page number support to drawing pins

  1. Changes
    - Add `page_number` column to `drawing_pins` table
      - Defaults to 1 for existing pins
      - Required for multi-page PDF support
  
  2. Notes
    - Existing pins will automatically get page_number = 1
    - Enables filtering pins by PDF page
*/

ALTER TABLE drawing_pins
ADD COLUMN IF NOT EXISTS page_number INTEGER NOT NULL DEFAULT 1;
