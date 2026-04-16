import type { SystemType, ElementType, Environment, ObservedConcern, Severity } from '../types';

export type ProductFamilyHint =
  | 'waterborne_thinfilm'
  | 'solventborne_thinfilm'
  | 'hybrid_fasttrack'
  | 'epoxy_highdurability'
  | 'unknown';

export type FamilyConfidence = 'low' | 'medium' | 'high';

export type VisualCue =
  | 'exposed_substrate'
  | 'edge_cracking'
  | 'rust_staining'
  | 'blistering'
  | 'softening'
  | 'wash_marks'
  | 'powdering'
  | 'patch_texture_mismatch'
  | 'impact_gouge'
  | 'chunk_loss'
  | 'runs_sags'
  | 'heavy_build'
  | 'water_trap_pattern'
  | 'widespread_repeat'
  | 'no_topcoat_visible'
  | 'uv_fade'
  | 'repair_patch'
  | 'hollow_zone'
  | 'bolt_cluster_damage'
  | 'service_breach';

export type InstallationAge = 'New' | 'Recent' | 'Aged' | 'Unknown';
export type V3ComplianceConcernLevel = 'Low' | 'Moderate' | 'High';
export type V3LikelyIssueType = 'Maintenance' | 'Workmanship' | 'Systemic' | 'Verification';

export interface RuleContext {
  systemType: SystemType;
  elementType: ElementType;
  environment: Environment;
  age: InstallationAge;
  observedConcern: ObservedConcern;
  aiDefectType?: string;
  aiSeverity?: Severity;
  visualCues: VisualCue[];
}

export interface RuleMatchOutput {
  defectType?: string;
  severityModifier?: -1 | 0 | 1;
  complianceConcernLevel?: V3ComplianceConcernLevel;
  likelyIssueType?: V3LikelyIssueType;
  familyHint?: ProductFamilyHint;
  familyConfidence?: FamilyConfidence;
  likelyCauses?: string[];
  nextChecks?: string[];
  hiddenRisks?: string[];
  remediationGuidance?: string[];
  standardsNotes?: string[];
  manufacturerLogicNotes?: string[];
  escalation?: boolean;
  reviewTriggers?: string[];
  confidenceModifier?: number;
}

interface InspectionRuleV3 {
  id: string;
  name: string;
  enabled?: boolean;
  priority: number;
  applies: (ctx: RuleContext) => boolean;
  output: RuleMatchOutput;
}

export interface RulebookV3Result {
  matchedRuleIds: string[];
  matchedRuleNames: string[];
  defectType?: string;
  severityModifier: -1 | 0 | 1;
  complianceConcernLevel?: V3ComplianceConcernLevel;
  likelyIssueType?: V3LikelyIssueType;
  familyHint: ProductFamilyHint;
  familyConfidence: FamilyConfidence;
  likelyCauses: string[];
  nextChecks: string[];
  hiddenRisks: string[];
  remediationGuidance: string[];
  standardsNotes: string[];
  manufacturerLogicNotes: string[];
  reviewTriggers: string[];
  escalation: boolean;
  confidenceModifier: number;
}

const hasCue = (ctx: RuleContext, cue: VisualCue): boolean => ctx.visualCues.includes(cue);

const mergeUnique = (a: string[], b?: string[]): string[] => {
  if (!b?.length) return a;
  return [...new Set([...a, ...b])];
};

