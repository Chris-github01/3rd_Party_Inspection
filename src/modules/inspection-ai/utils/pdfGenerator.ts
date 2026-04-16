import jsPDF from 'jspdf';
import type { InspectionAIReport, InspectionAIItem } from '../types';

const BRAND = '#1a1a2e';
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

function drawSection(doc: jsPDF, label: string, content: string, x: number, y: number, w: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 120);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 50);
  const lines = doc.splitTextToSize(content, w);
  doc.text(lines, x, y + 4.5);

  return y + 4.5 + lines.length * 4.5;
}

function severityColour(severity: string): [number, number, number] {
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
  doc.setTextColor(...BRAND.match(/\w\w/g)!.map(h => parseInt(h, 16)) as [number, number, number]);
  doc.text(report.project_name, MARGIN, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);
  doc.text(`Inspector: ${report.inspector_name}    ·    Date: ${dateStr}    ·    ${items.length} Finding${items.length !== 1 ? 's' : ''}`, MARGIN, y);
  y += 8;

  doc.setFillColor(200, 16, 46);
  doc.rect(MARGIN, y, CONTENT_W, 0.5, 'F');
  y += 6;

  const high = items.filter(i => i.severity === 'High').length;
  const med = items.filter(i => i.severity === 'Medium').length;
  const low = items.filter(i => i.severity === 'Low').length;

  const cardW = (CONTENT_W - 6) / 3;
  const summaryItems = [
    { label: 'High', count: high, colour: [200, 16, 46] as [number, number, number] },
    { label: 'Medium', count: med, colour: [217, 119, 6] as [number, number, number] },
    { label: 'Low', count: low, colour: [16, 185, 129] as [number, number, number] },
  ];

  summaryItems.forEach(({ label, count, colour }, i) => {
    const cx = MARGIN + i * (cardW + 3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F');
    doc.setDrawColor(...colour);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...colour);
    doc.text(String(count), cx + cardW / 2, y + 10.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(label, cx + cardW / 2, y + 15.5, { align: 'center' });
  });

  y += 24;

  doc.setFillColor(245, 245, 250);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 120);
  doc.text('DISCLAIMER', MARGIN + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 90);
  const disclaimer = 'This assessment is based on visual inspection only. Further investigation may be required. This report does not constitute a compliance certification or fire engineering assessment.';
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W - 8);
  doc.text(dLines, MARGIN + 4, y + 10);

  addFooter(doc);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    doc.addPage();
    addPageBackground(doc);
    addHeader(doc, report, idx + 2, totalPages);

    y = 32;

    const [r, g, b] = severityColour(item.severity);

    doc.setFillColor(r, g, b);
    doc.rect(MARGIN, y, 2, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 46);
    doc.text(`Finding ${idx + 1}: ${item.defect_type}`, MARGIN + 5, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text(`${item.system_type}  ·  ${item.element}`, MARGIN + 5, y + 12.5);

    doc.setFillColor(r, g, b);
    const badgeLabel = `  ${item.severity.toUpperCase()} SEVERITY  `;
    const badgeW = doc.getTextWidth(badgeLabel) + 2;
    doc.roundedRect(PAGE_W - MARGIN - badgeW - 2, y + 2, badgeW + 2, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${item.severity.toUpperCase()} SEVERITY`, PAGE_W - MARGIN - badgeW / 2 - 2, y + 6, { align: 'center' });

    y += 18;

    if (item.image_url) {
      const imgData = await loadImageAsDataUrl(item.image_url);
      if (imgData) {
        const maxImgH = 65;
        const maxImgW = CONTENT_W;
        doc.setFillColor(240, 240, 245);
        doc.roundedRect(MARGIN, y, maxImgW, maxImgH, 2, 2, 'F');
        try {
          doc.addImage(imgData, 'JPEG', MARGIN, y, maxImgW, maxImgH, undefined, 'MEDIUM');
        } catch {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text('Image could not be embedded.', MARGIN + CONTENT_W / 2, y + maxImgH / 2, { align: 'center' });
        }
        y += maxImgH + 5;
      }
    }

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(MARGIN, y, CONTENT_W, PAGE_H - y - 20, 2, 2, 'F');

    const innerX = MARGIN + 4;
    const innerW = CONTENT_W - 8;
    y += 5;

    y = drawSection(doc, 'Observation', item.observation, innerX, y, innerW) + 3;
    doc.setDrawColor(230, 230, 240);
    doc.setLineWidth(0.2);
    doc.line(innerX, y - 1, innerX + innerW, y - 1);

    y = drawSection(doc, 'Non-Conformance', item.non_conformance, innerX, y + 2, innerW) + 3;
    doc.line(innerX, y - 1, innerX + innerW, y - 1);

    y = drawSection(doc, 'Recommendation', item.recommendation, innerX, y + 2, innerW) + 3;
    doc.line(innerX, y - 1, innerX + innerW, y - 1);

    y = drawSection(doc, 'Risk Statement', item.risk, innerX, y + 2, innerW) + 3;
    doc.line(innerX, y - 1, innerX + innerW, y - 1);

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 120);
    doc.text('AI CONFIDENCE', innerX, y);
    y += 4;
    const confPct = Math.max(0, Math.min(100, Math.round(item.confidence)));
    const barW = innerW;
    doc.setFillColor(230, 230, 240);
    doc.roundedRect(innerX, y, barW, 3.5, 1, 1, 'F');
    const fillW = barW * (confPct / 100);
    if (fillW > 0) {
      doc.setFillColor(r, g, b);
      doc.roundedRect(innerX, y, fillW, 3.5, 1, 1, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 90);
    doc.text(`${confPct}%`, innerX + barW + 2, y + 3);

    addFooter(doc);
  }

  const safeProjectName = report.project_name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
  doc.save(`Inspection_AI_Report_${safeProjectName}_${Date.now()}.pdf`);
}
