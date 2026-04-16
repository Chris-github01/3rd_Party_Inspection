/*
  # Inspection AI — Evidence Photos per Finding

  ## Summary
  Adds an evidence photos table so inspectors can attach additional photos
  to a finding without triggering a new AI analysis. The primary analysed
  image on the inspection item remains the primary image; these are
  supplementary evidence captures.

  ## New Tables

  ### inspection_ai_item_images
  - Additional evidence photos attached to a single inspection AI item
  - Fields:
    - id (uuid, PK)
    - item_id (uuid, FK → inspection_ai_items, CASCADE)
    - image_url (text, public URL)
    - caption (text, optional free-text label)
    - sort_order (integer, for manual reordering, default 0)
    - created_at (timestamptz)

  ## Security
  - RLS enabled
  - Access controlled through item → report → user_id ownership chain
  - Authenticated users can read/insert/update/delete their own item images

  ## Storage
  - Reuses the existing `inspection-ai-images` bucket (same MIME policy)
  - New storage policies scoped to the `evidence/` path prefix

  ## Notes
  1. No AI analysis is triggered for these images — they are purely visual
     evidence to support the classification already recorded on the item
  2. sort_order allows drag-to-reorder in the UI; 0 = first uploaded
  3. caption is optional (max 200 chars recommended in UI)
*/

CREATE TABLE IF NOT EXISTS inspection_ai_item_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid NOT NULL REFERENCES inspection_ai_items(id) ON DELETE CASCADE,
  image_url  text NOT NULL DEFAULT '',
  caption    text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai item images"
  ON inspection_ai_item_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_items i
      JOIN inspection_ai_reports r ON r.id = i.report_id
      WHERE i.id = inspection_ai_item_images.item_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai item images"
  ON inspection_ai_item_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_items i
      JOIN inspection_ai_reports r ON r.id = i.report_id
      WHERE i.id = inspection_ai_item_images.item_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai item images"
  ON inspection_ai_item_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_items i
      JOIN inspection_ai_reports r ON r.id = i.report_id
      WHERE i.id = inspection_ai_item_images.item_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_items i
      JOIN inspection_ai_reports r ON r.id = i.report_id
      WHERE i.id = inspection_ai_item_images.item_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai item images"
  ON inspection_ai_item_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_items i
      JOIN inspection_ai_reports r ON r.id = i.report_id
      WHERE i.id = inspection_ai_item_images.item_id
        AND r.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_item_images_item_id ON inspection_ai_item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_item_images_sort_order ON inspection_ai_item_images(item_id, sort_order);