const rules: InspectionRuleV3[] = [

  // ─── WATERBORNE THIN-FILM FAMILY ─────────────────────────────────────────

  {
    id: 'V3-WB-01',
    name: 'Waterborne thin-film in wet/external exposure',
    priority: 100,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      (ctx.environment === 'External' || ctx.environment === 'Exposed / Harsh') &&
      (hasCue(ctx, 'no_topcoat_visible') || hasCue(ctx, 'wash_marks') || hasCue(ctx, 'softening')),
    output: {
      familyHint: 'waterborne_thinfilm',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Systemic',
      likelyCauses: [
        'Behaviour consistent with a moisture-sensitive thin-film intumescent in an unsuitable or insufficiently protected exposure.',
      ],
      nextChecks: [
        'Verify specified intumescent product family and approved topcoat system.',
        'Check surrounding members for similar exposure-related deterioration.',
      ],
      hiddenRisks: [
        'Durability mismatch may lead to progressive breakdown beyond the visibly affected area.',
      ],
      manufacturerLogicNotes: [
        'Waterborne thin-film families are generally positioned for internal or lower-corrosivity building environments. A topcoat is required where higher humidity or mechanical protection is needed.',
      ],
      reviewTriggers: ['verify_exposure_suitability', 'verify_topcoat_system'],
      escalation: true,
      confidenceModifier: 8,
    },
  },

  {
    id: 'V3-WB-02',
    name: 'Waterborne softening after moisture exposure',
    priority: 98,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'softening') &&
      (ctx.environment === 'External' ||
        ctx.environment === 'Exposed / Harsh' ||
        hasCue(ctx, 'wash_marks')),
    output: {
      defectType: 'Moisture Compromise',
      familyHint: 'waterborne_thinfilm',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Moisture ingress is likely compromising the coating matrix — behaviour consistent with a waterborne thin-film product in an unsuitable exposure.',
      ],
      nextChecks: [
        'Check adjacent coating for soft or friable zones.',
        'Confirm whether any topcoat breach or seal discontinuity is present.',
      ],
      hiddenRisks: [
        'Softened areas may have reduced durability and may conceal wider deterioration beyond the visible area.',
      ],
      remediationGuidance: [
        'Remove compromised material to sound edges and reinstate the system with appropriate topcoat protection where required.',
      ],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  {
    id: 'V3-WB-03',
    name: 'Waterborne edge cracking at sharp arrises',
    priority: 90,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'edge_cracking') &&
      (ctx.elementType === 'Beam' || ctx.elementType === 'Column' || ctx.elementType === 'Connection'),
    output: {
      familyHint: 'waterborne_thinfilm',
      familyConfidence: 'low',
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'Moderate',
      likelyCauses: [
        'Thin-film edge continuity may have been affected by sharp edge geometry or insufficient stripe coat application.',
      ],
      nextChecks: [
        'Inspect adjacent edges for a repeated cracking pattern.',
        'Review whether adequate edge preparation and stripe coat procedure was applied.',
      ],
      reviewTriggers: ['verify_edge_detailing'],
      confidenceModifier: 4,
    },
  },

  {
    id: 'V3-WB-04',
    name: 'Waterborne interior cosmetic weathering only',
    priority: 50,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      ctx.environment === 'Internal' &&
      hasCue(ctx, 'uv_fade') &&
      !hasCue(ctx, 'exposed_substrate') &&
      !hasCue(ctx, 'rust_staining'),
    output: {
      familyHint: 'waterborne_thinfilm',
      familyConfidence: 'low',
      likelyIssueType: 'Maintenance',
      complianceConcernLevel: 'Low',
      likelyCauses: [
        'Visible change is more consistent with surface ageing of a topcoat than with active film breach.',
      ],
      nextChecks: ['Confirm there is no local film breach or loss of continuity beneath the surface change.'],
      confidenceModifier: 2,
    },
  },

  // ─── SOLVENTBORNE THIN-FILM FAMILY ────────────────────────────────────────

  {
    id: 'V3-SB-01',
    name: 'Solventborne semi-exposed build sequence tolerance',
    priority: 80,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      ctx.environment === 'Exposed / Harsh' &&
      !hasCue(ctx, 'softening') &&
      !hasCue(ctx, 'wash_marks') &&
      (ctx.age === 'New' || ctx.age === 'Recent'),
    output: {
      familyHint: 'solventborne_thinfilm',
      familyConfidence: 'low',
      likelyIssueType: 'Verification',
      complianceConcernLevel: 'Moderate',
      manufacturerLogicNotes: [
        'Solventborne thin-film families are generally more tolerant of variable humidity and weather during construction than waterborne families — exposure alone in a new install may not indicate a defect.',
      ],
      nextChecks: [
        'Verify actual product family before treating exposure alone as a defect indicator.',
      ],
      reviewTriggers: ['verify_product_family'],
      confidenceModifier: 3,
    },
  },

  {
    id: 'V3-SB-02',
    name: 'Solventborne workmanship flow defects',
    priority: 88,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'runs_sags') &&
      (ctx.age === 'New' || ctx.age === 'Recent'),
    output: {
      familyHint: 'solventborne_thinfilm',
      familyConfidence: 'medium',
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'Moderate',
      likelyCauses: [
        'Visible flow defects are more consistent with application control issues than long-term deterioration.',
      ],
      nextChecks: [
        'Determine whether the defect is isolated to a local application pass or repeated across members.',
      ],
      standardsNotes: [
        'Visible workmanship irregularities on new work should be reviewed against site inspection test plan expectations.',
      ],
      confidenceModifier: 6,
    },
  },

  {
    id: 'V3-SB-03',
    name: 'Solventborne repair compatibility mismatch',
    priority: 86,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'patch_texture_mismatch') &&
      hasCue(ctx, 'repair_patch'),
    output: {
      familyHint: 'solventborne_thinfilm',
      familyConfidence: 'low',
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'Moderate',
      likelyCauses: [
        'Repair material or DFT build may be incompatible with the surrounding thin-film system.',
      ],
      nextChecks: [
        'Verify repair method, approved patch system, and local DFT build compatibility.',
      ],
      reviewTriggers: ['verify_repair_compatibility'],
      confidenceModifier: 5,
    },
  },

  // ─── HYBRID FAST-TRACK FAMILY ─────────────────────────────────────────────

  {
    id: 'V3-HY-01',
    name: 'Hybrid fast-track early weather tolerance',
    priority: 72,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      ctx.environment === 'Exposed / Harsh' &&
      ctx.age === 'New' &&
      !hasCue(ctx, 'softening') &&
      !hasCue(ctx, 'blistering'),
    output: {
      familyHint: 'hybrid_fasttrack',
      familyConfidence: 'low',
      likelyIssueType: 'Verification',
      complianceConcernLevel: 'Low',
      manufacturerLogicNotes: [
        'Fast-track hybrid families may tolerate early weather exposure better than standard waterborne systems — early construction exposure alone may not be a defect for this family.',
      ],
      nextChecks: [
        'Verify actual product family before classifying early exposure as damage.',
      ],
      reviewTriggers: ['verify_product_family'],
      confidenceModifier: 2,
    },
  },

  {
    id: 'V3-HY-02',
    name: 'Hybrid fast-track high-build cracking',
    priority: 94,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'heavy_build') &&
      hasCue(ctx, 'edge_cracking'),
    output: {
      familyHint: 'hybrid_fasttrack',
      familyConfidence: 'medium',
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'High',
      likelyCauses: [
        'High-build fast-track application may have introduced local cure or shrinkage stress — consistent with single-coat over-application.',
      ],
      nextChecks: [
        'Inspect whether cracking follows heavy local build zones or repaired areas.',
        'Check adjacent sections for similar single-coat stress defects.',
      ],
      hiddenRisks: [
        'Cracked high-build areas may permit progressive local moisture ingress if left untreated.',
      ],
      reviewTriggers: ['verify_build_history', 'verify_recoat_timing'],
      escalation: true,
      confidenceModifier: 9,
    },
  },

  {
    id: 'V3-HY-03',
    name: 'Hybrid fast-track light post-blast rust tolerance check',
    priority: 70,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'rust_staining') &&
      ctx.age === 'New',
    output: {
      familyHint: 'hybrid_fasttrack',
      familyConfidence: 'low',
      likelyIssueType: 'Verification',
      complianceConcernLevel: 'Moderate',
      nextChecks: [
        'Verify whether the declared hybrid system has any stated tolerance window for light post-blast rust before classifying the observation.',
      ],
      reviewTriggers: ['verify_surface_prep_window'],
      confidenceModifier: 1,
    },
  },

  // ─── EPOXY / HIGH-DURABILITY FAMILY ───────────────────────────────────────

  {
    id: 'V3-EP-01',
    name: 'Epoxy local impact without substrate exposure',
    priority: 92,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'impact_gouge') &&
      !hasCue(ctx, 'exposed_substrate'),
    output: {
      familyHint: 'epoxy_highdurability',
      familyConfidence: 'medium',
      likelyIssueType: 'Maintenance',
      complianceConcernLevel: 'Moderate',
      likelyCauses: [
        'Observed damage is consistent with a localised impact to a higher-durability system — substrate remains protected.',
      ],
      nextChecks: [
        'Confirm substrate remains fully protected beneath the damaged surface area.',
      ],
      confidenceModifier: 7,
    },
  },

  {
    id: 'V3-EP-02',
    name: 'Epoxy no-topcoat not automatically defective',
    priority: 78,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'no_topcoat_visible') &&
      ctx.environment === 'Exposed / Harsh',
    output: {
      familyHint: 'epoxy_highdurability',
      familyConfidence: 'low',
      likelyIssueType: 'Verification',
      complianceConcernLevel: 'Moderate',
      manufacturerLogicNotes: [
        'Some epoxy and high-durability intumescent families are designed for service without a topcoat in specified corrosivity categories — absence of topcoat is not automatically a non-conformance.',
      ],
      nextChecks: [
        'Verify whether the specified system required a topcoat before classifying its absence as non-conformance.',
      ],
      reviewTriggers: ['verify_topcoat_requirement'],
      confidenceModifier: 2,
    },
  },

  {
    id: 'V3-EP-03',
    name: 'Epoxy edge fracture / chunking',
    priority: 90,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      hasCue(ctx, 'chunk_loss') &&
      (ctx.elementType === 'Beam' || ctx.elementType === 'Column' || ctx.elementType === 'Connection'),
    output: {
      familyHint: 'epoxy_highdurability',
      familyConfidence: 'medium',
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'High',
      likelyCauses: [
        'Failure pattern consistent with impact or handling fracture of a harder high-durability intumescent film.',
      ],
      nextChecks: [
        'Check lifting points, access routes, and recent handling operations for the element.',
      ],
      hiddenRisks: [
        'Even localised chunk loss may expose substrate or reduce coating continuity at high-risk connection details.',
      ],
      escalation: true,
      confidenceModifier: 8,
    },
  },

  {
    id: 'V3-EP-04',
    name: 'Epoxy / high-hazard environment branch',
    priority: 96,
    applies: (ctx) =>
      ctx.systemType === 'Intumescent' &&
      (hasCue(ctx, 'chunk_loss') || hasCue(ctx, 'exposed_substrate') || hasCue(ctx, 'service_breach')),
    output: {
      familyHint: 'epoxy_highdurability',
      familyConfidence: 'low',
      likelyIssueType: 'Systemic',
      complianceConcernLevel: 'High',
      manufacturerLogicNotes: [
        'Observed service context may align more closely with a high-durability epoxy or high-hazard passive fire family than standard architectural thin-film logic.',
      ],
      nextChecks: [
        'Verify actual product family, service environment, and required protection basis before applying standard thin-film reasoning.',
      ],
      reviewTriggers: ['branch_high_hazard_family_review'],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  // ─── GENERAL RULES ────────────────────────────────────────────────────────

  {
    id: 'V3-GEN-01',
    name: 'Repeated same defect across members',
    priority: 84,
    applies: (ctx) => hasCue(ctx, 'widespread_repeat'),
    output: {
      likelyIssueType: 'Systemic',
      complianceConcernLevel: 'High',
      hiddenRisks: [
        'Repeated pattern suggests an installation, detailing, exposure, or maintenance process issue rather than isolated localised damage.',
      ],
      nextChecks: [
        'Inspect adjacent members and similar connection details for recurrence of the defect.',
      ],
      escalation: true,
      confidenceModifier: 6,
    },
  },

  {
    id: 'V3-GEN-02',
    name: 'Exposed substrate always escalates',
    priority: 110,
    applies: (ctx) => hasCue(ctx, 'exposed_substrate'),
    output: {
      complianceConcernLevel: 'High',
      hiddenRisks: [
        'Exposed substrate indicates loss of coating continuity and elevated corrosion and fire performance risk.',
      ],
      escalation: true,
      confidenceModifier: 8,
    },
  },

  {
    id: 'V3-GEN-03',
    name: 'Bolt cluster damage priority',
    priority: 89,
    applies: (ctx) => hasCue(ctx, 'bolt_cluster_damage'),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      nextChecks: [
        'Inspect adjacent fastener group and full extent of surrounding coating continuity.',
      ],
      escalation: true,
      confidenceModifier: 5,
    },
  },

  {
    id: 'V3-GEN-04',
    name: 'Service breach post-install',
    priority: 87,
    applies: (ctx) => hasCue(ctx, 'service_breach'),
    output: {
      likelyIssueType: 'Workmanship',
      complianceConcernLevel: 'Moderate',
      likelyCauses: [
        'Services installation or modification after coating application appears to have caused a breach.',
      ],
      nextChecks: [
        'Document the breach and identify the responsible trade for reinstatement.',
        'Verify full extent of affected coating around the service entry point.',
      ],
      reviewTriggers: ['verify_services_permit_to_penetrate'],
      confidenceModifier: 4,
    },
  },

  {
    id: 'V3-GEN-05',
    name: 'Hollow zone delamination risk',
    priority: 85,
    applies: (ctx) => hasCue(ctx, 'hollow_zone'),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Hollow or drumming sound zones indicate inter-coat or substrate delamination beneath the surface.',
      ],
      nextChecks: [
        'Tap test the surrounding area to define the full extent of the hollow zone.',
        'Check whether the hollow zone includes any exposed substrate or edge continuity breach.',
      ],
      hiddenRisks: [
        'Hollow zones may be significantly larger than the visible surface indication.',
      ],
      escalation: true,
      confidenceModifier: 7,
    },
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const COMPLIANCE_RANK: Record<V3ComplianceConcernLevel, number> = { Low: 1, Moderate: 2, High: 3 };
const ISSUE_RANK: Record<V3LikelyIssueType, number> = {
  Maintenance: 1,
  Verification: 2,
  Workmanship: 3,
  Systemic: 4,
};
const FAMILY_CONFIDENCE_RANK: Record<FamilyConfidence, number> = { low: 1, medium: 2, high: 3 };

