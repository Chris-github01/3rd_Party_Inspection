import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Member {
  member_mark: string;
  element_type: string;
  section: string;
  level: string;
  block: string;
  frr_minutes: number;
  coating_system: string;
  required_dft_microns: number;
}

interface MemberSet {
  member_name: string;
  required_thickness_microns: number;
  min_value_microns: number;
  max_value_microns: number;
  readings_per_member: number;
  summary_json: any;
}

interface Reading {
  reading_no: number;
  dft_microns: number;
}

interface MemberWithReadings {
  member: Member;
  memberSet: MemberSet;
  readings: Reading[];
  inspectionDate: Date;
}

interface Project {
  name: string;
  project_number: string;
  location: string;
}

export async function generateMemberReadingsPDF(
  project: Project,
  membersWithReadings: MemberWithReadings[]
) {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Member Register - DFT Readings', 14, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.name}`, 14, yPos);
  yPos += 6;
  doc.text(`Project No: ${project.project_number || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Location: ${project.location || 'N/A'}`, 14, yPos);
  yPos += 6;
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, yPos);
  yPos += 10;

  for (let i = 0; i < membersWithReadings.length; i++) {
    const { member, memberSet, readings, inspectionDate } = membersWithReadings[i];
    const summary = memberSet.summary_json;

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Member: ${member.member_mark}`, 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const memberInfo = [
      ['Element Type:', member.element_type],
      ['Section:', member.section],
      ['Level:', member.level],
      ['Block:', member.block],
      ['FRR:', `${member.frr_minutes} minutes`],
      ['Coating System:', member.coating_system],
      ['Required DFT:', `${member.required_dft_microns} µm`],
      ['Inspection Date:', inspectionDate.toLocaleDateString()],
    ];

    (doc as any).autoTable({
      startY: yPos,
      head: [],
      body: memberInfo,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 80 },
      },
      margin: { left: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    if (summary) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics:', 14, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const statsInfo = [
        ['Average:', `${summary.average?.toFixed(2) || 'N/A'} µm`],
        ['Minimum:', `${summary.minimum?.toFixed(2) || 'N/A'} µm`],
        ['Maximum:', `${summary.maximum?.toFixed(2) || 'N/A'} µm`],
        ['Std Deviation:', `${summary.stdDev?.toFixed(2) || 'N/A'} µm`],
        ['Compliance:', summary.compliance || 'N/A'],
      ];

      (doc as any).autoTable({
        startY: yPos,
        head: [],
        body: statsInfo,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 50 },
        },
        margin: { left: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    }

    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`DFT Readings (${readings.length} readings):`, 14, yPos);
    yPos += 6;

    const readingsPerRow = 10;
    const readingsRows: any[] = [];

    // Sort readings to ensure sequential order 1-100
    const sortedReadings = [...readings].sort((a, b) => a.reading_no - b.reading_no);

    for (let j = 0; j < sortedReadings.length; j += readingsPerRow) {
      const row = sortedReadings.slice(j, j + readingsPerRow).map(r =>
        `${r.reading_no}: ${r.dft_microns}µm`
      );
      readingsRows.push(row);
    }

    (doc as any).autoTable({
      startY: yPos,
      head: [],
      body: readingsRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'center'
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    if (i < membersWithReadings.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos - 5, 196, yPos - 5);
      yPos += 5;
    }
  }

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${totalPages}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  doc.save(`member-readings-${project.name}-${new Date().toISOString().split('T')[0]}.pdf`);
}
