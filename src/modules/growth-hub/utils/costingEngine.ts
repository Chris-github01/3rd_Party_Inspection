export interface InspectorRate {
  type: string;
  label: string;
  hourlyRate: number;
}

export interface CostInputs {
  // Labour
  inspectorType: string;
  labourHours: number;
  reportWritingHours: number;
  // Travel
  travelKm: number;
  kmRate: number;
  parking: number;
  tolls: number;
  accommodation: number;
  // Subcontractors
  subcontractorCost: number;
  // Surcharges
  urgentSurchargePercent: number;
  afterHoursMultiplier: number;
  // Admin
  adminOverheadPercent: number;
}

export interface CostBreakdown {
  labourCost: number;
  reportWritingCost: number;
  travelCost: number;
  parkingTolls: number;
  accommodation: number;
  subcontractorCost: number;
  urgentSurcharge: number;
  afterHoursPremium: number;
  adminOverhead: number;
  totalInternalCost: number;
}

export const INSPECTOR_RATES: InspectorRate[] = [
  { type: 'junior',    label: 'Junior Inspector',       hourlyRate: 85  },
  { type: 'senior',    label: 'Senior Inspector',        hourlyRate: 120 },
  { type: 'principal', label: 'Principal Inspector',     hourlyRate: 160 },
  { type: 'engineer',  label: 'Fire Engineer',           hourlyRate: 195 },
  { type: 'specialist',label: 'Specialist / Director',   hourlyRate: 240 },
];

export const KM_RATE_DEFAULT = 0.98;

export const DEFAULT_COST_INPUTS: CostInputs = {
  inspectorType: 'senior',
  labourHours: 4,
  reportWritingHours: 2,
  travelKm: 0,
  kmRate: KM_RATE_DEFAULT,
  parking: 0,
  tolls: 0,
  accommodation: 0,
  subcontractorCost: 0,
  urgentSurchargePercent: 0,
  afterHoursMultiplier: 1,
  adminOverheadPercent: 15,
};

export function calcCostBreakdown(inputs: CostInputs): CostBreakdown {
  const rate = INSPECTOR_RATES.find(r => r.type === inputs.inspectorType)?.hourlyRate ?? 120;

  const labourCost = inputs.labourHours * rate;
  const reportWritingCost = inputs.reportWritingHours * rate;
  const travelCost = inputs.travelKm * (inputs.kmRate ?? KM_RATE_DEFAULT);
  const parkingTolls = (inputs.parking ?? 0) + (inputs.tolls ?? 0);
  const accommodation = inputs.accommodation ?? 0;
  const subcontractorCost = inputs.subcontractorCost ?? 0;

  const preAfterHours = labourCost + reportWritingCost;
  const afterHoursPremium = inputs.afterHoursMultiplier > 1
    ? preAfterHours * (inputs.afterHoursMultiplier - 1)
    : 0;

  const baseBeforeUrgent = preAfterHours + afterHoursPremium + travelCost + parkingTolls + accommodation + subcontractorCost;
  const urgentSurcharge = baseBeforeUrgent * ((inputs.urgentSurchargePercent ?? 0) / 100);

  const subtotalBeforeAdmin = baseBeforeUrgent + urgentSurcharge;
  const adminOverhead = subtotalBeforeAdmin * ((inputs.adminOverheadPercent ?? 15) / 100);

  const totalInternalCost = subtotalBeforeAdmin + adminOverhead;

  return {
    labourCost,
    reportWritingCost,
    travelCost,
    parkingTolls,
    accommodation,
    subcontractorCost,
    urgentSurcharge,
    afterHoursPremium,
    adminOverhead,
    totalInternalCost,
  };
}

export function calcMargin(revenue: number, internalCost: number): { grossMargin: number; grossMarginPct: number } {
  const grossMargin = revenue - internalCost;
  const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  return { grossMargin, grossMarginPct };
}

export function marginColor(pct: number): string {
  if (pct >= 40) return 'text-emerald-400';
  if (pct >= 25) return 'text-amber-400';
  if (pct >= 10) return 'text-orange-400';
  return 'text-red-400';
}

export function marginBgColor(pct: number): string {
  if (pct >= 40) return 'bg-emerald-900/30 border-emerald-800';
  if (pct >= 25) return 'bg-amber-900/30 border-amber-800';
  if (pct >= 10) return 'bg-orange-900/30 border-orange-800';
  return 'bg-red-900/30 border-red-800';
}

export interface QuoteTemplate {
  type: string;
  name: string;
  scopeOfWork: string;
  defaultCostInputs: Partial<CostInputs>;
  defaultLineItems: Array<{
    description: string;
    category: string;
    unit: string;
    quantity: number;
    unit_price: number;
    markup_percent: number;
  }>;
  terms: string;
}

