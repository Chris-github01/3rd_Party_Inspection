/*
  # Inspection Brain v4 — Self-Learning Override Engine

  ## Purpose
  Every time a senior inspector changes a defect classification, severity, or observation
  produced by the AI, that correction is captured as a labelled training signal.
  Over time these override records power pattern-matching logic that adjusts future
  AI confidence scores and surfaces coaching prompts to intermediate inspectors.

  ## New Tables

  ### inspection_ai_overrides
  Records each inspector correction event against an inspection item.
  - `id`                        — primary key
  - `item_id`                   — the inspection item that was corrected
  - `report_id`                 — denormalised for efficient portfolio queries
  - `user_id`                   — the inspector who made the correction
  - `created_at`
  - `system_type`               — Intumescent / Cementitious / Protective Coating / Firestopping
  - `element_type`              — Beam / Column / Slab / Penetration / Other
  - `environment`               — Internal / External / Exposed / Harsh
  - `observed_concern`          — original concern tag from intake
  - `v3_family_hint`            — product-family behaviour hint from Brain v3 (nullable)
  - `ai_defect_type`            — what the AI originally classified
  - `ai_severity`               — AI original severity
  - `ai_confidence`             — AI confidence score 0-100
  - `final_defect_type`         — what the inspector corrected it to
  - `final_severity`            — inspector final severity
  - `changed_fields`            — array of which fields were changed
  - `notes`                     — optional free-text inspector note

  ## Security
  - RLS enabled; users may only read/insert their own overrides.
  - A separate policy allows service-role reads for analytics aggregation.
*/

CREATE TABLE IF NOT EXISTS inspection_ai_overrides (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           uuid NOT NULL,
  report_id         uuid NOT NULL,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz DEFAULT now() NOT NULL,
  system_type       text NOT NULL DEFAULT '',
  element_type      text NOT NULL DEFAULT '',
  environment       text NOT NULL DEFAULT '',
  observed_concern  text NOT NULL DEFAULT '',
  v3_family_hint    text,
  ai_defect_type    text NOT NULL DEFAULT '',
  ai_severity       text NOT NULL DEFAULT '',
  ai_confidence     numeric(5,2) NOT NULL DEFAULT 0,
  final_defect_type text NOT NULL DEFAULT '',
  final_severity    text NOT NULL DEFAULT '',
  changed_fields    text[] NOT NULL DEFAULT '{}',
  notes             text
);

ALTER TABLE inspection_ai_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own overrides"
  ON inspection_ai_overrides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own overrides"
  ON inspection_ai_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_overrides_user_id    ON inspection_ai_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_item_id    ON inspection_ai_overrides(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_system     ON inspection_ai_overrides(system_type);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_ai_defect  ON inspection_ai_overrides(ai_defect_type);
CREATE INDEX IF NOT EXISTS idx_ai_overrides_created_at ON inspection_ai_overrides(created_at DESC);
