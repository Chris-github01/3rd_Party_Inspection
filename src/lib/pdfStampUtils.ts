import { PDFDocument, PDFPage, rgb, degrees } from 'pdf-lib';

interface StampConfig {
  status: string;
  inspectorName: string;
  approvalDate: Date;
  organizationName?: string;
}

const STATUS_COLORS = {
  Passed: { r: 0.12, g: 0.37, b: 0.18 },
  Passed_With_Observations: { r: 0.15, g: 0.35, b: 0.65 },
  Failed: { r: 0.54, g: 0.12, b: 0.12 },
  Rectification_Required: { r: 0.70, g: 0.45, b: 0.00 },
};

const STATUS_TEXT = {
  Passed: 'INSPECTION PASSED',
  Passed_With_Observations: 'PASSED WITH OBSERVATIONS',
  Failed: 'INSPECTION FAILED',
  Rectification_Required: 'RECTIFICATION REQUIRED',
};

export async function applyInspectionStamp(
  pdfDoc: PDFDocument,
  config: StampConfig
): Promise<void> {
  const pages = pdfDoc.getPages();
  if (pages.length === 0) return;

  const firstPage = pages[0];
  await drawStampOnPage(firstPage, config);
}

async function drawStampOnPage(page: PDFPage, config: StampConfig): Promise<void> {
  const { status, inspectorName, approvalDate, organizationName } = config;

  const colorKey = status as keyof typeof STATUS_COLORS;
  const color = STATUS_COLORS[colorKey] || STATUS_COLORS.Passed;
  const statusText = STATUS_TEXT[colorKey] || status.replace(/_/g, ' ');

  const { width, height } = page.getSize();

  const stampRadius = 75;
  const centerX = width - 150;
  const centerY = height - 150;
  const opacity = 0.3;

  page.pushOperators(
    ...drawCircularStamp({
      centerX,
      centerY,
      radius: stampRadius,
      color,
      opacity,
      statusText,
      inspectorName,
      approvalDate,
      organizationName: organizationName || 'P&R Consulting Limited',
    })
  );
}

interface CircularStampParams {
  centerX: number;
  centerY: number;
  radius: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  statusText: string;
  inspectorName: string;
  approvalDate: Date;
  organizationName: string;
}

function drawCircularStamp(params: CircularStampParams): any[] {
  const { centerX, centerY, radius, color, opacity, statusText, inspectorName, approvalDate, organizationName } = params;

  const operators: any[] = [];

  operators.push(['q']);
  operators.push(['cm', 1, 0, 0, 1, centerX, centerY]);
  operators.push(['cm', Math.cos(degrees(-12)), Math.sin(degrees(-12)), -Math.sin(degrees(-12)), Math.cos(degrees(-12)), 0, 0]);

  operators.push(['w', 2]);
  operators.push(['RG', color.r, color.g, color.b]);
  operators.push(['rg', color.r, color.g, color.b]);
  operators.push(['gs', { CA: opacity, ca: opacity }]);

  const outerRadius = radius;
  const innerRadius = radius - 15;

  operators.push(['m', outerRadius, 0]);
  for (let angle = 0; angle <= 360; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * outerRadius;
    const y = Math.sin(rad) * outerRadius;
    operators.push(['l', x, y]);
  }
  operators.push(['S']);

  operators.push(['m', innerRadius, 0]);
  for (let angle = 0; angle <= 360; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * innerRadius;
    const y = Math.sin(rad) * innerRadius;
    operators.push(['l', x, y]);
  }
  operators.push(['S']);

  operators.push(['BT']);
  operators.push(['Tf', 'Helvetica-Bold', 14]);
  operators.push(['Td', -statusText.length * 3.5, 0]);
  operators.push(['Tj', statusText]);
  operators.push(['ET']);

  const dateStr = approvalDate.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  operators.push(['BT']);
  operators.push(['Tf', 'Helvetica', 8]);
  operators.push(['Td', -40, -25]);
  operators.push(['Tj', `Approved: ${dateStr}`]);
  operators.push(['ET']);

  operators.push(['BT']);
  operators.push(['Tf', 'Helvetica', 8]);
  operators.push(['Td', -40, -35]);
  operators.push(['Tj', `Inspector: ${inspectorName}`]);
  operators.push(['ET']);

  const topText = organizationName.toUpperCase();
  operators.push(['BT']);
  operators.push(['Tf', 'Helvetica-Bold', 7]);
  operators.push(['Td', -topText.length * 2, radius - 25]);
  operators.push(['Tj', topText]);
  operators.push(['ET']);

  const bottomText = 'THIRD PARTY COATINGS INSPECTION';
  operators.push(['BT']);
  operators.push(['Tf', 'Helvetica-Bold', 7]);
  operators.push(['Td', -bottomText.length * 1.8, -radius + 15]);
  operators.push(['Tj', bottomText]);
  operators.push(['ET']);

  operators.push(['Q']);

  return operators;
}

export function getInspectionStatusForStamp(inspectionStatus: string | null): string | null {
  if (!inspectionStatus || inspectionStatus === 'Draft') {
    return null;
  }
  return inspectionStatus;
}

export async function addStampToExistingPDF(
  existingPdfBytes: Uint8Array,
  config: StampConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  await applyInspectionStamp(pdfDoc, config);

  return await pdfDoc.save();
}

export async function addDisclaimerText(page: PDFPage): Promise<void> {
  const { width, height } = page.getSize();

  const disclaimerText = 'This approval applies only to the inspected scope as documented in this report.';
  const fontSize = 7;
  const textWidth = disclaimerText.length * (fontSize * 0.5);

  const x = width - 150 - textWidth / 2;
  const y = height - 250;

  page.drawText(disclaimerText, {
    x,
    y,
    size: fontSize,
    color: rgb(0.4, 0.4, 0.4),
    opacity: 0.6,
  });
}
