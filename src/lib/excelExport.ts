import * as XLSX from 'xlsx';

interface ReadingData {
  'Member Mark': string;
  'Element Type': string;
  'Section': string;
  'Level': string;
  'Block': string;
  'FRR (min)': number;
  'Coating System': string;
  'Required DFT (um)': number;
  'Reading Number': number;
  'DFT Value (um)': number;
  'Date': string;
}

interface MemberReadingsGroup {
  memberMark: string;
  elementType: string;
  section: string;
  level: string;
  block: string;
  frrMinutes: number;
  coatingSystem: string;
  requiredDft: number;
  date: string;
  readings: Array<{ number: number; value: number }>;
}

export function exportReadingsToFormattedExcel(
  readingsData: ReadingData[],
  filename: string
) {
  const wb = XLSX.utils.book_new();

  const groupedByMember = groupReadingsByMember(readingsData);

  groupedByMember.forEach((group, index) => {
    const ws = createFormattedWorksheet(group);

    const sheetName = sanitizeSheetName(
      `${group.memberMark}`.substring(0, 31)
    );

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, filename);
}

function groupReadingsByMember(data: ReadingData[]): MemberReadingsGroup[] {
  const grouped = new Map<string, MemberReadingsGroup>();

  data.forEach((row) => {
    const key = row['Member Mark'];

    if (!grouped.has(key)) {
      grouped.set(key, {
        memberMark: row['Member Mark'],
        elementType: row['Element Type'],
        section: row['Section'],
        level: row['Level'],
        block: row['Block'],
        frrMinutes: row['FRR (min)'],
        coatingSystem: row['Coating System'],
        requiredDft: row['Required DFT (um)'],
        date: row['Date'],
        readings: [],
      });
    }

    grouped.get(key)!.readings.push({
      number: row['Reading Number'],
      value: row['DFT Value (um)'],
    });
  });

  return Array.from(grouped.values());
}

function createFormattedWorksheet(group: MemberReadingsGroup): XLSX.WorkSheet {
  const data: any[][] = [];

  data.push(['FIRE PROTECTION INSPECTION REPORT']);
  data.push(['DFT READINGS - DETAILED REPORT']);
  data.push([]);

  data.push(['Member Information']);
  data.push(['Member Mark:', group.memberMark]);
  data.push(['Element Type:', group.elementType]);
  data.push(['Section:', group.section]);
  data.push(['Level:', group.level]);
  data.push(['Block:', group.block]);
  data.push(['FRR Rating:', `${group.frrMinutes} minutes`]);
  data.push(['Coating System:', group.coatingSystem]);
  data.push(['Required DFT:', `${group.requiredDft} um`]);
  data.push(['Inspection Date:', group.date]);
  data.push([]);

  const readingsArray = group.readings.sort((a, b) => a.number - b.number);
  const totalReadings = readingsArray.length;
  const avgDft = readingsArray.reduce((sum, r) => sum + r.value, 0) / totalReadings;
  const minDft = Math.min(...readingsArray.map(r => r.value));
  const maxDft = Math.max(...readingsArray.map(r => r.value));

  data.push(['STATISTICS SUMMARY']);
  data.push(['Total Readings:', totalReadings]);
  data.push(['Average DFT:', `${avgDft.toFixed(1)} um`]);
  data.push(['Minimum DFT:', `${minDft} um`]);
  data.push(['Maximum DFT:', `${maxDft} um`]);
  data.push(['Required DFT:', `${group.requiredDft} um`]);
  data.push(['Compliance Status:', avgDft >= group.requiredDft ? 'PASS' : 'FAIL']);
  data.push([]);

  data.push(['DFT READINGS (100 Measurements)']);
  data.push([]);

  const readingsPerRow = 10;
  const numRows = Math.ceil(totalReadings / readingsPerRow);

  for (let row = 0; row < numRows; row++) {
    const headerRow: any[] = [];
    const valueRow: any[] = [];

    for (let col = 0; col < readingsPerRow; col++) {
      const index = row * readingsPerRow + col;
      if (index < totalReadings) {
        const reading = readingsArray[index];
        headerRow.push(`#${reading.number}`);
        valueRow.push(reading.value);
      } else {
        headerRow.push('');
        valueRow.push('');
      }
    }

    data.push(headerRow);
    data.push(valueRow);
    data.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  if (!ws['!merges']) ws['!merges'] = [];

  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });
  ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } });
  ws['!merges'].push({ s: { r: 14, c: 0 }, e: { r: 14, c: 9 } });
  ws['!merges'].push({ s: { r: 22, c: 0 }, e: { r: 22, c: 9 } });

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;

      if (!ws[cellAddress].s) ws[cellAddress].s = {};

      ws[cellAddress].s.border = {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } },
      };

      if (R === 0 || R === 1) {
        ws[cellAddress].s.fill = { fgColor: { rgb: '002850' } };
        ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 };
        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      else if (R === 3 || R === 14 || R === 22) {
        ws[cellAddress].s.fill = { fgColor: { rgb: '4472C4' } };
        ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 };
        ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      else if (R >= 4 && R <= 12 && C === 0) {
        ws[cellAddress].s.fill = { fgColor: { rgb: 'D9E1F2' } };
        ws[cellAddress].s.font = { bold: true, color: { rgb: '002850' } };
      }

      else if (R >= 15 && R <= 21 && C === 0) {
        ws[cellAddress].s.fill = { fgColor: { rgb: 'E2EFDA' } };
        ws[cellAddress].s.font = { bold: true, color: { rgb: '375623' } };
      }

      else if (R >= 24) {
        const dataRow = R - 24;
        const isHeaderRow = dataRow % 3 === 0;
        const isValueRow = dataRow % 3 === 1;

        if (isHeaderRow) {
          ws[cellAddress].s.fill = { fgColor: { rgb: '70AD47' } };
          ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFF' } };
          ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };
        } else if (isValueRow) {
          ws[cellAddress].s.fill = { fgColor: { rgb: 'F4F6F8' } };
          ws[cellAddress].s.font = { sz: 11 };
          ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center' };

          const cellValue = ws[cellAddress].v;
          if (typeof cellValue === 'number') {
            if (cellValue < group.requiredDft) {
              ws[cellAddress].s.fill = { fgColor: { rgb: 'FFC7CE' } };
              ws[cellAddress].s.font.color = { rgb: '9C0006' };
            } else {
              ws[cellAddress].s.fill = { fgColor: { rgb: 'C6EFCE' } };
              ws[cellAddress].s.font.color = { rgb: '006100' };
            }
          }
        }
      }
    }
  }

  // Apply styling to compliance cell
  const complianceCell = ws[XLSX.utils.encode_cell({ r: 20, c: 1 })];
  if (complianceCell && complianceCell.v === 'PASS') {
    complianceCell.s.fill = { fgColor: { rgb: '00B050' } };
    complianceCell.s.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
  } else if (complianceCell && complianceCell.v === 'FAIL') {
    complianceCell.s.fill = { fgColor: { rgb: 'FF0000' } };
    complianceCell.s.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
  }

  ws['!cols'] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  return ws;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*\[\]]/g, '_');
}
