import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';
import { pdfjsLib } from './pdfjs';
import { format } from 'date-fns';

interface PinCorrection {
  id: string;
  correction_type: string;
  original_x: number | null;
  original_y: number | null;
  corrected_x: number | null;
  corrected_y: number | null;
  original_label: string | null;
  corrected_label: string | null;
  original_status: string | null;
  corrected_status: string | null;
  issue_description: string;
  correction_notes: string | null;
  severity: string;
  corrected_at: string;
  drawing_page: number;
  drawing_name: string;
  pin_number: string | null;
}

interface DrawingWithCorrections {
  drawing_id: string;
  drawing_name: string;
  file_path: string;
  page_number: number;
  block_name: string;
  level_name: string;
  corrections: PinCorrection[];
  currentPins: any[];
}

interface CorrectionsSummary {
  total_corrections: number;
  by_type: { [key: string]: number };
  by_severity: { [key: string]: number };
  drawings_affected: number;
}

async function fetchCorrectionsData(projectId: string, batchId?: string): Promise<{
  corrections: PinCorrection[];
  drawings: DrawingWithCorrections[];
  summary: CorrectionsSummary;
  projectInfo: any;
  batchInfo: any;
}> {
  let query = supabase
    .from('pin_corrections')
    .select(`
      *,
      drawings!inner(
        id,
        page_number,
        documents!inner(file_path, file_name),
        levels!inner(name, blocks!inner(name))
      )
    `)
    .eq('project_id', projectId)
    .order('corrected_at', { ascending: false });

  if (batchId) {
    query = query.eq('batch_id', batchId);
  }

  const { data: correctionsData, error: correctionsError } = await query;

  if (correctionsError) {
    console.error('Error fetching corrections:', correctionsError);
    throw correctionsError;
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  let batchInfo = null;
  if (batchId) {
    const { data: batchData } = await supabase
      .from('pin_correction_batches')
      .select('*')
      .eq('id', batchId)
      .single();
    batchInfo = batchData;
  }

  const { data: currentPinsData } = await supabase
    .from('drawing_pins')
    .select('*')
    .eq('project_id', projectId);

  const corrections: PinCorrection[] = (correctionsData || []).map((c: any) => ({
    id: c.id,
    correction_type: c.correction_type,
    original_x: c.original_x,
    original_y: c.original_y,
    corrected_x: c.corrected_x,
    corrected_y: c.corrected_y,
    original_label: c.original_label,
    corrected_label: c.corrected_label,
    original_status: c.original_status,
    corrected_status: c.corrected_status,
    issue_description: c.issue_description,
    correction_notes: c.correction_notes,
    severity: c.severity,
    corrected_at: c.corrected_at,
    drawing_page: c.drawings?.page_number || 1,
    drawing_name: `${c.drawings?.levels?.blocks?.name} - ${c.drawings?.levels?.name}`,
    pin_number: c.corrected_label || c.original_label,
  }));

  const drawingsMap = new Map<string, DrawingWithCorrections>();

  correctionsData?.forEach((c: any) => {
    const drawingId = c.drawing_id;
    if (!drawingsMap.has(drawingId)) {
      drawingsMap.set(drawingId, {
        drawing_id: drawingId,
        drawing_name: `${c.drawings?.levels?.blocks?.name} - ${c.drawings?.levels?.name}`,
        file_path: c.drawings?.documents?.file_path || '',
        page_number: c.drawings?.page_number || 1,
        block_name: c.drawings?.levels?.blocks?.name || '',
        level_name: c.drawings?.levels?.name || '',
        corrections: [],
        currentPins: currentPinsData?.filter((p: any) => p.drawing_id === drawingId) || [],
      });
    }
    drawingsMap.get(drawingId)!.corrections.push(corrections.find((cor) => cor.id === c.id)!);
  });

  const drawings = Array.from(drawingsMap.values());

  const summary: CorrectionsSummary = {
    total_corrections: corrections.length,
    by_type: {},
    by_severity: {},
    drawings_affected: drawings.length,
  };

  corrections.forEach((c) => {
    summary.by_type[c.correction_type] = (summary.by_type[c.correction_type] || 0) + 1;
    summary.by_severity[c.severity] = (summary.by_severity[c.severity] || 0) + 1;
  });

  return {
    corrections,
    drawings,
    summary,
    projectInfo: projectData,
    batchInfo,
  };
}

async function getDrawingImageData(filePath: string, pageNumber: number): Promise<string | null> {
  try {
    const isPdf = filePath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (downloadError || !fileData) {
        console.error('Error downloading PDF:', downloadError);
        return null;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.95);
    } else {
      const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
      const response = await fetch(data.publicUrl);
      const blob = await response.blob();

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('Error loading drawing image:', error);
    return null;
  }
}

function getCorrectionTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    position: 'Position Correction',
    missing: 'Missing Pin Added',
    duplicate: 'Duplicate Removed',
    incorrect_label: 'Label Correction',
    status_change: 'Status Update',
    other: 'Other Correction',
  };
  return labels[type] || type;
}

