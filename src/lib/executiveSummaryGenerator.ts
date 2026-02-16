import { supabase } from './supabase';
import { format } from 'date-fns';

interface ExecutiveSummaryData {
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
  blocks_levels: {
    blocks: Array<{ id: string; name: string }>;
    levels: Array<{ id: string; name: string; block_name: string }>;
  };
  materials: Array<{
    material_id: string;
    manufacturer: string;
    product_name: string;
    material_type: string;
    certification_standard?: string;
    application_type?: string;
  }>;
  frr_ratings: number[];
  fire_scenarios: string[];
  overall_result: 'Compliant' | 'Non-Compliant';
  inspection_stats: {
    total_inspections: number;
    completed_inspections: number;
    passed_inspections: number;
    failed_inspections: number;
    draft_inspections: number;
    min_date: string | null;
    max_date: string | null;
  };
}

interface ExecutiveSummaryResult {
  short_summary_text: string;
  full_summary_text: string;
  overall_result: 'Compliant' | 'Non-Compliant';
  materials_list: string[];
  frr_list: number[];
  data: ExecutiveSummaryData;
}

export async function generateExecutiveSummary(
  projectId: string
): Promise<ExecutiveSummaryResult> {
  const { data, error } = await supabase.rpc('get_executive_summary_data', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('Error fetching executive summary data:', error);
    throw new Error('Failed to fetch executive summary data');
  }

  if (!data) {
    throw new Error('No data returned for executive summary');
  }

  const summaryData: ExecutiveSummaryData = data;

  const shortSummary = generateShortSummary(summaryData);
  const fullSummary = generateFullLegalSummary(summaryData);

  const materialsList = summaryData.materials.map(
    (m) => `${m.manufacturer} ${m.product_name}`
  );

  return {
    short_summary_text: shortSummary,
    full_summary_text: fullSummary,
    overall_result: summaryData.overall_result,
    materials_list: materialsList,
    frr_list: summaryData.frr_ratings,
    data: summaryData,
  };
}

function generateShortSummary(data: ExecutiveSummaryData): string {
  const blockNames = data.blocks_levels.blocks?.map((b) => b.name).join(', ') || 'N/A';
  const levelNames = data.blocks_levels.levels?.map((l) => l.name).join(', ') || 'N/A';
  const location =
    data.blocks_levels.blocks?.length > 0 && data.blocks_levels.levels?.length > 0
      ? `${blockNames} – ${levelNames}`
      : blockNames !== 'N/A'
      ? blockNames
      : levelNames;

  const materialCount = data.materials?.length || 0;
  const frrList = data.frr_ratings?.map((frr) => `${frr} min`).join(', ') || 'N/A';

  const dateRange = formatDateRange(
    data.inspection_stats.min_date,
    data.inspection_stats.max_date
  );

  return `Inspection Summary

Client: ${data.client.name}
Project: ${data.project.project_name}
Location: ${location}
Materials: ${materialCount} system${materialCount !== 1 ? 's' : ''} inspected
FRR Ratings: ${frrList}
Inspection Period: ${dateRange}

Overall Compliance: ${data.overall_result}`;
}