const STANDARD_TERMS = `Payment is due within 30 days of invoice date. This quotation is valid for the period stated. Prices are exclusive of GST unless otherwise stated. Additional site visits beyond scope will be charged at our standard hourly rates. All work performed to NZS 4512, NZS 4218, and relevant NZBC provisions as applicable.`;

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    type: 'inspection',
    name: 'Fire Protection Inspection',
    scopeOfWork: 'Provide passive fire protection inspection services including review of applied coatings/systems, thickness readings, documentation review, and preparation of an inspection report in accordance with the project specification and relevant New Zealand standards.',
    defaultCostInputs: {
      inspectorType: 'senior',
      labourHours: 4,
      reportWritingHours: 2,
      adminOverheadPercent: 15,
    },
    defaultLineItems: [
      { description: 'Site inspection — passive fire protection assessment', category: 'Labour', unit: 'visit', quantity: 1, unit_price: 950, markup_percent: 0 },
      { description: 'Inspection report preparation and issue', category: 'Labour', unit: 'report', quantity: 1, unit_price: 450, markup_percent: 0 },
      { description: 'Travel & disbursements', category: 'Travel', unit: 'allow', quantity: 1, unit_price: 120, markup_percent: 0 },
    ],
    terms: STANDARD_TERMS,
  },
  {
    type: 'reinspection',
    name: 'Reinspection / Follow-up',
    scopeOfWork: 'Reinspection of previously identified defects and non-conformances to verify rectification works have been completed to an acceptable standard. Issue of updated inspection certificate or close-out report.',
    defaultCostInputs: {
      inspectorType: 'senior',
      labourHours: 2,
      reportWritingHours: 1,
      adminOverheadPercent: 15,
    },
    defaultLineItems: [
      { description: 'Reinspection — defect close-out verification', category: 'Labour', unit: 'visit', quantity: 1, unit_price: 550, markup_percent: 0 },
      { description: 'Close-out report / certificate of compliance', category: 'Labour', unit: 'report', quantity: 1, unit_price: 250, markup_percent: 0 },
      { description: 'Travel & disbursements', category: 'Travel', unit: 'allow', quantity: 1, unit_price: 80, markup_percent: 0 },
    ],
    terms: STANDARD_TERMS,
  },
  {
    type: 'intumescent_audit',
    name: 'Intumescent Coating Audit',
    scopeOfWork: 'Comprehensive intumescent coating audit including review of application records, DFT readings across a statistically representative sample of members, assessment against the approved coating system and fire rating schedule, and production of a full audit report with tabulated results and photographic evidence.',
    defaultCostInputs: {
      inspectorType: 'principal',
      labourHours: 8,
      reportWritingHours: 4,
      adminOverheadPercent: 15,
    },
    defaultLineItems: [
      { description: 'Intumescent audit — site inspection (full day)', category: 'Labour', unit: 'day', quantity: 1, unit_price: 2200, markup_percent: 0 },
      { description: 'DFT thickness testing — statistical sample', category: 'Labour', unit: 'members', quantity: 50, unit_price: 12, markup_percent: 0 },
      { description: 'Audit report — tabulated results, photos & certification', category: 'Labour', unit: 'report', quantity: 1, unit_price: 1200, markup_percent: 0 },
      { description: 'Travel & disbursements', category: 'Travel', unit: 'allow', quantity: 1, unit_price: 180, markup_percent: 0 },
    ],
    terms: STANDARD_TERMS,
  },
  {
    type: 'fire_stopping_survey',
    name: 'Fire Stopping Survey',
    scopeOfWork: 'Survey of fire stopping installations throughout the building including penetration seals, linear joint seals, and fire doors. Assessment of installation quality, penetrant types, and compliance with the fire strategy. Deficiency schedule and remediation recommendations included in the survey report.',
    defaultCostInputs: {
      inspectorType: 'senior',
      labourHours: 6,
      reportWritingHours: 3,
      adminOverheadPercent: 15,
    },
    defaultLineItems: [
      { description: 'Fire stopping survey — site inspection', category: 'Labour', unit: 'visit', quantity: 1, unit_price: 1400, markup_percent: 0 },
      { description: 'Survey report — deficiency schedule & recommendations', category: 'Labour', unit: 'report', quantity: 1, unit_price: 850, markup_percent: 0 },
      { description: 'Travel & disbursements', category: 'Travel', unit: 'allow', quantity: 1, unit_price: 150, markup_percent: 0 },
    ],
    terms: STANDARD_TERMS,
  },
  {
    type: 'witness_inspection',
    name: 'Witness Inspection',
    scopeOfWork: 'Third-party witness inspection of passive fire protection application works. Inspector to be present on site during application to witness and verify correct application rates, mixing, DFT, and workmanship in accordance with the manufacturer specification and fire rating schedule.',
    defaultCostInputs: {
      inspectorType: 'senior',
      labourHours: 8,
      reportWritingHours: 1.5,
      adminOverheadPercent: 15,
    },
    defaultLineItems: [
      { description: 'Witness inspection — full day on site', category: 'Labour', unit: 'day', quantity: 1, unit_price: 1800, markup_percent: 0 },
      { description: 'Site attendance report', category: 'Labour', unit: 'report', quantity: 1, unit_price: 350, markup_percent: 0 },
      { description: 'Travel & disbursements', category: 'Travel', unit: 'allow', quantity: 1, unit_price: 160, markup_percent: 0 },
    ],
    terms: STANDARD_TERMS,
  },
];
