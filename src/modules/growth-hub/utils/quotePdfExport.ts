import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote } from '../types';

function fmtCurrency(value: number): string {
  return `$${value.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function exportQuotePDF(quote: Quote, orgName: string = 'P&R Consulting Limited'): void {
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

  // Footer
  doc.setFillColor(...dark);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${orgName} — ${quote.quote_number}`, margin, pageH - 5);
  doc.text(`Generated ${new Date().toLocaleDateString('en-NZ')}`, pageW - margin, pageH - 5, { align: 'right' });

  doc.save(`${quote.quote_number}.pdf`);
}
