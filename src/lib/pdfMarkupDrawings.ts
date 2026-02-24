import jsPDF from 'jspdf';
import { supabase } from './supabase';
import { pdfjsLib } from './pdfjs';
import { downloadPreviewAsDataURL } from './drawingPreviewGenerator';
import { denormalizeCoordinates } from './pinCoordinateUtils';

interface Pin {
  id: string;
  pin_number: string | null;
  label: string;
  x: number;
  y: number;
  x_normalized: number | null;
  y_normalized: number | null;
  status: string;
  pin_type: string;
  steel_type: string | null;
  member_mark: string | null;
  page_number: number;
  drawing_id: string;
}

interface Drawing {
  id: string;
  document_id: string;
  page_number: number;
  file_path: string;
  file_name: string;
  level_name: string;
  block_name: string;
  preview_paths: string[] | null;
  preview_width: number | null;
  preview_height: number | null;
}

interface MarkupDrawingData {
  drawings: Drawing[];
  pins: Pin[];
}

export async function fetchMarkupDrawingData(projectId: string): Promise<MarkupDrawingData> {
  // Fetch drawings with document info
  const { data: drawingsData, error: drawingsError } = await supabase
    .from('drawings')
    .select(`
      id,
      document_id,
      page_number,
      preview_paths,
      preview_width,
      preview_height,
      documents!inner(storage_path, file_name),
      levels!inner(name, blocks!inner(name, project_id))
    `)
    .eq('levels.blocks.project_id', projectId)
    .order('page_number', { ascending: true });

  if (drawingsError) {
    console.error('Error fetching drawings:', drawingsError);
    throw drawingsError;
  }

  // Fetch all pins for the project
  const { data: pinsData, error: pinsError } = await supabase
    .from('drawing_pins')
    .select(`
      id,
      pin_number,
      label,
      x,
      y,
      x_normalized,
      y_normalized,
      status,
      pin_type,
      steel_type,
      page_number,
      drawing_id,
      members(member_mark)
    `)
    .eq('project_id', projectId)
    .order('pin_number', { ascending: true });

  if (pinsError) {
    console.error('Error fetching pins:', pinsError);
    throw pinsError;
  }

  // Transform the data
  const drawings: Drawing[] = (drawingsData || []).map((d: any) => ({
    id: d.id,
    document_id: d.document_id,
    page_number: d.page_number,
    file_path: d.documents.storage_path,
    file_name: d.documents.file_name,
    level_name: d.levels.name,
    block_name: d.levels.blocks.name,
    preview_paths: d.preview_paths,
    preview_width: d.preview_width,
    preview_height: d.preview_height,
  }));

  const pins: Pin[] = (pinsData || []).map((p: any) => ({
    id: p.id,
    pin_number: p.pin_number,
    label: p.label,
    x: p.x,
    y: p.y,
    x_normalized: p.x_normalized,
    y_normalized: p.y_normalized,
    status: p.status,
    pin_type: p.pin_type,
    steel_type: p.steel_type,
    member_mark: p.members?.[0]?.member_mark || null,
    page_number: p.page_number,
    drawing_id: p.drawing_id,
  }));

  return { drawings, pins };
}

