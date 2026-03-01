import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { getPinPhotosWithBlobs, getPhotoDataURL, PinPhoto } from './pinPhotoUtils';
import { supabase } from './supabase';

interface EnhancedInspectedPin {
  id: string;
  pin_number: string;
  steel_type: string;
  label: string;
  status: string;
  member_mark: string;
  section_size: string;
  frr: string;
  coating_product: string;
  dft_required: number;
  x: number;
  y: number;
  x_normalized: number;
  y_normalized: number;
  page_number: number;
  document_id: string;
  drawing_id: string;
  created_at: string;
  updated_at: string;
  canvas_width: number;
  canvas_height: number;
}

interface EnhancedPinWithPhotos extends EnhancedInspectedPin {
  photos: PinPhoto[];
  photo_count: number;
}

export async function generateEnhancedInspectionReportWithPhotos(
  projectId: string,
  projectName: string,
  selectedPinIds: string[]
): Promise<jsPDF> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  let yPos = 20;
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Enhanced Inspection Report', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(14);
  doc.text('with Photos and Pin Details', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, margin, yPos);

  yPos += 7;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, yPos);

  yPos += 7;
  doc.text(`Inspected Members: ${selectedPinIds.length}`, margin, yPos);

  yPos += 12;

  // Fetch pin data with all details
  const { data: pinsData } = await supabase
    .from('drawing_pins')
    .select(`
      id,
      pin_number,
      steel_type,
      label,
      status,
      member_id,
      x,
      y,
      x_normalized,
      y_normalized,
      page_number,
      document_id,
      drawing_id,
      canvas_width,
      canvas_height,
      created_at
    `)
    .in('id', selectedPinIds)
    .order('pin_number', { ascending: true });

  if (!pinsData || pinsData.length === 0) {
    doc.setFontSize(10);
    doc.text('No inspection data found.', margin, yPos);
    return doc;
  }

  // Fetch member data
  const memberIds = pinsData
    .map(p => p.member_id)
    .filter(id => id !== null);

  let membersMap = new Map();
  if (memberIds.length > 0) {
    const { data: membersData } = await supabase
      .from('members')
      .select('id, member_mark, section_size, frr_format, coating_product, dft_required_microns, updated_at')
      .in('id', memberIds);

    if (membersData) {
      membersMap = new Map(membersData.map(m => [m.id, m]));
    }
  }

  // Fetch photos for all pins
  const pinsWithPhotos: EnhancedPinWithPhotos[] = [];

  for (const pin of pinsData) {
    const photos = await getPinPhotosWithBlobs(pin.id);
    const member = pin.member_id ? membersMap.get(pin.member_id) : null;

    pinsWithPhotos.push({
      ...pin,
      member_mark: member?.member_mark || 'N/A',
      section_size: member?.section_size || 'N/A',
      frr: member?.frr_format || 'N/A',
      coating_product: member?.coating_product || 'N/A',
      dft_required: member?.dft_required_microns || 0,
      photos,
      photo_count: photos.length,
      updated_at: member?.updated_at || pin.created_at,
    });
  }

  // Generate content for each pin
  for (const pin of pinsWithPhotos) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    // Pin header with gradient effect
    doc.setFillColor(25, 118, 210);
    doc.rect(margin, yPos - 6, contentWidth, 12, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${pin.pin_number} - ${pin.steel_type || 'Unknown Type'}`, margin + 3, yPos + 2);

    // Photo count badge
    if (pin.photo_count > 0) {
      const badgeText = `${pin.photo_count} Photo${pin.photo_count > 1 ? 's' : ''}`;
      const badgeWidth = doc.getTextWidth(badgeText) + 6;
      doc.setFillColor(76, 175, 80);
      doc.roundedRect(pageWidth - margin - badgeWidth - 3, yPos - 4, badgeWidth, 8, 2, 2, 'F');
      doc.setFontSize(10);
      doc.text(badgeText, pageWidth - margin - badgeWidth / 2 - 3, yPos + 1, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPos += 14;

    // Section: Basic Information
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Basic Information', margin + 2, yPos + 5);
    yPos += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const basicInfo = [
      ['Description:', pin.label || 'N/A'],
      ['Steel Type:', pin.steel_type || 'N/A'],
      ['Status:', pin.status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'],
    ];

    basicInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 35, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Section: Member Specifications
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Member Specifications', margin + 2, yPos + 5);
    yPos += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const memberSpecs = [
      ['Member Mark:', pin.member_mark],
      ['Section Size:', pin.section_size],
      ['FRR Rating:', pin.frr],
      ['Coating Product:', pin.coating_product],
      ['Required DFT:', pin.dft_required ? `${pin.dft_required} µm` : 'N/A'],
    ];

    memberSpecs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 35, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Section: Location Details
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Location Details', margin + 2, yPos + 5);
    yPos += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const locationDetails = [
      ['Drawing Page:', pin.page_number?.toString() || 'N/A'],
      ['X Coordinate:', pin.x ? `${Math.round(pin.x)} px` : 'N/A'],
      ['Y Coordinate:', pin.y ? `${Math.round(pin.y)} px` : 'N/A'],
      ['Normalized X:', pin.x_normalized ? pin.x_normalized.toFixed(4) : 'N/A'],
      ['Normalized Y:', pin.y_normalized ? pin.y_normalized.toFixed(4) : 'N/A'],
      ['Canvas Size:', pin.canvas_width && pin.canvas_height ? `${pin.canvas_width} × ${pin.canvas_height}` : 'N/A'],
    ];

    locationDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 35, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Section: Timestamps
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Timestamps', margin + 2, yPos + 5);
    yPos += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const timestamps = [
      ['Pin Created:', format(new Date(pin.created_at), 'dd/MM/yyyy HH:mm')],
      ['Last Updated:', format(new Date(pin.updated_at), 'dd/MM/yyyy HH:mm')],
    ];

    timestamps.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 35, yPos);
      yPos += 5;
    });

    yPos += 3;

    // Section: Reference IDs
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Reference IDs', margin + 2, yPos + 5);
    yPos += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const referenceIds = [
      ['Pin ID:', pin.id],
      ['Drawing ID:', pin.drawing_id || 'N/A'],
      ['Document ID:', pin.document_id || 'N/A'],
    ];

    referenceIds.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, yPos);
      doc.setFont('helvetica', 'normal');
      const maxWidth = contentWidth - 30;
      doc.text(value, margin + 28, yPos, { maxWidth });
      yPos += 5;
    });

    yPos += 5;

    // Section: Photos
    if (pin.photos.length > 0) {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Inspection Photos (${pin.photos.length})`, margin + 2, yPos + 5);
      yPos += 12;

      for (let i = 0; i < pin.photos.length; i++) {
        const photo = pin.photos[i];

        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }

        try {
          const dataURL = await getPhotoDataURL(photo);
          if (dataURL) {
            // Larger thumbnail size for better visibility
            const imgWidth = 120;
            const imgHeight = 90;

            // Photo border
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(margin, yPos, imgWidth, imgHeight);

            // Photo image
            doc.addImage(dataURL, 'JPEG', margin, yPos, imgWidth, imgHeight);

            // Photo metadata panel
            const metaStartX = margin + imgWidth + 5;
            const metaWidth = contentWidth - imgWidth - 5;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Photo ${i + 1} of ${pin.photos.length}`, metaStartX, yPos + 5);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');

            let metaY = yPos + 12;

            if (photo.caption) {
              doc.setFont('helvetica', 'bold');
              doc.text('Caption:', metaStartX, metaY);
              doc.setFont('helvetica', 'italic');
              metaY += 5;
              const captionLines = doc.splitTextToSize(photo.caption, metaWidth);
              doc.text(captionLines, metaStartX, metaY);
              metaY += (captionLines.length * 4) + 3;
            }

            doc.setFont('helvetica', 'bold');
            doc.text('File:', metaStartX, metaY);
            doc.setFont('helvetica', 'normal');
            metaY += 4;
            const fileLines = doc.splitTextToSize(photo.file_name, metaWidth);
            doc.text(fileLines, metaStartX, metaY);
            metaY += (fileLines.length * 4) + 3;

            doc.setFont('helvetica', 'bold');
            doc.text('Uploaded:', metaStartX, metaY);
            doc.setFont('helvetica', 'normal');
            metaY += 4;
            doc.text(format(new Date(photo.created_at), 'dd/MM/yyyy HH:mm'), metaStartX, metaY);
            metaY += 5;

            doc.setFont('helvetica', 'bold');
            doc.text('Sort Order:', metaStartX, metaY);
            doc.setFont('helvetica', 'normal');
            metaY += 4;
            doc.text(photo.sort_order.toString(), metaStartX, metaY);

            yPos += imgHeight + 8;
          }
        } catch (error) {
          console.error('Error adding photo to PDF:', error);
          doc.setFontSize(9);
          doc.setTextColor(200, 0, 0);
          doc.text(`Error loading photo: ${photo.file_name}`, margin, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 6;
        }
      }
    } else {
      doc.setFillColor(255, 243, 224);
      doc.rect(margin, yPos, contentWidth, 10, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 100, 0);
      doc.text('No photos attached to this inspection point', margin + 2, yPos + 6);
      doc.setTextColor(0, 0, 0);
      yPos += 12;
    }

    yPos += 8;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
  }

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' });

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, 285, pageWidth - margin, 285);

    // Document info in footer
    doc.setFontSize(7);
    doc.text(`${projectName}`, margin, 292);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 292, { align: 'right' });
  }

  return doc;
}
