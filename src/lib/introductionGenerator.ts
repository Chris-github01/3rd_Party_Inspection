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
    name: string;
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
  const clientName = data.client.name;
  const projectNumber = data.project.project_number;

  let systemType = 'passive fire protection systems';
  const systemTypes: string[] = [];

  if (data.scope.has_intumescent) {
    systemTypes.push('intumescent coating');
  }
  if (data.scope.has_cementitious) {
    systemTypes.push('cementitious spray');
  }
  if (data.scope.has_board) {
    systemTypes.push('board-based');
  }

  if (systemTypes.length === 1) {
    systemType = `${systemTypes[0]} fire protection systems`;
  } else if (systemTypes.length > 1) {
    systemType = `passive fire protection systems including ${systemTypes.join(', ')} applications`;
  }

  let scopeItems: string[] = [];

  if (data.scope.has_intumescent) {
    scopeItems.push(
      '- Intumescent coating application verification including dry film thickness (DFT) measurements and visual assessment of coating quality, adhesion, and finish'
    );
  }

  if (data.scope.has_cementitious) {
    scopeItems.push(
      '- Cementitious spray-applied fire protection verification including thickness measurements, density checks, and assessment of application uniformity'
    );
  }

  if (data.scope.has_board) {
    scopeItems.push(
      '- Board system installation verification including joint treatment, fixing compliance, and penetration sealing assessment'
    );
  }

  const alwaysIncluded = [
    '- Substrate surface preparation assessment and verification of cleanliness standards',
    '- Environmental conditions monitoring (temperature, humidity, dew point) at time of application and inspection',
    '- Material traceability and compliance verification against Product Data Sheets (PDS), Safety Data Sheets (SDS), and approved specifications',
    '- Comprehensive photographic documentation of representative areas, typical conditions, and any non-conformances identified',
    '- Verification of applied fire resistance ratings (FRR) against fire engineering loading schedules and design documentation',
    '- Assessment of workmanship quality and identification of defects or deficiencies requiring rectification',
  ];

  scopeItems = [...scopeItems, ...alwaysIncluded];

  let locationClause = '';
  if (
    data.blocks_levels &&
    (data.blocks_levels.blocks?.length > 0 || data.blocks_levels.levels?.length > 0)
  ) {
    const blockNames = data.blocks_levels.blocks?.map((b) => b.name) || [];
    const levelNames = data.blocks_levels.levels?.map((l) => l.name) || [];

    if (blockNames.length > 0 || levelNames.length > 0) {
      const areas: string[] = [];
      if (blockNames.length > 0) {
        areas.push(`Blocks: ${blockNames.join(', ')}`);
      }
      if (levelNames.length > 0) {
        areas.push(`Levels: ${levelNames.join(', ')}`);
      }
      locationClause = `\n\n1.3 Inspection Areas\n\nThe inspection program covered the following designated project areas:\n\n${areas.join('\n')}`;
    }
  }

  let nonConformanceClause = '';
  if (data.inspection_dates.has_failures) {
    nonConformanceClause =
      '\n\n1.4 Non-Conformance Reporting\n\nWhere non-conformances or deficiencies were identified during the inspection process, these have been documented in detail within the body of this report. Each non-conformance includes photographic evidence, location information, and recommended corrective actions. Non-conformances are categorized by severity to assist with prioritization of rectification activities.';
  }

  const projectRef = projectNumber ? ` (Project Ref: ${projectNumber})` : '';

  return `1. INTRODUCTION

1.1 Purpose and Scope

${companyName} has been formally engaged by ${clientName} to perform independent third-party audit inspections of ${systemType} at ${projectName}${projectRef}, located at ${siteAddress}. This inspection report provides a comprehensive record of all verification activities undertaken to assess compliance with the project specifications, approved manufacturer requirements, and relevant industry standards.

The integrity of passive fire protection systems is critical to building safety, property protection, and regulatory compliance. These inspections serve to verify that fire protection systems have been installed in accordance with design intent, manufacturer specifications, and accepted industry practice. The audit provides documented evidence of compliance for quality assurance purposes and supports the certification process for building consent authorities.

1.2 Inspection Period and Methodology

This report encompasses all inspection activities completed between ${dateRange}. Inspections were conducted in accordance with the approved project inspection and test plan (ITP), manufacturer installation guidelines, and recognized protective coatings inspection standards.

The inspection scope included the following key elements:

${scopeItems.join('\n\n')}

1.3 Standards and Reference Documents

All inspections and assessments documented in this report have been conducted in accordance with the following standards and specifications:

- Project-specific fire protection specifications and contract drawings
- Approved manufacturer Product Data Sheets (PDS) and Technical Data Sheets (TDS)
- Material Safety Data Sheets (SDS) for health and safety compliance
- NACE/AMPP standards for protective coatings inspection (where applicable)
- AS/NZS standards for fire protection systems and testing
- Fire engineering loading schedules and Fire Resistance Rating (FRR) requirements
- Building Code of New Zealand (NZBC) Acceptable Solutions and Verification Methods

The inspection methodology employed visual assessment, dimensional verification, photographic documentation, and where applicable, non-destructive testing techniques. All measurements and observations were recorded in accordance with industry best practice.${locationClause}${nonConformanceClause}

1.4 Report Structure

This report is structured to provide clear documentation of inspection findings, organized by project area, structural element, or fire protection system as appropriate. Each section includes detailed observations, measurement data, photographic evidence, and compliance assessment against the specified requirements.`;
}

function generateShortIntroduction(data: IntroductionData, dateRange: string): string {
  const companyName = data.company.company_name || 'P&R Consulting Limited';
  const projectName = data.project.project_name;
  const siteAddress = data.project.site_address || 'the project site';
  const clientName = data.client.name;

  let systemType = 'passive fire protection systems';
  const systemTypes: string[] = [];

  if (data.scope.has_intumescent) {
    systemTypes.push('intumescent coatings');
  }
  if (data.scope.has_cementitious) {
    systemTypes.push('cementitious spray applications');
  }
  if (data.scope.has_board) {
    systemTypes.push('board systems');
  }

  if (systemTypes.length > 0) {
    systemType = systemTypes.join(' and ');
  }

  let complianceStatement = 'All inspections were conducted in accordance with project specifications, manufacturer requirements, and recognized industry standards.';

  if (data.inspection_dates.has_failures) {
    complianceStatement = 'Inspections were conducted in accordance with project specifications and industry standards. Non-conformances identified during the inspection process are documented within this report with recommended corrective actions.';
  }

  return `1. INTRODUCTION

${companyName} was engaged by ${clientName} to perform independent third-party audit inspections of ${systemType} at ${projectName}, located at ${siteAddress}.

This report documents inspection activities completed between ${dateRange}. The scope of work included verification of substrate preparation, environmental conditions, material compliance, thickness measurements, workmanship quality, and conformance with fire engineering requirements. Comprehensive photographic records were maintained throughout the inspection program.

${complianceStatement}

This inspection report provides documented evidence of compliance for quality assurance purposes and supports the project's fire protection certification requirements.`;
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
