import { supabase } from '../../../lib/supabase';
import { prepareFileForUpload } from '../utils/fileRenderer';
import type {
  InspectionAIBlock,
  InspectionAILevel,
  InspectionAIDrawing,
  InspectionAIPin,
} from '../types';

const DRAWING_BUCKET = 'inspection-ai-drawings';

// ─── Blocks ───────────────────────────────────
export async function fetchBlocks(projectId: string): Promise<InspectionAIBlock[]> {
  const { data, error } = await supabase
    .from('inspection_ai_blocks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createBlock(projectId: string, name: string): Promise<InspectionAIBlock> {
  const { data, error } = await supabase
    .from('inspection_ai_blocks')
    .insert({ project_id: projectId, name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_blocks')
    .delete()
    .eq('id', blockId);
  if (error) throw new Error(error.message);
}

// ─── Levels ───────────────────────────────────
export async function fetchLevels(blockId: string): Promise<InspectionAILevel[]> {
  const { data, error } = await supabase
    .from('inspection_ai_levels')
    .select('*')
    .eq('block_id', blockId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createLevel(blockId: string, name: string): Promise<InspectionAILevel> {
  const { data, error } = await supabase
    .from('inspection_ai_levels')
    .insert({ block_id: blockId, name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLevel(levelId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_levels')
    .delete()
    .eq('id', levelId);
  if (error) throw new Error(error.message);
}

// ─── Drawings ─────────────────────────────────
export async function fetchDrawings(levelId: string): Promise<InspectionAIDrawing[]> {
  const { data, error } = await supabase
    .from('inspection_ai_drawings')
    .select('*')
    .eq('level_id', levelId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function uploadDrawing(
  file: File,
  levelId: string,
  name: string,
  pageCount = 1
): Promise<InspectionAIDrawing> {
  const { blob, mime, ext } = await prepareFileForUpload(file);

  const filename = `${levelId}/${Date.now()}.${ext}`;
  const isPdf = mime === 'application/pdf';
  const fileType = isPdf ? 'pdf' : 'image';

  const { error: uploadError } = await supabase.storage
    .from(DRAWING_BUCKET)
    .upload(filename, blob, { upsert: false, contentType: mime });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from(DRAWING_BUCKET)
    .getPublicUrl(filename);

  const { data, error } = await supabase
    .from('inspection_ai_drawings')
    .insert({
      level_id: levelId,
      name: name || file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      mime_type: mime,
      page_count: isPdf ? pageCount : 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_drawings')
    .delete()
    .eq('id', drawingId);
  if (error) throw new Error(error.message);
}

// ─── Pins ─────────────────────────────────────
export async function fetchPins(drawingId: string): Promise<InspectionAIPin[]> {
  const { data, error } = await supabase
    .from('inspection_ai_pins')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPin(
  drawingId: string,
  xPercent: number,
  yPercent: number,
  severity = 'Medium',
  label = ''
): Promise<InspectionAIPin> {
  const { data, error } = await supabase
    .from('inspection_ai_pins')
    .insert({
      drawing_id: drawingId,
      x_percent: xPercent,
      y_percent: yPercent,
      severity,
      label,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePin(
  pinId: string,
  patch: Partial<Pick<InspectionAIPin, 'item_id' | 'severity' | 'label'>>
): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_pins')
    .update(patch)
    .eq('id', pinId);
  if (error) throw new Error(error.message);
}

export async function deletePin(pinId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_pins')
    .delete()
    .eq('id', pinId);
  if (error) throw new Error(error.message);
}

export async function fetchAllPinsForProject(projectId: string): Promise<InspectionAIPin[]> {
  const { data, error } = await supabase
    .from('inspection_ai_pins')
    .select(`
      *,
      inspection_ai_drawings!inner(
        id,
        inspection_ai_levels!inner(
          id,
          inspection_ai_blocks!inner(project_id)
        )
      )
    `)
    .eq('inspection_ai_drawings.inspection_ai_levels.inspection_ai_blocks.project_id', projectId);

  if (error) throw new Error(error.message);
  return (data || []) as InspectionAIPin[];
}
