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
    PAGE_W / 2, y + 2,
    { align: 'center', maxWidth: CONTENT_W }
  );
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
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

function drawLabeledBlock(doc: jsPDF, label: string, content: string, x: number, y: number, w: number): number {
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

function addSummaryPage(doc: jsPDF, report: InspectionAIReport, items: InspectionAIItem[], totalPages: number) {
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
  const dateStr = new Date(report.created_at).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.text(
    `Inspector: ${report.inspector_name}    ·    Date: ${dateStr}    ·    ${items.length} Finding${items.length !== 1 ? 's' : ''}`,
    MARGIN, y
  );
  y += 6;

  doc.setFillColor(200, 16, 46);
  doc.rect(MARGIN, y, CONTENT_W, 0.5, 'F');
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 46);
  doc.text('INSPECTION SUMMARY', MARGIN, y);
  y += 6;

  const high = items.filter((i) => i.severity === 'High').length;
  const med = items.filter((i) => i.severity === 'Medium').length;
  const low = items.filter((i) => i.severity === 'Low').length;
  const review = items.filter((i) => i.confidence < CONFIDENCE_REVIEW_THRESHOLD).length;
  const overrides = items.filter((i) => i.defect_type_override || i.severity_override || i.observation_override).length;
  const widespread = items.filter((i) => i.extent === 'Widespread').length;
  const moderate = items.filter((i) => i.extent === 'Moderate').length;

  const summaryCards = [
    { label: 'Total Findings', count: items.length, colour: [60, 60, 80] as [number, number, number] },
    { label: 'High Severity', count: high, colour: [200, 16, 46] as [number, number, number] },
    { label: 'Medium Severity', count: med, colour: [217, 119, 6] as [number, number, number] },
    { label: 'Low Severity', count: low, colour: [16, 185, 129] as [number, number, number] },
  ];

  const cardW = (CONTENT_W - 9) / 4;
  summaryCards.forEach(({ label, count, colour }, i) => {
    const cx = MARGIN + i * (cardW + 3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, y, cardW, 20, 2, 2, 'F');
    doc.setDrawColor(...colour);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx, y, cardW, 20, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...colour);
    doc.text(String(count), cx + cardW / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 110);
    doc.text(label, cx + cardW / 2, y + 17, { align: 'center' });
  });
  y += 27;

  const defectCounts: Record<string, number> = {};
  items.forEach((i) => { defectCounts[i.defect_type] = (defectCounts[i.defect_type] ?? 0) + 1; });
  const topDefects = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (topDefects.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 46);
    doc.text('PRIMARY ISSUES', MARGIN, y);
    y += 5;

    const barMaxW = CONTENT_W - 30;
    const maxCount = topDefects[0][1];
    topDefects.forEach(([defect, count]) => {
      const barW = barMaxW * (count / maxCount);
      doc.setFillColor(235, 235, 245);
      doc.roundedRect(MARGIN, y, barMaxW, 5, 1, 1, 'F');
      doc.setFillColor(26, 26, 46);
      doc.roundedRect(MARGIN, y, barW, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 55);
      doc.text(defect, MARGIN + barMaxW + 3, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      if (barW > 10) doc.text(String(count), MARGIN + barW - 3, y + 4, { align: 'right' });
      y += 8;
    });
    y += 3;
  }

  if (widespread > 0 || moderate > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 46);
    doc.text('EXTENT OF DEFECTS', MARGIN, y);
    y += 5;

    const extentItems = [
      { label: 'Widespread', count: widespread, colour: [200, 16, 46] as [number, number, number] },
      { label: 'Moderate', count: moderate, colour: [217, 119, 6] as [number, number, number] },
      { label: 'Localised', count: items.length - widespread - moderate, colour: [60, 130, 200] as [number, number, number] },
    ].filter((e) => e.count > 0);

    extentItems.forEach(({ label, count, colour }) => {
      doc.setFillColor(...colour);
      doc.roundedRect(MARGIN, y, 3, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 55);
      doc.text(`${label}: ${count}`, MARGIN + 6, y + 4);
      y += 8;
    });
    y += 3;
  }

  const systemCounts: Record<string, number> = {};
  items.forEach((i) => { systemCounts[i.system_type] = (systemCounts[i.system_type] ?? 0) + 1; });
  const systemEntries = Object.entries(systemCounts);

  if (systemEntries.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 46);
    doc.text('SYSTEMS INSPECTED', MARGIN, y);
    y += 5;
    systemEntries.forEach(([sys, count]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 80);
      doc.text(`${sys}: ${count} finding${count !== 1 ? 's' : ''}`, MARGIN + 3, y + 4);
      y += 7;
    });
    y += 3;
  }

  if (review > 0 || overrides > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(26, 26, 46);
    doc.text('FLAGS', MARGIN, y);
    y += 5;

    if (review > 0) {
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14);
      doc.text(`${review} finding${review !== 1 ? 's' : ''} flagged for manual review (AI confidence < ${CONFIDENCE_REVIEW_THRESHOLD}%)`, MARGIN + 3, y + 4.5);
      y += 10;
    }

    if (overrides > 0) {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 64, 175);
      doc.text(`${overrides} finding${overrides !== 1 ? 's' : ''} include inspector override of AI classification`, MARGIN + 3, y + 4.5);
      y += 10;
    }
    y += 3;
  }

  doc.setFillColor(245, 245, 250);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 120);
  doc.text('DISCLAIMER', MARGIN + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 90);
  const disclaimer = 'This assessment is based on visual inspection only. Further investigation may be required. ' +
    'This report does not constitute a compliance certification or fire engineering assessment. ' +
    'All standards references are for general guidance only.';
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W - 8);
  doc.text(dLines, MARGIN + 4, y + 10);

  addFooter(doc);
}

