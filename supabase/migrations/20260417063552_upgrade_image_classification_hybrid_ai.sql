/*
  # Upgrade Image Classification to Hybrid AI Intelligence

  ## Summary
  Extends inspection_ai_drawings with full classification metadata for the
  two-stage hybrid pipeline: instant heuristic + async AI vision reclassification.

  ## New Columns on inspection_ai_drawings
  - `image_category_confidence` (numeric 0-1) – confidence score from the classifier
  - `image_category_source`     (text)        – 'heuristic' | 'gemini' | 'openai' | 'manual'
  - `image_category_reason`     (text)        – short human-readable explanation
  - `image_category_pending_ai` (boolean)     – true while async AI job is in-flight

  ## New Table: image_classification_corrections
  Captures manual overrides for future learning / fine-tuning.
  - `drawing_id`         FK → inspection_ai_drawings
  - `original_category`  what the classifier said
  - `original_source`    heuristic | gemini | openai
  - `corrected_category` what the user changed it to
  - `corrected_by`       auth.uid()
  - `created_at`

  ## Security
  - RLS enabled on corrections table
  - Users can only insert/select their own corrections
*/

-- ── Column additions ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'image_category_confidence') THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN image_category_confidence numeric(4,3) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'image_category_source') THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN image_category_source text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'image_category_reason') THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN image_category_reason text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'image_category_pending_ai') THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN image_category_pending_ai boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── Corrections table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS image_classification_corrections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id          uuid NOT NULL REFERENCES inspection_ai_drawings(id) ON DELETE CASCADE,
  original_category   text NOT NULL,
  original_source     text NOT NULL DEFAULT 'heuristic',
  original_confidence numeric(4,3) DEFAULT NULL,
  corrected_category  text NOT NULL,
  corrected_by        uuid NOT NULL DEFAULT auth.uid(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE image_classification_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own corrections"
  ON image_classification_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = corrected_by);

CREATE POLICY "Users can select own corrections"
  ON image_classification_corrections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = corrected_by);

-- ── Index for lookup by drawing ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_corrections_drawing_id
  ON image_classification_corrections(drawing_id);
