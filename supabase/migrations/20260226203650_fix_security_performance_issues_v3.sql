/*
  # Fix Security and Performance Issues

  1. **Add Missing Indexes for Foreign Keys**
     - Add indexes for all unindexed foreign keys to improve query performance
     - Covers: drawing_pins, inspection_packages, pin_correction_batches, pin_corrections, pin_photos, workflow_events

  2. **Optimize RLS Policies (Auth Function Initialization)**
     - Fix RLS policies to use `(select auth.uid())` instead of `auth.uid()` directly
     - Prevents re-evaluation of auth functions for each row
     - Covers multiple tables: drawings, drawing_pins, pin_photos, project_workflow_state, workflow_events, form_templates, inspection_packages, blocks, levels

  3. **Remove Duplicate/Overly Permissive RLS Policies**
     - Remove policies that are always true (bypass security)
     - Remove duplicate permissive policies
     - Ensure proper access control

  4. **Fix Function Security**
     - Add search_path security to all functions to prevent injection attacks
     - Use `SET search_path = public, pg_temp` for all functions
*/

-- =====================================================
-- PART 1: ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_drawing_pins_created_by ON public.drawing_pins(created_by);
CREATE INDEX IF NOT EXISTS idx_inspection_packages_material_id ON public.inspection_packages(material_id);
CREATE INDEX IF NOT EXISTS idx_pin_correction_batches_created_by ON public.pin_correction_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_pin_correction_batches_reviewed_by ON public.pin_correction_batches(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_pin_corrections_corrected_by ON public.pin_corrections(corrected_by);
CREATE INDEX IF NOT EXISTS idx_pin_corrections_verified_by ON public.pin_corrections(verified_by);
CREATE INDEX IF NOT EXISTS idx_pin_photos_uploaded_by ON public.pin_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_workflow_events_user_id ON public.workflow_events(user_id);

-- =====================================================
-- PART 2: FIX RLS POLICIES - OPTIMIZE AUTH FUNCTION CALLS
-- =====================================================

-- Fix drawings table policies
DROP POLICY IF EXISTS "Admins and inspectors can create drawings" ON public.drawings;
CREATE POLICY "Admins and inspectors can create drawings"
  ON public.drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can update drawings" ON public.drawings;
CREATE POLICY "Admins and inspectors can update drawings"
  ON public.drawings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can delete drawings" ON public.drawings;
CREATE POLICY "Admins and inspectors can delete drawings"
  ON public.drawings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix drawing_pins table policies
DROP POLICY IF EXISTS "Users can update their own pins or admins/inspectors can update" ON public.drawing_pins;
CREATE POLICY "Users can update their own pins or admins/inspectors can update"
  ON public.drawing_pins FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own pins or admins/inspectors can delete" ON public.drawing_pins;
CREATE POLICY "Users can delete their own pins or admins/inspectors can delete"
  ON public.drawing_pins FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix pin_photos table policies
DROP POLICY IF EXISTS "Users can update their own photos or admins/inspectors can upda" ON public.pin_photos;
CREATE POLICY "Users can update their own photos or admins/inspectors can upda"
  ON public.pin_photos FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Users can delete their own photos or admins/inspectors can dele" ON public.pin_photos;
CREATE POLICY "Users can delete their own photos or admins/inspectors can dele"
  ON public.pin_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix project_workflow_state policies
DROP POLICY IF EXISTS "Users can view workflow state for their projects" ON public.project_workflow_state;
CREATE POLICY "Users can view workflow state for their projects"
  ON public.project_workflow_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_workflow_state.project_id
      AND created_by = (SELECT auth.uid())
    )
  );

-- Fix workflow_events policies
DROP POLICY IF EXISTS "Users can view workflow events for their projects" ON public.workflow_events;
CREATE POLICY "Users can view workflow events for their projects"
  ON public.workflow_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = workflow_events.project_id
      AND created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert workflow events" ON public.workflow_events;
CREATE POLICY "Users can insert workflow events"
  ON public.workflow_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix form_templates policies
DROP POLICY IF EXISTS "Admins can insert form templates" ON public.form_templates;
CREATE POLICY "Admins can insert form templates"
  ON public.form_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update form templates" ON public.form_templates;
CREATE POLICY "Admins can update form templates"
  ON public.form_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete form templates" ON public.form_templates;
CREATE POLICY "Admins can delete form templates"
  ON public.form_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Fix inspection_packages policies (remove duplicates and overly permissive ones)
DROP POLICY IF EXISTS "Authenticated users can insert inspection packages" ON public.inspection_packages;
DROP POLICY IF EXISTS "Authenticated users can update inspection packages" ON public.inspection_packages;
DROP POLICY IF EXISTS "Authenticated users can delete inspection packages" ON public.inspection_packages;

DROP POLICY IF EXISTS "Admins and inspectors can create inspection packages" ON public.inspection_packages;
CREATE POLICY "Admins and inspectors can create inspection packages"
  ON public.inspection_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can update inspection packages" ON public.inspection_packages;
