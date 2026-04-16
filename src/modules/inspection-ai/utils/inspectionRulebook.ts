import type { SystemType, ElementType, Environment, ObservedConcern, Severity } from '../types';

export interface RuleInput {
  systemType: SystemType;
  element: ElementType;
  environment: Environment;
  observedConcern: ObservedConcern;
  isNewInstall: boolean;
  aiDefectType?: string;
  aiObservation?: string;
}

export interface RuleOutput {
  ruleId: string;
  ruleName: string;
  defect: string;
  likelyCause: string;
  hiddenRisks: string[];
  nextChecks: string[];
  severityModifier: 'upgrade' | 'downgrade' | 'none';
  escalate: boolean;
  remediationGuidance: string;
  confidence: number;
}

export interface RulebookResult {
  triggeredRules: RuleOutput[];
  recommendedDefect: string | null;
  recommendedSeverity: Severity | null;
  escalate: boolean;
  likelyCause: string | null;
  nextChecks: string[];
  hiddenRisks: string[];
  remediationGuidance: string | null;
  rulebookConfidence: number;
}

type RuleDefinition = {
  id: string;
  name: string;
  match: (input: RuleInput) => boolean;
  output: Omit<RuleOutput, 'ruleId' | 'ruleName'>;
};

const RULES: RuleDefinition[] = [
  // ─── A. INTUMESCENT COATINGS ───────────────────────────────────────────────

  {
    id: 'INT-01',
    name: 'Connection Zone Stress Cracking',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Cracking' &&
      (i.element === 'Beam' || i.element === 'Column') &&
      (i.aiObservation?.toLowerCase().includes('connection') ||
        i.aiObservation?.toLowerCase().includes('weld') ||
        i.aiObservation?.toLowerCase().includes('joint') ||
        i.aiDefectType?.toLowerCase().includes('crack')),
    output: {
      defect: 'Stress Cracking at Connection',
      likelyCause: 'Thermal and structural movement cycling at the connection zone is causing the intumescent film to crack at stress concentration points.',
      hiddenRisks: [
        'Cracks may propagate and expose steel substrate',
        'Water ingress into cracks accelerates corrosion beneath coating',
        'Fire performance may be compromised at critical connection node',
      ],
      nextChecks: [
        'Probe crack depth with fine pick to assess substrate exposure',
        'Inspect all similar beam-to-column connections on the same level',
        'Check detailing of edge paint / fillet at connection plate',
        'Review as-built DFT records at connection zones',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Feather-sand cracks, apply compatible primer, reinstate intumescent to specified DFT. Notify coating engineer if pattern is systemic.',
      confidence: 82,
    },
  },

  {
    id: 'INT-02',
    name: 'Exposed Steel at Impact Scar',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.observedConcern === 'Damage' || i.observedConcern === 'Missing Material') &&
      (i.aiObservation?.toLowerCase().includes('exposed') ||
        i.aiObservation?.toLowerCase().includes('steel') ||
        i.aiObservation?.toLowerCase().includes('bare') ||
        i.aiDefectType?.toLowerCase().includes('damage')),
    output: {
      defect: 'Mechanical Damage — Substrate Exposed',
      likelyCause: 'Physical impact from plant, services installation, or formwork removal has breached the coating system to bare steel.',
      hiddenRisks: [
        'Bare steel will begin flash rusting within 24–48 hours in humid conditions',
        'Corrosion beneath adjacent coating may go undetected without probing',
      ],
      nextChecks: [
        'Measure diameter and depth of impact zone',
        'Tap surrounding coating to check for hidden delamination halo',
        'Document location relative to nearest structural connection',
        'Confirm primer layer is intact beneath impact scar',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Clean to bare metal, apply primer same day, reinstate intumescent and seal/topcoat. Repair must match original spec DFT and system.',
      confidence: 88,
    },
  },

  {
    id: 'INT-03',
    name: 'Edge Detailing Failure',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('edge') ||
        i.aiObservation?.toLowerCase().includes('plate') ||
        i.aiObservation?.toLowerCase().includes('bracket') ||
        i.aiObservation?.toLowerCase().includes('flange')),
    output: {
      defect: 'Edge Detailing Crack',
      likelyCause: 'Coating applied too thinly at sharp edges or corners — a common application error where the wet film bridges rather than wrapping the geometry.',
      hiddenRisks: [
        'Edges are the first failure point in fire — compromised geometry worst case',
        'Crack lines provide moisture ingress path to primer coat',
      ],
      nextChecks: [
        'Check DFT at edge using edge-corrected measurement',
        'Inspect all plate brackets and gussets in the same area',
        'Review if stripe coat was applied pre-main coat during application',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Apply stripe coat to all edges before full reinstatement. Ensure adequate WFT at edges during application.',
      confidence: 75,
    },
  },

  {
    id: 'INT-04',
    name: 'Blistering from Moisture Ingress — Intumescent',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Blistering / Bubbling' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh'),
    output: {
      defect: 'Moisture-Induced Blistering',
      likelyCause: 'Water vapour is migrating beneath the intumescent film on the external or exposed face, forming blisters as the coating fails to breathe.',
      hiddenRisks: [
        'Blisters typically indicate active corrosion beneath — can be rapid in coastal environments',
        'If blisters contain rust-coloured liquid, substrate corrosion is confirmed',
      ],
      nextChecks: [
        'Open one blister carefully to inspect contents (clear = osmotic; rust = corrosion)',
        'Tap full area for hollow sound indicating delamination halo',
        'Check if system is approved for external exposure in this environment',
        'Review drainage points and water traps above location',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Full removal in affected zone, surface prep to Sa 2.5 minimum, apply approved external-grade intumescent system with compatible topcoat.',
      confidence: 84,
    },
  },

  {
    id: 'INT-05',
    name: 'UV / Weathering Degradation',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('chalk') ||
        i.aiObservation?.toLowerCase().includes('fade') ||
        i.aiObservation?.toLowerCase().includes('powder') ||
        i.aiObservation?.toLowerCase().includes('dull')),
    output: {
      defect: 'UV / Weathering Degradation',
      likelyCause: 'Prolonged UV and weathering exposure is chalking and degrading the topcoat, reducing the protective envelope over the intumescent layer.',
      hiddenRisks: [
        'Topcoat failure leaves intumescent film vulnerable to moisture ingress',
        'Progressive chalking indicates the coating system life may be exceeded',
      ],
      nextChecks: [
        'Check if topcoat is an approved UV-stable system for external use',
        'Test adhesion of remaining topcoat with cross-cut or pull-off test',
        'Review original coating specification vs environment classification',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Overcoat with compatible UV-stable topcoat after surface preparation. If system has exceeded design life, full removal and reinstatement may be required.',
      confidence: 70,
    },
  },

  {
    id: 'INT-06',
    name: 'Intercoat Adhesion Failure',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Delamination' &&
      (i.aiObservation?.toLowerCase().includes('flak') ||
        i.aiObservation?.toLowerCase().includes('peel') ||
        i.aiObservation?.toLowerCase().includes('layer') ||
        i.aiObservation?.toLowerCase().includes('delamina')),
    output: {
      defect: 'Intercoat Adhesion Loss',
      likelyCause: 'Insufficient surface preparation between coats, or topcoat applied before intumescent was fully cured, preventing adequate intercoat bond.',
      hiddenRisks: [
        'Delamination progresses — small area today becomes widespread quickly',
        'Loss of topcoat exposes intumescent to direct weather without protection',
      ],
      nextChecks: [
        'Perform cross-cut adhesion test on adjacent intact areas',
        'Identify which interface has failed (primer/intumescent or intumescent/topcoat)',
        'Check application records for overcoating windows and ambient conditions',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Remove all delaminated material, abrade surface, re-apply system from failed interface. Ensure overcoating intervals are respected.',
      confidence: 80,
    },
  },

  {
    id: 'INT-07',
    name: 'Corrosion Breakthrough — Intumescent',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.observedConcern === 'Rust / Corrosion' ||
        i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('corrosion') ||
        i.aiObservation?.toLowerCase().includes('oxide')),
    output: {
      defect: 'Corrosion Breakthrough',
      likelyCause: 'Active corrosion beneath the coating has broken through the film. This typically indicates primer failure or a moisture ingress path that has been present for an extended period.',
      hiddenRisks: [
        'Substrate section loss may be occurring beneath the visible rust area',
        'Adjacent coating is likely disbonded beyond the visible rust stain radius',
        'Fire performance at this location is compromised',
      ],
      nextChecks: [
        'Tap the area with a hammer to find the disbondment radius',
        'Measure any section loss with a pit gauge if substrate is accessible',
        'Inspect above for water accumulation points feeding corrosion',
        'Check same element on opposite face for hidden corrosion pattern',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all coating to bare metal, blast to Sa 2.5, assess section loss with engineer, reinstate full system. Flag for structural review if significant loss.',
      confidence: 91,
    },
  },

  {
    id: 'INT-08',
    name: 'Water Ingress — Soft Wet Section',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.aiObservation?.toLowerCase().includes('soft') ||
        i.aiObservation?.toLowerCase().includes('wet') ||
        i.aiObservation?.toLowerCase().includes('damp') ||
        i.aiObservation?.toLowerCase().includes('satur')),
    output: {
      defect: 'Water-Saturated Coating',
      likelyCause: 'Water has infiltrated the coating system, softening the intumescent matrix. This can occur through damaged topcoat, exposed edges, or direct wetting.',
      hiddenRisks: [
        'Wet intumescent has significantly reduced fire performance',
        'Ongoing moisture cycling will cause rapid coating breakdown',
        'Soft areas indicate the coating integrity is already compromised',
      ],
      nextChecks: [
        'Probe coating firmness across the affected area',
        'Trace water source — check above for ponding, leaks, or condensation',
        'Review if topcoat is breached allowing direct water entry',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Allow full drying, remove affected section, address water source, reinstate with full system specification.',
      confidence: 78,
    },
  },

  {
    id: 'INT-09',
    name: 'Bolt Cluster Exposure',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.observedConcern === 'Missing Material' || i.observedConcern === 'Damage') &&
      (i.aiObservation?.toLowerCase().includes('bolt') ||
        i.aiObservation?.toLowerCase().includes('fastener') ||
        i.aiObservation?.toLowerCase().includes('fixing')),
    output: {
      defect: 'Exposed Steel at Bolt Cluster',
      likelyCause: 'Coating was not applied to bolt heads and surrounding areas during installation, or was removed during a service intervention and not reinstated.',
      hiddenRisks: [
        'Bolt clusters are high-stress nodes — fire exposure here is critical',
        'Crevice corrosion between bolt/washer/plate interface is likely',
      ],
      nextChecks: [
        'Inspect all bolts in the connection for coating coverage',
        'Check bolt head, nut, washer, and adjacent plate separately',
        'Review if bolts were installed post-coating (common reinstatement miss)',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Wire brush, prime, and apply intumescent to each bolt head and nut individually. Use a brush-grade product for complex geometry.',
      confidence: 85,
    },
  },

  {
    id: 'INT-10',
    name: 'Hollow Delamination Zone',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Delamination' &&
      (i.aiObservation?.toLowerCase().includes('hollow') ||
        i.aiObservation?.toLowerCase().includes('detach') ||
        i.aiObservation?.toLowerCase().includes('delamina')),
    output: {
      defect: 'Delamination — Hollow Section',
      likelyCause: 'Loss of adhesion between the intumescent and primer or substrate, creating an air gap beneath the film that can be confirmed by tapping.',
      hiddenRisks: [
        'The delaminated zone is likely larger than visible — tap to map full extent',
        'Delaminated coating will fail immediately under fire conditions',
      ],
      nextChecks: [
        'Tap systematically across the area — record hollow radius',
        'Probe at edges of delamination to check for corrosion beneath',
        'Identify root cause before repair (moisture, contamination, or adhesion failure)',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all hollow/delaminated material. Identify and resolve root cause. Blast or abrade and reinstate full coating system.',
      confidence: 86,
    },
  },

  {
    id: 'INT-11',
    name: 'Patch Repair — Inconsistent Thickness Ridge',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('patch') ||
        i.aiObservation?.toLowerCase().includes('repair') ||
        i.aiObservation?.toLowerCase().includes('ridge') ||
        i.aiObservation?.toLowerCase().includes('overlap')),
    output: {
      defect: 'Previous Repair Area — Verification Required',
      likelyCause: 'A prior repair has been applied over the existing system without full feathering or removal, creating a non-uniform DFT profile.',
      hiddenRisks: [
        'DFT at repair edges may exceed limits causing cracking under thermal movement',
        'Compatibility between original and repair product must be confirmed',
        'Repair may not be matched to original specification',
      ],
      nextChecks: [
        'Measure DFT at repair centre and edges — compare to spec limits',
        'Check product compatibility (brand, type, formulation)',
        'Review repair records or ITPs for this area',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Feather all edges of existing repair. If DFT out of tolerance, remove and reinstate to specification.',
      confidence: 68,
    },
  },

  {
    id: 'INT-12',
    name: 'Missing Topcoat — External Member',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      (i.observedConcern === 'Missing Material' ||
        i.aiObservation?.toLowerCase().includes('topcoat') ||
        i.aiObservation?.toLowerCase().includes('top coat') ||
        i.aiObservation?.toLowerCase().includes('seal')),
    output: {
      defect: 'Missing Topcoat — Intumescent Exposed',
      likelyCause: 'The protective topcoat was omitted, has weathered away, or was mechanically removed, leaving the intumescent film directly exposed to the environment.',
      hiddenRisks: [
        'Unprotected intumescent absorbs moisture and degrades rapidly outdoors',
        'Fire performance may already be compromised by moisture uptake',
      ],
      nextChecks: [
        'Check intumescent hardness — probe with fingernail to assess moisture uptake',
        'Confirm topcoat specification for this environment type',
        'Review application records for topcoat',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Apply compatible UV-stable topcoat to the full member after surface cleaning and any required intumescent repairs.',
      confidence: 77,
    },
  },

  {
    id: 'INT-13',
    name: 'Systemic Cracking Pattern — Multiple Members',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('multiple') ||
        i.aiObservation?.toLowerCase().includes('repeat') ||
        i.aiObservation?.toLowerCase().includes('pattern') ||
        i.aiObservation?.toLowerCase().includes('widespread')),
    output: {
      defect: 'Systemic Cracking — Multiple Members',
      likelyCause: 'A specification mismatch (wrong DFT, wrong product, or wrong substrate condition) or a building-wide movement issue is causing consistent cracking across the floor plate.',
      hiddenRisks: [
        'Systemic issues require root cause analysis — individual repairs will not resolve',
        'May indicate an incompatible primer/intumescent combination',
        'Structural movement assessment may be required',
      ],
      nextChecks: [
        'Map the pattern — identify if cracking follows beam spans, connections, or orientation',
        'Review coating specification and confirm product compatibility',
        'Consult coating manufacturer for root cause assessment',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Raise with project engineer and coating manufacturer before any remediation. A systemic spec or movement issue requires coordinated remediation strategy.',
      confidence: 73,
    },
  },

  {
    id: 'INT-14',
    name: 'Mechanical Damage from Services Install',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Damage' &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('gouge') ||
        i.aiObservation?.toLowerCase().includes('scratch') ||
        i.aiObservation?.toLowerCase().includes('service') ||
        i.aiObservation?.toLowerCase().includes('cable') ||
        i.aiObservation?.toLowerCase().includes('pipe')),
    output: {
      defect: 'Services Installation Damage',
      likelyCause: 'Subsequent services installation trades have caused mechanical damage to the applied intumescent coating without reinstatement.',
      hiddenRisks: [
        'Services trades often do not reinstate fire protection — further damage may be ongoing',
        'Damage adjacent to service penetrations may indicate unsealed penetrations nearby',
      ],
      nextChecks: [
        'Walk the full route of the services run for extent of damage',
        'Check penetrations at the structural element for firestopping continuity',
        'Review construction programme for services completion status',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Reinstate intumescent to specification at all damage locations. Coordinate with services contractor to prevent further damage before completion.',
      confidence: 72,
    },
  },

  {
    id: 'INT-15',
    name: 'Chemical / Sealant Incompatibility',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.aiObservation?.toLowerCase().includes('sealant') ||
        i.aiObservation?.toLowerCase().includes('silicone') ||
        i.aiObservation?.toLowerCase().includes('contact') ||
        i.aiObservation?.toLowerCase().includes('chemical')),
    output: {
      defect: 'Possible Chemical Incompatibility',
      likelyCause: 'Contact between the intumescent and a silicone or other incompatible sealant may be causing localised softening, disbondment, or surface contamination.',
      hiddenRisks: [
        'Some silicone sealants are incompatible with water-based intumescents',
        'Contaminated primer will prevent intumescent adhesion',
      ],
      nextChecks: [
        'Identify the sealant product and check compatibility with the intumescent specification',
        'Test adhesion in the contact zone',
        'Review if sealant was applied before or after coating',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Remove incompatible sealant and contaminated coating. Apply primer, then reinstate intumescent. Confirm compatible sealant product before resealing.',
      confidence: 65,
    },
  },

  // ─── B. CEMENTITIOUS FIREPROOFING ──────────────────────────────────────────

  {
    id: 'CEM-01',
    name: 'Impact Scar — Substrate Exposed',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      i.observedConcern === 'Damage' &&
      (i.aiObservation?.toLowerCase().includes('impact') ||
        i.aiObservation?.toLowerCase().includes('exposed') ||
        i.aiObservation?.toLowerCase().includes('bare') ||
        i.aiObservation?.toLowerCase().includes('scar')),
    output: {
      defect: 'Impact Scar — Substrate Exposed',
      likelyCause: 'A hard impact from plant, formwork, or equipment has broken through the cementitious layer to the substrate.',
      hiddenRisks: [
        'Cementitious is brittle — micro-cracks may extend well beyond visible damage',
        'Adjacent material may be hollow-sounding even if surface appears intact',
      ],
      nextChecks: [
        'Tap the radius around the scar to map hollow zones',
        'Measure the depth of remaining cementitious in adjacent areas',
        'Document size and location relative to nearest structural node',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Remove all loose material, clean substrate, apply compatible patch mortar to full specification depth. Match aggregate texture if aesthetically required.',
      confidence: 85,
    },
  },

  {
    id: 'CEM-02',
    name: 'Adhesion Loss — Soffit / Underside',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      (i.element === 'Beam' || i.element === 'Slab') &&
      (i.observedConcern === 'Delamination' || i.observedConcern === 'Damage') &&
      (i.aiObservation?.toLowerCase().includes('soffit') ||
        i.aiObservation?.toLowerCase().includes('chunk') ||
        i.aiObservation?.toLowerCase().includes('drop') ||
        i.aiObservation?.toLowerCase().includes('fall')),
    output: {
      defect: 'Soffit Adhesion Loss — Cementitious',
      likelyCause: 'Gravity and adhesion failure are causing the underside cementitious to detach. This may be caused by inadequate surface preparation, substrate movement, or moisture degradation.',
      hiddenRisks: [
        'Falling material is a safety hazard — area below must be cordoned off',
        'Loss may be larger than visible from below — check above slab if accessible',
      ],
      nextChecks: [
        'Cordon off area beneath immediately',
        'Tap the entire soffit zone systematically',
        'Check if substrate is reinforced mesh or direct-to-steel',
        'Review if any vibration or movement source is nearby',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all loose material. Consider proprietary mesh system for reinstatement on overhead applications. Do not recoat until bond cause is resolved.',
      confidence: 88,
    },
  },

  {
    id: 'CEM-03',
    name: 'Corrosion Staining Through Cementitious',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('stain') ||
        i.aiObservation?.toLowerCase().includes('brown') ||
        i.aiObservation?.toLowerCase().includes('corrosion')),
    output: {
      defect: 'Corrosion Staining — Substrate Corrosion Suspected',
      likelyCause: 'Rust staining through the cementitious indicates active corrosion on the steel substrate. This is typically caused by moisture ingress, especially if the substrate was not adequately primed.',
      hiddenRisks: [
        'Section loss on the substrate may be ongoing and hidden',
        'Corrosion products are expansive — cementitious cracking will accelerate',
        'Fire performance at this location is unreliable until assessed',
      ],
      nextChecks: [
        'Carefully core a sample area to inspect substrate condition',
        'Check for water entry points feeding the corrosion',
        'Review if substrate was primed before cementitious application',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove cementitious in affected zone, assess and treat substrate corrosion, apply primer, reinstate full cementitious system.',
      confidence: 87,
    },
  },

  {
    id: 'CEM-04',
    name: 'Surface Powder / Shedding Degradation',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      (i.aiObservation?.toLowerCase().includes('powder') ||
        i.aiObservation?.toLowerCase().includes('shed') ||
        i.aiObservation?.toLowerCase().includes('dust') ||
        i.aiObservation?.toLowerCase().includes('loose surface')),
    output: {
      defect: 'Surface Degradation — Powder Loss',
      likelyCause: 'Surface degradation through carbonation, repeated wetting/drying, or inadequate sealer application. The surface matrix is breaking down, releasing powder.',
      hiddenRisks: [
        'Surface degradation eventually compromises depth and bond integrity',
        'In high-humidity environments, degradation accelerates rapidly',
      ],
      nextChecks: [
        'Scratch test surface to assess depth of soft zone',
        'Check if sealer was applied per specification',
        'Review ambient conditions — assess for ongoing moisture exposure',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Clean loose material, apply penetrating sealer to consolidate surface. If depth is compromised, apply build-up coat to specification.',
      confidence: 71,
    },
  },

  {
    id: 'CEM-05',
    name: 'Water Damage — Softening',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      (i.aiObservation?.toLowerCase().includes('soft') ||
        i.aiObservation?.toLowerCase().includes('satur') ||
        i.aiObservation?.toLowerCase().includes('water') ||
        i.aiObservation?.toLowerCase().includes('damp')),
    output: {
      defect: 'Water Damage — Cementitious Softening',
      likelyCause: 'Prolonged water contact or saturation has softened the cementitious binder matrix. Cementitious fireproofing is highly moisture-sensitive.',
      hiddenRisks: [
        'Wet cementitious has significantly reduced fire resistance performance',
        'Substrate corrosion is likely to be concurrent if water has been persistent',
      ],
      nextChecks: [
        'Probe the soft zone extent with a pick or screwdriver',
        'Identify and resolve water source before repair',
        'Check substrate for corrosion beneath softened zones',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all softened material, allow substrate to dry fully, address water source, reinstate cementitious to full specification depth.',
      confidence: 83,
    },
  },

  {
    id: 'CEM-06',
    name: 'Missing Material at Hanger / Penetration',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      i.observedConcern === 'Missing Material' &&
      (i.element === 'Beam' || i.element === 'Slab') &&
      (i.aiObservation?.toLowerCase().includes('hanger') ||
        i.aiObservation?.toLowerCase().includes('penetration') ||
        i.aiObservation?.toLowerCase().includes('hole') ||
        i.aiObservation?.toLowerCase().includes('missing')),
    output: {
      defect: 'Missing Material at Hanger/Penetration Interface',
      likelyCause: 'Services hangers, penetrations, or post-install drilling have displaced the cementitious without subsequent reinstatement by the installing trade.',
      hiddenRisks: [
        'Unsealed penetrations through a fire-rated element breach the rated assembly',
        'Missing material around hangers creates cold bridges in the protective zone',
      ],
      nextChecks: [
        'Map all unsealed penetration points in the zone',
        'Confirm if penetrations are within the fire-rated ceiling/floor assembly',
        'Review services trades completion records',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Reinstate cementitious around all hanger and penetration interfaces. Seal penetrations with appropriate rated filler if through-slab.',
      confidence: 79,
    },
  },

  {
    id: 'CEM-07',
    name: 'Sagging Soffit — Bond Failure Risk',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      (i.element === 'Slab' || i.element === 'Beam') &&
      (i.aiObservation?.toLowerCase().includes('sag') ||
        i.aiObservation?.toLowerCase().includes('bulge') ||
        i.aiObservation?.toLowerCase().includes('belly')),
    output: {
      defect: 'Sagging / Bulging — Imminent Adhesion Failure',
      likelyCause: 'The cementitious soffit is beginning to detach. Gravity is pulling the material away from the substrate — full adhesion failure is imminent.',
      hiddenRisks: [
        'Sagging sections will fall without warning — safety hazard',
        'Hidden extent above the sagging zone may be much larger',
      ],
      nextChecks: [
        'Cordon off area below immediately',
        'Do not tap aggressively — risk of accelerating collapse',
        'Photograph extent and measure sag depth',
        'Review if moisture or vibration source is causing the failure',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all material in sagging zone urgently. Investigate bond failure cause. Reinstate using mesh reinforced system for overhead application.',
      confidence: 91,
    },
  },

  {
    id: 'CEM-08',
    name: 'Voids Around Structural Clips',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      (i.aiObservation?.toLowerCase().includes('clip') ||
        i.aiObservation?.toLowerCase().includes('void') ||
        i.aiObservation?.toLowerCase().includes('gap') ||
        i.aiObservation?.toLowerCase().includes('around')),
    output: {
      defect: 'Voids Around Structural Clips / Fixtures',
      likelyCause: 'Cementitious was not worked into the complex geometry around clips and fixtures during application, leaving voids that are difficult to see without close inspection.',
      hiddenRisks: [
        'Clips and hangers are high heat-transfer points — unprotected geometry critical',
        'Pattern indicates a wider application quality issue on the level',
      ],
      nextChecks: [
        'Inspect all clips and structural fixtures in the zone systematically',
        'Check if these are standard clip types that should have standard back-fill procedure',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Hand-pack cementitious mortar around all clip/fixture interfaces. Use low-viscosity formulation for complex geometry backfill.',
      confidence: 73,
    },
  },

  {
    id: 'CEM-09',
    name: 'Spalling — Repeated Mechanical Abuse',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      !i.isNewInstall &&
      i.observedConcern === 'Damage' &&
      (i.aiObservation?.toLowerCase().includes('spall') ||
        i.aiObservation?.toLowerCase().includes('traffic') ||
        i.aiObservation?.toLowerCase().includes('repeat') ||
        i.aiObservation?.toLowerCase().includes('forklift') ||
        i.aiObservation?.toLowerCase().includes('plant')),
    output: {
      defect: 'Spalling from Repeated Mechanical Impact',
      likelyCause: 'Ongoing mechanical damage from forklifts, plant, or pedestrian traffic in high-activity zones is progressively destroying the cementitious protection.',
      hiddenRisks: [
        'Root cause is ongoing — repair without protection will fail again',
        'Spalled zones create accumulation of debris that hides further damage',
      ],
      nextChecks: [
        'Review what traffic or activity is causing repeated impact',
        'Consider if a physical barrier or bumper guard is required',
        'Map all spalled areas on the level plan for full scope assessment',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Reinstate cementitious. Install physical protection guards. Coordinate with building manager to restrict vehicle access below rated structure.',
      confidence: 76,
    },
  },

  {
    id: 'CEM-10',
    name: 'Prior Repair — Bond Verification Required',
    match: (i) =>
      i.systemType === 'Cementitious' &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('patch') ||
        i.aiObservation?.toLowerCase().includes('repair') ||
        i.aiObservation?.toLowerCase().includes('inconsistent') ||
        i.aiObservation?.toLowerCase().includes('different texture')),
    output: {
      defect: 'Prior Repair Area — Bond Verification Required',
      likelyCause: 'A previous repair has been applied but may not be properly bonded to the substrate or surrounding original cementitious.',
      hiddenRisks: [
        'Poor adhesion repair patches can fall unexpectedly',
        'If repair mortar is incompatible with original, delamination is likely',
      ],
      nextChecks: [
        'Tap repair boundary to check for hollow sound at edges',
        'Confirm the repair product is compatible with the original specification',
        'Review ITP or maintenance records for repair details',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Test bond at repair edges. If hollow, remove and reinstate with compatible product. Document repair scope for maintenance records.',
      confidence: 67,
    },
  },

  // ─── C. PROTECTIVE COATINGS / CORROSION ───────────────────────────────────

  {
    id: 'PC-01',
    name: 'Corrosion Breakthrough — Active Rust',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('corrosion') ||
        i.aiObservation?.toLowerCase().includes('oxide') ||
        i.aiObservation?.toLowerCase().includes('red') ||
        i.aiObservation?.toLowerCase().includes('brown')),
    output: {
      defect: 'Active Corrosion Breakthrough',
      likelyCause: 'The coating system has been breached — either by mechanical damage, weathering, or edge/seam failure — allowing moisture and oxygen to reach the substrate and initiate active corrosion.',
      hiddenRisks: [
        'Underfilm corrosion creep extends well beyond the visible rust area',
        'In exposed or coastal environments, corrosion rate can be very aggressive',
        'Structural section loss may be occurring without visible indication',
      ],
      nextChecks: [
        'Tap coating around rust area to determine disbondment radius (typically 2–5× visible area)',
        'Use DFT meter to check if coating thinning is adjacent to rust',
        'Check the back face of the same element — corrosion often mirrors',
        'Inspect above for water ponding or condensation source',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Blast to Sa 2.5, apply zinc-rich primer within 4 hours, full system reinstatement to specification. Flag any pitting for pit-gauge measurement.',
      confidence: 93,
    },
  },

  {
    id: 'PC-02',
    name: 'Osmotic Blistering with Rust Centre',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Blistering / Bubbling' &&
      (i.aiObservation?.toLowerCase().includes('blister') ||
        i.aiObservation?.toLowerCase().includes('bubble') ||
        i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('centre')),
    output: {
      defect: 'Osmotic/Corrosion Blistering',
      likelyCause: 'Water vapour is migrating through the coating and accumulating at the steel interface. If blisters contain rust, active corrosion is confirmed beneath the film.',
      hiddenRisks: [
        'Rust-centred blisters confirm substrate corrosion — may be widespread',
        'In immersed or splash zones, blister density increases rapidly',
        'Adjacent coating disbondment is likely — tap area thoroughly',
      ],
      nextChecks: [
        'Carefully open one blister with a knife and note contents (clear = osmotic; rust = corrosion)',
        'Tap surrounding coating for disbondment halo',
        'Identify moisture source — check if element is in splash zone or condensation pocket',
        'Review original system specification vs actual exposure category',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove all blistered coating. Blast to Sa 2.5. Apply appropriate primer and full system reinstated per exposure classification.',
      confidence: 88,
    },
  },

  {
    id: 'PC-03',
    name: 'Edge Corrosion Creep',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.observedConcern === 'Rust / Corrosion' || i.observedConcern === 'Delamination') &&
      (i.aiObservation?.toLowerCase().includes('edge') ||
        i.aiObservation?.toLowerCase().includes('corner') ||
        i.aiObservation?.toLowerCase().includes('plate') ||
        i.aiObservation?.toLowerCase().includes('lift')),
    output: {
      defect: 'Edge Corrosion Creep / Film Lifting',
      likelyCause: 'Coating at plate or steel edges is lifting, allowing moisture to ingress at the cut edge and establish an underfilm corrosion cell that migrates inward.',
      hiddenRisks: [
        'Edge corrosion is typically faster than face corrosion due to thin film build',
        'Lifting film creates a moisture trap that accelerates substrate attack',
        'Once edge creep is established it progresses reliably without intervention',
      ],
      nextChecks: [
        'Slide a feeler gauge under the lifted edge to measure creep extent',
        'Check DFT along the edge versus the face — edges are commonly under-built',
        'Inspect all similar plate edges in the area',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Remove all lifted material. Feather edges. Apply stripe coat to all edges before full system reinstatement. Specify holiday-free coverage at edges.',
      confidence: 82,
    },
  },

  {
    id: 'PC-04',
    name: 'Intercoat Adhesion Loss — No Rust',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.observedConcern === 'Delamination' || i.observedConcern === 'Damage') &&
      (i.aiObservation?.toLowerCase().includes('peel') ||
        i.aiObservation?.toLowerCase().includes('flak') ||
        i.aiObservation?.toLowerCase().includes('topcoat')) &&
      !(i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('corrosion')),
    output: {
      defect: 'Intercoat Adhesion Loss — No Active Corrosion',
      likelyCause: 'The topcoat is detaching from the intermediate or primer coat due to contamination of the intercoat surface, overcoating out of window, or an incompatible coating pair.',
      hiddenRisks: [
        'Although no current rust, the exposed intermediate coat will not provide long-term protection',
        'Intercoat adhesion failure typically spreads — small area today becomes large area quickly',
      ],
      nextChecks: [
        'Cross-cut adhesion test on adjacent intact area to check remaining system integrity',
        'Identify failure interface (primer/mid or mid/top) using peeling layer method',
        'Review application records for overcoating windows',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Remove all delaminated material. Clean and abrade to sound coat. Reinstate from failure interface up. Ensure correct overcoating intervals.',
      confidence: 77,
    },
  },

  {
    id: 'PC-05',
    name: 'Chalking / UV Weathering Only',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      (i.aiObservation?.toLowerCase().includes('chalk') ||
        i.aiObservation?.toLowerCase().includes('fade') ||
        i.aiObservation?.toLowerCase().includes('dull')) &&
      !(i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('corrosion') ||
        i.aiObservation?.toLowerCase().includes('blister')),
    output: {
      defect: 'UV / Weathering Chalking — Topcoat Only',
      likelyCause: 'Normal UV-induced photodegradation of an organic topcoat on an external-facing element. Aesthetic degradation without current structural concern.',
      hiddenRisks: [
        'Continued chalking will erode topcoat to zero — then mid-coat exposed',
        'If mid-coat is not UV stable, corrosion protection reduces rapidly',
      ],
      nextChecks: [
        'Check topcoat DFT — if <40% of specified, recoating is overdue',
        'Check edges and areas of more exposure for more advanced degradation',
        'Review maintenance schedule — external coatings have design life intervals',
      ],
      severityModifier: 'downgrade',
      escalate: false,
      remediationGuidance: 'Clean surface, apply fresh topcoat from same system family. If mid-coat exposed in patches, light abrade and full topcoat recoat.',
      confidence: 72,
    },
  },

  {
    id: 'PC-06',
    name: 'Pitting — Advanced Corrosion',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('pit') ||
        i.aiObservation?.toLowerCase().includes('crater') ||
        i.aiObservation?.toLowerCase().includes('pock')),
    output: {
      defect: 'Pitting Corrosion — Substrate Attack',
      likelyCause: 'Localised electrochemical corrosion cells have formed, concentrating attack into pits on the substrate surface. This indicates the coating has been absent for an extended period.',
      hiddenRisks: [
        'Pit depth can exceed 1mm without being visible to the eye — measure with pit gauge',
        'Pit distribution may indicate galvanic or crevice corrosion mechanism',
        'Structural section loss risk if pitting is on tension flange',
      ],
      nextChecks: [
        'Measure pit depth with pit gauge — record maximum, average and density',
        'Identify pitting pattern — random (electrochemical) vs localised (galvanic/crevice)',
        'Consult structural engineer if pitting on primary structural element',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Fill pits with zinc-rich filler, blast surrounding to Sa 2.5, reinstate full system. Submit pit depth measurements to structural engineer.',
      confidence: 89,
    },
  },

  {
    id: 'PC-07',
    name: 'Weld Burn — Missed Repair',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.observedConcern === 'Missing Material' || i.observedConcern === 'Damage') &&
      (i.aiObservation?.toLowerCase().includes('weld') ||
        i.aiObservation?.toLowerCase().includes('burn') ||
        i.aiObservation?.toLowerCase().includes('heat') ||
        i.aiObservation?.toLowerCase().includes('spatter')),
    output: {
      defect: 'Weld Burn / Hot Works — Coating Destroyed',
      likelyCause: 'Heat from welding or cutting operations has destroyed the coating in the affected zone. This is a maintenance or modification scenario where the coating has not been reinstated.',
      hiddenRisks: [
        'Heat-affected zone may have altered steel microstructure requiring different prep',
        'Weld spatter is difficult to coat over — requires grinding before coating',
        'Adjacent coating may be thermally disbonded without visible evidence',
      ],
      nextChecks: [
        'Check extent of heat affected zone by tapping coating for brittleness',
        'Confirm all weld spatter has been removed by grinding',
        'Review if welding is complete or if further hot works are planned',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Grind all spatter to smooth profile. Prepare to Sa 2.5 in heat zone. Abrade adjacent coating. Reinstate full system with zinc-rich primer.',
      confidence: 83,
    },
  },

  {
    id: 'PC-08',
    name: 'Flash Rust — Surface Contamination',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.isNewInstall &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('flash') ||
        i.aiObservation?.toLowerCase().includes('orange') ||
        i.aiObservation?.toLowerCase().includes('light rust') ||
        i.aiObservation?.toLowerCase().includes('contamina')),
    output: {
      defect: 'Flash Rust / Surface Contamination',
      likelyCause: 'New or recently blasted steel has flash rusted before primer application, or soluble salt contamination from the preparation surface has caused corrosion beneath a freshly applied coating.',
      hiddenRisks: [
        'If primed over flash rust, premature coating failure is inevitable',
        'Soluble salt contamination cannot be removed by abrasion alone',
      ],
      nextChecks: [
        'Conductivity test for soluble salts on prepared surface',
        'Check time between blast and primer application — max 4 hours dry environments',
        'Determine if coating was applied over the contamination',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'If over flash rust: remove coating, clean salts with fresh water wash, re-blast, apply primer within window. Reject if application was over contamination.',
      confidence: 80,
    },
  },

  {
    id: 'PC-09',
    name: 'Water Trap / Poor Drainage Staining',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.aiObservation?.toLowerCase().includes('stain') ||
        i.aiObservation?.toLowerCase().includes('water mark') ||
        i.aiObservation?.toLowerCase().includes('drainage') ||
        i.aiObservation?.toLowerCase().includes('below')),
    output: {
      defect: 'Water Trap / Drainage Detail Corrosion',
      likelyCause: 'Standing water is accumulating at a structural detail — typically a horizontal hollow section, upturned flange, or blocked drain — causing concentrated corrosion in that zone.',
      hiddenRisks: [
        'Hidden internal corrosion in hollow sections is impossible to detect by visual inspection',
        'Water traps accelerate local corrosion to a rate far above surrounding areas',
      ],
      nextChecks: [
        'Identify the exact water accumulation geometry',
        'Check for drain holes in hollow section members — they may be blocked',
        'If hollow section, ultrasonic thickness test recommended to assess internal loss',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Clear or create drain holes. Treat all exposed corrosion. Reinstate coating with emphasis on drainage detail. Consider internal protection for hollow sections.',
      confidence: 75,
    },
  },

  {
    id: 'PC-10',
    name: 'Galvanic Corrosion — Dissimilar Metals',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.aiObservation?.toLowerCase().includes('galvan') ||
        i.aiObservation?.toLowerCase().includes('dissimilar') ||
        i.aiObservation?.toLowerCase().includes('aluminium') ||
        i.aiObservation?.toLowerCase().includes('aluminum') ||
        i.aiObservation?.toLowerCase().includes('stainless') ||
        i.aiObservation?.toLowerCase().includes('zinc')),
    output: {
      defect: 'Galvanic Corrosion — Dissimilar Metal Contact',
      likelyCause: 'Two dissimilar metals in electrical contact in a conducting electrolyte (moisture) are forming a galvanic cell. The anodic metal corrodes preferentially and rapidly.',
      hiddenRisks: [
        'Galvanic corrosion is highly localised and faster than general corrosion',
        'The less noble metal may lose section faster than visible indicators suggest',
        'Design defect — corrosion will return without isolation',
      ],
      nextChecks: [
        'Identify the metal pair and their galvanic potential difference',
        'Check if isolation gaskets or washers are present at the interface',
        'Measure section loss at the anodic metal',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Treat corrosion. Install galvanic isolation (non-conducting gaskets, sleeves). Apply zinc-rich primer to anodic metal after surface preparation.',
      confidence: 81,
    },
  },

  {
    id: 'PC-11',
    name: 'Runs and Sags — Application Defect',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('run') ||
        i.aiObservation?.toLowerCase().includes('sag') ||
        i.aiObservation?.toLowerCase().includes('drip') ||
        i.aiObservation?.toLowerCase().includes('curtain')),
    output: {
      defect: 'Runs / Sags — Over-Application',
      likelyCause: 'Excessive wet film thickness applied at one pass, or coating applied at too low a viscosity, has caused gravitational flow before cure.',
      hiddenRisks: [
        'Runs create thin zones adjacent to the thick run — both outside specification',
        'Thick film runs are prone to mud-cracking during cure',
        'DFT readings in run areas are unreliable as thickness is non-uniform',
      ],
      nextChecks: [
        'Check DFT in the thin zone beside the run',
        'Inspect the run for mud-cracking or adhesion lifting',
        'Review applicator spray technique and material viscosity records',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Feather and sand runs flat. Check adjacent DFT and build up thin zones. Ensure viscosity and application technique meet spec.',
      confidence: 74,
    },
  },

  {
    id: 'PC-12',
    name: 'Pinholes / Holiday — Coverage Defect',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.aiObservation?.toLowerCase().includes('pinhole') ||
        i.aiObservation?.toLowerCase().includes('holiday') ||
        i.aiObservation?.toLowerCase().includes('void') ||
        i.aiObservation?.toLowerCase().includes('gap') ||
        i.aiObservation?.toLowerCase().includes('miss')),
    output: {
      defect: 'Pinhole / Holiday — Substrate Not Sealed',
      likelyCause: 'Outgassing from the substrate, solvent entrapment, or application over porous surfaces has created pinholes that penetrate to bare steel.',
      hiddenRisks: [
        'Pinholes are moisture ingress points — each is a potential corrosion initiation site',
        'Pinhole density is usually higher than visible to the naked eye — holiday detector required',
      ],
      nextChecks: [
        'Use wet-sponge holiday detector across the full affected area',
        'Check DFT in pinhole zones — often associated with thin film areas',
        'Review if substrate was porous (blast profile too sharp, rust pitting)',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Lightly abrade, spot-apply compatible primer to fill pinholes, overcoat to full DFT. Confirm holiday-free with detector before closing out.',
      confidence: 76,
    },
  },

  {
    id: 'PC-13',
    name: 'Systemic Defect Pattern — Multiple Members Same Defect',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.aiObservation?.toLowerCase().includes('multiple') ||
        i.aiObservation?.toLowerCase().includes('systemic') ||
        i.aiObservation?.toLowerCase().includes('repeat') ||
        i.aiObservation?.toLowerCase().includes('pattern')),
    output: {
      defect: 'Systemic Application Defect Pattern',
      likelyCause: 'A consistent pattern across multiple members indicates a systemic issue — specification non-compliance, applicator error, environmental condition at time of application, or a product batch problem.',
      hiddenRisks: [
        'Individual remediation without root cause analysis will fail',
        'The scope may extend beyond visible areas',
      ],
      nextChecks: [
        'Map the geographic or sequential pattern of the defect',
        'Review application records for the affected area (batch numbers, dates, conditions)',
        'Engage coating manufacturer for site assessment',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Do not remediate individual defects until root cause is confirmed. Engage manufacturer and project engineer for a coordinated remediation strategy.',
      confidence: 69,
    },
  },

  {
    id: 'PC-14',
    name: 'Weld Seam Cracking — Brittle Coating',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('weld') ||
        i.aiObservation?.toLowerCase().includes('seam') ||
        i.aiObservation?.toLowerCase().includes('joint') ||
        i.aiObservation?.toLowerCase().includes('crack')),
    output: {
      defect: 'Weld Seam Cracking',
      likelyCause: 'The coating has cracked at the weld seam due to thermal movement cycling or application of a high-build brittle coating over a stress concentration without stripe coat.',
      hiddenRisks: [
        'Weld seam cracks provide a direct moisture path to an already higher-stress zone',
        'May indicate a specification mismatch for the application geometry',
      ],
      nextChecks: [
        'Check if stripe coat was applied to welds before full coat',
        'Inspect all weld seams in the area for consistent cracking pattern',
        'Review if coating type is appropriate for flexible substrate applications',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Abrade cracks, apply zinc-rich stripe coat to all welds, overcoat to full DFT. Specify stripe coat as mandatory on all weld seams.',
      confidence: 74,
    },
  },

  {
    id: 'PC-15',
    name: 'Underfilm Corrosion — Maintenance Backlog',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      !i.isNewInstall &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('widespread') ||
        i.aiObservation?.toLowerCase().includes('general') ||
        i.aiObservation?.toLowerCase().includes('backlog') ||
        i.aiObservation?.toLowerCase().includes('old') ||
        i.aiObservation?.toLowerCase().includes('age')),
    output: {
      defect: 'General Corrosion — Maintenance Life Exceeded',
      likelyCause: 'The coating system has exceeded its design maintenance interval. General degradation and corrosion breakthrough indicates that the protective life of the system is exhausted.',
      hiddenRisks: [
        'When a system is at end-of-life, corrosion is likely present on all less-visible faces',
        'Structural section loss assessment may be needed before refurbishment',
      ],
      nextChecks: [
        'Full condition survey recommended — not just visible faces',
        'Ultrasonic thickness testing on hollow sections and flanges',
        'Review asset maintenance history for last intervention date',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Full system refurbishment required. Remove to bare metal (blast), treat section loss, reinstate full protective coating system to current exposure classification.',
      confidence: 78,
    },
  },

  // ─── D. FIRESTOPPING ──────────────────────────────────────────────────────

  {
    id: 'FS-01',
    name: 'Open Annular Gap — Incomplete Firestopping',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.observedConcern === 'Missing Material' || i.observedConcern === 'Damage') &&
      (i.aiObservation?.toLowerCase().includes('gap') ||
        i.aiObservation?.toLowerCase().includes('open') ||
        i.aiObservation?.toLowerCase().includes('annular') ||
        i.aiObservation?.toLowerCase().includes('unsealed') ||
        i.aiObservation?.toLowerCase().includes('void')),
    output: {
      defect: 'Open Annular Gap — Unsealed Penetration',
      likelyCause: 'The penetrating service was installed through a rated element without the annular gap being sealed with a rated firestopping product, or the seal has been removed during a subsequent services change.',
      hiddenRisks: [
        'An open gap in a fire-rated element directly compromises the FRL of the assembly',
        'Smoke migration through open gaps is a life safety risk, not just a passive fire risk',
        'Compliance may not be achievable without a third-party seal system certification',
      ],
      nextChecks: [
        'Confirm the fire rating of the element being penetrated',
        'Identify all cable, pipe, or duct types passing through the gap',
        'Determine if the gap is pre-existing or a result of recent services work',
        'Review FRL requirements for this rated assembly from drawings',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Install a third-party assessed firestopping system appropriate for the penetrating service types and element FRL. Apply ID label with product, installer, and date.',
      confidence: 95,
    },
  },

  {
    id: 'FS-02',
    name: 'Foam Only — Incorrect Material',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('foam') ||
        i.aiObservation?.toLowerCase().includes('expanding') ||
        i.aiObservation?.toLowerCase().includes('polyurethane')) &&
      !(i.aiObservation?.toLowerCase().includes('intumescent') ||
        i.aiObservation?.toLowerCase().includes('rated')),
    output: {
      defect: 'Non-Rated Foam — Incorrect Firestopping Material',
      likelyCause: 'General purpose expanding foam has been used at a rated penetration in place of a third-party assessed firestopping system. This is a common error by non-specialist contractors.',
      hiddenRisks: [
        'Standard PU foam is combustible — it will burn and melt in a fire event',
        'This installation is a non-conformance against NZ Building Code Clause C',
        'Further investigation required — may indicate widespread incorrect product use',
      ],
      nextChecks: [
        'Check product packaging/label visible at seal to confirm product type',
        'Survey surrounding penetrations for the same product',
        'Review which contractor installed the seals',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove non-rated foam. Install a third-party assessed intumescent firestopping system appropriate for penetrating services and element FRL. Label and document.',
      confidence: 92,
    },
  },

  {
    id: 'FS-03',
    name: 'Damaged Seal — Cable Additions',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      i.observedConcern === 'Damage' &&
      (i.aiObservation?.toLowerCase().includes('cable') ||
        i.aiObservation?.toLowerCase().includes('damage') ||
        i.aiObservation?.toLowerCase().includes('broken') ||
        i.aiObservation?.toLowerCase().includes('disrupt')),
    output: {
      defect: 'Damaged Seal — Subsequent Cable Addition',
      likelyCause: 'A previously rated seal has been physically damaged when additional cables were threaded through without proper reinstatement.',
      hiddenRisks: [
        'The original seal rating is invalidated once the seal has been breached',
        'Cable addtions may have changed the fill ratio beyond the tested limit',
      ],
      nextChecks: [
        'Assess the fill ratio of the opening (cables/void by area)',
        'Identify the original seal system and whether it can be reinstated with new cable count',
        'Confirm if any FRL documentation exists for the original seal',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Full removal and reinstatement with a third-party assessed system that covers the current cable type and fill ratio. Install ID label.',
      confidence: 90,
    },
  },

  {
    id: 'FS-04',
    name: 'Missing ID Label / Documentation',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('label') ||
        i.aiObservation?.toLowerCase().includes('tag') ||
        i.aiObservation?.toLowerCase().includes('documentation') ||
        i.aiObservation?.toLowerCase().includes('id') ||
        i.aiObservation?.toLowerCase().includes('no marking')),
    output: {
      defect: 'Missing Firestopping ID Label',
      likelyCause: 'The seal has not been labelled per the firestopping system documentation requirements, or the label has fallen off or been painted over. A seal without a label cannot be verified.',
      hiddenRisks: [
        'Without a label, there is no evidence that a rated system was installed',
        'Unverified seals are often excluded from building compliance certificates',
      ],
      nextChecks: [
        'Check if the product can be identified from visual inspection or residue',
        'Search for installation records or photos from the installation contractor',
        'Review if label is present but obscured',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'If product can be positively identified: apply a replacement ID label per system instructions. If product cannot be confirmed: inspect seal integrity and consider reinstatement.',
      confidence: 65,
    },
  },

  {
    id: 'FS-05',
    name: 'Unknown / Mixed Materials in Penetration',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('mix') ||
        i.aiObservation?.toLowerCase().includes('unknown') ||
        i.aiObservation?.toLowerCase().includes('various') ||
        i.aiObservation?.toLowerCase().includes('non-standard') ||
        i.aiObservation?.toLowerCase().includes('improvised')),
    output: {
      defect: 'Unknown / Non-Standard Assembly',
      likelyCause: 'Materials that cannot be positively identified as a third-party assessed firestopping system have been used. This may be a DIY or improvised seal.',
      hiddenRisks: [
        'Non-standard assemblies have no tested fire performance data',
        'May include combustible or ineffective materials',
        'Legal liability for the building owner if compliance cannot be demonstrated',
      ],
      nextChecks: [
        'Photograph all materials clearly for product identification',
        'Contact the installation contractor to identify the products used',
        'Review if this is a tested proprietary system or a non-standard assembly',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove non-standard assembly. Install third-party assessed rated system appropriate for the penetration type and element FRL.',
      confidence: 87,
    },
  },

  {
    id: 'FS-06',
    name: 'Perimeter Shrinkage Cracks',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('crack') ||
        i.aiObservation?.toLowerCase().includes('shrink') ||
        i.aiObservation?.toLowerCase().includes('perimeter') ||
        i.aiObservation?.toLowerCase().includes('gap at edge')),
    output: {
      defect: 'Perimeter Shrinkage Cracks — Seal Deterioration',
      likelyCause: 'The sealant or firestopping product has shrunk over time, creating gaps at the perimeter interface between the seal and the element or service. This is a common ageing failure mode for some acrylic-based products.',
      hiddenRisks: [
        'Perimeter cracks reduce the effective fire resistance of the seal assembly',
        'In damp environments cracks can admit moisture and further degrade the seal',
      ],
      nextChecks: [
        'Measure gap width at perimeter — anything > 3mm requires reinstatement',
        'Identify the sealant product type — some acrylics have known long-term shrinkage',
        'Check if the penetrating service has moved (expansion/contraction) opening the gap',
      ],
      severityModifier: 'none',
      escalate: false,
      remediationGuidance: 'Apply a compatible intumescent sealant bead to perimeter cracks. If gap is >3mm or structural reinstatement is required, full seal removal and reinstatement.',
      confidence: 73,
    },
  },

  {
    id: 'FS-07',
    name: 'Unsealed Tray / Cable Basket Additions',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('tray') ||
        i.aiObservation?.toLowerCase().includes('basket') ||
        i.aiObservation?.toLowerCase().includes('ladder') ||
        i.aiObservation?.toLowerCase().includes('cable tray') ||
        i.aiObservation?.toLowerCase().includes('duct')),
    output: {
      defect: 'Unsealed Cable Tray / Basket Penetration',
      likelyCause: 'A cable tray or basket has been added through a rated element and the penetration has not been sealed with a rated firestopping system. Open trays are one of the most common firestopping failures.',
      hiddenRisks: [
        'Open cable trays provide a rapid fire and smoke propagation path',
        'The cross-section of an open tray may exceed the capacity of standard seal systems',
        'The tray plus future cable additions must both be catered for in the seal design',
      ],
      nextChecks: [
        'Measure tray dimensions and current cable fill ratio',
        'Confirm element FRL requirement',
        'Check if fire blanket, pillow system, or composite sheet system is required',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Install a third-party assessed firestopping system for cable tray penetrations — typically a composite sheet or fire blanket/pillow assembly. Label and document.',
      confidence: 91,
    },
  },

  {
    id: 'FS-08',
    name: 'Combustible Packing Exposed',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('combustible') ||
        i.aiObservation?.toLowerCase().includes('wood') ||
        i.aiObservation?.toLowerCase().includes('cardboard') ||
        i.aiObservation?.toLowerCase().includes('plastic') ||
        i.aiObservation?.toLowerCase().includes('packing') ||
        i.aiObservation?.toLowerCase().includes('temporary')),
    output: {
      defect: 'Combustible Packing Material in Rated Penetration',
      likelyCause: 'Temporary combustible packing materials (wood, cardboard, plastic) used during construction have not been replaced with a rated firestopping system.',
      hiddenRisks: [
        'Combustible packing will ignite and accelerate fire spread through the penetration',
        'This is one of the highest risk firestopping failures',
        'Likely to be an ongoing issue at multiple penetrations in construction-phase buildings',
      ],
      nextChecks: [
        'Survey all penetrations in the area for similar temporary materials',
        'Determine if building has received a clearance for temporary protection',
        'Photograph all instances for formal NCR documentation',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Remove combustible packing immediately. Install rated firestopping system before any occupancy. Issue formal NCR and notify fire engineer.',
      confidence: 96,
    },
  },

  {
    id: 'FS-09',
    name: 'Moisture Damaged Sealant',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('water') ||
        i.aiObservation?.toLowerCase().includes('damp') ||
        i.aiObservation?.toLowerCase().includes('wet') ||
        i.aiObservation?.toLowerCase().includes('discolour') ||
        i.aiObservation?.toLowerCase().includes('softened seal')),
    output: {
      defect: 'Moisture-Damaged Firestopping Sealant',
      likelyCause: 'Prolonged moisture exposure has softened, degraded, or displaced the firestopping sealant product.',
      hiddenRisks: [
        'Softened sealant may have lost its intumescent properties',
        'Water ingress source must be resolved or reinstatement will fail again',
      ],
      nextChecks: [
        'Probe sealant for firmness — soft sealant should be removed',
        'Identify moisture source — check pipe joint above for drips, or HVAC condensate',
        'Review if the sealant product is rated for wet conditions',
      ],
      severityModifier: 'upgrade',
      escalate: false,
      remediationGuidance: 'Remove softened sealant. Resolve moisture source. Install a rated system approved for damp/wet conditions. Allow to cure fully before covering.',
      confidence: 79,
    },
  },

  {
    id: 'FS-10',
    name: 'Repeated Breaches — Same Riser or Zone',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.aiObservation?.toLowerCase().includes('repeat') ||
        i.aiObservation?.toLowerCase().includes('multiple') ||
        i.aiObservation?.toLowerCase().includes('riser') ||
        i.aiObservation?.toLowerCase().includes('systematic') ||
        i.aiObservation?.toLowerCase().includes('pattern')),
    output: {
      defect: 'Systematic Firestopping Failure — Multiple Locations',
      likelyCause: 'Repeated breaches in the same riser or zone indicate a systemic maintenance control failure, contractor non-compliance, or a building management process gap for change management of services penetrations.',
      hiddenRisks: [
        'The same pattern likely extends to all levels in the riser — full survey recommended',
        'Without a permit-to-penetrate process, breaches will recur after remediation',
        'The building owner faces compliance and insurance risk across the entire asset',
      ],
      nextChecks: [
        'Survey all levels of the same riser for the same issue',
        'Engage building management to understand the change management process',
        'Determine if a permit-to-penetrate system is in place and enforced',
      ],
      severityModifier: 'upgrade',
      escalate: true,
      remediationGuidance: 'Full riser survey and remediation plan required. Implement permit-to-penetrate process. Recommend independent third-party firestopping inspection programme.',
      confidence: 85,
    },
  },
];

export function runRulebook(input: RuleInput): RulebookResult {
  const triggered = RULES
    .filter((r) => {
      try {
        return r.match(input);
      } catch {
        return false;
      }
    })
    .map((r): RuleOutput => ({
      ruleId: r.id,
      ruleName: r.name,
      ...r.output,
    }));

  if (triggered.length === 0) {
    return {
      triggeredRules: [],
      recommendedDefect: null,
      recommendedSeverity: null,
      escalate: false,
      likelyCause: null,
      nextChecks: [],
      hiddenRisks: [],
      remediationGuidance: null,
      rulebookConfidence: 0,
    };
  }

  const escalateRules = triggered.filter((r) => r.escalate);
  const shouldEscalate = escalateRules.length > 0;

  const upgradeCount = triggered.filter((r) => r.severityModifier === 'upgrade').length;
  const downgradeCount = triggered.filter((r) => r.severityModifier === 'downgrade').length;
  let severityModifier: 'upgrade' | 'downgrade' | 'none' = 'none';
  if (upgradeCount > downgradeCount) severityModifier = 'upgrade';
  else if (downgradeCount > upgradeCount) severityModifier = 'downgrade';

  const primaryRule = triggered.reduce((best, r) => (r.confidence > best.confidence ? r : best), triggered[0]);

  const allNextChecks = Array.from(new Set(triggered.flatMap((r) => r.nextChecks)));
  const allHiddenRisks = Array.from(new Set(triggered.flatMap((r) => r.hiddenRisks)));

  const avgConfidence = triggered.reduce((sum, r) => sum + r.confidence, 0) / triggered.length;

  let recommendedSeverity: Severity | null = null;
  if (severityModifier !== 'none') {
    recommendedSeverity = severityModifier === 'upgrade' ? 'High' : 'Low';
  }

  return {
    triggeredRules: triggered,
    recommendedDefect: primaryRule.defect,
    recommendedSeverity,
    escalate: shouldEscalate,
    likelyCause: primaryRule.likelyCause,
    nextChecks: allNextChecks.slice(0, 6),
    hiddenRisks: allHiddenRisks.slice(0, 4),
    remediationGuidance: primaryRule.remediationGuidance,
    rulebookConfidence: Math.round(avgConfidence),
  };
}
