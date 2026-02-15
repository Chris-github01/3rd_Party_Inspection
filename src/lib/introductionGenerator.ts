import { supabase } from './supabase';
import { format } from 'date-fns';

interface IntroductionData {
  company: {
    company_name: string;
    company_logo_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  project: {
    project_name: string;
    site_address: string;
    project_number?: string;
    client_id: string;
  };
  client: {
    client_name: string;
    contact_name?: string;
  };
  scope: {
    has_intumescent: boolean;
    has_cementitious: boolean;
    has_board: boolean;
    application_categories: string[];
    fire_scenarios: string[];
    material_types: string[];
  };
  inspection_dates: {
    min_date: string | null;
    max_date: string | null;
    has_failures: boolean;
  };
  blocks_levels: {
    blocks: Array<{ id: string; name: string }>;
    levels: Array<{ id: string; name: string }>;
  };
}

interface IntroductionResult {
  full_introduction_text: string;
  short_introduction_text: string;
  inspection_date_range: string;
  scope_flags: {
    has_intumescent: boolean;
    has_cementitious: boolean;
    has_board: boolean;
  };
  data: IntroductionData;
}

export async function generateIntroduction(projectId: string): Promise<IntroductionResult> {
  const { data, error } = await supabase.rpc('get_introduction_data', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching introduction data:', error);
    throw new Error('Failed to fetch introduction data');
  }

  if (!data) {
    throw new Error('No data returned for introduction');
  }

  const introData: IntroductionData = data;

  const dateRange = formatDateRange(
    introData.inspection_dates.min_date,
    introData.inspection_dates.max_date
  );

  const fullIntro = generateFullIntroduction(introData, dateRange);
  const shortIntro = generateShortIntroduction(introData, dateRange);

  return {
    full_introduction_text: fullIntro,
    short_introduction_text: shortIntro,
    inspection_date_range: dateRange,
    scope_flags: {
      has_intumescent: introData.scope.has_intumescent,
      has_cementitious: introData.scope.has_cementitious,
      has_board: introData.scope.has_board,
    },
    data: introData,
  };
}

function generateFullIntroduction(data: IntroductionData, dateRange: string): string {
  const companyName = data.company.company_name || 'P&R Consulting Limited';
  const projectName = data.project.project_name;
  const siteAddress = data.project.site_address || 'the project site';
  const clientName = data.client.client_name;

  let systemType = 'passive fire protection systems';
  const systemTypes: string[] = [];

  if (data.scope.has_intumescent) {
    systemTypes.push('intumescent');
  }
  if (data.scope.has_cementitious) {
    systemTypes.push('cementitious');
  }
  if (data.scope.has_board) {
    systemTypes.push('board-based');
  }

  if (systemTypes.length === 1) {
    systemType = `${systemTypes[0]} fire protection systems`;
  } else if (systemTypes.length > 1) {
    systemType = `passive fire protection systems (${systemTypes.join(', ')})`;
  }

  let scopeItems: string[] = [];

  if (data.scope.has_intumescent) {
    scopeItems.push('- Verification of applied intumescent coating systems');
  }

  if (data.scope.has_cementitious) {
    scopeItems.push('- Verification of applied cementitious fireproofing systems');
  }

  if (data.scope.has_board) {
    scopeItems.push('- Verification of installed board-based fire protection systems');
  }

  const alwaysIncluded = [
    '- Surface preparation verification (where applicable)',
    '- Environmental condition verification at time of inspection',
    '- Material control checks (PDS, SDS & specification compliance)',
    '- Thickness verification (DFT or depth measurement as applicable)',
    '- Photographic records',
    '- Conformance assessment against fire engineering loading schedules',
  ];

  scopeItems = [...scopeItems, ...alwaysIncluded];

  let locationClause = '';
  if (
    data.blocks_levels &&
    (data.blocks_levels.blocks?.length > 0 || data.blocks_levels.levels?.length > 0)
  ) {
    const blockNames = data.blocks_levels.blocks?.map((b) => b.name) || [];
    const levelNames = data.blocks_levels.levels?.map((l) => l.name) || [];

    if (blockNames.length > 1 || levelNames.length > 1) {
      const areas: string[] = [];
      if (blockNames.length > 0) {
        areas.push(blockNames.join(', '));
      }
      if (levelNames.length > 0) {
        areas.push(levelNames.join(', '));
      }
      locationClause = `\n\nThe inspections were conducted across the following project areas: ${areas.join(' / ')}.`;
    }
  }

  let nonConformanceClause = '';
  if (data.inspection_dates.has_failures) {
    nonConformanceClause =
      '\n\nAny identified non-conformances are documented within this report.';
  }

  return `1. Introduction

${companyName} has been engaged to perform independent third-party audit inspections of the ${systemType} installed at ${projectName} located at ${siteAddress}.

The inspections were undertaken on behalf of ${clientName} in accordance with the approved project inspection packages and nominated contract specifications.

This report covers inspection activities completed between ${dateRange}.

The scope of inspection included:

${scopeItems.join('\n')}

Compliance assessment was undertaken in accordance with:
- The applicable project specification
- Approved manufacturer Product Data Sheets (PDS)
- Recognised NACE (AMPP) standards for protective coatings inspection
- Nominated contract inspection standards

This audit supports the client's quality assurance requirements and provides independent verification of compliance based strictly on the contract documentation and inspection standards referenced.${locationClause}${nonConformanceClause}`;
}

function generateShortIntroduction(data: IntroductionData, dateRange: string): string {
  const companyName = data.company.company_name || 'P&R Consulting Limited';
  const projectName = data.project.project_name;
  const clientName = data.client.client_name;

  return `1. Introduction

${companyName} conducted independent third-party inspections of passive fire protection systems at ${projectName} on behalf of ${clientName}.

Inspections were completed between ${dateRange} and included surface preparation checks, environmental verification, material compliance review, thickness measurements, and photographic records.`;
}

function formatDateRange(minDate: string | null, maxDate: string | null): string {
  if (!minDate && !maxDate) {
    return 'the inspection period';
  }

  try {
    const start = minDate ? format(new Date(minDate), 'dd MMMM yyyy') : 'project commencement';
    const end = maxDate ? format(new Date(maxDate), 'dd MMMM yyyy') : 'present';

    if (minDate && maxDate && minDate === maxDate) {
      return start;
    }

    return `${start} and ${end}`;
  } catch (error) {
    console.error('Error formatting dates:', error);
    return 'the inspection period';
  }
}