CREATE POLICY "Admins and inspectors can update inspection packages"
  ON public.inspection_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can delete inspection packages" ON public.inspection_packages;
CREATE POLICY "Admins and inspectors can delete inspection packages"
  ON public.inspection_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix blocks policies
DROP POLICY IF EXISTS "Admins and inspectors can create blocks" ON public.blocks;
CREATE POLICY "Admins and inspectors can create blocks"
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can update blocks" ON public.blocks;
CREATE POLICY "Admins and inspectors can update blocks"
  ON public.blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can delete blocks" ON public.blocks;
CREATE POLICY "Admins and inspectors can delete blocks"
  ON public.blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- Fix levels policies
DROP POLICY IF EXISTS "Admins and inspectors can create levels" ON public.levels;
CREATE POLICY "Admins and inspectors can create levels"
  ON public.levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can update levels" ON public.levels;
CREATE POLICY "Admins and inspectors can update levels"
  ON public.levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can delete levels" ON public.levels;
CREATE POLICY "Admins and inspectors can delete levels"
  ON public.levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- =====================================================
-- PART 3: REMOVE OVERLY PERMISSIVE POLICIES
-- =====================================================

-- Remove overly permissive organization_settings policy
DROP POLICY IF EXISTS "Authenticated users can manage organization settings" ON public.organization_settings;

-- Remove duplicate pin_photos policies
DROP POLICY IF EXISTS "Authenticated users can insert pin photos" ON public.pin_photos;
DROP POLICY IF EXISTS "Authenticated users can update pin photos" ON public.pin_photos;
DROP POLICY IF EXISTS "Authenticated users can delete pin photos" ON public.pin_photos;

-- Fix the overly permissive "Authenticated users can upload pin photos" policy
DROP POLICY IF EXISTS "Authenticated users can upload pin photos" ON public.pin_photos;
CREATE POLICY "Authenticated users can upload pin photos"
  ON public.pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

-- Fix overly permissive documents policy
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
CREATE POLICY "Authenticated users can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = documents.project_id
      AND created_by = (SELECT auth.uid())
    )
  );

-- Fix overly permissive drawing_pins policy
DROP POLICY IF EXISTS "Authenticated users can create pins" ON public.drawing_pins;
CREATE POLICY "Authenticated users can create pins"
  ON public.drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Fix overly permissive project_workflow_state policies
DROP POLICY IF EXISTS "System can insert workflow state" ON public.project_workflow_state;
DROP POLICY IF EXISTS "System can update workflow state" ON public.project_workflow_state;

CREATE POLICY "System can insert workflow state"
  ON public.project_workflow_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_workflow_state.project_id
      AND created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "System can update workflow state"
  ON public.project_workflow_state FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_workflow_state.project_id
      AND created_by = (SELECT auth.uid())
    )
  );

-- =====================================================
-- PART 4: SECURE FUNCTIONS WITH SEARCH_PATH
-- =====================================================

-- Drop and recreate trigger functions with secure search_path
DROP FUNCTION IF EXISTS public.trigger_update_workflow_state() CASCADE;
CREATE FUNCTION public.trigger_update_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.recompute_project_workflow_state(NEW.project_id);
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.trigger_recompute_workflow_state() CASCADE;
CREATE FUNCTION public.trigger_recompute_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.recompute_project_workflow_state(COALESCE(NEW.project_id, OLD.project_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP FUNCTION IF EXISTS public.update_batch_correction_count() CASCADE;
CREATE FUNCTION public.update_batch_correction_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pin_correction_batches
    SET correction_count = correction_count + 1
    WHERE id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pin_correction_batches
    SET correction_count = GREATEST(0, correction_count - 1)
    WHERE id = OLD.batch_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP FUNCTION IF EXISTS public.normalize_pin_coordinates() CASCADE;
CREATE FUNCTION public.normalize_pin_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.x_normalized := NEW.x_coordinate / NEW.page_width;
  NEW.y_normalized := NEW.y_coordinate / NEW.page_height;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.update_pin_photos_updated_at() CASCADE;
CREATE FUNCTION public.update_pin_photos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers after recreating functions
DO $$
BEGIN
  -- Trigger for normalize_pin_coordinates
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'normalize_coordinates_trigger'
  ) THEN
    CREATE TRIGGER normalize_coordinates_trigger
      BEFORE INSERT OR UPDATE ON public.drawing_pins
      FOR EACH ROW
      EXECUTE FUNCTION public.normalize_pin_coordinates();
  END IF;

  -- Trigger for update_pin_photos_updated_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_pin_photos_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_pin_photos_updated_at_trigger
      BEFORE UPDATE ON public.pin_photos
      FOR EACH ROW
      EXECUTE FUNCTION public.update_pin_photos_updated_at();
  END IF;

  -- Trigger for update_batch_correction_count
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_batch_count_trigger'
  ) THEN
    CREATE TRIGGER update_batch_count_trigger
      AFTER INSERT OR DELETE ON public.pin_corrections
      FOR EACH ROW
      EXECUTE FUNCTION public.update_batch_correction_count();
  END IF;
END $$;
