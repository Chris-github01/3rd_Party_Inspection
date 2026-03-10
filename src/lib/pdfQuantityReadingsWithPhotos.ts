import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getPinPhotosWithBlobs, getPhotoDataURL, PinPhoto, blobToCleanDataURL } from './pinPhotoUtils';
import { supabase } from './supabase';

interface PinData {
  pin_id: string;
  pin_number: string;
  label: string;
  status: string;
  steel_type: string;
  member_mark: string;
  section_size: string;
  element_type: string;
  frr_format: string;
  coating_product: string;
  dft_required_microns: number;
  photo_count: number;
  x: number;
  y: number;
  page_number: number;
  created_at: string;
}

interface PinWithPhotos extends PinData {
  photos: PinPhoto[];
}

export async function generateQuantityReadingsPhotoReport(
  projectId: string,
  projectName: string,
  selectedPinIds: string[]
): Promise<jsPDF> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPos = margin;

  // Fetch organization logo and details
  const { data: orgData } = await supabase
    .from('projects')
    .select(`
      organization_id,
      organizations!inner (
        name,
        logo_url,
        address,
        phone,
        email,
        website
      )
    `)
    .eq('id', projectId)
    .single();

  const org = orgData?.organizations;
  const logoUrl = org?.logo_url;

  // Add header with logo
  if (logoUrl) {
    try {
      console.log('[PDF] Loading organization logo...');
      const response = await fetch(logoUrl);
      const blob = await response.blob();

      // Use clean conversion to ensure jsPDF compatibility
      const logoDataUrl = await blobToCleanDataURL(blob);
      console.log('[PDF] Logo converted to clean JPEG format');

      doc.addImage(logoDataUrl, 'JPEG', margin, yPos, 30, 15);
      console.log('[PDF] ✓ Logo added to header');
      yPos += 20;
    } catch (error) {
      console.error('[PDF] Error loading logo:', error);
      yPos += 5;
    }
  }

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Report with Photos', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, margin, yPos);

  yPos += 7;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, yPos);

  yPos += 7;
  doc.text(`Inspected Pins: ${selectedPinIds.length}`, margin, yPos);

  if (org) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (org.name) doc.text(org.name, margin, yPos);
    yPos += 4;
    if (org.address) doc.text(org.address, margin, yPos);
    yPos += 4;
    if (org.phone) doc.text(`Phone: ${org.phone}`, margin, yPos);
    if (org.email) doc.text(`Email: ${org.email}`, pageWidth - margin, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 15;

  // Fetch pin data
  const { data: pinsData } = await supabase.rpc('get_pins_for_photo_export_selection', {
    p_project_id: projectId
  });

  const selectedPins = (pinsData || []).filter((p: PinData) =>
    selectedPinIds.includes(p.pin_id)
  );

  if (selectedPins.length === 0) {
    doc.setFontSize(10);
    doc.text('No pins selected for this report.', margin, yPos);
    return doc;
  }

  // Load photos for each pin
  console.log(`[PDF Generator] Loading photos for ${selectedPins.length} pins...`);
  const pinsWithPhotos: PinWithPhotos[] = await Promise.all(
    selectedPins.map(async (pin: PinData) => {
      const photos = await getPinPhotosWithBlobs(pin.pin_id);
      console.log(`[PDF Generator] Pin ${pin.pin_number}: ${photos.length} photos loaded`);
      return { ...pin, photos };
    })
  );

  // Section 1: Summary Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary of Inspected Pins', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const tableData = pinsWithPhotos.map(pin => [
    pin.pin_number,
    pin.member_mark || 'N/A',
    pin.section_size || 'N/A',
    pin.steel_type || 'N/A',
    pin.status?.toUpperCase() || 'N/A',
    pin.photos.length.toString()
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Pin #', 'Member', 'Section', 'Steel Type', 'Status', 'Photos']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30]
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data: any) => {
      yPos = data.cursor.y + 10;
    }
  });

  // Section 2: On-site Inspection Photos
  doc.addPage();
  yPos = margin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('On-site Inspection Photos', margin, yPos);
  yPos += 10;

  // Process each pin with photos
  for (const pin of pinsWithPhotos) {
    if (pin.photos.length === 0) continue;

    // Check if we need a new page for this pin
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    // Pin header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // Primary blue
    doc.text(`Pin ${pin.pin_number}`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pin.label || pin.member_mark} - ${pin.section_size || 'Unknown section'}`, margin, yPos);

    yPos += 6;

    // Pin details in compact grid
    const details = [
      `Steel Type: ${pin.steel_type || 'N/A'}`,
      `Status: ${pin.status?.toUpperCase() || 'N/A'}`,
      `FRR: ${pin.frr_format || 'N/A'}`,
      `DFT: ${pin.dft_required_microns ? `${pin.dft_required_microns} um` : 'N/A'}`
    ];

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const detailY = yPos;
    const colWidth = contentWidth / 2;

    details.forEach((detail, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      doc.text(detail, margin + (col * colWidth), detailY + (row * 5));
    });

    yPos += 12;
    doc.setTextColor(0, 0, 0);

    // Add photos for this pin in a 2-column grid
    const photosPerRow = 2;
    const photoSpacing = 5;
    const photoWidth = (contentWidth - photoSpacing) / photosPerRow;
    const photoHeight = photoWidth * 0.75; // 4:3 aspect ratio
    const rowHeight = photoHeight + 15; // Photo + caption + spacing

    for (let i = 0; i < pin.photos.length; i++) {
      const photo = pin.photos[i];
      const col = i % photosPerRow;
      const row = Math.floor(i / photosPerRow);

      // Check if we need a new page before starting a new row
      if (col === 0 && yPos + rowHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;

        // Repeat pin header on new page
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`Pin ${pin.pin_number} (continued)`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
      }

      // Calculate position for this photo
      const xPos = margin + (col * (photoWidth + photoSpacing));
      const photoYPos = yPos;

      try {
        console.log(`[PDF] Processing photo ${i + 1}/${pin.photos.length}: ${photo.file_name}`);
        const dataURL = await getPhotoDataURL(photo);

        if (dataURL) {
          console.log(`[PDF] Data URL obtained, length: ${dataURL.length}`);
          console.log(`[PDF] Adding image at (${xPos.toFixed(1)}, ${photoYPos.toFixed(1)}) size (${photoWidth.toFixed(1)} x ${photoHeight.toFixed(1)})`);

          // All images are now converted to JPEG by blobToCleanDataURL
          // This ensures maximum compatibility with jsPDF
          const imageFormat = 'JPEG';
          console.log(`[PDF] Using format: ${imageFormat} (standardized)`);

          // Add photo with error handling
          try {
            doc.addImage(dataURL, imageFormat, xPos, photoYPos, photoWidth, photoHeight);
            console.log(`[PDF] ✓ Image successfully embedded`);
          } catch (addError) {
            console.error(`[PDF] ✗ addImage failed for ${photo.file_name}:`, addError);
            throw addError; // Re-throw to be caught by outer try-catch
          }

          // Add caption below photo
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          const caption = photo.caption || photo.file_name || 'Photo';
          const captionLines = doc.splitTextToSize(caption, photoWidth);
          doc.text(captionLines[0], xPos, photoYPos + photoHeight + 3);
          doc.setTextColor(0, 0, 0);
          console.log(`[PDF] ✓ Caption added: ${caption}`);
        } else {
          console.warn(`[PDF] ✗ No data URL for: ${photo.file_name}`);
          // Add error indicator
          doc.setFontSize(7);
          doc.setTextColor(200, 0, 0);
          doc.text(`[Missing: ${photo.file_name}]`, xPos, photoYPos + 10);
          doc.setTextColor(0, 0, 0);
        }
      } catch (error) {
        console.error(`[PDF] ✗ Error adding photo ${photo.file_name}:`, error);
        // Add error indicator
        doc.setFontSize(7);
        doc.setTextColor(200, 0, 0);
        doc.text(`[Error: ${photo.file_name}]`, xPos, photoYPos + 10);
        doc.setTextColor(0, 0, 0);
      }

      // Move to next row after processing second column or last photo
      if (col === photosPerRow - 1 || i === pin.photos.length - 1) {
        yPos += rowHeight;
      }
    }

    // Add spacing between pins
    yPos += 10;

    // Add separator line if not near bottom
    if (yPos < pageHeight - 40) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
  }

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      format(new Date(), 'dd/MM/yyyy'),
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  console.log(`[PDF Generator] Report complete: ${totalPages} pages, ${pinsWithPhotos.length} pins`);
  return doc;
}
