import { PDFDocument, rgb } from 'pdf-lib';
import { applyInspectionStamp, addDisclaimerText, addStampToExistingPDF } from './pdfStampUtils';

export { addStampToExistingPDF };

export async function convertImageToPdf(imageFile: File): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  const imageBytes = await imageFile.arrayBuffer();

  let image;
  if (imageFile.type === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBytes);
  } else {
    throw new Error(`Unsupported image type: ${imageFile.type}`);
  }

  const imageDims = image.scale(1);
  const aspectRatio = imageDims.width / imageDims.height;

  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;
  const MARGIN = 50;

  let pageWidth: number;
  let pageHeight: number;

  if (aspectRatio > 1) {
    pageWidth = A4_HEIGHT;
    pageHeight = A4_WIDTH;
  } else {
    pageWidth = A4_WIDTH;
    pageHeight = A4_HEIGHT;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const maxWidth = pageWidth - (MARGIN * 2);
  const maxHeight = pageHeight - (MARGIN * 2);

  let drawWidth = imageDims.width;
  let drawHeight = imageDims.height;

  if (drawWidth > maxWidth) {
    const scale = maxWidth / drawWidth;
    drawWidth = maxWidth;
    drawHeight = drawHeight * scale;
  }

  if (drawHeight > maxHeight) {
    const scale = maxHeight / drawHeight;
    drawHeight = maxHeight;
    drawWidth = drawWidth * scale;
  }

  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  page.drawImage(image, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function mergePdfs(
  pdfFiles: Blob[],
  inspectionStatus?: {
    status: string;
    inspectorName: string;
    approvalDate: Date;
    organizationName?: string;
  }
): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  if (inspectionStatus && inspectionStatus.status !== 'Draft') {
    await applyInspectionStamp(mergedPdf, inspectionStatus);
    const pages = mergedPdf.getPages();
    if (pages.length > 0) {
      await addDisclaimerText(pages[0]);
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}

export async function generateReportPdfBlob(
  projectName: string,
  clientName: string,
  data: any,
  inspectionStatus?: {
    status: string;
    inspectorName: string;
    approvalDate: Date;
    organizationName?: string;
  }
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  const fontSize = 24;
  page.drawText('P&R Consulting Limited', {
    x: 50,
    y: 792,
    size: fontSize,
    color: rgb(0, 0.4, 0.6),
  });

  page.drawText('Third Party Coatings Inspection Report', {
    x: 50,
    y: 750,
    size: 18,
    color: rgb(0, 0, 0),
  });

  page.drawText(projectName, {
    x: 50,
    y: 710,
    size: 14,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Client: ${clientName}`, {
    x: 50,
    y: 680,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText('Prepared by P&R Consulting Limited', {
    x: 50,
    y: 50,
    size: 10,
    color: rgb(0.4, 0.4, 0.4),
  });

  if (inspectionStatus && inspectionStatus.status !== 'Draft') {
    await applyInspectionStamp(pdfDoc, inspectionStatus);
    await addDisclaimerText(page);
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function createDividerPage(
  appendixLetter: string,
  title: string,
  metadata: {
    category?: string;
    filename: string;
    uploadedBy: string;
    uploadedAt: string;
    projectName: string;
    clientName: string;
    siteAddress?: string;
  }
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);

  const titleFontSize = 32;
  const headingFontSize = 16;
  const bodyFontSize = 11;
  const smallFontSize = 9;

  let yPos = 792;

  page.drawText('P&R Consulting Limited', {
    x: 50,
    y: yPos,
    size: 18,
    color: rgb(0, 0.4, 0.6),
  });

  yPos -= 60;

  page.drawRectangle({
    x: 40,
    y: yPos - 10,
    width: 515,
    height: 2,
    color: rgb(1, 0.84, 0),
  });

  yPos -= 50;

  page.drawText(`APPENDIX ${appendixLetter}`, {
    x: 50,
    y: yPos,
    size: titleFontSize,
    color: rgb(0, 0.2, 0.4),
  });

  yPos -= 50;

  page.drawText(title, {
    x: 50,
    y: yPos,
    size: headingFontSize,
    color: rgb(0, 0, 0),
  });

  yPos -= 40;

  if (metadata.category) {
    page.drawText(`Category: ${metadata.category}`, {
      x: 50,
      y: yPos,
      size: bodyFontSize,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  }

  page.drawText(`File: ${metadata.filename}`, {
    x: 50,
    y: yPos,
    size: bodyFontSize,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 20;

  page.drawText(`Uploaded by: ${metadata.uploadedBy}`, {
    x: 50,
    y: yPos,
    size: bodyFontSize,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 20;

  page.drawText(`Uploaded at: ${metadata.uploadedAt}`, {
    x: 50,
    y: yPos,
    size: bodyFontSize,
    color: rgb(0.2, 0.2, 0.2),
  });

  yPos -= 40;

  page.drawText('Project Details', {
    x: 50,
    y: yPos,
    size: headingFontSize - 2,
    color: rgb(0, 0.2, 0.4),
  });
  yPos -= 25;

  page.drawText(`Project: ${metadata.projectName}`, {
    x: 50,
    y: yPos,
    size: bodyFontSize,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 20;

  page.drawText(`Client: ${metadata.clientName}`, {
    x: 50,
    y: yPos,
    size: bodyFontSize,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPos -= 20;

  if (metadata.siteAddress) {
    page.drawText(`Site: ${metadata.siteAddress}`, {
      x: 50,
      y: yPos,
      size: bodyFontSize,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const footer = 'Generated by 3rd Party Coatings Inspector';
  const timestamp = new Date().toLocaleString();
  page.drawText(footer, {
    x: 50,
    y: 40,
    size: smallFontSize,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(timestamp, {
    x: 50,
    y: 25,
    size: smallFontSize,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