function getSeverityColor(severity: string): [number, number, number] {
  switch (severity) {
    case 'critical':
      return [220, 38, 38];
    case 'high':
      return [249, 115, 22];
    case 'medium':
      return [251, 191, 36];
    case 'low':
      return [34, 197, 94];
    default:
      return [148, 163, 184];
  }
}

export async function generatePinCorrectionsReport(
  projectId: string,
  batchId?: string
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const { corrections, drawings, summary, projectInfo, batchInfo } = await fetchCorrectionsData(
    projectId,
    batchId
  );

  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('PIN CORRECTIONS REPORT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, pageWidth / 2, yPos, {
    align: 'center',
  });
  yPos += 15;

  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Information', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectInfo?.name || 'N/A'}`, 20, yPos);
  yPos += 6;
  doc.text(`Client: ${projectInfo?.client_name || 'N/A'}`, 20, yPos);
  yPos += 6;
  doc.text(`Reference: ${projectInfo?.project_ref || 'N/A'}`, 20, yPos);
  yPos += 6;

  if (batchInfo) {
    doc.text(`Correction Batch: ${batchInfo.batch_name}`, 20, yPos);
    yPos += 6;
    if (batchInfo.description) {
      doc.text(`Description: ${batchInfo.description}`, 20, yPos);
      yPos += 6;
    }
  }
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Corrections Summary', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Corrections: ${summary.total_corrections}`, 20, yPos);
  yPos += 6;
  doc.text(`Drawings Affected: ${summary.drawings_affected}`, 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('By Type:', 20, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  Object.entries(summary.by_type).forEach(([type, count]) => {
    doc.text(`  • ${getCorrectionTypeLabel(type)}: ${count}`, 25, yPos);
    yPos += 5;
  });
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('By Severity:', 20, yPos);
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  Object.entries(summary.by_severity).forEach(([severity, count]) => {
    const color = getSeverityColor(severity);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(28, yPos - 2, 2, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(`${severity.toUpperCase()}: ${count}`, 35, yPos);
    yPos += 5;
  });

  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Legend', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const legendItems = [
    { color: [255, 0, 0], symbol: '●', label: 'Original/Incorrect Position (Red)' },
    { color: [34, 197, 94], symbol: '●', label: 'Corrected/New Position (Green)' },
    { color: [251, 191, 36], symbol: '▲', label: 'Missing Pin (Yellow Triangle)' },
    { color: [220, 38, 38], symbol: '✕', label: 'Duplicate/Removed (Red X)' },
    { color: [59, 130, 246], symbol: '→', label: 'Movement Arrow (Blue)' },
  ];

  legendItems.forEach((item) => {
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    if (item.symbol === '●') {
      doc.circle(23, yPos - 2, 2, 'F');
    }
    doc.setTextColor(0, 0, 0);
    doc.text(`${item.symbol} ${item.label}`, 30, yPos);
    yPos += 6;
  });

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Correction Types:', 20, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const correctionTypes = [
    'Position Correction: Pin moved to correct location',
    'Missing Pin Added: Pin that was not originally placed',
    'Duplicate Removed: Redundant pin removed',
    'Label Correction: Pin identifier updated',
    'Status Update: Inspection status changed',
  ];

  correctionTypes.forEach((type) => {
    doc.text(`  • ${type}`, 25, yPos);
    yPos += 5;
  });

  for (const drawing of drawings) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Drawing: ${drawing.drawing_name} (Page ${drawing.page_number})`, 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Corrections on this drawing: ${drawing.corrections.length}`, 20, yPos);
    yPos += 10;

    const imageData = await getDrawingImageData(drawing.file_path, drawing.page_number);

    if (imageData) {
      try {
        const imgProps = doc.getImageProperties(imageData);
        const imgAspectRatio = imgProps.width / imgProps.height;

        const maxWidth = pageWidth - 40;
        const maxHeight = 140;

        let drawWidth = maxWidth;
        let drawHeight = maxWidth / imgAspectRatio;

        if (drawHeight > maxHeight) {
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspectRatio;
        }

        const xOffset = (pageWidth - drawWidth) / 2;

        doc.addImage(imageData, 'JPEG', xOffset, yPos, drawWidth, drawHeight);

        drawing.corrections.forEach((correction) => {
          if (correction.original_x !== null && correction.original_y !== null) {
            const origX = xOffset + correction.original_x * drawWidth;
            const origY = yPos + correction.original_y * drawHeight;

            doc.setDrawColor(255, 0, 0);
            doc.setLineWidth(1);
            doc.circle(origX, origY, 4, 'S');

            doc.setDrawColor(255, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(origX - 5, origY - 5, origX + 5, origY + 5);
            doc.line(origX - 5, origY + 5, origX + 5, origY - 5);

            if (correction.corrected_x !== null && correction.corrected_y !== null) {
              const corrX = xOffset + correction.corrected_x * drawWidth;
              const corrY = yPos + correction.corrected_y * drawHeight;

              doc.setFillColor(34, 197, 94);
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.5);
              doc.circle(corrX, corrY, 3, 'FD');

              doc.setDrawColor(59, 130, 246);
              doc.setLineWidth(1);
              doc.line(origX, origY, corrX, corrY);

              const angle = Math.atan2(corrY - origY, corrX - origX);
              const arrowSize = 3;
              doc.line(
                corrX,
                corrY,
                corrX - arrowSize * Math.cos(angle - Math.PI / 6),
                corrY - arrowSize * Math.sin(angle - Math.PI / 6)
              );
              doc.line(
                corrX,
                corrY,
                corrX - arrowSize * Math.cos(angle + Math.PI / 6),
                corrY - arrowSize * Math.sin(angle + Math.PI / 6)
              );

              doc.setFontSize(7);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              const label = correction.pin_number || '?';
              const labelWidth = doc.getTextWidth(label) + 2;
              doc.setFillColor(34, 197, 94);
              doc.roundedRect(corrX + 4, corrY - 3, labelWidth, 4, 0.5, 0.5, 'F');
              doc.text(label, corrX + 5, corrY);
            }
          } else if (
            correction.correction_type === 'missing' &&
            correction.corrected_x !== null &&
            correction.corrected_y !== null
          ) {
            const corrX = xOffset + correction.corrected_x * drawWidth;
            const corrY = yPos + correction.corrected_y * drawHeight;

            doc.setFillColor(251, 191, 36);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);

            const size = 4;
            doc.triangle(corrX, corrY - size, corrX - size, corrY + size, corrX + size, corrY + size, 'FD');
          }
        });

        yPos += drawHeight + 10;
      } catch (error) {
        console.error('Error rendering drawing:', error);
        doc.setTextColor(200, 0, 0);
        doc.text('(Drawing could not be rendered)', 20, yPos);
        yPos += 10;
      }
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('(Drawing preview not available)', 20, yPos);
      yPos += 10;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Corrections Detail:', 20, yPos);
    yPos += 8;

    const tableData = drawing.corrections.map((c) => {
      const severityColor = getSeverityColor(c.severity);
      return [
        c.pin_number || 'N/A',
        getCorrectionTypeLabel(c.correction_type),
        c.severity.toUpperCase(),
        c.issue_description || 'N/A',
        c.correction_notes || '-',
        format(new Date(c.corrected_at), 'dd/MM/yyyy'),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Pin', 'Type', 'Severity', 'Issue', 'Notes', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 50 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const severity = data.cell.text[0].toLowerCase();
          const color = getSeverityColor(severity);
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('All Corrections Summary', 20, yPos);
  yPos += 10;

  const allCorrectionsData = corrections.map((c) => [
    c.drawing_name,
    c.pin_number || 'N/A',
    getCorrectionTypeLabel(c.correction_type),
    c.severity.toUpperCase(),
    c.issue_description,
    format(new Date(c.corrected_at), 'dd/MM/yyyy'),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Drawing', 'Pin', 'Type', 'Severity', 'Issue Description', 'Date']],
    body: allCorrectionsData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 55 },
      5: { cellWidth: 20, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const severity = data.cell.text[0].toLowerCase();
        const color = getSeverityColor(severity);
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('PIN CORRECTIONS REPORT', 20, pageHeight - 10);
  }

  return doc.output('blob');
}
