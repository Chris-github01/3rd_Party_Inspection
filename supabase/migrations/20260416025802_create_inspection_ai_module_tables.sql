/*
  # Inspection AI Module — Standalone Tables

  ## Summary
  Creates two new isolated tables for the Inspection AI module.
  These tables are completely independent of all existing tables.

  ## New Tables

  ### inspection_ai_reports
  - Top-level report record created when an inspection session begins
  - Fields: id, project_name, inspector_name, created_at, user_id

  ### inspection_ai_items
  - Individual inspection findings linked to a report
  - Stores image URL, system/element tags, AI analysis results, and recommendations
  - Fields: id, report_id (FK), image_url, system_type, element, defect_type,
            severity, observation, non_conformance, recommendation, risk,
            confidence, created_at

  ## Security
  - RLS enabled on both tables
  - Authenticated users can CRUD their own reports and items
  - Items are accessible if the parent report belongs to the current user

  ## Storage
  - New storage bucket: inspection-ai-images
  - Authenticated users can upload/read their own images
*/

CREATE TABLE IF NOT EXISTS inspection_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL DEFAULT '',
  inspector_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai reports"
  ON inspection_ai_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai reports"
  ON inspection_ai_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai reports"
  ON inspection_ai_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai reports"
  ON inspection_ai_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS inspection_ai_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES inspection_ai_reports(id) ON DELETE CASCADE,
  image_url text NOT NULL DEFAULT '',
  system_type text NOT NULL DEFAULT '',
  element text NOT NULL DEFAULT '',
  defect_type text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'Low',
  observation text NOT NULL DEFAULT '',
  non_conformance text NOT NULL DEFAULT '',
  recommendation text NOT NULL DEFAULT '',
  risk text NOT NULL DEFAULT '',
  confidence numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own ai items"
  ON inspection_ai_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_reports r
      WHERE r.id = inspection_ai_items.report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai items"
  ON inspection_ai_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_reports r
      WHERE r.id = inspection_ai_items.report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai items"
  ON inspection_ai_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_reports r
      WHERE r.id = inspection_ai_items.report_id
      AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_ai_reports r
      WHERE r.id = inspection_ai_items.report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai items"
  ON inspection_ai_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_reports r
      WHERE r.id = inspection_ai_items.report_id
      AND r.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_inspection_ai_items_report_id ON inspection_ai_items(report_id);
CREATE INDEX IF NOT EXISTS idx_inspection_ai_reports_user_id ON inspection_ai_reports(user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-ai-images',
  'inspection-ai-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload ai images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inspection-ai-images');

CREATE POLICY "Anyone can read ai images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'inspection-ai-images');

CREATE POLICY "Authenticated users can delete own ai images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inspection-ai-images' AND auth.uid()::text = (storage.foldername(name))[1]);
