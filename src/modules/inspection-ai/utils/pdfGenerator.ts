import jsPDF from 'jspdf';
import type { InspectionAIReport, InspectionAIItem } from '../types';
import { CONFIDENCE_REVIEW_THRESHOLD } from '../services/inspectionAIService';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addPageBackground(doc: jsPDF) {
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function addHeader(doc: jsPDF, report: InspectionAIReport, pageNum: number, totalPages: number) {
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setFillColor(200, 16, 46);
  doc.rect(0, 22, PAGE_W, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INSPECTION AI REPORT', MARGIN, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${report.project_name}  ·  Inspector: ${report.inspector_name}`, MARGIN, 15);

  doc.setFontSize(7.5);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, 15, { align: 'right' });
}

function addFooter(doc: jsPDF) {
  const y = PAGE_H - 12;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    'This assessment is based on visual inspection only. Further investigation may be required. This report does not constitute a compliance certification.',
    PAGE_W / 2,
    y + 2,
    { align: 'center', maxWidth: CONTENT_W }
  );
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawLabeledBlock(
  doc: jsPDF,
  label: string,
  content: string,
  x: number,
  y: number,
  w: number
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 140);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 55);
  const lines = doc.splitTextToSize(content, w);
  doc.text(lines, x, y + 4);

  return y + 4 + lines.length * 4.2;
}

function severityRGB(severity: string): [number, number, number] {
  switch (severity) {
    case 'High': return [200, 16, 46];
    case 'Medium': return [217, 119, 6];
    default: return [16, 185, 129];
  }
}