function maxCompliance(a: V3ComplianceConcernLevel | undefined, b: V3ComplianceConcernLevel): V3ComplianceConcernLevel {
  if (!a) return b;
  return COMPLIANCE_RANK[b] > COMPLIANCE_RANK[a] ? b : a;
}

function maxIssueType(a: V3LikelyIssueType | undefined, b: V3LikelyIssueType): V3LikelyIssueType {
  if (!a) return b;
  return ISSUE_RANK[b] > ISSUE_RANK[a] ? b : a;
}

function maxFamilyConfidence(a: FamilyConfidence, b: FamilyConfidence): FamilyConfidence {
  return FAMILY_CONFIDENCE_RANK[b] > FAMILY_CONFIDENCE_RANK[a] ? b : a;
}

// ─── INFERENCE: DERIVE VISUAL CUES FROM AI TEXT ──────────────────────────────

export function deriveVisualCuesFromAI(
  observedConcern: ObservedConcern,
  aiDefectType?: string,
  aiObservation?: string
): VisualCue[] {
  const text = [(aiDefectType ?? ''), (aiObservation ?? '')].join(' ').toLowerCase();
  const cues: VisualCue[] = [];

  if (text.includes('exposed') || text.includes('bare') || text.includes('substrate')) cues.push('exposed_substrate');
  if (text.includes('edge') || text.includes('arris') || text.includes('corner')) cues.push('edge_cracking');
  if (text.includes('rust') || text.includes('corrosion') || text.includes('stain')) cues.push('rust_staining');
  if (text.includes('blister') || text.includes('bubble')) cues.push('blistering');
  if (text.includes('soft') || text.includes('friable') || text.includes('tacky')) cues.push('softening');
  if (text.includes('wash') || text.includes('rain') || text.includes('run off') || text.includes('moisture')) cues.push('wash_marks');
  if (text.includes('powder') || text.includes('chalk') || text.includes('dust')) cues.push('powdering');
  if (text.includes('patch') && (text.includes('texture') || text.includes('mismatch') || text.includes('colour') || text.includes('color'))) cues.push('patch_texture_mismatch');
  if (text.includes('gouge') || text.includes('impact')) cues.push('impact_gouge');
  if (text.includes('chunk') || text.includes('spall') || text.includes('fracture')) cues.push('chunk_loss');
  if (text.includes('run') || text.includes('sag') || text.includes('drip')) cues.push('runs_sags');
  if (text.includes('heavy') || text.includes('high build') || text.includes('thick')) cues.push('heavy_build');
  if (text.includes('water trap') || text.includes('ponding') || text.includes('ledge')) cues.push('water_trap_pattern');
  if (text.includes('widespread') || text.includes('repeat') || text.includes('pattern') || text.includes('multiple')) cues.push('widespread_repeat');
  if (text.includes('no topcoat') || text.includes('topcoat missing') || text.includes('topcoat absent')) cues.push('no_topcoat_visible');
  if (text.includes('fade') || text.includes('uv') || text.includes('dull')) cues.push('uv_fade');
  if (text.includes('patch') || text.includes('repair')) cues.push('repair_patch');
  if (text.includes('hollow') || text.includes('drum') || text.includes('delaminate')) cues.push('hollow_zone');
  if (text.includes('bolt') || text.includes('fastener') || text.includes('washer')) cues.push('bolt_cluster_damage');
  if (text.includes('cable') || text.includes('pipe') || text.includes('penetrat') || text.includes('breach')) cues.push('service_breach');

  if (observedConcern === 'Cracking') { if (!cues.includes('edge_cracking')) cues.push('edge_cracking'); }
  if (observedConcern === 'Rust / Corrosion') { if (!cues.includes('rust_staining')) cues.push('rust_staining'); }
  if (observedConcern === 'Blistering / Bubbling') { if (!cues.includes('blistering')) cues.push('blistering'); }
  if (observedConcern === 'Delamination') { if (!cues.includes('hollow_zone')) cues.push('hollow_zone'); }
  if (observedConcern === 'Missing Material') { if (!cues.includes('exposed_substrate')) cues.push('exposed_substrate'); }

  return [...new Set(cues)];
}

