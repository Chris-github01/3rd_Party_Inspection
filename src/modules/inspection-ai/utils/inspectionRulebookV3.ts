import type { SystemType, ElementType, Environment, ObservedConcern, Severity } from '../types';

export type ProductFamilyHint =
  | 'waterborne_thinfilm'
  | 'solventborne_thinfilm'
  | 'hybrid_fasttrack'
  | 'epoxy_highdurability'
  | 'cementitious_lightweight'
  | 'cementitious_dense'
  | 'protective_zinc_epoxy'
  | 'protective_alkyd'
  | 'firestopping_intumescent_sealant'
  | 'firestopping_collar_wrap'
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
  | 'service_breach'
  | 'spalling'
  | 'efflorescence'
  | 'surface_erosion'
  | 'adhesion_loss'
  | 'open_gap'
  | 'non_rated_foam'
  | 'incomplete_seal'
  | 'corrosion_edge_creep'
  | 'full_depth_crack'
  | 'osmotic_blister';

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

  // ─── INTUMESCENT — WATERBORNE THIN-FILM ──────────────────────────────────

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
        'Waterborne thin-film families (e.g. Nullifire S607, Jotun Steelmaster WB, International Interchar 1120) are positioned for internal or lower-corrosivity environments. A topcoat is required where higher humidity or mechanical protection is needed.',
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
      defectType: 'Moisture Damage',
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
        'Softened areas may have reduced fire expansion performance and may conceal wider deterioration.',
      ],
      remediationGuidance: [
        'Remove compromised material to sound edges and reinstate the system with appropriate topcoat protection.',
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
      (ctx.elementType === 'Beam' || ctx.elementType === 'Column'),
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

  // ─── INTUMESCENT — SOLVENTBORNE THIN-FILM ────────────────────────────────

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
        'Solventborne thin-film families (e.g. Nullifire S802, Jotun Steelmaster SB) are generally more tolerant of variable humidity and weather during construction than waterborne families.',
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
        'Visible workmanship irregularities on new work should be reviewed against site inspection test plan expectations (AS 3894).',
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

  // ─── INTUMESCENT — HYBRID FAST-TRACK ─────────────────────────────────────

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
        'Fast-track hybrid families (e.g. Sherwin-Williams Firetex FX) may tolerate early weather exposure better than standard waterborne systems.',
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
        'High-build fast-track application may have introduced local cure or shrinkage stress.',
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
        'Verify whether the declared hybrid system has any stated tolerance window for light post-blast rust.',
      ],
      reviewTriggers: ['verify_surface_prep_window'],
      confidenceModifier: 1,
    },
  },

  // ─── INTUMESCENT — EPOXY / HIGH-DURABILITY ───────────────────────────────

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
        'Some epoxy intumescent families (e.g. Carboline Interam, Nullifire S908) are designed for service without a topcoat in specified corrosivity categories.',
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
      (ctx.elementType === 'Beam' || ctx.elementType === 'Column'),
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
        'Verify actual product family, service environment, and required protection basis.',
      ],
      reviewTriggers: ['branch_high_hazard_family_review'],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  // ─── CEMENTITIOUS — SPALLING ──────────────────────────────────────────────

  {
    id: 'V3-CEM-01',
    name: 'Cementitious spalling with substrate exposure',
    priority: 115,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      (hasCue(ctx, 'spalling') || hasCue(ctx, 'chunk_loss')) &&
      hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Spalling',
      familyHint: 'cementitious_lightweight',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Full-depth material loss exposing structural steel — FRL continuity is breached.',
        'Likely causes: mechanical impact, freeze-thaw cycling, adhesion failure, water saturation.',
      ],
      nextChecks: [
        'Tap test surrounding material to identify additional hollow or loose zones.',
        'Check entire column/beam face for further adhesion loss.',
        'Verify depth of remaining material at spall perimeter.',
      ],
      hiddenRisks: [
        'Visible spall area is often smaller than the underlying adhesion loss zone — adjacent material may be at risk.',
      ],
      remediationGuidance: [
        'Remove all loose and hollow material to sound edges. Reinstate with compatible cementitious fire protection mix to specified DFT. Surface must be clean and lightly roughened before repair.',
      ],
      standardsNotes: [
        'NZBC Clause C / NCC: FRL of element requires full continuous coverage — spalling to substrate = system failure in a fire event.',
      ],
      manufacturerLogicNotes: [
        'Common NZ cementitious products: Cafco 300/400, Isolatek Blaze-Shield, GCP Monokote legacy systems. Repair must use compatible product.',
      ],
      escalation: true,
      confidenceModifier: 12,
    },
  },

  {
    id: 'V3-CEM-02',
    name: 'Cementitious spalling without visible substrate',
    priority: 100,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      (hasCue(ctx, 'spalling') || hasCue(ctx, 'chunk_loss')) &&
      !hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Spalling',
      familyHint: 'cementitious_lightweight',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Material loss from cementitious layer — substrate may not yet be exposed but FRL margin is reduced.',
      ],
      nextChecks: [
        'Probe spall cavity depth to determine whether substrate is exposed.',
        'Tap test surrounding area for hollow zones indicating wider adhesion loss.',
      ],
      escalation: true,
      confidenceModifier: 9,
    },
  },

  {
    id: 'V3-CEM-03',
    name: 'Cementitious adhesion loss / delamination',
    priority: 98,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      (hasCue(ctx, 'adhesion_loss') || hasCue(ctx, 'hollow_zone')),
    output: {
      defectType: 'Delamination',
      familyHint: 'cementitious_lightweight',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Adhesion loss between cementitious material and steel substrate.',
        'Common causes: poor surface preparation, moisture infiltration, contaminated substrate, freeze-thaw cycling.',
      ],
      nextChecks: [
        'Perform systematic tap test across full element face to map extent of hollow zones.',
        'Check for water infiltration pathways above or adjacent to affected zone.',
      ],
      hiddenRisks: [
        'Hollow zone extent is typically 3-5x larger than visible surface indication.',
      ],
      remediationGuidance: [
        'Remove all delaminated and hollow material. Wire brush substrate to Sa 2.5 equivalent. Reinstate with compatible cementitious mix.',
      ],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  {
    id: 'V3-CEM-04',
    name: 'Cementitious full-depth cracking',
    priority: 95,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      hasCue(ctx, 'full_depth_crack'),
    output: {
      defectType: 'Cracking',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Full-depth crack penetrating to substrate — FRL continuity is breached at crack plane.',
      ],
      nextChecks: [
        'Confirm crack depth by probing or visual inspection at crack face.',
        'Check for associated adhesion loss along crack edges.',
      ],
      escalation: true,
      confidenceModifier: 9,
    },
  },

  {
    id: 'V3-CEM-05',
    name: 'Cementitious surface crazing only',
    priority: 60,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      hasCue(ctx, 'edge_cracking') &&
      !hasCue(ctx, 'full_depth_crack') &&
      !hasCue(ctx, 'exposed_substrate') &&
      !hasCue(ctx, 'adhesion_loss'),
    output: {
      defectType: 'Surface Deterioration',
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Surface crazing is very common in cementitious fireproofing and is typically caused by shrinkage during curing or differential thermal movement.',
        'Surface crazing alone does not breach FRL continuity if material remains adhered.',
      ],
      nextChecks: [
        'Confirm crack does not penetrate full depth to substrate.',
        'Tap test surrounding area to verify adhesion is maintained.',
      ],
      confidenceModifier: 3,
    },
  },

  {
    id: 'V3-CEM-06',
    name: 'Cementitious moisture damage / efflorescence',
    priority: 85,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      (hasCue(ctx, 'efflorescence') || hasCue(ctx, 'wash_marks') || hasCue(ctx, 'softening')),
    output: {
      defectType: 'Moisture Damage',
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Moisture infiltrating the cementitious matrix — efflorescence indicates active moisture movement through material.',
      ],
      nextChecks: [
        'Identify and address moisture source (roof penetration, pipe leak, wet construction).',
        'Test surface hardness — softened or friable zones indicate integrity loss.',
        'Check for associated adhesion loss in wet-stained areas.',
      ],
      hiddenRisks: [
        'Prolonged moisture cycling weakens the cement matrix and accelerates adhesion loss.',
      ],
      escalation: false,
      confidenceModifier: 6,
    },
  },

  {
    id: 'V3-CEM-07',
    name: 'Cementitious surface erosion / powdering',
    priority: 65,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      (hasCue(ctx, 'surface_erosion') || hasCue(ctx, 'powdering')) &&
      !hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Surface Deterioration',
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Surface hardener loss or ongoing moisture weathering causing granular surface erosion.',
      ],
      nextChecks: [
        'Measure remaining material thickness if possible.',
        'Monitor for progression — if DFT margin is thin, reinstate surface protection.',
      ],
      confidenceModifier: 4,
    },
  },

  {
    id: 'V3-CEM-08',
    name: 'Cementitious missing material at penetrations or bases',
    priority: 110,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      hasCue(ctx, 'exposed_substrate') &&
      (ctx.elementType === 'Penetration' || ctx.observedConcern === 'Missing Material'),
    output: {
      defectType: 'Missing Coating',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Cementitious material was never applied or was removed and not reinstated around penetration or at base detail.',
      ],
      nextChecks: [
        'Confirm extent of missing material around full penetration perimeter or element base.',
        'Check whether gap is original installation defect or post-installation damage.',
      ],
      remediationGuidance: [
        'Apply cementitious material to full specified DFT around penetration and seal edges to prevent moisture infiltration.',
      ],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  {
    id: 'V3-CEM-09',
    name: 'Cementitious impact damage on dense systems',
    priority: 92,
    applies: (ctx) =>
      ctx.systemType === 'Cementitious' &&
      hasCue(ctx, 'impact_gouge') &&
      !hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Mechanical Damage',
      familyHint: 'cementitious_dense',
      familyConfidence: 'low',
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Construction traffic or equipment impact has damaged the cementitious surface.',
      ],
      nextChecks: [
        'Probe impact zone to confirm substrate is not exposed at the base of the gouge.',
        'Check remaining material thickness at impact centre.',
      ],
      confidenceModifier: 6,
    },
  },

  // ─── PROTECTIVE COATING ───────────────────────────────────────────────────

  {
    id: 'V3-PC-01',
    name: 'Protective coating corrosion breakthrough with edge creep',
    priority: 108,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      hasCue(ctx, 'corrosion_edge_creep') &&
      hasCue(ctx, 'rust_staining'),
    output: {
      defectType: 'Corrosion Breakthrough',
      familyHint: 'protective_zinc_epoxy',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Corrosion has broken through coating film and is spreading via undercutting from coating edges or damage points.',
      ],
      nextChecks: [
        'Measure rust grade using ISO 4628-3 (Ri scale).',
        'Check coating adhesion around corrosion perimeter — probe for cathodic disbondment.',
        'Inspect all edges, weld toes, and cut sections across element.',
      ],
      standardsNotes: [
        'ISO 4628-3: rust grade Ri 3+ (>1% rusted area) = maintenance threshold for most industrial coating systems.',
        'ISO 12944: C3+ environment with edge creep = maintenance action required.',
      ],
      remediationGuidance: [
        'Abrasive blast or power-tool clean corroded area to Sa 2 or St 3. Feather coating edges. Reinstate full primer/intermediate/topcoat system.',
      ],
      escalation: true,
      confidenceModifier: 11,
    },
  },

  {
    id: 'V3-PC-02',
    name: 'Protective coating osmotic blistering over rust',
    priority: 105,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      hasCue(ctx, 'osmotic_blister') &&
      hasCue(ctx, 'rust_staining'),
    output: {
      defectType: 'Blistering',
      familyHint: 'protective_zinc_epoxy',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Osmotic corrosion cells forming under coating film — rust driving cathodic disbondment and blister formation.',
      ],
      nextChecks: [
        'Open a sample blister to check for rust product or liquid inside.',
        'Assess rust grade across the full element using ISO 4628-3.',
      ],
      hiddenRisks: [
        'Blistered areas over rust may have significantly greater corrosion extent under the film than surface appearance suggests.',
      ],
      escalation: true,
      confidenceModifier: 10,
    },
  },

  {
    id: 'V3-PC-03',
    name: 'Protective coating delamination intercoat failure',
    priority: 95,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      (hasCue(ctx, 'hollow_zone') || hasCue(ctx, 'adhesion_loss')) &&
      !hasCue(ctx, 'rust_staining'),
    output: {
      defectType: 'Delamination',
      familyHint: 'protective_zinc_epoxy',
      familyConfidence: 'low',
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Intercoat adhesion failure — likely caused by contamination between coats, overcoat interval exceeded, or incompatible intercoat combination.',
      ],
      nextChecks: [
        'Cross-cut adhesion test (ISO 2409) at representative areas.',
        'Verify recoat interval was not exceeded for specified system.',
      ],
      remediationGuidance: [
        'Remove delaminated coating to sound substrate. Clean thoroughly. Reinstate compatible primer/coat system.',
      ],
      confidenceModifier: 7,
    },
  },

  {
    id: 'V3-PC-04',
    name: 'Protective coating UV chalking and gloss loss',
    priority: 55,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      (hasCue(ctx, 'uv_fade') || hasCue(ctx, 'powdering')) &&
      !hasCue(ctx, 'rust_staining') &&
      !hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Surface Deterioration',
      familyHint: 'protective_alkyd',
      familyConfidence: 'low',
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'UV degradation of topcoat resin — chalking is normal end-of-service for many alkyd and acrylic topcoats.',
      ],
      nextChecks: [
        'Assess chalk degree using ISO 4628-6.',
        'Check underlying coat for integrity — if chalk is severe, moisture may reach midcoat.',
      ],
      standardsNotes: [
        'ISO 4628-6: chalk degree 4+ typically triggers topcoat maintenance in most maintenance specifications.',
      ],
      confidenceModifier: 3,
    },
  },

  {
    id: 'V3-PC-05',
    name: 'Protective coating new work application defects',
    priority: 88,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      (hasCue(ctx, 'runs_sags') || hasCue(ctx, 'patch_texture_mismatch')) &&
      (ctx.age === 'New' || ctx.age === 'Recent'),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Application control defects on new work — runs, sags, or texture inconsistency indicating incorrect application technique or product viscosity.',
      ],
      nextChecks: [
        'Check DFT at defective areas — sags may have local over-application while adjacent areas may be under-applied.',
        'Verify application conditions (temperature, humidity, wind) were within specification.',
      ],
      standardsNotes: [
        'AS 3894: visible application defects on new work require repair before final DFT survey acceptance.',
      ],
      confidenceModifier: 5,
    },
  },

  {
    id: 'V3-PC-06',
    name: 'Protective coating missing at weld or edge',
    priority: 102,
    applies: (ctx) =>
      ctx.systemType === 'Protective Coating' &&
      hasCue(ctx, 'exposed_substrate'),
    output: {
      defectType: 'Missing Coating',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Bare metal at weld, edge, penetration, or damage point — corrosion will initiate rapidly at exposed areas in C3+ environments.',
      ],
      nextChecks: [
        'Measure extent of bare metal area.',
        'Check adjacent welds and cut edges for similar coating absence.',
        'Identify whether bare area is original workmanship defect or post-installation damage.',
      ],
      remediationGuidance: [
        'Abrasive blast or power-tool clean bare area. Apply stripe coat to edges and welds before full system reinstatement.',
      ],
      escalation: true,
      confidenceModifier: 9,
    },
  },

  // ─── FIRESTOPPING ─────────────────────────────────────────────────────────

  {
    id: 'V3-FS-01',
    name: 'Firestopping open penetration gap',
    priority: 120,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'open_gap'),
    output: {
      defectType: 'Incomplete Firestopping',
      familyHint: 'firestopping_intumescent_sealant',
      familyConfidence: 'medium',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Open gap in fire-rated penetration — firestopping seal is absent, incomplete, or has failed.',
        'Common at cable, pipe, or duct penetrations through fire-rated walls and floors.',
      ],
      nextChecks: [
        'Measure annular gap dimensions.',
        'Confirm whether a tested firestopping system was ever installed at this location.',
        'Check all penetrations in the same fire compartment boundary for similar gaps.',
      ],
      hiddenRisks: [
        'Open penetration gap allows fire and smoke to travel between compartments, directly undermining building FRL.',
      ],
      remediationGuidance: [
        'Install tested firestopping system appropriate for the penetration type (service, substrate, gap dimensions). Use Codemark or third-party assessed system per NZBC Clause C / AS 4072.1.',
      ],
      standardsNotes: [
        'NZBC Clause C / NCC C2: all penetrations through fire-rated construction must be sealed with a tested firestopping system. AS 4072.1 specifies performance requirements.',
      ],
      manufacturerLogicNotes: [
        'Suitable products: Hilti CP 601/606, Sika Pyroplug/Pyroflex, 3M Fire Barrier, Promat Promaseal, FSi Fireflex. Selection depends on substrate, annular gap, and service type.',
      ],
      escalation: true,
      confidenceModifier: 15,
    },
  },

  {
    id: 'V3-FS-02',
    name: 'Firestopping non-rated expanding foam',
    priority: 118,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'non_rated_foam'),
    output: {
      defectType: 'Incomplete Firestopping',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Non-rated polyurethane expanding foam used in place of a tested firestopping system — non-compliant installation.',
      ],
      nextChecks: [
        'Confirm foam is not a tested intumescent foam product (check labelling/colour).',
        'Identify all penetrations sealed with non-rated foam across the affected area.',
      ],
      remediationGuidance: [
        'Remove all non-rated foam. Reinstate with compliant tested firestopping system. Document installation with system certification.',
      ],
      standardsNotes: [
        'Generic expanding foam has no fire resistance — it burns. Only products with AS 4072.1 assessed performance may be used as firestopping.',
      ],
      escalation: true,
      confidenceModifier: 12,
    },
  },

  {
    id: 'V3-FS-03',
    name: 'Firestopping incomplete seal / partial installation',
    priority: 112,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'incomplete_seal'),
    output: {
      defectType: 'Incomplete Firestopping',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'Firestopping product partially applied — sealant bead incomplete, collar not fully tightened, or batt packing missing.',
      ],
      nextChecks: [
        'Verify full perimeter of penetration is sealed without gaps.',
        'Check whether installation was terminated before completion (common at cable bundles and duct penetrations).',
      ],
      escalation: true,
      confidenceModifier: 11,
    },
  },

  {
    id: 'V3-FS-04',
    name: 'Firestopping sealant shrinkage / adhesion loss',
    priority: 90,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'adhesion_loss') &&
      !hasCue(ctx, 'open_gap'),
    output: {
      defectType: 'Delamination',
      familyHint: 'firestopping_intumescent_sealant',
      familyConfidence: 'medium',
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Sealant pulling away from substrate at penetration perimeter — adhesion failure due to service movement, substrate contamination, or age.',
      ],
      nextChecks: [
        'Check whether a gap has opened at the substrate interface.',
        'Inspect whether service movement is ongoing — flexible re-entrant sealant may be required.',
      ],
      escalation: false,
      confidenceModifier: 7,
    },
  },

  {
    id: 'V3-FS-05',
    name: 'Firestopping post-install breach by new service',
    priority: 115,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'service_breach'),
    output: {
      defectType: 'Incomplete Firestopping',
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      likelyCauses: [
        'New service installed through a previously sealed penetration without reinstatement of firestopping.',
      ],
      nextChecks: [
        'Identify the responsible trade and confirm whether a permit-to-penetrate was issued.',
        'Check all penetrations in the same area for similar post-install breaches.',
      ],
      remediationGuidance: [
        'Reinstate tested firestopping system around new service. Document with system certification reference.',
      ],
      escalation: true,
      confidenceModifier: 13,
    },
  },

  {
    id: 'V3-FS-06',
    name: 'Firestopping physical damage to installed seal',
    priority: 95,
    applies: (ctx) =>
      ctx.systemType === 'Firestopping' &&
      hasCue(ctx, 'impact_gouge') &&
      !hasCue(ctx, 'open_gap'),
    output: {
      defectType: 'Mechanical Damage',
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      likelyCauses: [
        'Physical damage to installed firestop seal — puncture, cut, or pull-out from service movement or construction activity.',
      ],
      nextChecks: [
        'Confirm seal integrity is maintained — check whether damage penetrates full depth of sealant bead.',
        'If seal is breached, treat as open gap and escalate.',
      ],
      escalation: false,
      confidenceModifier: 6,
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
    applies: (ctx) => hasCue(ctx, 'service_breach') && ctx.systemType !== 'Firestopping',
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
    applies: (ctx) => hasCue(ctx, 'hollow_zone') && ctx.systemType !== 'Cementitious',
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

// ─── VISUAL CUE DERIVATION ────────────────────────────────────────────────────
// systemType is now used to inject context-specific cues that the AI text may
// not explicitly name, preventing cross-system reasoning contamination.

export function deriveVisualCuesFromAI(
  systemType: SystemType,
  observedConcern: ObservedConcern,
  aiDefectType?: string,
  aiObservation?: string
): VisualCue[] {
  const text = [(aiDefectType ?? ''), (aiObservation ?? '')].join(' ').toLowerCase();
  const cues: VisualCue[] = [];

  // Universal text-derived cues
  if (text.includes('exposed') || text.includes('bare') || text.includes('substrate')) cues.push('exposed_substrate');
  if (text.includes('edge') || text.includes('arris') || text.includes('corner')) cues.push('edge_cracking');
  if (text.includes('rust') || text.includes('corrosion') || text.includes('stain')) cues.push('rust_staining');
  if (text.includes('blister') || text.includes('bubble')) cues.push('blistering');
  if (text.includes('soft') || text.includes('friable') || text.includes('tacky')) cues.push('softening');
  if (text.includes('wash') || text.includes('rain') || text.includes('run off') || text.includes('moisture')) cues.push('wash_marks');
  if (text.includes('chalk') || text.includes('dust')) cues.push('powdering');
  if (text.includes('patch') && (text.includes('texture') || text.includes('mismatch') || text.includes('colour') || text.includes('color'))) cues.push('patch_texture_mismatch');
  if (text.includes('gouge') || text.includes('impact')) cues.push('impact_gouge');
  if (text.includes('chunk') || text.includes('fracture')) cues.push('chunk_loss');
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

  // System-type-specific cues injected from context
  if (systemType === 'Cementitious') {
    if (text.includes('spall') || text.includes('chunk') || text.includes('fragment') || text.includes('break off')) cues.push('spalling');
    if (text.includes('efflores') || text.includes('salt') || text.includes('white deposit')) cues.push('efflorescence');
    if (text.includes('eros') || text.includes('powder') || text.includes('granular') || text.includes('dusty')) cues.push('surface_erosion');
    if (text.includes('adhesion') || text.includes('detach') || text.includes('lifting') || text.includes('peel')) cues.push('adhesion_loss');
    if (text.includes('full depth') || text.includes('through crack') || text.includes('penetrat')) cues.push('full_depth_crack');
  }

  if (systemType === 'Protective Coating') {
    if (text.includes('edge creep') || text.includes('undercutting') || text.includes('spread') || text.includes('advance')) cues.push('corrosion_edge_creep');
    if (text.includes('osmot') || text.includes('liquid') || text.includes('wet blister')) cues.push('osmotic_blister');
    if (text.includes('adhesion') || text.includes('detach') || text.includes('intercoat')) cues.push('adhesion_loss');
    if (text.includes('eros') || text.includes('powder') || text.includes('chalk')) cues.push('surface_erosion');
  }

  if (systemType === 'Firestopping') {
    if (text.includes('gap') || text.includes('open') || text.includes('unsealed') || text.includes('void')) cues.push('open_gap');
    if (text.includes('foam') || text.includes('polyurethane') || text.includes('pu foam') || text.includes('expanding foam')) cues.push('non_rated_foam');
    if (text.includes('partial') || text.includes('incomplete') || text.includes('missing seal') || text.includes('not sealed')) cues.push('incomplete_seal');
    if (text.includes('adhesion') || text.includes('pull') || text.includes('shrink') || text.includes('separated')) cues.push('adhesion_loss');
    if (text.includes('new service') || text.includes('additional') || text.includes('subsequent')) cues.push('service_breach');
  }

  // Observed concern overrides
  if (observedConcern === 'Cracking') { if (!cues.includes('edge_cracking')) cues.push('edge_cracking'); }
  if (observedConcern === 'Rust / Corrosion') { if (!cues.includes('rust_staining')) cues.push('rust_staining'); }
  if (observedConcern === 'Blistering / Bubbling') { if (!cues.includes('blistering')) cues.push('blistering'); }
  if (observedConcern === 'Delamination') { if (!cues.includes('hollow_zone')) cues.push('hollow_zone'); }
  if (observedConcern === 'Missing Material') { if (!cues.includes('exposed_substrate')) cues.push('exposed_substrate'); }
  if (observedConcern === 'Spalling') { if (!cues.includes('spalling')) cues.push('spalling'); }
  if (observedConcern === 'Incomplete Seal') { if (!cues.includes('incomplete_seal')) cues.push('incomplete_seal'); }
  if (observedConcern === 'Moisture / Water Damage') { if (!cues.includes('wash_marks')) cues.push('wash_marks'); }

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
  cementitious_lightweight: 'Cementitious Lightweight',
  cementitious_dense: 'Cementitious Dense Mix',
  protective_zinc_epoxy: 'Zinc-Rich / Epoxy System',
  protective_alkyd: 'Alkyd / Acrylic System',
  firestopping_intumescent_sealant: 'Intumescent Sealant / Collar',
  firestopping_collar_wrap: 'Firestopping Collar / Wrap',
  unknown: 'Unknown',
};