function generateFullLegalSummary(data: ExecutiveSummaryData): string {
  const blockNames = data.blocks_levels.blocks?.map((b) => b.name) || [];
  const levelNames = data.blocks_levels.levels?.map((l) => l.name) || [];

  let locationPhrase = '';
  if (blockNames.length > 0 && levelNames.length > 0) {
    if (blockNames.length === 1 && levelNames.length === 1) {
      locationPhrase = `${blockNames[0]} – ${levelNames[0]}`;
    } else if (blockNames.length > 1 && levelNames.length === 1) {
      locationPhrase = `${blockNames.join(', ')} – ${levelNames[0]}`;
    } else if (blockNames.length === 1 && levelNames.length > 1) {
      locationPhrase = `${blockNames[0]} (${levelNames.join(', ')})`;
    } else {
      locationPhrase = `multiple blocks and levels (${blockNames.join(', ')})`;
    }
  } else if (blockNames.length > 0) {
    locationPhrase = blockNames.join(', ');
  } else if (levelNames.length > 0) {
    locationPhrase = levelNames.join(', ');
  }

  const materialsSection = generateMaterialsSection(data.materials);
  const frrSection = generateFRRSection(data.frr_ratings);
  const inspectionMethodsSection = generateInspectionMethodsSection(data.materials);
  const complianceResultSection = generateComplianceResultSection(data.overall_result);

  let fireScenarioSection = '';
  if (data.fire_scenarios && data.fire_scenarios.length > 0) {
    const scenarios = data.fire_scenarios.filter((s) => s && s.trim() !== '');
    if (scenarios.length > 0) {
      if (scenarios.length === 1) {
        fireScenarioSection = `\n\nFire Scenario: ${scenarios[0]}`;
      } else {
        fireScenarioSection = `\n\nFire Scenarios:\n${scenarios.map((s) => `- ${s}`).join('\n')}`;
      }
    }
  }

  return `Executive Summary

This independent third-party coating inspection was conducted for ${data.client.name} in relation to the ${data.project.project_name} located at ${data.project.site_address || 'the project site'}.

The scope of inspection covered structural steel elements located within ${locationPhrase} as defined under the approved project inspection packages.

Inspection activities included:
- Surface preparation verification (where applicable)
- Environmental condition measurement and dew point validation
- Material verification against approved project specifications
- Dry Film Thickness (DFT) measurement of intumescent coatings
- Thickness verification of cementitious fire protection systems
- Visual compliance assessment

${materialsSection}

${frrSection}${fireScenarioSection}

Compliance assessment was undertaken in accordance with:
- The applicable project specification
- Approved Product Data Sheets (PDS)
- Recognised NACE (AMPP) standards for protective coatings inspection
- Nominated contract inspection standards

${inspectionMethodsSection}

All inspections were conducted on a member-by-member basis.

OVERALL COMPLIANCE RESULT: ${data.overall_result.toUpperCase()}

${complianceResultSection}

This report constitutes independent third-party QA verification.`;
}

function generateMaterialsSection(materials: ExecutiveSummaryData['materials']): string {
  if (!materials || materials.length === 0) {
    return 'The coating systems inspected include materials as specified in the project documentation.';
  }

  const materialLines = materials.map((material) => {
    let line = `- ${material.manufacturer} ${material.product_name}`;
    if (material.material_type) {
      line += ` (${material.material_type})`;
    }
    if (material.certification_standard) {
      line += ` – ${material.certification_standard}`;
    }
    return line;
  });

  return `The coating systems inspected include:\n${materialLines.join('\n')}`;
}

function generateFRRSection(frrRatings: number[]): string {
  if (!frrRatings || frrRatings.length === 0) {
    return 'Fire Resistance Ratings (FRR) were verified as per project specifications.';
  }

  const frrLines = frrRatings.map((frr) => `- ${frr} minutes`);
  return `The following Fire Resistance Ratings (FRR) were verified:\n${frrLines.join('\n')}`;
}

function generateInspectionMethodsSection(
  materials: ExecutiveSummaryData['materials']
): string {
  const hasCementitious = materials?.some(
    (m) =>
      m.material_type?.toLowerCase().includes('cementitious') ||
      m.application_type?.toLowerCase().includes('spray')
  );

  const hasIntumescent = materials?.some(
    (m) =>
      m.material_type?.toLowerCase().includes('intumescent') ||
      m.material_type?.toLowerCase().includes('thin film')
  );

  const methods: string[] = [];

  if (hasIntumescent) {
    methods.push(
      'Dry Film Thickness measurement was conducted using calibrated electronic DFT gauges in accordance with manufacturer specifications.'
    );
  }

  if (hasCementitious) {
    methods.push(
      'Depth measurement verification was undertaken in accordance with manufacturer requirements for cementitious fire protection systems.'
    );
  }

  if (methods.length === 0) {
    return 'Thickness measurement verification was undertaken in accordance with approved project specifications and manufacturer requirements.';
  }

  return methods.join('\n\n');
}

function generateComplianceResultSection(overallResult: string): string {
  if (overallResult === 'Compliant') {
    return `All recorded values meet or exceed the specified thickness requirements and comply with the approved fire resistance loading schedules.

No corrective actions are required at this stage.`;
  } else {
    return `Certain elements were identified as non-compliant and are documented within this report under corrective action sections.

Rectification works are required to achieve full compliance with the specified fire resistance requirements.`;
  }
}

function formatDateRange(minDate: string | null, maxDate: string | null): string {
  if (!minDate && !maxDate) {
    return 'In Progress';
  }

  try {
    const start = minDate ? format(new Date(minDate), 'dd MMM yyyy') : 'N/A';
    const end = maxDate ? format(new Date(maxDate), 'dd MMM yyyy') : 'N/A';

    if (start === end) {
      return start;
    }

    return `${start} – ${end}`;
  } catch (error) {
    console.error('Error formatting dates:', error);
    return 'Date unavailable';
  }
}
