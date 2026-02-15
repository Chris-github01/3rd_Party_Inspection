import jsPDF from 'jspdf';
import { generateIntroduction } from './introductionGenerator';
import { generateExecutiveSummary } from './executiveSummaryGenerator';

export interface CompleteReportOptions {
  includeIntroduction?: boolean;
  includeExecutiveSummary?: boolean;
  includeCompanyHeader?: boolean;
  addComplianceWatermark?: boolean;
}

export async function generateCompleteReport(
  projectId: string,
  filename?: string,
  options: CompleteReportOptions = {}
): Promise<void> {
  const {
    includeIntroduction = true,
    includeExecutiveSummary = true,
    includeCompanyHeader = true,
    addComplianceWatermark = true,
  } = options;

  try {
    const doc = new jsPDF();
    let currentPage = 1;

    const [introduction, executiveSummary] = await Promise.all([
      includeIntroduction ? generateIntroduction(projectId) : null,
      includeExecutiveSummary ? generateExecutiveSummary(projectId) : null,
    ]);

    if (executiveSummary && includeExecutiveSummary) {
      addCoverPage(doc, executiveSummary, introduction);
      currentPage++;

      addShortExecutiveSummaryPage(doc, executiveSummary, currentPage);
      currentPage++;

      addFullExecutiveSummaryPage(doc, executiveSummary, currentPage);
      currentPage++;
    }

    if (introduction && includeIntroduction) {
      addFullIntroductionPage(doc, introduction, currentPage, includeCompanyHeader);
      currentPage++;
    }

    if (
      addComplianceWatermark &&
      executiveSummary &&
      executiveSummary.overall_result === 'Compliant'
    ) {
      addComplianceWatermarkToAllPages(doc);
    }

    const companyName = introduction?.data.company.company_name || 'P&R Consulting Limited';
    const projectName = introduction?.data.project.project_name || executiveSummary?.data.project.project_name || 'Project';

    const pdfFilename =
      filename || `${companyName.replace(/\s+/g, '_')}_Report_${projectName.replace(/\s+/g, '_')}.pdf`;

    doc.save(pdfFilename);
  } catch (error) {
    console.error('Error generating complete report:', error);
    throw error;
  }
}

function addCoverPage(doc: jsPDF, executiveSummary: any, introduction: any) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  const companyName = introduction?.data.company.company_name || 'P&R Consulting Limited';
  const projectName = executiveSummary.data.project.project_name;
  const clientName = executiveSummary.data.client.client_name;

  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Independent Third-Party Inspection Report', pageWidth / 2, 55, {
    align: 'center',
  });

  doc.setTextColor(0, 0, 0);

  let yPos = 120;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Passive Fire Protection Inspection', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  const projectLines = doc.splitTextToSize(projectName, pageWidth - 2 * margin);
  doc.text(projectLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += projectLines.length * 10 + 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared for:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(clientName, margin, yPos + 8);
  yPos += 25;

  doc.setFont('helvetica', 'bold');
  doc.text('Report Date:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }), margin, yPos + 8);

  const isCompliant = executiveSummary.overall_result === 'Compliant';
  const statusY = pageHeight - 60;

  if (isCompliant) {
    doc.setFillColor(34, 197, 94);
  } else {
    doc.setFillColor(239, 68, 68);
  }

  doc.roundedRect(margin, statusY, pageWidth - 2 * margin, 40, 5, 5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isCompliant ? '✓ COMPLIANT' : '⚠ NON-COMPLIANT',
    pageWidth / 2,
    statusY + 25,
    { align: 'center' }
  );

  doc.setTextColor(0, 0, 0);
}

function addShortExecutiveSummaryPage(doc: jsPDF, summary: any, pageNumber: number) {
  if (doc.getNumberOfPages() >= pageNumber) {
    doc.setPage(pageNumber);
  } else {
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
}

function addFullExecutiveSummaryPage(doc: jsPDF, summary: any, pageNumber: number) {
  if (doc.getNumberOfPages() >= pageNumber) {
    doc.setPage(pageNumber);
  } else {
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

function addFullIntroductionPage(
  doc: jsPDF,
  introduction: any,
  pageNumber: number,
  includeHeader: boolean
) {
  if (doc.getNumberOfPages() >= pageNumber) {
    doc.setPage(pageNumber);
  } else {
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Introduction', margin, yPos);
  yPos += 10;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const paragraphs = introduction.full_introduction_text
    .split('\n\n')
    .filter((p: string) => !p.startsWith('1. Introduction'));

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') continue;

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

    doc.text(text, (pageWidth - textWidth) / 2, pageHeight / 2, { angle: 45 });

    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }
}
