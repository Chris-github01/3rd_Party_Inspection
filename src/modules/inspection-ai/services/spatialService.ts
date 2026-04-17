import { supabase } from '../../../lib/supabase';
import { prepareFileForUpload, type PrepareProgressCallback } from '../utils/fileRenderer';
import type {
  InspectionAIBlock,
  InspectionAILevel,
  InspectionAIDrawing,
  InspectionAIPin,
  ImageCategory,
  ImageCategorySource,
} from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Confidence score assigned to heuristic results (0–1)
const HEURISTIC_CONFIDENCE = 0.52;

async function triggerAIClassification(
  drawingId: string,
  imageUrl: string,
  heuristicCategory: ImageCategory | null,
  heuristicConfidence: number
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    await fetch(
      `${SUPABASE_URL}/functions/v1/inspection-ai-classify-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          drawing_id: drawingId,
          image_url: imageUrl,
          heuristic_category: heuristicCategory,
          heuristic_confidence: heuristicConfidence,
        }),
      }
    );
  } catch {
    // fire-and-forget — never block the upload
  }
}

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
  pageCount = 1,
  onProgress?: PrepareProgressCallback
): Promise<InspectionAIDrawing> {
  const { blob, mime, ext, originalName, imageCategory } = await prepareFileForUpload(file, onProgress);

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

  onProgress?.('Saving drawing…');

  const isImage = !isPdf;
  const heuristicConf = isImage && imageCategory ? HEURISTIC_CONFIDENCE : null;
  const heuristicSource: ImageCategorySource | null = isImage && imageCategory ? 'heuristic' : null;

  const { data, error } = await supabase
    .from('inspection_ai_drawings')
    .insert({
      level_id: levelId,
      name: name || originalName || file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      mime_type: mime,
      page_count: isPdf ? pageCount : 1,
      image_category: imageCategory ?? null,
      image_category_confidence: heuristicConf,
      image_category_source: heuristicSource,
      image_category_reason: null,
      image_category_pending_ai: isImage,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (isImage && data?.id) {
    triggerAIClassification(
      data.id,
      urlData.publicUrl,
      imageCategory ?? null,
      heuristicConf ?? 0
    );
  }

  return data;
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_drawings')
    .delete()
    .eq('id', drawingId);
  if (error) throw new Error(error.message);
}

export async function overrideDrawingCategory(
  drawingId: string,
  newCategory: ImageCategory,
  originalCategory: ImageCategory | null,
  originalSource: ImageCategorySource | null,
  originalConfidence: number | null
): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_drawings')
    .update({
      image_category: newCategory,
      image_category_source: 'manual' as ImageCategorySource,
      image_category_confidence: 1.0,
      image_category_reason: 'Manually overridden by user',
      image_category_pending_ai: false,
    })
    .eq('id', drawingId);
  if (error) throw new Error(error.message);

  if (originalCategory) {
    await supabase.from('image_classification_corrections').insert({
      drawing_id: drawingId,
      original_category: originalCategory,
      original_source: originalSource ?? 'heuristic',
      original_confidence: originalConfidence,
      corrected_category: newCategory,
    });
  }
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
