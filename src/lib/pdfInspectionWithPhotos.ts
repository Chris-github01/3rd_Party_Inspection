import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getPinPhotosWithBlobs, getPhotoDataURL } from './pinPhotoUtils';
import { supabase } from './supabase';

interface InspectedPin {
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
  created_at: string;
}

export async function generateInspectionReportWithPhotos(
  projectId: string,
  projectName: string,
  selectedPinIds: string[]
): Promise<jsPDF> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  let yPos = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Report with Photos', 105, yPos, { align: 'center' });

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectName}`, 20, yPos);

  yPos += 7;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPos);

  yPos += 7;
  doc.text(`Inspected Members: ${selectedPinIds.length}`, 20, yPos);

  yPos += 15;

  const { data: pinsData } = await supabase
    .from('drawing_pins')
    .select(`
      id,
      pin_number,
      steel_type,
      label,
      status,
      member_id,
      created_at
    `)
    .in('id', selectedPinIds)
    .order('pin_number', { ascending: true });

  if (!pinsData || pinsData.length === 0) {
    doc.setFontSize(10);
    doc.text('No inspection data found.', 20, yPos);
    return doc;
  }

  const memberIds = pinsData
    .map(p => p.member_id)
    .filter(id => id !== null);

  let membersMap = new Map();
  if (memberIds.length > 0) {
    const { data: membersData } = await supabase
      .from('members')
      .select('id, member_mark, section_size, frr_format, coating_product, dft_required_microns')
      .in('id', memberIds);

    if (membersData) {
      membersMap = new Map(membersData.map(m => [m.id, m]));
    }
  }

  for (const pin of pinsData) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    const member = pin.member_id ? membersMap.get(pin.member_id) : null;

    doc.setFillColor(41, 98, 255);
    doc.rect(15, yPos - 5, 180, 10, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${pin.pin_number} - ${pin.steel_type || 'Unknown'}`, 20, yPos + 2);

    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const details = [
      ['Label:', pin.label || 'N/A'],
      ['Member Mark:', member?.member_mark || 'N/A'],
      ['Section Size:', member?.section_size || 'N/A'],
      ['FRR:', member?.frr_format || 'N/A'],
      ['Coating Product:', member?.coating_product || 'N/A'],
      ['Required DFT:', member?.dft_required_microns ? `${member.dft_required_microns} µm` : 'N/A'],
      ['Status:', pin.status?.replace('_', ' ').toUpperCase() || 'N/A'],
    ];

    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPos);
      yPos += 6;
    });

    yPos += 5;

    const photos = await getPinPhotosWithBlobs(pin.id);

    if (photos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Photos (${photos.length}):`, 20, yPos);
      yPos += 8;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        try {
          const dataURL = await getPhotoDataURL(photo);
          if (dataURL) {
            const imgWidth = 80;
            const imgHeight = 60;

            doc.addImage(dataURL, 'JPEG', 20, yPos, imgWidth, imgHeight);

            if (photo.caption) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              doc.text(photo.caption, 20, yPos + imgHeight + 4, { maxWidth: imgWidth });
            }

            yPos += imgHeight + (photo.caption ? 8 : 4);
          }
        } catch (error) {
          console.error('Error adding photo to PDF:', error);
        }
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No photos attached', 20, yPos);
      yPos += 6;
    }

    yPos += 10;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
}
