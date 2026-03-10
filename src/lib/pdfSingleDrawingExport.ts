import jsPDF from 'jspdf';
import { supabase } from './supabase';
import { pdfjsLib } from './pdfjs';

interface Pin {
  id: string;
  x: number;
  y: number;
  label: string;
  status: 'not_started' | 'in_progress' | 'pass' | 'repair_required';
  pin_type: string;
  member_id?: string | null;
}

interface ExportOptions {
  drawingId: string;
  storagePath: string;
  pageNumber: number;
  projectName?: string;
  levelName?: string;
  blockName?: string;
  canvasElement?: HTMLCanvasElement | null;
  imageElement?: HTMLImageElement | null;
}

export async function exportDrawingWithPins(options: ExportOptions): Promise<Blob> {
  const { drawingId, storagePath, pageNumber, projectName, levelName, blockName, canvasElement, imageElement } = options;

  console.log(`[exportDrawingWithPins] Starting export for drawing ${drawingId}`);

  const pins = await fetchPins(drawingId);
  console.log(`[exportDrawingWithPins] Found ${pins.length} pins`);

  let imageData: { imageData: string | null; width: number; height: number };

  if (canvasElement) {
    console.log(`[exportDrawingWithPins] Using provided canvas element`);
    imageData = {
      imageData: canvasElement.toDataURL('image/jpeg', 0.95),
      width: canvasElement.width,
      height: canvasElement.height,
    };
  } else if (imageElement) {
    console.log(`[exportDrawingWithPins] Using provided image element`);
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imageElement, 0, 0);
      imageData = {
        imageData: canvas.toDataURL('image/jpeg', 0.95),
        width: canvas.width,
        height: canvas.height,
      };
    } else {
      imageData = await getDrawingImageData(storagePath, pageNumber);
    }
  } else {
    console.log(`[exportDrawingWithPins] Falling back to loading from storage`);
    imageData = await getDrawingImageData(storagePath, pageNumber);
  }

  console.log(`[exportDrawingWithPins] Image data loaded: ${imageData.width}x${imageData.height}`);

  const pdf = new jsPDF({
    orientation: imageData.width > imageData.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [imageData.width, imageData.height],
  });

  if (imageData.imageData) {
    pdf.addImage(imageData.imageData, 'JPEG', 0, 0, imageData.width, imageData.height);
    console.log(`[exportDrawingWithPins] Drawing image added to PDF`);
  }

  drawPinsOnPDF(pdf, pins, imageData.width, imageData.height);
  console.log(`[exportDrawingWithPins] Pins drawn on PDF`);

  const title = [projectName, blockName, levelName, `Page ${pageNumber}`]
    .filter(Boolean)
    .join(' - ');

  if (title) {
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(title, 10, imageData.height - 10);
  }

  return pdf.output('blob');
}

async function fetchPins(drawingId: string): Promise<Pin[]> {
  const { data, error } = await supabase
    .from('drawing_pins')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('created_at');

  if (error) {
    console.error('[fetchPins] Error:', error);
    throw error;
  }

  return data || [];
}

async function getDrawingImageData(
  storagePath: string,
  pageNumber: number
): Promise<{ imageData: string | null; width: number; height: number }> {
  try {
    console.log(`[getDrawingImageData] Loading from storage: ${storagePath}, page ${pageNumber}`);

    const isPdf = storagePath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      console.log(`[getDrawingImageData] Step 1: Downloading PDF from storage...`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error('[getDrawingImageData] ❌ Step 1 FAILED - Error downloading PDF:', downloadError);
        return { imageData: null, width: 0, height: 0 };
      }

      console.log(`[getDrawingImageData] ✅ Step 1 Complete - PDF downloaded: ${fileData.size} bytes`);
      console.log(`[getDrawingImageData] Step 2: Converting to ArrayBuffer...`);

      const arrayBuffer = await fileData.arrayBuffer();
      console.log(`[getDrawingImageData] ✅ Step 2 Complete - ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      console.log(`[getDrawingImageData] Step 3: Loading PDF document...`);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`[getDrawingImageData] ✅ Step 3 Complete - PDF loaded, ${pdf.numPages} pages`);
      console.log(`[getDrawingImageData] Step 4: Getting page ${pageNumber}...`);

      const page = await pdf.getPage(pageNumber);
      console.log(`[getDrawingImageData] ✅ Step 4 Complete - Page retrieved`);

      console.log(`[getDrawingImageData] Step 5: Creating viewport...`);
      const viewport = page.getViewport({ scale: 2 });
      console.log(`[getDrawingImageData] ✅ Step 5 Complete - Viewport: ${viewport.width}x${viewport.height}`);

      console.log(`[getDrawingImageData] Step 6: Creating canvas...`);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('[getDrawingImageData] ❌ Step 6 FAILED - Could not get 2D context');
        return { imageData: null, width: 0, height: 0 };
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      console.log(`[getDrawingImageData] ✅ Step 6 Complete - Canvas created: ${canvas.width}x${canvas.height}`);

      console.log(`[getDrawingImageData] Step 7: Rendering PDF to canvas...`);
      await page.render({
        canvas: canvas,
        canvasContext: context,
        viewport: viewport,
      }).promise;

      console.log(`[getDrawingImageData] ✅ Step 7 Complete - PDF rendered to canvas`);
      console.log(`[getDrawingImageData] Step 8: Converting canvas to data URL...`);

      const dataURL = canvas.toDataURL('image/jpeg', 0.95);
      console.log(`[getDrawingImageData] ✅ Step 8 Complete - Data URL length: ${dataURL.length} chars`);
      console.log(`[getDrawingImageData] 🎉 SUCCESS - Returning image data`);

      return {
        imageData: dataURL,
        width: canvas.width,
        height: canvas.height,
      };
    } else {
      console.log(`[getDrawingImageData] Downloading image file from storage`);
      const { data: imageBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (downloadError || !imageBlob) {
        console.error('[getDrawingImageData] ❌ Error downloading image:', downloadError);
        return { imageData: null, width: 0, height: 0 };
      }

      const dataURL = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageBlob);
      });

      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = dataURL;
      });

      console.log(`[getDrawingImageData] ✅ Image loaded successfully: ${img.width}x${img.height}`);

      return {
        imageData: dataURL,
        width: img.width,
        height: img.height,
      };
    }
  } catch (error) {
    console.error('[getDrawingImageData] ❌ EXCEPTION CAUGHT:', error);
    console.error('[getDrawingImageData] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[getDrawingImageData] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[getDrawingImageData] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { imageData: null, width: 0, height: 0 };
  }
}

function drawPinsOnPDF(
  pdf: jsPDF,
  pins: Pin[],
  imageWidth: number,
  imageHeight: number
) {
  pins.forEach((pin, index) => {
    const x = pin.x * imageWidth;
    const y = pin.y * imageHeight;
    const radius = 24;

    const color = getPinColor(pin.status);
    pdf.setFillColor(color.r, color.g, color.b);
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(3);

    pdf.circle(x, y, radius, 'FD');

    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');

    const text = pin.label || `${index + 1}`;
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, x - textWidth / 2, y + 6);
  });
}

function getPinColor(status: string): { r: number; g: number; b: number } {
  switch (status) {
    case 'pass':
      return { r: 34, g: 197, b: 94 };
    case 'repair_required':
      return { r: 239, g: 68, b: 68 };
    case 'in_progress':
      return { r: 249, g: 115, b: 22 };
    case 'not_started':
      return { r: 59, g: 130, b: 246 };
    default:
      return { r: 100, g: 116, b: 139 };
  }
}
