-- Seed Demo Export Attachments
-- Creates sample export attachments for the demo project to demonstrate divider pages

DO $$
DECLARE
  demo_project_id uuid;
  demo_user_id uuid;
  doc1_id uuid;
  doc2_id uuid;
  doc3_id uuid;
BEGIN
  -- Get the first project (demo project)
  SELECT id INTO demo_project_id FROM projects LIMIT 1;
  
  -- Get the first user
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
  
  -- Only proceed if we have a project
  IF demo_project_id IS NOT NULL AND demo_user_id IS NOT NULL THEN
    
    -- Create sample document 1
    INSERT INTO documents (project_id, type, filename, original_name, storage_path, mime_type, size_bytes, uploaded_by_user_id)
    VALUES 
      (demo_project_id, 'other', 'Site_Drawing_Level_5.pdf', 'Site_Drawing_Level_5.pdf', 'demo/drawing1.pdf', 'application/pdf', 245000, demo_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO doc1_id;
    
    -- If doc1_id is null (conflict), get existing id
    IF doc1_id IS NULL THEN
      SELECT id INTO doc1_id FROM documents WHERE project_id = demo_project_id AND filename = 'Site_Drawing_Level_5.pdf' LIMIT 1;
    END IF;
    
    -- Create sample document 2
    INSERT INTO documents (project_id, type, filename, original_name, storage_path, mime_type, size_bytes, uploaded_by_user_id)
    VALUES 
      (demo_project_id, 'other', 'Elcometer_DFT_Report_Batch_001.pdf', 'Elcometer_DFT_Report_Batch_001.pdf', 'demo/dft1.pdf', 'application/pdf', 128000, demo_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO doc2_id;
    
    IF doc2_id IS NULL THEN
      SELECT id INTO doc2_id FROM documents WHERE project_id = demo_project_id AND filename = 'Elcometer_DFT_Report_Batch_001.pdf' LIMIT 1;
    END IF;
    
    -- Create sample document 3
    INSERT INTO documents (project_id, type, filename, original_name, storage_path, mime_type, size_bytes, uploaded_by_user_id)
    VALUES 
      (demo_project_id, 'other', 'Product_Data_Sheet_Intumescent.pdf', 'Product_Data_Sheet_Intumescent.pdf', 'demo/pds1.pdf', 'application/pdf', 512000, demo_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO doc3_id;
    
    IF doc3_id IS NULL THEN
      SELECT id INTO doc3_id FROM documents WHERE project_id = demo_project_id AND filename = 'Product_Data_Sheet_Intumescent.pdf' LIMIT 1;
    END IF;
    
    -- Create export attachments with metadata
    IF doc1_id IS NOT NULL THEN
      INSERT INTO project_export_attachments 
        (project_id, document_id, sequence_no, uploaded_by_user_id, source_type, mime_type, display_title, appendix_category)
      VALUES
        (demo_project_id, doc1_id, 1, demo_user_id, 'pdf', 'application/pdf', 'Site Drawing - Level 5 Fire Protection Layout', 'Drawing')
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF doc2_id IS NOT NULL THEN
      INSERT INTO project_export_attachments 
        (project_id, document_id, sequence_no, uploaded_by_user_id, source_type, mime_type, display_title, appendix_category)
      VALUES
        (demo_project_id, doc2_id, 2, demo_user_id, 'pdf', 'application/pdf', 'DFT Inspection Report - Batch 001', 'Elcometer / DFT Export')
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF doc3_id IS NOT NULL THEN
      INSERT INTO project_export_attachments 
        (project_id, document_id, sequence_no, uploaded_by_user_id, source_type, mime_type, display_title, appendix_category)
      VALUES
        (demo_project_id, doc3_id, 3, demo_user_id, 'pdf', 'application/pdf', 'Intumescent Coating System - Product Data Sheet', 'Product Data Sheet (PDS)')
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
END $$;
