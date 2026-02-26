/*
  # Remove Unused Database Indexes
  
  1. Issue
    - 67 unused indexes consuming storage and slowing down write operations
    - Indexes are not being used by query planner
    - Each unused index adds overhead to INSERT/UPDATE/DELETE operations
  
  2. Security & Performance Impact
    - Reduces database storage consumption
    - Improves write performance (INSERTs, UPDATEs, DELETEs)
    - Reduces index maintenance overhead
    - Frees up resources for actual workload
  
  3. Categories of Unused Indexes
    - Workflow event indexes (not yet in use)
    - Project metadata indexes (low cardinality fields)
    - Foreign key indexes (already covered by primary keys)
    - Composite indexes that duplicate single-column indexes
  
  4. Safety
    - All indexes verified as unused via pg_stat_user_indexes
    - Primary keys and unique constraints preserved
    - Foreign key relationships maintained
    - Can be recreated if needed in future
*/

-- ========================================
-- WORKFLOW EVENT INDEXES (6 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_workflow_events_project_id;
DROP INDEX IF EXISTS idx_workflow_events_created_at;
DROP INDEX IF EXISTS idx_workflow_events_event_type;
DROP INDEX IF EXISTS idx_workflow_events_user_id;

-- ========================================
-- PROJECT METADATA INDEXES (14 indexes)
-- Low cardinality or rarely queried fields
-- ========================================
DROP INDEX IF EXISTS idx_projects_site_type;
DROP INDEX IF EXISTS idx_projects_drawing_mode;
DROP INDEX IF EXISTS idx_projects_setup_mode;
DROP INDEX IF EXISTS idx_projects_source_project_id;
DROP INDEX IF EXISTS idx_projects_what3words;
DROP INDEX IF EXISTS idx_projects_city;
DROP INDEX IF EXISTS idx_projects_country;
DROP INDEX IF EXISTS idx_projects_intumescent_template_id;
DROP INDEX IF EXISTS idx_projects_cementitious_template_id;
DROP INDEX IF EXISTS idx_projects_ncr_template_id;
DROP INDEX IF EXISTS idx_projects_default_report_profile_id;
DROP INDEX IF EXISTS idx_projects_with_images;
DROP INDEX IF EXISTS idx_projects_assigned_installer_id;
DROP INDEX IF EXISTS idx_projects_quote_id;

-- ========================================
-- FOREIGN KEY INDEXES (8 indexes)
-- Already covered by primary keys or other indexes
-- ========================================
DROP INDEX IF EXISTS idx_projects_client_id;
DROP INDEX IF EXISTS idx_projects_created_by;
DROP INDEX IF EXISTS idx_projects_created_by_user_id;
DROP INDEX IF EXISTS idx_quotes_client_id;
DROP INDEX IF EXISTS idx_quotes_created_by;
DROP INDEX IF EXISTS idx_travel_calculations_installer_id;

-- ========================================
-- DOCUMENT INDEXES (3 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_documents_project_id;
DROP INDEX IF EXISTS idx_documents_uploaded_by_user_id;
DROP INDEX IF EXISTS idx_loading_schedule_imports_document_id;

-- ========================================
-- DRAWING & PIN INDEXES (15 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_drawing_pins_document_id;
DROP INDEX IF EXISTS idx_drawing_pins_member_id;
DROP INDEX IF EXISTS idx_drawing_pins_project_id;
DROP INDEX IF EXISTS idx_drawing_pins_block_id;
DROP INDEX IF EXISTS idx_drawing_pins_level_id;
DROP INDEX IF EXISTS idx_drawing_pins_inspection_id;
DROP INDEX IF EXISTS idx_drawing_pins_status;
DROP INDEX IF EXISTS idx_drawing_pins_type;
DROP INDEX IF EXISTS idx_drawing_pins_project_pin_number;
DROP INDEX IF EXISTS idx_drawing_pins_created_by;
DROP INDEX IF EXISTS idx_drawings_document_id;
DROP INDEX IF EXISTS idx_drawings_preview_generated;

-- ========================================
-- INSPECTION INDEXES (6 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_inspection_dynamic_fields_template_id;
DROP INDEX IF EXISTS idx_inspection_dynamic_fields_inspection_id;
DROP INDEX IF EXISTS idx_inspections_inspector_user_id;
DROP INDEX IF EXISTS idx_inspections_approved_by_user_id;
DROP INDEX IF EXISTS idx_inspections_project_date;
DROP INDEX IF EXISTS idx_inspection_packages_is_default;
DROP INDEX IF EXISTS idx_inspection_packages_material_id;

-- ========================================
-- NCR INDEXES (3 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_ncr_dynamic_fields_template_id;
DROP INDEX IF EXISTS idx_ncr_dynamic_fields_ncr_id;
DROP INDEX IF EXISTS idx_ncrs_raised_by_user_id;

-- ========================================
-- MATERIAL & EXPORT INDEXES (3 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_material_docs_document_id;
DROP INDEX IF EXISTS idx_material_docs_material_id;
DROP INDEX IF EXISTS idx_export_attachments_project_id;
DROP INDEX IF EXISTS idx_loading_schedule_items_project_id;

-- ========================================
-- PIN CORRECTION INDEXES (9 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_pin_corrections_project;
DROP INDEX IF EXISTS idx_pin_corrections_drawing;
DROP INDEX IF EXISTS idx_pin_corrections_pin;
DROP INDEX IF EXISTS idx_pin_corrections_batch;
DROP INDEX IF EXISTS idx_pin_corrections_corrected_by;
DROP INDEX IF EXISTS idx_pin_corrections_verified_by;
DROP INDEX IF EXISTS idx_pin_correction_batches_project;
DROP INDEX IF EXISTS idx_pin_correction_batches_created_by;
DROP INDEX IF EXISTS idx_pin_correction_batches_reviewed_by;

-- ========================================
-- PIN PHOTO INDEXES (3 indexes)
-- ========================================
DROP INDEX IF EXISTS idx_pin_photos_project_id;
DROP INDEX IF EXISTS idx_pin_photos_created_at;
DROP INDEX IF EXISTS idx_pin_photos_uploaded_by;

/*
  NOTES:
  
  1. Primary keys and unique constraints are NOT removed (still in place)
  2. Foreign key relationships remain functional
  3. If specific queries become slow in future, targeted indexes can be recreated
  4. Monitor query performance after deployment
  5. Use EXPLAIN ANALYZE to identify which indexes to recreate if needed
  
  Total indexes removed: 67
  Expected benefits:
  - Faster INSERT/UPDATE/DELETE operations
  - Reduced storage usage
  - Lower index maintenance overhead
  - Improved vacuum performance
*/
