import { supabase } from './supabase';

export interface JotunMemberData {
  steelType: string;
  designation: string;
  exposure: string;
  length: number;
  quantity: number;
  area: number;
  tcrit: number;
  use: string;
  hpA: number;
  productName: string;
  dftMm: number;
  volume: number;
  reference: string;
  notes: string;
  page: number;
  subset: string;
  frr: number;
}

export interface JotunScheduleMetadata {
  enquiryRef: string;
  projectName: string;
  company: string;
  presentedBy: string;
  date: string;
  standard: string;
}

export async function parseJotunScheduleAndImport(
  projectId: string,
  members: JotunMemberData[],
  metadata: JotunScheduleMetadata
): Promise<{ importId: string; memberCount: number }> {
  const importId = crypto.randomUUID();

  const membersToInsert = members.map((member, index) => {
    const memberMark = member.reference || `MEMBER-${index + 1}`;
    const elementType = member.use.includes('Column') ? 'Column' : 'Beam';
    const sectionSizeRaw = `${member.steelType} ${member.designation}`.trim();
    const sectionSizeNormalized = normalizeSectionSize(member.designation);
    const dftMicrons = Math.round(member.dftMm * 1000);
    const frrFormat = `${member.frr}FRR`;

    return {
      import_id: importId,
      project_id: projectId,
      loading_schedule_ref: metadata.enquiryRef,
      member_mark: memberMark,
      element_type: elementType,
      section_size_raw: sectionSizeRaw,
      section_size_normalized: sectionSizeNormalized,
      frr_minutes: member.frr,
      frr_format: frrFormat,
      coating_product: member.productName,
      dft_required_microns: dftMicrons,
      needs_review: false,
      confidence: 1.0,
      cite_page: member.page,
      cite_line_start: index + 1,
      cite_line_end: index + 1,
    };
  });

  const { error } = await supabase
    .from('loading_schedule_items')
    .insert(membersToInsert);

  if (error) {
    throw new Error(`Failed to import members: ${error.message}`);
  }

  return {
    importId,
    memberCount: membersToInsert.length,
  };
}

function normalizeSectionSize(designation: string): string {
  const cleaned = designation.trim().replace(/\s+/g, '');

  if (cleaned.match(/^\d+x\d+x\d+$/)) {
    return cleaned;
  }

  if (cleaned.match(/^\d+UC\d+/)) {
    return cleaned;
  }

  if (cleaned.match(/^\d+PFC$/)) {
    return cleaned;
  }

  if (cleaned.match(/^\d+UB[\d.]+$/)) {
    return cleaned;
  }

  if (cleaned.match(/^\d+x\d+$/)) {
    return cleaned;
  }

  return designation.trim();
}

export function extractJotunScheduleData(): {
  members: JotunMemberData[];
  metadata: JotunScheduleMetadata;
} {
  const metadata: JotunScheduleMetadata = {
    enquiryRef: '9859_EB_rev2',
    projectName: 'Westgate Town Centre',
    company: 'Zone Architectural Products',
    presentedBy: 'Edward Bridgman (Non-Jotun User)',
    date: 'Wednesday, February 26, 2025',
    standard: 'BS476',
  };

  const members: JotunMemberData[] = [
    {
      steelType: 'SHS',
      designation: '250x250x 9',
      exposure: '4 Sides',
      length: 27.600,
      quantity: 1,
      area: 26.961,
      tcrit: 520,
      use: 'Column/ALM',
      hpA: 115,
      productName: 'SteelMaster 600WF',
      dftMm: 0.606,
      volume: 23.025,
      reference: 'Ground',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'AU UC',
      designation: '310UC97',
      exposure: '4 Sides',
      length: 18.400,
      quantity: 1,
      area: 32.897,
      tcrit: 550,
      use: 'Column/ALM',
      hpA: 145,
      productName: 'SteelMaster 600WF',
      dftMm: 0.210,
      volume: 9.738,
      reference: 'Ground',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'AU PFC',
      designation: '300 PFC',
      exposure: '3 Short Side to Soffit',
      length: 70.180,
      quantity: 1,
      area: 59.091,
      tcrit: 620,
      use: 'Beam',
      hpA: 165,
      productName: 'SteelMaster 600WF',
      dftMm: 0.241,
      volume: 20.032,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'AU UB',
      designation: '460 UB 67.1',
      exposure: '3 Sides',
      length: 20.030,
      quantity: 1,
      area: 28.872,
      tcrit: 620,
      use: 'Beam',
      hpA: 170,
      productName: 'SteelMaster 600WF',
      dftMm: 0.247,
      volume: 10.047,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'AU UB',
      designation: '610 UB 101',
      exposure: '3 Sides',
      length: 80.030,
      quantity: 1,
      area: 147.477,
      tcrit: 620,
      use: 'Beam',
      hpA: 140,
      productName: 'SteelMaster 600WF',
      dftMm: 0.214,
      volume: 44.391,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'AU UC',
      designation: '200 UC 59.5',
      exposure: '4 Sides',
      length: 2.000,
      quantity: 1,
      area: 2.404,
      tcrit: 550,
      use: 'Beam',
      hpA: 160,
      productName: 'SteelMaster 600WF',
      dftMm: 0.240,
      volume: 0.813,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'Flat Plate',
      designation: '180x20',
      exposure: '3 Short Side to Soffit',
      length: 0.460,
      quantity: 16,
      area: 2.797,
      tcrit: 620,
      use: 'Beam',
      hpA: 105,
      productName: 'SteelMaster 600WF',
      dftMm: 0.175,
      volume: 0.688,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
    {
      steelType: 'Flat Plate',
      designation: '180x20',
      exposure: '3 Short Side to Soffit',
      length: 0.400,
      quantity: 18,
      area: 2.736,
      tcrit: 620,
      use: 'Beam',
      hpA: 105,
      productName: 'SteelMaster 600WF',
      dftMm: 0.175,
      volume: 0.673,
      reference: '',
      notes: '',
      page: 4,
      subset: '60FRR_WBcopy',
      frr: 60,
    },
  ];

  return { members, metadata };
}
