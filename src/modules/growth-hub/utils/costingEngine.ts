export interface InspectorRate {
  type: string;
  label: string;
  hourlyRate: number;
  loadedCostRate: number;
}

export interface TravelZone {
  id: string;
  label: string;
  description: string;
  baseSurcharge: number;
  travelTimeBilled: boolean;
}

export interface AccessDifficulty {
  id: string;
  label: string;
  multiplier: number;
}

export interface ServiceTier {
  id: string;
  label: string;
  description: string;
  premiumPct: number;
}

export interface CostInputs {
  // Labour
  inspectorType: string;
  labourHours: number;
  reportWritingHours: number;
  // Travel
  travelZone: string;
  travelKm: number;
  kmRate: number;
  parking: number;
  tolls: number;
  accommodation: number;
  // Fees
  calloutFee: number;
  // Access & complexity
  accessDifficulty: string;
  // Service tier
  serviceTier: string;
  // Subcontractors
  subcontractorCost: number;
  // Surcharges
  urgentSurchargePercent: number;
  afterHoursMultiplier: number;
  // Admin
  adminOverheadPercent: number;
}

export interface CostBreakdown {
  calloutFee: number;
  labourCost: number;
  reportWritingCost: number;
  accessComplexityPremium: number;
  afterHoursPremium: number;
  travelZoneSurcharge: number;
  travelCost: number;
  parkingTolls: number;
  accommodation: number;
  subcontractorCost: number;
  serviceTierPremium: number;
  urgentSurcharge: number;
  adminOverhead: number;
  totalInternalCost: number;
  minimumEnforced: boolean;
  minimumAmount: number;
}

export const INSPECTOR_RATES: InspectorRate[] = [
  { type: 'junior',     label: 'Junior Inspector',      hourlyRate: 110, loadedCostRate: 55 },
  { type: 'senior',     label: 'Senior Inspector',       hourlyRate: 145, loadedCostRate: 72 },
  { type: 'principal',  label: 'Principal Inspector',    hourlyRate: 175, loadedCostRate: 90 },
  { type: 'engineer',   label: 'Fire Engineer',          hourlyRate: 210, loadedCostRate: 110 },
  { type: 'specialist', label: 'Specialist / Director',  hourlyRate: 260, loadedCostRate: 135 },
];

export const TRAVEL_ZONES: TravelZone[] = [
  { id: 'local',    label: 'Zone A — Local Metro (0–25 km)',      description: 'Auckland / Wellington / Christchurch metro core', baseSurcharge: 0,   travelTimeBilled: false },
  { id: 'extended', label: 'Zone B — Extended Metro (25–60 km)',  description: 'Outer suburbs and satellite towns',               baseSurcharge: 120, travelTimeBilled: false },
  { id: 'regional', label: 'Zone C — Regional Day Trip (60–150 km)', description: 'Travel time billed + mileage',                baseSurcharge: 0,   travelTimeBilled: true  },
  { id: 'national', label: 'Zone D — National (flights / overnight)', description: 'Flights, hire car, accommodation charged at cost', baseSurcharge: 0, travelTimeBilled: true },
];

export const ACCESS_DIFFICULTIES: AccessDifficulty[] = [
  { id: 'easy',      label: 'Easy — ground level / open access',      multiplier: 1.00 },
  { id: 'scissor',   label: 'EWP / Scissor lift required',             multiplier: 1.15 },
  { id: 'confined',  label: 'Confined space / ceiling void',            multiplier: 1.25 },
  { id: 'critical',  label: 'Live critical environment (hospital etc)', multiplier: 1.35 },
  { id: 'shutdown',  label: 'Night shutdown / after-hours access',      multiplier: 1.50 },
];

export const SERVICE_TIERS: ServiceTier[] = [
  { id: 'standard',   label: 'Standard',   description: '3–5 business days',   premiumPct: 0   },
  { id: 'priority',   label: 'Priority',   description: '24–48 hours',          premiumPct: 20  },
  { id: 'emergency',  label: 'Emergency',  description: 'Same day / next day',  premiumPct: 50  },
];

export const CALLOUT_MINIMUMS: Record<string, number> = {
  local:    420,
  extended: 550,
  regional: 750,
  national: 1200,
};

export const KM_RATE_DEFAULT = 1.20;

export const DEFAULT_COST_INPUTS: CostInputs = {
  inspectorType: 'senior',
  labourHours: 4,
  reportWritingHours: 2,
  travelZone: 'local',
  travelKm: 0,
  kmRate: KM_RATE_DEFAULT,
  parking: 0,
  tolls: 0,
  accommodation: 0,
  calloutFee: 0,
  accessDifficulty: 'easy',
  serviceTier: 'standard',
  subcontractorCost: 0,
  urgentSurchargePercent: 0,
  afterHoursMultiplier: 1,
  adminOverheadPercent: 15,
};