export async function generatePDF(
  report: InspectionAIReport,
  items: InspectionAIItem[]
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const dateStr = new Date(report.created_at).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const totalPages = 1 + items.length;

  addPageBackground(doc);
  addHeader(doc, report, 1, totalPages);

  let y = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(26, 26, 46);
  doc.text(report.project_name, MARGIN, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 110);
  doc.text(
    `Inspector: ${report.inspector_name}    ·    Date: ${dateStr}    ·    ${items.length} Finding${items.length !== 1 ? 's' : ''}`,
    MARGIN,
    y
  );
  y += 6;

  doc.setFillColor(200, 16, 46);
  doc.rect(MARGIN, y, CONTENT_W, 0.5, 'F');
  y += 6;

  const high = items.filter((i) => i.severity === 'High').length;
  const med = items.filter((i) => i.severity === 'Medium').length;
  const low = items.filter((i) => i.severity === 'Low').length;
  const review = items.filter((i) => i.confidence < CONFIDENCE_REVIEW_THRESHOLD).length;

  const summaryItems = [
    { label: 'High', count: high, colour: [200, 16, 46] as [number, number, number] },
    { label: 'Medium', count: med, colour: [217, 119, 6] as [number, number, number] },
    { label: 'Low', count: low, colour: [16, 185, 129] as [number, number, number] },
    { label: 'For Review', count: review, colour: [217, 119, 6] as [number, number, number] },
  ].filter((s) => s.count > 0);

  if (summaryItems.length > 0) {
    const cardW = (CONTENT_W - (summaryItems.length - 1) * 3) / summaryItems.length;
    summaryItems.forEach(({ label, count, colour }, i) => {
      const cx = MARGIN + i * (cardW + 3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F');
      doc.setDrawColor(...colour);
      doc.setLineWidth(0.5);
      doc.roundedRect(cx, y, cardW, 18, 2, 2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...colour);
      doc.text(String(count), cx + cardW / 2, y + 10, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 110);
      doc.text(label, cx + cardW / 2, y + 15.5, { align: 'center' });
    });
    y += 24;
  }

  doc.setFillColor(245, 245, 250);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 120);
  doc.text('DISCLAIMER', MARGIN + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 90);
  const disclaimer =
    'This assessment is based on visual inspection only. Further investigation may be required. ' +
    'This report does not constitute a compliance certification or fire engineering assessment. ' +
    'All standards references are for general guidance only.';
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W - 8);
  doc.text(dLines, MARGIN + 4, y + 10);

  addFooter(doc);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    doc.addPage();
    addPageBackground(doc);
    addHeader(doc, report, idx + 2, totalPages);

    y = 32;

    const [r, g, b] = severityRGB(item.severity);
    const needsReview = item.confidence < CONFIDENCE_REVIEW_THRESHOLD;

    doc.setFillColor(r, g, b);
    doc.rect(MARGIN, y, 2.5, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 46);
    doc.text(`Finding ${idx + 1}: ${item.defect_type}`, MARGIN + 5, y + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text(`${item.system_type}  ·  ${item.element}`, MARGIN + 5, y + 13.5);

    const sevLabel = `  ${item.severity.toUpperCase()} SEVERITY  `;
    const sevW = doc.getTextWidth(sevLabel) + 4;
    doc.setFillColor(r, g, b);
    doc.roundedRect(PAGE_W - MARGIN - sevW, y + 2, sevW, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${item.severity.toUpperCase()} SEVERITY`, PAGE_W - MARGIN - sevW / 2, y + 6.5, { align: 'center' });

    if (needsReview) {
      doc.setFillColor(251, 191, 36);
      const rvW = doc.getTextWidth('  MANUAL REVIEW  ') + 4;
      doc.roundedRect(PAGE_W - MARGIN - rvW, y + 10, rvW, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(120, 60, 0);
      doc.text('MANUAL REVIEW', PAGE_W - MARGIN - rvW / 2, y + 14, { align: 'center' });
    }

    y += 20;

    if (item.image_url) {
      const imgData = await loadImageAsDataUrl(item.image_url);
      if (imgData) {
        const imgH = 62;
        doc.setFillColor(240, 240, 245);
        doc.roundedRect(MARGIN, y, CONTENT_W, imgH, 2, 2, 'F');
        try {
          doc.addImage(imgData, 'JPEG', MARGIN, y, CONTENT_W, imgH, undefined, 'MEDIUM');
        } catch {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text('Image could not be embedded.', MARGIN + CONTENT_W / 2, y + imgH / 2, { align: 'center' });
        }
        y += imgH + 4;
      }
    }

    const boxTop = y;
    const boxH = PAGE_H - y - 18;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(MARGIN, boxTop, CONTENT_W, boxH, 2, 2, 'F');

    const innerX = MARGIN + 4;
    const innerW = CONTENT_W - 8;
    y = boxTop + 5;

    const sections: Array<{ label: string; content: string }> = [
      { label: 'Observation', content: item.observation },
      { label: 'Non-Conformance', content: item.non_conformance },
      { label: 'Recommendation', content: item.recommendation },
      { label: 'Risk Statement', content: item.risk },
    ];

    for (let si = 0; si < sections.length; si++) {
      const { label, content } = sections[si];
      y = drawLabeledBlock(doc, label, content, innerX, y, innerW) + 2.5;
      if (si < sections.length - 1) {
        doc.setDrawColor(230, 230, 240);
        doc.setLineWidth(0.2);
        doc.line(innerX, y - 1, innerX + innerW, y - 1);
        y += 1.5;
      }
    }

    y += 3;
    const confPct = Math.max(0, Math.min(100, Math.round(item.confidence)));
    const [cr, cg, cb] = severityRGB(item.severity);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 140);
    doc.text('AI CONFIDENCE', innerX, y);

    if (needsReview) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 100, 0);
      doc.text('Manual review recommended', innerX + innerW, y, { align: 'right' });
    }

    y += 4;
    const barW = innerW - 14;
    doc.setFillColor(225, 225, 235);
    doc.roundedRect(innerX, y, barW, 3, 1, 1, 'F');
    if (confPct > 0) {
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(innerX, y, barW * (confPct / 100), 3, 1, 1, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 80);
    doc.text(`${confPct}%`, innerX + barW + 3, y + 3);

    addFooter(doc);
  }

  const safeProject = report.project_name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
  doc.save(`Inspection_AI_Report_${safeProject}_${Date.now()}.pdf`);
}
