import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { supabase } from './supabase';
import {
  calculateReadingStats,
  evaluateCompliance,
} from './readingStatistics';

interface Member {
  id: string;
  member_mark: string;
  element_type: string;
  section: string;
  level: string;
  block: string;
  frr_minutes: number;
  coating_system: string;
  required_dft_microns: number;
  required_thickness_mm: number;
  quantity: number;
  auto_generated_base_id: string | null;
}

interface InspectionReading {
  id: string;
  member_id: string;
  sequence_number: number;
  generated_id: string;
  dft_reading_1: number;
  dft_reading_2: number;
  dft_reading_3: number;
  dft_average: number;
  status: string;
  temperature_c: number;
  humidity_percent: number;
  notes: string;
  created_at: string;
}

interface MemberWithReadings {
  member: Member;
  readings: InspectionReading[];
}

export async function generateQuantityReadingsPDFWithStatistics(
  projectId: string,
  selectedMemberIds: string[]
): Promise<jsPDF> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  const { data: projectData } = await supabase
    .from('projects')
    .select(`
      *,
      organizations!inner (
        name,
        logo_url,
        address,
        phone,
        email
      )
    `)
    .eq('id', projectId)
    .single();

  if (!projectData) {
    throw new Error('Project not found');
  }

  const org = projectData.organizations;

  if (org?.logo_url) {
    try {
      const response = await fetch(org.logo_url);
      const blob = await response.blob();
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          doc.addImage(base64, 'JPEG', margin, yPos, 30, 15);
          yPos += 20;
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading logo:', error);
      yPos += 5;
    }
  }

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Quantity Readings Report with Statistical Analysis', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${projectData.name}`, margin, yPos);

  yPos += 7;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, yPos);

  if (org) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (org.name) doc.text(org.name, margin, yPos);
    yPos += 4;
    if (org.address) doc.text(org.address, margin, yPos);
    yPos += 4;
    if (org.phone) doc.text(`Phone: ${org.phone}`, margin, yPos);
    if (org.email) doc.text(`Email: ${org.email}`, pageWidth - margin, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 15;

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .in('id', selectedMemberIds)
    .order('member_mark');

  if (!members || members.length === 0) {
    doc.setFontSize(10);
    doc.text('No members selected for this report.', margin, yPos);
    return doc;
  }

  const membersWithReadings: MemberWithReadings[] = [];

  for (const member of members) {
    const { data: readings } = await supabase
      .from('inspection_readings')
      .select('*')
      .eq('member_id', member.id)
      .order('sequence_number');

    if (readings && readings.length > 0) {
      membersWithReadings.push({
        member,
        readings,
      });
    }
  }

  if (membersWithReadings.length === 0) {
    doc.setFontSize(10);
    doc.text('No readings found for selected members.', margin, yPos);
    return doc;
  }

  for (let memberIndex = 0; memberIndex < membersWithReadings.length; memberIndex++) {
    const { member, readings } = membersWithReadings[memberIndex];

    if (memberIndex > 0) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Member: ${member.member_mark}`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const memberInfo = [
      ['Element Type', member.element_type],
      ['Section', member.section],
      ['Level', member.level],
      ['Block', member.block],
      ['FRR', `${member.frr_minutes} minutes`],
      ['Coating System', member.coating_system],
      ['Required DFT', `${member.required_dft_microns} µm`],
      ['Total Readings', readings.length.toString()],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: memberInfo,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 80 },
      },
      margin: { left: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Detailed Readings (${readings.length} total):`, margin, yPos);
    yPos += 6;

    const readingsPerRow = 10;
    const readingsRows: any[] = [];

    for (let j = 0; j < readings.length; j += readingsPerRow) {
      const row = readings.slice(j, j + readingsPerRow).map(r =>
        `${r.sequence_number}: ${r.dft_average}µm`
      );
      readingsRows.push(row);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: readingsRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        halign: 'center',
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.addPage();
    yPos = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Statistical Analysis: ${member.member_mark}`, margin, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 10;

    const dftAverages = readings.map(r => r.dft_average);
    const stats = calculateReadingStats(dftAverages);
    const compliance = evaluateCompliance(member.required_dft_microns, stats);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', margin, yPos);
    yPos += 6;

    const statsData = [
      ['Number of Readings', stats.count.toString()],
      ['Mean (Average)', `${stats.mean.toFixed(1)} µm`],
      ['Maximum', `${stats.max} µm`],
      ['Minimum', `${stats.min} µm`],
      ['Range', `${stats.range} µm`],
      ['Standard Deviation (σ)', `${stats.standardDeviation.toFixed(1)} µm`],
      ['Mean - 3σ', `${stats.meanMinus3Sigma.toFixed(1)} µm`],
      ['Coefficient of Variation (COV)', `${stats.covPercent.toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: statsData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 50, halign: 'right' },
      },
      margin: { left: margin },
      headStyles: {
        fillColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (compliance.requiredDft !== null) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Compliance Summary', margin, yPos);
      yPos += 6;

      const complianceData = [
        ['Required DFT', `${compliance.requiredDft} µm`],
        ['Mean ≥ Required', compliance.meanPass ? '✓ PASS' : '✗ FAIL'],
        ['Min ≥ 90% Required', compliance.minPass ? '✓ PASS' : '✗ FAIL'],
        ['Mean - 3σ ≥ 90% Required', compliance.meanMinus3SigmaPass ? '✓ PASS' : '✗ FAIL'],
        ['Overall Status', compliance.overallPass ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: complianceData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: {
            cellWidth: 50,
            halign: 'right' as const,
          },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1 && data.row.index === 4) {
            data.cell.styles.textColor = compliance.overallPass ? [34, 197, 94] : [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: margin },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Add note about charts in web view
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Interactive charts and visualizations are available in the web application.', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  return doc;
}