export async function generatePDF(report: InspectionAIReport, items: InspectionAIItem[]): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const totalPages = 1 + items.length;

  addSummaryPage(doc, report, items, totalPages);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    doc.addPage();
    addPageBackground(doc);
    addHeader(doc, report, idx + 2, totalPages);

    let y = 32;

    const [r, g, b] = severityRGB(item.severity);
    const needsReview = item.confidence < CONFIDENCE_REVIEW_THRESHOLD;
    const hasOverride = !!(item.defect_type_override || item.severity_override || item.observation_override);

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

    const badgeX = PAGE_W - MARGIN;
    const sevLabel = `${item.severity.toUpperCase()} SEVERITY`;
    const sevW = doc.getTextWidth(sevLabel) + 6;
    doc.setFillColor(r, g, b);
    doc.roundedRect(badgeX - sevW, y + 1, sevW, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sevLabel, badgeX - sevW / 2, y + 5.5, { align: 'center' });

    let badgeStackY = y + 9;

    const extentColours: Record<string, [number, number, number]> = {
      Widespread: [200, 16, 46],
      Moderate: [217, 119, 6],
      Localised: [60, 130, 200],
    };
    if (item.extent) {
      const extLabel = item.extent.toUpperCase();
      const extW = doc.getTextWidth(extLabel) + 6;
      const [er, eg, eb] = extentColours[item.extent] ?? [100, 100, 120];
      doc.setFillColor(er, eg, eb);
      doc.roundedRect(badgeX - extW, badgeStackY, extW, 5.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(extLabel, badgeX - extW / 2, badgeStackY + 4, { align: 'center' });
      badgeStackY += 7;
    }

    if (needsReview && !hasOverride) {
      const rvLabel = 'MANUAL REVIEW';
      const rvW = doc.getTextWidth(rvLabel) + 6;
      doc.setFillColor(251, 191, 36);
      doc.roundedRect(badgeX - rvW, badgeStackY, rvW, 5.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(120, 60, 0);
      doc.text(rvLabel, badgeX - rvW / 2, badgeStackY + 4, { align: 'center' });
      badgeStackY += 7;
    }

    if (hasOverride) {
      const ovLabel = 'OVERRIDDEN';
      const ovW = doc.getTextWidth(ovLabel) + 6;
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(badgeX - ovW, badgeStackY, ovW, 5.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(ovLabel, badgeX - ovW / 2, badgeStackY + 4, { align: 'center' });
    }

    const locationParts = [item.location_level, item.location_grid, item.location_description].filter(Boolean);
    if (locationParts.length > 0) {
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 110);
      doc.text(`Location: ${locationParts.join('  ·  ')}`, MARGIN, y);
      y += 4;
    } else {
      y += 20;
    }

    if (item.image_url) {
      const imgData = await loadImageAsDataUrl(item.image_url);
      if (imgData) {
        const imgH = 60;
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
      y = drawLabeledBlock(doc, sections[si].label, sections[si].content, innerX, y, innerW) + 2.5;
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

    if (needsReview && !hasOverride) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(180, 100, 0);
      doc.text('Manual review recommended', innerX + innerW, y, { align: 'right' });
    }

    if (hasOverride) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 80, 200);
      doc.text('Inspector override applied', innerX + innerW, y, { align: 'right' });
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
