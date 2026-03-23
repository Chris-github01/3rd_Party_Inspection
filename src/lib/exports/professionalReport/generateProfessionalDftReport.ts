import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { MemberReportData, ReportMember, ReportReading, ReportProject, ReportGenerationOptions } from './reportTypes';
import { buildHistogramData, calculateStatistics } from './buildHistogramData';
import { renderHistogramToImage } from './renderHistogramToImage';
import { blobToCleanDataURL } from '../../pinPhotoUtils';

export async function generateProfessionalDftReport(
  project: ReportProject,
  members: ReportMember[],
  readingsMap: Map<string, ReportReading[]>,
  options?: ReportGenerationOptions
): Promise<jsPDF> {
  console.log('[Professional DFT Report] Starting generation');
  console.log('[Professional DFT Report] Project:', project.name);
  console.log('[Professional DFT Report] Members:', members.length);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const companyName = project.organizations?.name || 'P&R Consulting Limited';
  const logoUrl = project.organizations?.logo_url;

  let logoDataUrl: string | null = null;
  if (logoUrl) {
    try {
      console.log('[Professional DFT Report] Loading logo');
      const response = await fetch(logoUrl);
      if (response.ok) {
        const blob = await response.blob();
        logoDataUrl = await blobToCleanDataURL(blob);
        console.log('[Professional DFT Report] Logo loaded successfully');
      }
    } catch (error) {
      console.warn('[Professional DFT Report] Failed to load logo, continuing without:', error);
    }
  }

  let isFirstMember = true;

  for (const member of members) {
    const readings = readingsMap.get(member.id) || [];

    if (readings.length === 0) {
      console.log(`[Professional DFT Report] Skipping ${member.member_mark} - no readings`);
      continue;
    }

    console.log(`[Professional DFT Report] Processing ${member.member_mark} - ${readings.length} readings`);

    const dftValues = readings.map(r => r.dft_average);
    const stats = calculateStatistics(dftValues, member.required_dft_microns);
    const histogram = buildHistogramData(dftValues, 10);

    const memberData: MemberReportData = {
      project,
      member,
      readings,
      stats,
      histogram,
      requiredDft: member.required_dft_microns,
      inspectionDate: readings.length > 0 ? readings[0].created_at : undefined
    };

    try {
      if (!isFirstMember) {
        doc.addPage();
      }
      await renderPage1(doc, memberData, logoDataUrl, companyName);

      doc.addPage();
      await renderPage2(doc, memberData, logoDataUrl, companyName);

      isFirstMember = false;
      console.log(`[Professional DFT Report] ✓ ${member.member_mark} complete`);
    } catch (error) {
      console.error(`[Professional DFT Report] ✗ Failed to process ${member.member_mark}:`, error);
      throw error;
    }
  }

  console.log('[Professional DFT Report] Generation complete');
  return doc;
}