async function getDrawingImageData(
  drawing: Drawing,
  pageNumber: number
): Promise<{ imageData: string | null; width: number; height: number }> {
  try {
    console.log(`[getDrawingImageData] Loading drawing ${drawing.id}, page ${pageNumber}`);
    console.log(`[getDrawingImageData] Preview paths:`, drawing.preview_paths);
    console.log(`[getDrawingImageData] File path:`, drawing.file_path);

    if (drawing.preview_paths && drawing.preview_paths.length > 0) {
      const previewIndex = pageNumber - 1;
      if (previewIndex >= 0 && previewIndex < drawing.preview_paths.length) {
        const previewPath = drawing.preview_paths[previewIndex];
        console.log(`[getDrawingImageData] Attempting to load preview from: ${previewPath}`);
        const dataURL = await downloadPreviewAsDataURL(previewPath);

        if (dataURL) {
          console.log(`[getDrawingImageData] ✅ Preview loaded successfully`);
          return {
            imageData: dataURL,
            width: drawing.preview_width || 1600,
            height: drawing.preview_height || 1200,
          };
        }
        console.log(`[getDrawingImageData] ⚠️ Preview download returned null, falling back to live render`);
      }
    } else {
      console.log(`[getDrawingImageData] No preview paths available, using live render`);
    }

    const filePath = drawing.file_path;

    if (!filePath || filePath.trim() === '') {
      console.error('[getDrawingImageData] ❌ filePath is empty or null');
      return { imageData: null, width: 0, height: 0 };
    }

    console.log(`[getDrawingImageData] Attempting live PDF render from: ${filePath}`);

    const isPdf = filePath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError || !fileData) {
        console.error('Error downloading PDF:', downloadError);
        return { imageData: null, width: 0, height: 0 };
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return { imageData: null, width: 0, height: 0 };

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      console.log(`[getDrawingImageData] ✅ PDF rendered successfully to canvas: ${canvas.width}x${canvas.height}`);

      return {
        imageData: canvas.toDataURL('image/jpeg', 0.95),
        width: canvas.width,
        height: canvas.height,
      };
    } else {
      console.log(`[getDrawingImageData] Downloading image file from storage`);
      const { data: imageBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

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
    console.error('Error loading drawing image:', error);
    return { imageData: null, width: 0, height: 0 };
  }
}

function getStatusColor(status: string): [number, number, number] {
  switch (status?.toLowerCase()) {
    case 'pass':
      return [34, 197, 94]; // green
    case 'fail':
    case 'repair_required':
      return [239, 68, 68]; // red
    case 'in_progress':
      return [251, 191, 36]; // yellow
    case 'not_started':
    default:
      return [148, 163, 184]; // gray
  }
}

function getPinTypeSymbol(pinType: string): string {
  switch (pinType) {
    case 'inspection':
      return '●'; // Filled circle
    case 'member':
      return '■'; // Square
    case 'ncr':
      return '▲'; // Triangle
    case 'note':
      return '◆'; // Diamond
    default:
      return '●';
  }
}

export async function addMarkupDrawingsSection(
  doc: jsPDF,
  projectId: string,
  sectionNumber: string
): Promise<void> {
  try {
    const { drawings, pins } = await fetchMarkupDrawingData(projectId);

    if (drawings.length === 0) {
      console.log('No drawings found for markup section');
      return;
    }

    // Add section title page
    doc.addPage();
    let yPos = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNumber}. Site Drawings with Pin Locations`, 20, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'The following pages show structural drawings with marked inspection pin locations.',
      20,
      yPos
    );
    yPos += 7;
    doc.text(
      'Each pin is labeled and color-coded according to inspection status.',
      20,
      yPos
    );
    yPos += 15;

    // Add legend
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Legend:', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Pin type symbols
    doc.text('Pin Types:', 20, yPos);
    yPos += 6;

    const pinTypes = [
      { type: 'inspection', label: 'Inspection Point' },
      { type: 'member', label: 'Member Reference' },
      { type: 'ncr', label: 'Non-Conformance' },
      { type: 'note', label: 'Note/Observation' },
    ];

    pinTypes.forEach(({ type, label }) => {
      const symbol = getPinTypeSymbol(type);
      doc.setFontSize(14);
      doc.text(symbol, 25, yPos);
      doc.setFontSize(10);
      doc.text(label, 35, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Status colors
    doc.text('Status Colors:', 20, yPos);
    yPos += 6;

    const statuses = [
      { status: 'pass', label: 'Passed Inspection' },
      { status: 'repair_required', label: 'Repair Required' },
      { status: 'in_progress', label: 'In Progress' },
      { status: 'not_started', label: 'Not Started' },
    ];

    statuses.forEach(({ status, label }) => {
      const color = getStatusColor(status);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(28, yPos - 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(label, 35, yPos);
      yPos += 6;
    });

    // Process each drawing
    for (const drawing of drawings) {
      const drawingPins = pins.filter(
        (p) => p.drawing_id === drawing.id
      );

      doc.addPage();
      yPos = 20;

      // Drawing title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Drawing: ${drawing.block_name} - ${drawing.level_name} (Page ${drawing.page_number})`,
        20,
        yPos
      );
      yPos += 10;

      // Load and add the drawing image
      console.log(`[addMarkupDrawingsSection] Processing drawing ${drawing.id}: ${drawing.file_name}`);
      console.log(`[addMarkupDrawingsSection] Found ${drawingPins.length} pins for this drawing`);

      const { imageData, width: imgWidth, height: imgHeight } = await getDrawingImageData(
        drawing,
        drawing.page_number
      );

      if (imageData) {
        console.log(`[addMarkupDrawingsSection] ✅ Drawing image loaded successfully`);
        // Calculate dimensions to fit on page
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = pageWidth - 40;
        const maxHeight = pageHeight - yPos - 60;

        try {
          const imgProps = doc.getImageProperties(imageData);
          const imgAspectRatio = imgProps.width / imgProps.height;

          let drawWidth = maxWidth;
          let drawHeight = maxWidth / imgAspectRatio;

          if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = maxHeight * imgAspectRatio;
          }

          const xOffset = (pageWidth - drawWidth) / 2;

          doc.addImage(imageData, 'PNG', xOffset, yPos, drawWidth, drawHeight);

          // Draw pins on the image using normalized coordinates
          drawingPins.forEach((pin) => {
            let pinX, pinY;

            if (pin.x_normalized != null && pin.y_normalized != null) {
              // Use normalized coordinates for consistent positioning
              pinX = xOffset + pin.x_normalized * drawWidth;
              pinY = yPos + pin.y_normalized * drawHeight;
            } else {
              // Fallback to pixel coordinates (legacy)
              pinX = xOffset + pin.x * drawWidth;
              pinY = yPos + pin.y * drawHeight;
            }

            // Draw pin marker
            const color = getStatusColor(pin.status);
            doc.setFillColor(color[0], color[1], color[2]);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.circle(pinX, pinY, 3, 'FD');

            // Draw pin label
            const pinLabel = pin.member_mark || pin.pin_number || pin.label || '?';
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);

            // Draw label background
            const labelWidth = doc.getTextWidth(pinLabel) + 2;
            doc.setFillColor(0, 0, 0, 0.7);
            doc.roundedRect(pinX + 4, pinY - 4, labelWidth, 5, 1, 1, 'F');

            // Draw label text
            doc.text(pinLabel, pinX + 5, pinY - 0.5);
          });

          yPos += drawHeight + 10;

        } catch (imgError) {
          console.error('[addMarkupDrawingsSection] ❌ Error adding image to PDF:', imgError);
          doc.setFontSize(10);
          doc.setTextColor(200, 0, 0);
          doc.text('(Drawing image could not be rendered - see console for details)', 20, yPos);
          yPos += 5;
          doc.setFontSize(8);
          doc.text(`Error: ${imgError instanceof Error ? imgError.message : String(imgError)}`, 20, yPos);
          yPos += 10;
        }
      } else {
        console.error('[addMarkupDrawingsSection] ❌ No image data returned for drawing');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('(Drawing preview not available - image data is null)', 20, yPos);
        yPos += 5;
        doc.setFontSize(8);
        doc.text(`File path: ${drawing.file_path}`, 20, yPos);
        yPos += 5;
        doc.text(`Preview paths: ${JSON.stringify(drawing.preview_paths)}`, 20, yPos);
        yPos += 10;
      }

      // Add pin reference table for this drawing
      if (drawingPins.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Pin References for this Drawing:', 20, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        drawingPins.forEach((pin) => {
          const pinLabel = pin.pin_number || 'N/A';
          const memberInfo = pin.member_mark || 'N/A';
          const typeSymbol = getPinTypeSymbol(pin.pin_type);

          const color = getStatusColor(pin.status);
          doc.setFillColor(color[0], color[1], color[2]);
          doc.circle(23, yPos - 2, 1.5, 'F');

          doc.setTextColor(0, 0, 0);
          doc.text(`${typeSymbol} ${pinLabel}: ${pin.label} | Member: ${memberInfo}`, 30, yPos);
          yPos += 5;

          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
        });
      }
    }

  } catch (error) {
    console.error('Error adding markup drawings section:', error);
    throw error;
  }
}