// ─── RUNNER ───────────────────────────────────────────────────────────────────

export function runInspectionRulebookV3(ctx: RuleContext): RulebookV3Result {
  const active = rules
    .filter((r) => r.enabled !== false && (() => { try { return r.applies(ctx); } catch { return false; } })())
    .sort((a, b) => b.priority - a.priority);

  let defectType: string | undefined;
  let severityModifier: -1 | 0 | 1 = 0;
  let complianceConcernLevel: V3ComplianceConcernLevel | undefined;
  let likelyIssueType: V3LikelyIssueType | undefined;
  let familyHint: ProductFamilyHint = 'unknown';
  let familyConfidence: FamilyConfidence = 'low';
  let escalation = false;
  let confidenceModifier = 0;
  let likelyCauses: string[] = [];
  let nextChecks: string[] = [];
  let hiddenRisks: string[] = [];
  let remediationGuidance: string[] = [];
  let standardsNotes: string[] = [];
  let manufacturerLogicNotes: string[] = [];
  let reviewTriggers: string[] = [];

  for (const rule of active) {
    const o = rule.output;
    if (!defectType && o.defectType) defectType = o.defectType;
    if (o.severityModifier) severityModifier = o.severityModifier;
    if (o.complianceConcernLevel) complianceConcernLevel = maxCompliance(complianceConcernLevel, o.complianceConcernLevel);
    if (o.likelyIssueType) likelyIssueType = maxIssueType(likelyIssueType, o.likelyIssueType);
    if (o.familyHint && familyHint === 'unknown') familyHint = o.familyHint;
    if (o.familyConfidence) familyConfidence = maxFamilyConfidence(familyConfidence, o.familyConfidence);
    if (o.escalation) escalation = true;
    confidenceModifier += o.confidenceModifier ?? 0;
    likelyCauses = mergeUnique(likelyCauses, o.likelyCauses);
    nextChecks = mergeUnique(nextChecks, o.nextChecks);
    hiddenRisks = mergeUnique(hiddenRisks, o.hiddenRisks);
    remediationGuidance = mergeUnique(remediationGuidance, o.remediationGuidance);
    standardsNotes = mergeUnique(standardsNotes, o.standardsNotes);
    manufacturerLogicNotes = mergeUnique(manufacturerLogicNotes, o.manufacturerLogicNotes);
    reviewTriggers = mergeUnique(reviewTriggers, o.reviewTriggers);
  }

  return {
    matchedRuleIds: active.map((r) => r.id),
    matchedRuleNames: active.map((r) => r.name),
    defectType,
    severityModifier,
    complianceConcernLevel,
    likelyIssueType,
    familyHint,
    familyConfidence,
    likelyCauses,
    nextChecks,
    hiddenRisks,
    remediationGuidance,
    standardsNotes,
    manufacturerLogicNotes,
    reviewTriggers,
    escalation,
    confidenceModifier,
  };
}

export const FAMILY_LABEL: Record<ProductFamilyHint, string> = {
  waterborne_thinfilm: 'Waterborne Thin-Film',
  solventborne_thinfilm: 'Solventborne Thin-Film',
  hybrid_fasttrack: 'Hybrid Fast-Track',
  epoxy_highdurability: 'Epoxy / High-Durability',
  unknown: 'Unknown',
};
