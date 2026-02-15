import jsPDF from 'jspdf';
import { generateIntroduction } from './introductionGenerator';

export interface PDFIntroductionOptions {
  includeShortVersion?: boolean;
  includeFullVersion?: boolean;
  shortVersionPage?: number;
  fullVersionPage?: number;
  includeCompanyHeader?: boolean;
}

export async function addIntroductionToPDF(
  doc: jsPDF,
  projectId: string,
  options: PDFIntroductionOptions = {}
): Promise<jsPDF> {
  const {
    includeShortVersion = false,
    includeFullVersion = true,
    shortVersionPage = 3,
    fullVersionPage = 3,
    includeCompanyHeader = true,
  } = options;

  try {
    const introduction = await generateIntroduction(projectId);

    if (includeFullVersion) {
      addFullIntroductionPage(doc, introduction, fullVersionPage, includeCompanyHeader);
    }

    if (includeShortVersion && !includeFullVersion) {
      addShortIntroductionPage(doc, introduction, shortVersionPage, includeCompanyHeader);
    }

    return doc;
  } catch (error) {
    console.error('Error adding introduction to PDF:', error);
    throw error;
  }
}

function addCompanyHeader(doc: jsPDF, companyName: string, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, yPos + 5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, yPos - 5);

  doc.setTextColor(0, 0, 0);

  return yPos + 10;
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

  if (includeHeader) {
    yPos = addCompanyHeader(doc, introduction.data.company.company_name, 15);
  }

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

    if (paragraph.includes('The scope of inspection included:')) {
      const parts = paragraph.split('The scope of inspection included:');

      if (parts[0].trim()) {
        const lines = doc.splitTextToSize(parts[0].trim(), contentWidth);
        for (const line of lines) {
          if (yPos > pageHeight - margin - 10) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin, yPos);
          yPos += 5;
        }
        yPos += 3;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('The scope of inspection included:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');

      if (parts[1]) {
        const scopeItems = parts[1].split('\n').filter((item: string) => item.trim());
        for (const item of scopeItems) {
          if (yPos > pageHeight - margin - 10) {
            doc.addPage();
            yPos = margin;
          }
          const lines = doc.splitTextToSize(item.trim(), contentWidth - 5);
          for (const line of lines) {
            doc.text(line, margin + 3, yPos);
            yPos += 5;
          }
        }
      }
      yPos += 3;
    } else if (paragraph.includes('Compliance assessment was undertaken')) {
      yPos += 2;
      doc.setFont('helvetica', 'bold');
      const lines = doc.splitTextToSize(
        'Compliance assessment was undertaken in accordance with:',
        contentWidth
      );
      for (const line of lines) {
        if (yPos > pageHeight - margin - 10) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 5;
      }

      doc.setFont('helvetica', 'normal');
      const complianceItems = paragraph
        .split('Compliance assessment was undertaken in accordance with:')[1]
        .split('\n')
        .filter((item: string) => item.trim());

      for (const item of complianceItems) {
        if (yPos > pageHeight - margin - 10) {
          doc.addPage();
          yPos = margin;
        }
        const lines = doc.splitTextToSize(item.trim(), contentWidth - 5);
        for (const line of lines) {
          doc.text(line, margin + 3, yPos);
          yPos += 5;
        }
      }
      yPos += 3;
    } else if (paragraph.startsWith('-')) {
      const lines = doc.splitTextToSize(paragraph, contentWidth);
      for (const line of lines) {
        if (yPos > pageHeight - margin - 10) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 5;
      }
      yPos += 2;
    } else {
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
}

function addShortIntroductionPage(
  doc: jsPDF,
  introduction: any,
  pageNumber: number,
  includeHeader: boolean
) {
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

  if (includeHeader) {
    yPos = addCompanyHeader(doc, introduction.data.company.company_name, 15);
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Introduction', margin, yPos);
  yPos += 10;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const paragraphs = introduction.short_introduction_text
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

export async function generateStandaloneIntroductionPDF(
  projectId: string,
  filename?: string
): Promise<void> {
  try {
    const introduction = await generateIntroduction(projectId);

    const doc = new jsPDF();

    addFullIntroductionPage(doc, introduction, 1, true);

    const pdfFilename = filename || `Introduction_${Date.now()}.pdf`;
    doc.save(pdfFilename);
  } catch (error) {
    console.error('Error generating introduction PDF:', error);
    throw error;
  }
}
