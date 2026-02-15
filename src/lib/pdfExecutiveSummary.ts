import jsPDF from 'jspdf';
import { generateExecutiveSummary } from './executiveSummaryGenerator';

export interface PDFSummaryOptions {
  includeShortSummary?: boolean;
  includeFullSummary?: boolean;
  addComplianceWatermark?: boolean;
  shortSummaryPage?: number;
  fullSummaryPage?: number;
}

export async function addExecutiveSummaryToPDF(
  doc: jsPDF,
  projectId: string,
  options: PDFSummaryOptions = {}
): Promise<jsPDF> {
  const {
    includeShortSummary = true,
    includeFullSummary = true,
    addComplianceWatermark = true,
    shortSummaryPage = 1,
    fullSummaryPage = 2,
  } = options;

  try {
    const summary = await generateExecutiveSummary(projectId);

    if (includeShortSummary) {
      addShortSummaryPage(doc, summary, shortSummaryPage);
    }

    if (includeFullSummary) {
      addFullSummaryPage(doc, summary, fullSummaryPage);
    }

    if (addComplianceWatermark && summary.overall_result === 'Compliant') {
      addComplianceWatermarkToAllPages(doc);
    }

    return doc;
  } catch (error) {
    console.error('Error adding executive summary to PDF:', error);
    throw error;
  }
}

function addShortSummaryPage(doc: jsPDF, summary: any, pageNumber: number) {
  if (doc.getNumberOfPages() >= pageNumber) {
    doc.setPage(pageNumber);
  } else {
    while (doc.getNumberOfPages() < pageNumber - 1) {
      doc.addPage();
    }
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Summary', margin, yPos);
  yPos += 15;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  const lines = summary.short_summary_text.split('\n');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  for (const line of lines) {
    if (line.trim() === '') {
      yPos += 6;
      continue;
    }

    if (line.includes(':')) {
      const [label, value] = line.split(':');
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const splitValue = doc.splitTextToSize(value.trim(), contentWidth - 60);
      doc.text(splitValue, margin + 60, yPos);
      yPos += splitValue.length * 6;
    } else if (line.startsWith('Inspection Summary') || line.startsWith('Overall Compliance')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(line, margin, yPos);
      doc.setFontSize(11);
      yPos += 8;
    } else {
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(line, contentWidth);
      doc.text(splitText, margin, yPos);
      yPos += splitText.length * 6;
    }

    if (yPos > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  }

  if (summary.overall_result === 'Compliant') {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(margin, pageHeight - 50, contentWidth, 30, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ INSPECTION PASSED', pageWidth / 2, pageHeight - 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(margin, pageHeight - 50, contentWidth, 30, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ NON-COMPLIANT', pageWidth / 2, pageHeight - 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

function addFullSummaryPage(doc: jsPDF, summary: any, pageNumber: number) {
  if (doc.getNumberOfPages() >= pageNumber) {
    doc.setPage(pageNumber);
  } else {
    while (doc.getNumberOfPages() < pageNumber - 1) {
      doc.addPage();
    }
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, yPos);
  yPos += 12;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const paragraphs = summary.full_summary_text.split('\n\n');
  doc.setFontSize(10);

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') continue;

    if (
      paragraph.startsWith('Executive Summary') ||
      paragraph.startsWith('OVERALL COMPLIANCE')
    ) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    } else if (paragraph.includes('•') || paragraph.includes('-')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    const lines = doc.splitTextToSize(paragraph, contentWidth);

    for (const line of lines) {
      if (yPos > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    yPos += 5;
  }
}

function addComplianceWatermarkToAllPages(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));

    doc.setTextColor(34, 197, 94);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');

    const text = 'PASSED';
    const textWidth = doc.getTextWidth(text);

    doc.text(
      text,
      (pageWidth - textWidth) / 2,
      pageHeight / 2,
      { angle: 45 }
    );

    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }
}

export async function generateStandaloneExecutiveSummaryPDF(
  projectId: string,
  filename?: string
): Promise<void> {
  try {
    const summary = await generateExecutiveSummary(projectId);

    const doc = new jsPDF();

    addShortSummaryPage(doc, summary, 1);
    addFullSummaryPage(doc, summary, 2);

    if (summary.overall_result === 'Compliant') {
      addComplianceWatermarkToAllPages(doc);
    }

    const pdfFilename = filename || `Executive_Summary_${Date.now()}.pdf`;
    doc.save(pdfFilename);
  } catch (error) {
    console.error('Error generating executive summary PDF:', error);
    throw error;
  }
}