export function calcCostBreakdown(inputs: CostInputs): CostBreakdown {
  const rateObj = INSPECTOR_RATES.find(r => r.type === inputs.inspectorType) ?? INSPECTOR_RATES[1];
  const loadedRate = rateObj.loadedCostRate;

  const zone = TRAVEL_ZONES.find(z => z.id === inputs.travelZone) ?? TRAVEL_ZONES[0];
  const access = ACCESS_DIFFICULTIES.find(a => a.id === inputs.accessDifficulty) ?? ACCESS_DIFFICULTIES[0];
  const tier = SERVICE_TIERS.find(t => t.id === inputs.serviceTier) ?? SERVICE_TIERS[0];

  const calloutFee = inputs.calloutFee ?? 0;
  const baseLaborCost = inputs.labourHours * loadedRate;
  const reportWritingCost = inputs.reportWritingHours * loadedRate;

  const preAfterHours = baseLaborCost + reportWritingCost;
  const afterHoursPremium = inputs.afterHoursMultiplier > 1
    ? preAfterHours * (inputs.afterHoursMultiplier - 1)
    : 0;

  const labourWithAccess = (preAfterHours + afterHoursPremium) * access.multiplier;
  const accessComplexityPremium = labourWithAccess - (preAfterHours + afterHoursPremium);

  const travelZoneSurcharge = zone.baseSurcharge;
  const travelCost = inputs.travelKm * (inputs.kmRate ?? KM_RATE_DEFAULT);
  const parkingTolls = (inputs.parking ?? 0) + (inputs.tolls ?? 0);
  const accommodation = inputs.accommodation ?? 0;
  const subcontractorCost = inputs.subcontractorCost ?? 0;

  const preTierBase = calloutFee + labourWithAccess + travelZoneSurcharge + travelCost + parkingTolls + accommodation + subcontractorCost;
  const serviceTierPremium = preTierBase * (tier.premiumPct / 100);

  const preUrgent = preTierBase + serviceTierPremium;
  const urgentSurcharge = preUrgent * ((inputs.urgentSurchargePercent ?? 0) / 100);

  const subtotalBeforeAdmin = preUrgent + urgentSurcharge;
  const adminOverhead = subtotalBeforeAdmin * ((inputs.adminOverheadPercent ?? 15) / 100);

  const totalInternalCost = subtotalBeforeAdmin + adminOverhead;

  const minimum = CALLOUT_MINIMUMS[inputs.travelZone] ?? 420;
  const minimumEnforced = totalInternalCost < minimum;

  return {
    calloutFee,
    labourCost: baseLaborCost,
    reportWritingCost,
    accessComplexityPremium,
    afterHoursPremium,
    travelZoneSurcharge,
    travelCost,
    parkingTolls,
    accommodation,
    subcontractorCost,
    serviceTierPremium,
    urgentSurcharge,
    adminOverhead,
    totalInternalCost: minimumEnforced ? minimum : totalInternalCost,
    minimumEnforced,
    minimumAmount: minimum,
  };
}

export function calcMargin(revenue: number, internalCost: number): { grossMargin: number; grossMarginPct: number } {
  const grossMargin = revenue - internalCost;
  const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  return { grossMargin, grossMarginPct };
}

export function getTargetMargin(serviceType?: string | null): number {
  if (!serviceType) return 45;
  const targets: Record<string, number> = {
    inspection: 45,
    reinspection: 45,
    intumescent_audit: 52,
    fire_stopping_survey: 50,
    witness_inspection: 50,
  };
  return targets[serviceType] ?? 45;
}

export function marginColor(pct: number, target = 45): string {
  if (pct >= target) return 'text-emerald-400';
  if (pct >= target * 0.7) return 'text-amber-400';
  if (pct >= target * 0.4) return 'text-orange-400';
  return 'text-red-400';
}

export function marginBgColor(pct: number, target = 45): string {
  if (pct >= target) return 'bg-emerald-900/30 border-emerald-800';
  if (pct >= target * 0.7) return 'bg-amber-900/30 border-amber-800';
  if (pct >= target * 0.4) return 'bg-orange-900/30 border-orange-800';
  return 'bg-red-900/30 border-red-800';
}

export function marginLabel(pct: number, target = 45): string {
  if (pct >= target) return 'Strong margin';
  if (pct >= target * 0.7) return 'Acceptable — below target';
  if (pct >= target * 0.4) return 'Low margin — review pricing';
  return 'Warning: very low margin';
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
      travelZone: 'local',
      accessDifficulty: 'easy',
      serviceTier: 'standard',
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
      travelZone: 'local',
      accessDifficulty: 'easy',
      serviceTier: 'standard',
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
      travelZone: 'local',
      accessDifficulty: 'scissor',
      serviceTier: 'standard',
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
      travelZone: 'local',
      accessDifficulty: 'easy',
      serviceTier: 'standard',
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
      travelZone: 'local',
      accessDifficulty: 'easy',
      serviceTier: 'standard',
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
