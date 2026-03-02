import { pdfjsLib } from './pdfjs';
import { supabase } from './supabase';

export interface PreviewGenerationProgress {
  currentPage: number;
  totalPages: number;
  status: 'processing' | 'uploading' | 'complete' | 'error';
  message: string;
}

export interface GeneratedPreview {
  pageNumber: number;
  storagePath: string;
  width: number;
  height: number;
  blob: Blob;
}

export interface PreviewGenerationResult {
  success: boolean;
  previews: GeneratedPreview[];
  totalPages: number;
  error?: string;
}

const PREVIEW_SCALE = 2.0;
const PREVIEW_MAX_WIDTH = 1600;

export async function generateDrawingPreviews(
  pdfFile: File | Blob,
  projectId: string,
  drawingId: string,
  onProgress?: (progress: PreviewGenerationProgress) => void
): Promise<PreviewGenerationResult> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    onProgress?.({
      currentPage: 0,
      totalPages,
      status: 'processing',
      message: `Loading PDF (${totalPages} pages)...`,
    });

    const previews: GeneratedPreview[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({
        currentPage: pageNum,
        totalPages,
        status: 'processing',
        message: `Generating preview ${pageNum} of ${totalPages}...`,
      });

      const page = await pdf.getPage(pageNum);

      let viewport = page.getViewport({ scale: PREVIEW_SCALE });

      if (viewport.width > PREVIEW_MAX_WIDTH) {
        const scale = PREVIEW_MAX_WIDTH / viewport.width * PREVIEW_SCALE;
        viewport = page.getViewport({ scale });
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: false });

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          'image/png',
          0.95
        );
      });

      const storagePath = `projects/${projectId}/drawings/${drawingId}/page-${pageNum}.png`;

      previews.push({
        pageNumber: pageNum,
        storagePath,
        width: canvas.width,
        height: canvas.height,
        blob,
      });

      canvas.remove();
    }

    return {
      success: true,
      previews,
      totalPages,
    };
  } catch (error: any) {
    console.error('Error generating drawing previews:', error);
    return {
      success: false,
      previews: [],
      totalPages: 0,
      error: error.message || 'Failed to generate previews',
    };
  }
}

export async function uploadDrawingPreviews(
  previews: GeneratedPreview[],
  onProgress?: (progress: PreviewGenerationProgress) => void
): Promise<{ success: boolean; paths: string[]; error?: string }> {
  try {
    const uploadedPaths: string[] = [];

    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];

      onProgress?.({
        currentPage: i + 1,
        totalPages: previews.length,
        status: 'uploading',
        message: `Uploading preview ${i + 1} of ${previews.length}...`,
      });

      const { error: uploadError } = await supabase.storage
        .from('drawing-previews')
        .upload(preview.storagePath, preview.blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload preview ${i + 1}: ${uploadError.message}`);
      }

      uploadedPaths.push(preview.storagePath);
    }

    onProgress?.({
      currentPage: previews.length,
      totalPages: previews.length,
      status: 'complete',
      message: 'All previews uploaded successfully',
    });

    return {
      success: true,
      paths: uploadedPaths,
    };
  } catch (error: any) {
    console.error('Error uploading previews:', error);
    return {
      success: false,
      paths: [],
      error: error.message || 'Failed to upload previews',
    };
  }
}

export async function updateDrawingPreviewMetadata(
  drawingId: string,
  previewPaths: string[],
  pageCount: number,
  width: number,
  height: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('drawings')
      .update({
        preview_paths: previewPaths,
        page_count: pageCount,
        preview_width: width,
        preview_height: height,
        preview_generated_at: new Date().toISOString(),
      })
      .eq('id', drawingId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating drawing metadata:', error);
    return {
      success: false,
      error: error.message || 'Failed to update drawing metadata',
    };
  }
}

export async function generateAndUploadDrawingPreviews(
  pdfFile: File | Blob,
  projectId: string,
  drawingId: string,
  onProgress?: (progress: PreviewGenerationProgress) => void
): Promise<{ success: boolean; error?: string }> {
  const generationResult = await generateDrawingPreviews(
    pdfFile,
    projectId,
    drawingId,
    onProgress
  );

  if (!generationResult.success) {
    return {
      success: false,
      error: generationResult.error,
    };
  }

  const uploadResult = await uploadDrawingPreviews(generationResult.previews, onProgress);

  if (!uploadResult.success) {
    return {
      success: false,
      error: uploadResult.error,
    };
  }

  const firstPreview = generationResult.previews[0];
  const metadataResult = await updateDrawingPreviewMetadata(
    drawingId,
    uploadResult.paths,
    generationResult.totalPages,
    firstPreview.width,
    firstPreview.height
  );

  if (!metadataResult.success) {
    return {
      success: false,
      error: metadataResult.error,
    };
  }

  return { success: true };
}

export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadPreviewAsDataURL(storagePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('drawing-previews')
      .download(storagePath);

    if (error || !data) {
      console.error('Error downloading preview:', error);
      return null;
    }

    return await blobToDataURL(data);
  } catch (error) {
    console.error('Error converting preview to data URL:', error);
    return null;
  }
}

export async function getDrawingPreviewDataURLs(
  drawingId: string
): Promise<{ pageNumber: number; dataURL: string }[]> {
  try {
    const { data: drawing, error } = await supabase
      .from('drawings')
      .select('preview_paths')
      .eq('id', drawingId)
      .single();

    if (error || !drawing || !drawing.preview_paths) {
      return [];
    }

    const previewPaths = drawing.preview_paths as string[];
    const results: { pageNumber: number; dataURL: string }[] = [];

    for (let i = 0; i < previewPaths.length; i++) {
      const dataURL = await downloadPreviewAsDataURL(previewPaths[i]);
      if (dataURL) {
        results.push({
          pageNumber: i + 1,
          dataURL,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error getting preview data URLs:', error);
    return [];
  }
}
