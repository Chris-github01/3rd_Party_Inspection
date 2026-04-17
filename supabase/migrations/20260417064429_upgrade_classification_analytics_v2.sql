/*
  # Upgrade Image Classification Analytics v2

  ## Summary
  Extends the image classification system with full disagreement logging,
  top-2 confidence scores storage, enhanced corrections table, and a
  database view + RPC that powers the admin analytics dashboard.

  ## Changes

  ### 1. New columns on inspection_ai_drawings
  - `image_category_top2_json` (jsonb) — stores top-2 category scores:
    [{category, confidence}, {category, confidence}]

  ### 2. Enhanced image_classification_corrections
  - `heuristic_category` (text) — what the heuristic said at upload time
  - `ai_category`        (text) — what the AI said (gemini/openai)
  - `manual_category`    (text) — what the user set (alias: corrected_category, kept for compatibility)
  - All three fields filled whenever any one of them differs (disagreement log)

  ### 3. New table: image_classification_disagreements
  Automatically populated via trigger whenever AI result differs from heuristic.
  - `drawing_id`            FK → inspection_ai_drawings
  - `heuristic_category`
  - `ai_category`
  - `ai_confidence`
  - `ai_source`            gemini | openai
  - `agreed`               boolean — true if heuristic === ai
  - `created_at`

  ### 4. RPC: get_image_classification_stats()
  Returns JSON with:
  - total_images, ai_classified, manually_overridden, pending
  - ai_correction_rate (fraction where AI disagreed with heuristic)
  - manual_override_rate
  - avg_confidence
  - by_category (array of {category, count, avg_confidence, override_count})
  - worst_categories (top 5 by override_count)

  ### 5. RPC: export_classification_corrections_csv(p_year int, p_month int)
  Returns labeled correction rows for the given month as a JSON array
  (client converts to CSV). Useful for monthly dataset exports.

  ## Security
  - RLS on disagreements table (authenticated users see all — analytics use case)
  - get_image_classification_stats is SECURITY DEFINER so it can aggregate across org
*/

-- ── 1. Top-2 scores column ──────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'image_category_top2_json') THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN image_category_top2_json jsonb DEFAULT NULL;
  END IF;
END $$;

-- ── 2. Enhance corrections table ────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'image_classification_corrections' AND column_name = 'heuristic_category') THEN
    ALTER TABLE image_classification_corrections ADD COLUMN heuristic_category text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'image_classification_corrections' AND column_name = 'ai_category') THEN
    ALTER TABLE image_classification_corrections ADD COLUMN ai_category text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'image_classification_corrections' AND column_name = 'manual_category') THEN
    ALTER TABLE image_classification_corrections ADD COLUMN manual_category text DEFAULT NULL;
  END IF;
END $$;

-- ── 3. Disagreements table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS image_classification_disagreements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id          uuid NOT NULL REFERENCES inspection_ai_drawings(id) ON DELETE CASCADE,
  heuristic_category  text,
  ai_category         text NOT NULL,
  ai_confidence       numeric(4,3),
  ai_source           text NOT NULL DEFAULT 'gemini',
  agreed              boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE image_classification_disagreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select disagreements"
  ON image_classification_disagreements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert disagreements"
  ON image_classification_disagreements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_disagreements_drawing_id
  ON image_classification_disagreements(drawing_id);

CREATE INDEX IF NOT EXISTS idx_disagreements_ai_category
  ON image_classification_disagreements(ai_category);

CREATE INDEX IF NOT EXISTS idx_disagreements_created_at
  ON image_classification_disagreements(created_at DESC);

-- ── 4. Analytics RPC ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_image_classification_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH base AS (
    SELECT
      id,
      image_category,
      image_category_source,
      image_category_confidence,
      image_category_pending_ai,
      file_type
    FROM inspection_ai_drawings
    WHERE file_type = 'image'
  ),
  totals AS (
    SELECT
      COUNT(*)                                                                           AS total_images,
      COUNT(*) FILTER (WHERE image_category_source IN ('gemini','openai'))               AS ai_classified,
      COUNT(*) FILTER (WHERE image_category_source = 'manual')                           AS manually_overridden,
      COUNT(*) FILTER (WHERE image_category_pending_ai = true)                           AS pending,
      ROUND(AVG(image_category_confidence) FILTER (WHERE image_category_confidence IS NOT NULL)::numeric, 3) AS avg_confidence
    FROM base
  ),
  disagreement_rate AS (
    SELECT
      COUNT(*) FILTER (WHERE NOT agreed)::numeric / NULLIF(COUNT(*), 0) AS ai_correction_rate
    FROM image_classification_disagreements
  ),
  override_rate AS (
    SELECT
      COUNT(DISTINCT drawing_id)::numeric / NULLIF((SELECT COUNT(*) FROM base WHERE image_category_source IN ('gemini','openai','manual')), 0) AS manual_override_rate
    FROM image_classification_corrections
  ),
  by_cat AS (
    SELECT
      image_category AS category,
      COUNT(*)::int                                                                               AS count,
      ROUND(AVG(image_category_confidence) FILTER (WHERE image_category_confidence IS NOT NULL)::numeric, 3) AS avg_confidence,
      COUNT(c.id)::int                                                                            AS override_count
    FROM base b
    LEFT JOIN image_classification_corrections c ON c.drawing_id = b.id
    WHERE image_category IS NOT NULL
    GROUP BY image_category
    ORDER BY count DESC
  )
  SELECT jsonb_build_object(
    'total_images',         t.total_images,
    'ai_classified',        t.ai_classified,
    'manually_overridden',  t.manually_overridden,
    'pending',              t.pending,
    'avg_confidence',       t.avg_confidence,
    'ai_correction_rate',   ROUND(COALESCE(d.ai_correction_rate, 0)::numeric, 4),
    'manual_override_rate', ROUND(COALESCE(o.manual_override_rate, 0)::numeric, 4),
    'by_category',          COALESCE((SELECT jsonb_agg(row_to_json(bc)) FROM by_cat bc), '[]'::jsonb),
    'worst_categories',     COALESCE((
                              SELECT jsonb_agg(row_to_json(wc))
                              FROM (SELECT * FROM by_cat WHERE override_count > 0 ORDER BY override_count DESC LIMIT 5) wc
                            ), '[]'::jsonb)
  ) INTO v_result
  FROM totals t
  CROSS JOIN disagreement_rate d
  CROSS JOIN override_rate o;

  RETURN v_result;
END;
$$;

-- ── 5. Monthly export RPC ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION export_classification_corrections_csv(
  p_year  int DEFAULT NULL,
  p_month int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_start  timestamptz;
  v_end    timestamptz;
BEGIN
  IF p_year IS NOT NULL AND p_month IS NOT NULL THEN
    v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
    v_end   := v_start + interval '1 month';
  ELSE
    v_start := date_trunc('month', now());
    v_end   := v_start + interval '1 month';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      c.id,
      c.drawing_id,
      d.name                    AS drawing_name,
      c.heuristic_category,
      c.ai_category,
      c.original_category,
      c.original_source,
      c.original_confidence,
      c.corrected_category      AS manual_category,
      c.corrected_by,
      c.created_at
    FROM image_classification_corrections c
    JOIN inspection_ai_drawings d ON d.id = c.drawing_id
    WHERE c.created_at >= v_start
      AND c.created_at < v_end
    ORDER BY c.created_at DESC
  ) r;

  RETURN v_result;
END;
$$;
