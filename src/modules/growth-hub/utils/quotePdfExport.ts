import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote } from '../types';
import { calcCostBreakdown, INSPECTOR_RATES } from './costingEngine';
import type { CostInputs } from './costingEngine';

function fmtCurrency(value: number): string {
  return `$${value.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function exportQuotePDF(quote: Quote, orgName: string = 'P&R Consulting Limited', includeInternalPage = false): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const red: [number, number, number] = [200, 16, 46];
  const dark: [number, number, number] = [11, 15, 20];
  const mid: [number, number, number] = [71, 85, 105];
  const light: [number, number, number] = [241, 245, 249];

  // Header bar
  doc.setFillColor(...red);
  doc.rect(0, 0, pageW, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(orgName, margin, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('QUOTATION', pageW - margin, 14, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.quote_number, pageW - margin, 22, { align: 'right' });

  // Sub-header strip
  doc.setFillColor(...dark);
  doc.rect(0, 32, pageW, 10, 'F');
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared: ${fmtDate(quote.created_at)}`, margin, 38.5);
  if (quote.valid_until) {
    doc.text(`Valid Until: ${fmtDate(quote.valid_until)}`, pageW - margin, 38.5, { align: 'right' });
  }

  let y = 52;

  // Client + Project info two-column
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PREPARED FOR', margin, y);
  doc.text('PROJECT DETAILS', pageW / 2 + 5, y);

  y += 5;
  doc.setDrawColor(...light);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW / 2 - 5, y);
  doc.line(pageW / 2 + 5, y, pageW - margin, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(quote.client_name, margin, y);

  const projName = quote.project_name ?? '—';
  doc.text(projName, pageW / 2 + 5, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mid);

  if (quote.client_email) { doc.text(quote.client_email, margin, y); y += 4.5; }
  if (quote.client_address) {
    const lines = doc.splitTextToSize(quote.client_address, pageW / 2 - margin - 10);
    doc.text(lines, margin, y);
    y += lines.length * 4.5;
  }

  let y2 = 62;
  if (quote.site_address) {
    doc.setTextColor(...mid);
    doc.setFontSize(9);
    const siteLines = doc.splitTextToSize(`Site: ${quote.site_address}`, pageW / 2 - 15);
    doc.text(siteLines, pageW / 2 + 5, y2);
    y2 += siteLines.length * 4.5;
  }

  y = Math.max(y, y2) + 6;

  // Scope of work
  if (quote.scope_of_work) {
    doc.setFillColor(...light);
    doc.rect(margin, y, pageW - margin * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('SCOPE OF WORK', margin + 3, y + 4.2);
    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mid);
    const scopeLines = doc.splitTextToSize(quote.scope_of_work, pageW - margin * 2);
    doc.text(scopeLines, margin, y);
    y += scopeLines.length * 4.5 + 4;
  }

  // Line items table
  const lineItems = quote.line_items ?? [];
  if (lineItems.length > 0) {
    const tableBody = lineItems
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(li => [
        li.description,
        li.category,
        `${li.quantity} ${li.unit}`,
        fmtCurrency(li.unit_price),
        li.markup_percent > 0 ? `${li.markup_percent}%` : '—',
        fmtCurrency(li.line_total),
      ]);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Category', 'Qty / Unit', 'Unit Price', 'Markup', 'Total']],
      body: tableBody,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: red,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      bodyStyles: { fontSize: 8.5, textColor: [...dark] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 28 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Totals block
  const totalsX = pageW - margin - 70;
  const totalsW = 70;

  const drawTotalRow = (label: string, value: string, bold = false, bgColor?: [number, number, number]) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(totalsX, y - 1, totalsW, 7, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(bold ? dark : mid));
    doc.text(label, totalsX + 3, y + 4);
    doc.text(value, totalsX + totalsW - 3, y + 4, { align: 'right' });
    y += 7;
  };

  drawTotalRow('Subtotal (excl. GST)', fmtCurrency(quote.subtotal));
  drawTotalRow(`GST (${Math.round((quote.gst_rate ?? 0.15) * 100)}%)`, fmtCurrency(quote.gst_amount));
  drawTotalRow('TOTAL (incl. GST)', fmtCurrency(quote.total), true, [220, 235, 220]);

  y += 6;

  // Notes
  if (quote.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Notes', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mid);
    const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4.5 + 4;
  }

  // Terms
  if (quote.terms_and_conditions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Terms & Conditions', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mid);
    const tLines = doc.splitTextToSize(quote.terms_and_conditions, pageW - margin * 2);
    doc.text(tLines, margin, y);
  }

  // Footer page 1
  doc.setFillColor(...dark);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orgName} — ${quote.quote_number}`, margin, pageH - 5);
  doc.text(`Generated ${new Date().toLocaleDateString('en-NZ')}`, pageW - margin, pageH - 5, { align: 'right' });

  // Internal cost analysis page
  if (includeInternalPage && quote.cost_inputs) {
    const inputs = quote.cost_inputs as unknown as CostInputs;
    const breakdown = calcCostBreakdown(inputs);
    const amber: [number, number, number] = [180, 120, 20];
    const green: [number, number, number] = [22, 163, 74];
    const rose: [number, number, number] = [190, 30, 45];

    doc.addPage();

    // Confidential header
    doc.setFillColor(40, 20, 20);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setTextColor(255, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('INTERNAL — COST ANALYSIS', margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 130, 130);
    doc.text('CONFIDENTIAL — NOT FOR CLIENT DISTRIBUTION', margin, 22);
    doc.setTextColor(180, 130, 130);
    doc.text(quote.quote_number, pageW - margin, 14, { align: 'right' });
    doc.text(quote.client_name, pageW - margin, 22, { align: 'right' });

    doc.setFillColor(...dark);
    doc.rect(0, 32, pageW, 8, 'F');
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7.5);
    const inspectorRate = INSPECTOR_RATES.find(r => r.type === inputs.inspectorType);
    doc.text(
      `Inspector: ${inspectorRate?.label ?? inputs.inspectorType} @ $${inspectorRate?.hourlyRate ?? 0}/hr`,
      margin, 37.5
    );
    doc.text(
      `Quote Total (excl. GST): ${fmtCurrency(quote.subtotal)}`,
      pageW - margin, 37.5, { align: 'right' }
    );

    let py = 50;

    // Cost breakdown table
    const breakdownRows: [string, string][] = [
      ['Site Labour', fmtCurrency(breakdown.siteLabour)],
      ['Report Writing', fmtCurrency(breakdown.reportWriting)],
    ];
    if (breakdown.afterHoursPremium > 0) breakdownRows.push(['After-Hours Premium', fmtCurrency(breakdown.afterHoursPremium)]);
    if (breakdown.travel > 0) breakdownRows.push(['Travel', fmtCurrency(breakdown.travel)]);
    if (breakdown.parking > 0) breakdownRows.push(['Parking & Tolls', fmtCurrency(breakdown.parking)]);
    if (breakdown.accommodation > 0) breakdownRows.push(['Accommodation', fmtCurrency(breakdown.accommodation)]);
    if (breakdown.subcontractors > 0) breakdownRows.push(['Subcontractors', fmtCurrency(breakdown.subcontractors)]);
    if (breakdown.urgentSurcharge > 0) breakdownRows.push(['Urgent Turnaround Surcharge', fmtCurrency(breakdown.urgentSurcharge)]);
    if (breakdown.adminOverhead > 0) breakdownRows.push(['Admin Overhead', fmtCurrency(breakdown.adminOverhead)]);

    autoTable(doc, {
      startY: py,
      head: [['Cost Component', 'Amount']],
      body: breakdownRows,
      foot: [['TOTAL INTERNAL COST', fmtCurrency(breakdown.totalInternalCost)]],
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [60, 30, 30], textColor: [255, 200, 200], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [...dark] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      footStyles: { fillColor: [40, 20, 20], textColor: [255, 200, 200], fontStyle: 'bold', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 45, halign: 'right' },
      },
      theme: 'grid',
    });

    py = (doc as any).lastAutoTable.finalY + 10;

    // Margin summary block
    const revenue = quote.subtotal;
    const cost = breakdown.totalInternalCost;
    const margin$ = revenue - cost;
    const marginPct = revenue > 0 ? (margin$ / revenue) * 100 : 0;
    const marginRgb: [number, number, number] = marginPct >= 40 ? green : marginPct >= 25 ? amber : rose;

    const blockW = (pageW - margin * 2 - 10) / 3;

    const drawSummaryBlock = (label: string, value: string, color: [number, number, number], x: number) => {
      doc.setFillColor(248, 248, 248);
      doc.rect(x, py, blockW, 20, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.rect(x, py, blockW, 20, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mid);
      doc.text(label, x + 4, py + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...color);
      doc.text(value, x + 4, py + 15);
    };

    drawSummaryBlock('Revenue (excl. GST)', fmtCurrency(revenue), dark, margin);
    drawSummaryBlock('Internal Cost', fmtCurrency(cost), [...mid], margin + blockW + 5);
    drawSummaryBlock('Gross Margin $', fmtCurrency(margin$), marginRgb, margin + (blockW + 5) * 2);

    py += 25;

    // Large margin % display
    doc.setFillColor(...(marginPct >= 40 ? [230, 255, 235] : marginPct >= 25 ? [255, 248, 220] : [255, 230, 230]) as [number, number, number]);
    doc.rect(margin, py, pageW - margin * 2, 28, 'F');
    doc.setDrawColor(...marginRgb);
    doc.setLineWidth(0.5);
    doc.rect(margin, py, pageW - margin * 2, 28, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mid);
    doc.text('GROSS MARGIN %', margin + 6, py + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...marginRgb);
    doc.text(`${marginPct.toFixed(1)}%`, margin + 6, py + 22);

    const marginLabel = marginPct >= 40 ? 'Strong margin — proceed' : marginPct >= 25 ? 'Acceptable margin' : marginPct >= 10 ? 'Low margin — review pricing' : 'WARNING: Negative or very low margin';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...marginRgb);
    doc.text(marginLabel, pageW / 2, py + 15, { align: 'center' });

    py += 35;

    // Cost inputs summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text('Cost Inputs Used', margin, py);
    py += 5;
    doc.setDrawColor(...light);
    doc.setLineWidth(0.3);
    doc.line(margin, py, pageW - margin, py);
    py += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...mid);

    const inputRows: [string, string][] = [
      ['Site Labour Hours', `${inputs.siteLabourHours} hrs`],
      ['Inspector Grade', inspectorRate?.label ?? inputs.inspectorType],
      ['Report Writing Hours', `${inputs.reportWritingHours} hrs`],
    ];
    if (inputs.afterHoursMultiplier > 1) inputRows.push(['After-Hours Multiplier', `${inputs.afterHoursMultiplier}×`]);
    if (inputs.travelKm > 0) inputRows.push(['Travel Distance', `${inputs.travelKm} km @ $${inputs.kmRate}/km`]);
    if (inputs.parking > 0) inputRows.push(['Parking & Tolls', fmtCurrency(inputs.parking)]);
    if (inputs.accommodation > 0) inputRows.push(['Accommodation', fmtCurrency(inputs.accommodation)]);
    if (inputs.subcontractorCosts > 0) inputRows.push(['Subcontractor Costs', fmtCurrency(inputs.subcontractorCosts)]);
    if (inputs.urgentSurchargePct > 0) inputRows.push(['Urgent Surcharge', `${inputs.urgentSurchargePct}%`]);
    if (inputs.adminOverheadPct > 0) inputRows.push(['Admin Overhead', `${inputs.adminOverheadPct}%`]);

    const colMid = pageW / 2;
    inputRows.forEach((row, i) => {
      const col = i % 2 === 0 ? margin : colMid + 5;
      const rowY = py + Math.floor(i / 2) * 8;
      doc.setTextColor(...mid);
      doc.text(row[0] + ':', col, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text(row[1], col + 55, rowY);
      doc.setFont('helvetica', 'normal');
    });

    py += Math.ceil(inputRows.length / 2) * 8 + 4;

    // Footer page 2
    doc.setFillColor(40, 20, 20);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setTextColor(120, 80, 80);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`INTERNAL ONLY — ${orgName} — ${quote.quote_number}`, margin, pageH - 5);
    doc.text(`Generated ${new Date().toLocaleDateString('en-NZ')}`, pageW - margin, pageH - 5, { align: 'right' });
  }

  doc.save(`${quote.quote_number}.pdf`);
}