async function renderPage1(
  doc: jsPDF,
  data: MemberReportData,
  logoDataUrl: string | null,
  companyName: string
) {
  let yPos = 15;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 15, yPos, 40, 20);
    } catch (error) {
      console.warn('[Professional DFT Report] Failed to add logo to page 1');
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('DFT Inspection Report', 105, yPos + 10, { align: 'center' });

  yPos = 40;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 105, yPos, { align: 'center' });

  yPos = 50;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Member: ${data.member.member_mark}`, 20, yPos);

  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const memberDetails = [
    data.member.section ? `Section: ${data.member.section}` : null,
    data.member.coating_system ? `Product: ${data.member.coating_system}` : null,
    `Required DFT: ${data.requiredDft} µm`,
    data.member.steel_type ? `Steel Type: ${data.member.steel_type}` : null
  ].filter(Boolean).join(' | ');
  doc.text(memberDetails, 20, yPos);

  yPos = 68;

  renderMetadataPanel(doc, 15, yPos, 60, 32, 'Project Information', [
    { label: 'Project', value: data.project.name },
    { label: 'Client', value: data.project.client_name || 'N/A' },
    { label: 'Location', value: data.project.location || 'N/A' }
  ]);

  renderMetadataPanel(doc, 78, yPos, 60, 32, 'Member Details', [
    { label: 'Member', value: data.member.member_mark },
    { label: 'Section', value: data.member.section || 'N/A' },
    { label: 'Product', value: data.member.coating_system || 'N/A' },
    { label: 'Required DFT', value: `${data.requiredDft} µm` }
  ]);

  renderMetadataPanel(doc, 141, yPos, 54, 32, 'Statistics', [
    { label: 'Readings', value: data.stats.count.toString() },
    { label: 'Average', value: `${data.stats.mean.toFixed(1)} µm` },
    { label: 'Min / Max', value: `${data.stats.min.toFixed(1)} / ${data.stats.max.toFixed(1)} µm` }
  ]);

  yPos = 105;

  try {
    console.log('[Professional DFT Report] Rendering histogram for', data.member.member_mark);
    const histogramImage = await renderHistogramToImage(data.histogram, {
      width: 800,
      height: 400,
      barColor: '#D4A537',
      backgroundColor: '#FAFAFA',
      showGrid: true
    });

    const imgWidth = 170;
    const imgHeight = 85;
    const imgX = (210 - imgWidth) / 2;

    doc.addImage(histogramImage, 'PNG', imgX, yPos, imgWidth, imgHeight);
    console.log('[Professional DFT Report] Histogram rendered successfully');
  } catch (error) {
    console.error('[Professional DFT Report] Failed to render histogram:', error);
    doc.setFontSize(10);
    doc.setTextColor(200, 50, 50);
    doc.text('Histogram rendering failed', 105, yPos + 40, { align: 'center' });
  }

  yPos = 200;

  const passFailStatus = data.stats.passRate >= 95 ? 'PASS' : 'FAIL';
  const statusColor = data.stats.passRate >= 95 ? [34, 139, 34] : [220, 38, 38];

  doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, 180, 12, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Result: ${passFailStatus} (${data.stats.passCount}/${data.stats.count} pass, ${data.stats.passRate.toFixed(1)}%)`,
    105,
    yPos + 8,
    { align: 'center' }
  );
}

async function renderPage2(
  doc: jsPDF,
  data: MemberReportData,
  logoDataUrl: string | null,
  companyName: string
) {
  let yPos = 15;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 15, yPos, 30, 15);
    } catch (error) {
      console.warn('[Professional DFT Report] Failed to add logo to page 2');
    }
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Inspection Readings', 105, yPos + 8, { align: 'center' });

  yPos = 35;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Member: ${data.member.member_mark}`, 20, yPos);

  yPos += 8;

  const tableData = data.readings.map((r, index) => [
    (index + 1).toString(),
    format(new Date(r.created_at), 'dd/MM/yyyy'),
    format(new Date(r.created_at), 'HH:mm'),
    r.dft_average.toFixed(1),
    r.reading_type || 'Standard'
  ]);

  autoTable(doc, {
    head: [['#', 'Date', 'Time', 'Thickness (µm)', 'Type']],
    body: tableData,
    startY: yPos,
    theme: 'grid',
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'left', cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { left: 20, right: 20, bottom: 30 },
    didDrawPage: (hookData) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        105,
        285,
        { align: 'center' }
      );

      doc.text(
        `${companyName} | DFT Inspection Report`,
        20,
        285
      );

      doc.text(
        format(new Date(), 'dd MMM yyyy'),
        190,
        285,
        { align: 'right' }
      );
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

  if (finalY < 250) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Summary: ${data.stats.count} readings | Average: ${data.stats.mean.toFixed(1)} µm | Range: ${data.stats.min.toFixed(1)} - ${data.stats.max.toFixed(1)} µm`,
      20,
      finalY + 10
    );
  }
}

function renderMetadataPanel(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  items: { label: string; value: string }[]
) {
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 248, 248);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(title, x + 3, y + 5);

  let itemY = y + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  items.forEach(item => {
    const text = `${item.label}: ${item.value}`;
    const lines = doc.splitTextToSize(text, width - 6);
    lines.forEach((line: string) => {
      if (itemY < y + height - 2) {
        doc.text(line, x + 3, itemY);
        itemY += 4;
      }
    });
  });
}
