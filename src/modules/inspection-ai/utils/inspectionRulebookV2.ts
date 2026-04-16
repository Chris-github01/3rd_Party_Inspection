import type { SystemType, ElementType, Environment, ObservedConcern } from '../types';

export type ComplianceConcernLevel = 'Low' | 'Moderate' | 'High';
export type LikelyIssueType = 'Maintenance' | 'Workmanship' | 'Systemic' | 'Verification';

export interface V2RuleInput {
  systemType: SystemType;
  element: ElementType;
  environment: Environment;
  observedConcern: ObservedConcern;
  isNewInstall: boolean;
  aiDefectType?: string;
  aiObservation?: string;
}

export interface V2RuleOutput {
  ruleId: string;
  ruleName: string;
  complianceConcernLevel: ComplianceConcernLevel;
  likelyIssueType: LikelyIssueType;
  standardsNotes: string[];
  manufacturerLogicNotes: string[];
  intumescentSystemNotes: string[];
  rationale: string;
}

export interface V2RulebookResult {
  triggeredV2Rules: V2RuleOutput[];
  complianceConcernLevel: ComplianceConcernLevel;
  likelyIssueType: LikelyIssueType;
  standardsNotes: string[];
  manufacturerLogicNotes: string[];
  intumescentSystemNotes: string[];
  complianceRationale: string | null;
}

type V2RuleDefinition = {
  id: string;
  name: string;
  match: (input: V2RuleInput) => boolean;
  output: Omit<V2RuleOutput, 'ruleId' | 'ruleName'>;
};

const V2_RULES: V2RuleDefinition[] = [

  // ─── INTUMESCENT SYSTEM LOGIC ─────────────────────────────────────────────

  {
    id: 'SYS-01',
    name: 'Water-Based Intumescent — External Use Without Topcoat',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      (i.observedConcern === 'Missing Material' ||
        i.aiObservation?.toLowerCase().includes('no topcoat') ||
        i.aiObservation?.toLowerCase().includes('topcoat missing') ||
        i.aiObservation?.toLowerCase().includes('exposed intumescent')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Water-based intumescent products typically require a protective topcoat when used in external or exposed environments — refer to product system data sheet for environmental suitability.',
        'Durability expectations under AS/NZS 2312 corrosion protection principles require the full system to be installed as specified.',
      ],
      manufacturerLogicNotes: [
        'Most water-based intumescent manufacturers classify external exposure without topcoat as outside the system design scope.',
        'Moisture uptake without topcoat protection may compromise the fire expansion performance of the intumescent layer.',
      ],
      intumescentSystemNotes: [
        'Water-based intumescent systems are hygroscopic by nature — direct weather exposure causes progressive moisture ingress and film softening.',
        'Without a sealed topcoat, the expected system durability life is significantly reduced.',
      ],
      rationale: 'A water-based intumescent coating without topcoat in an exposed environment represents a likely workmanship non-conformance against the product system data sheet requirements.',
    },
  },

  {
    id: 'SYS-02',
    name: 'Epoxy Intumescent — Impact Damage Assessment',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Damage' &&
      (i.aiObservation?.toLowerCase().includes('gouge') ||
        i.aiObservation?.toLowerCase().includes('impact') ||
        i.aiObservation?.toLowerCase().includes('chip') ||
        i.aiObservation?.toLowerCase().includes('epoxy')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'Epoxy intumescent systems provide superior mechanical resistance compared to thin-film water-based products but can still be breached by hard impacts.',
        'AS 3894 inspection principles note that exposed substrate at damage locations requires immediate remediation.',
      ],
      manufacturerLogicNotes: [
        'Epoxy intumescent products typically allow localised patch repair provided the adjacent coating is intact and the DFT profile is maintained.',
        'Repair products must be from the same system family to ensure compatible fire expansion behaviour.',
      ],
      intumescentSystemNotes: [
        'Epoxy intumescent systems are commonly specified in harsh/industrial environments and offshore applications due to their mechanical durability.',
        'Unlike water-based systems, epoxy intumescent is less sensitive to moisture ingress but requires correct surface preparation for repair adhesion.',
      ],
      rationale: 'Impact damage to epoxy intumescent is likely a localised maintenance repair scope provided the substrate is not exposed. Verify surrounding DFT integrity before recommending patch only.',
    },
  },

  {
    id: 'SYS-03',
    name: 'Thin-Film Water-Based — Edge Cracking at Sharp Steel',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('edge') ||
        i.aiObservation?.toLowerCase().includes('flange') ||
        i.aiObservation?.toLowerCase().includes('corner') ||
        i.aiObservation?.toLowerCase().includes('sharp')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Sharp steel edges present a known challenge for intumescent systems — the Rayleigh instability of liquid films causes thinning at edges and corners during application.',
        'Best practice aligned to AS 3894 inspection requirements specifies a stripe coat applied to all sharp edges before main coat application.',
      ],
      manufacturerLogicNotes: [
        'Most thin-film intumescent manufacturers specify a minimum edge radius or a mandatory stripe coat procedure for sharp edges to prevent holiday and cracking.',
        'Failure to stripe-coat sharp edges is one of the most common installation defects observed in quality audits.',
      ],
      intumescentSystemNotes: [
        'Thin-film water-based intumescent products have lower build-per-coat than solvent-based or epoxy systems, making edge detailing more critical.',
        'Cracking at sharp edges typically indicates the WFT at the edge was below the minimum required — not a product failure but an application technique issue.',
      ],
      rationale: 'Edge cracking on thin-film water-based intumescent is a workmanship issue with a defined root cause. Stripe-coat procedure during application should be confirmed against the ITP.',
    },
  },

  {
    id: 'SYS-04',
    name: 'Solvent-Based Intumescent — Crack Tendency at High Build',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      i.observedConcern === 'Cracking' &&
      (i.aiObservation?.toLowerCase().includes('thick') ||
        i.aiObservation?.toLowerCase().includes('high build') ||
        i.aiObservation?.toLowerCase().includes('wide crack') ||
        i.aiObservation?.toLowerCase().includes('deep crack')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Solvent-based intumescent products are susceptible to mud-cracking if individual coat thickness exceeds the manufacturer maximum per-coat WFT.',
        'AS 3894 quality inspection expects DFT readings to conform to per-coat and total DFT limits as specified in the ITP.',
      ],
      manufacturerLogicNotes: [
        'Solvent-based intumescent systems typically require multiple thin coats with defined drying intervals — applying excessive thickness per coat traps solvent and causes cracking during cure.',
        'Mud-cracking in solvent-based intumescent is a definitive indicator of over-application per coat, not product failure.',
      ],
      intumescentSystemNotes: [
        'Solvent-based intumescent systems have a characteristic flexible film at correct DFT but become brittle and crack-prone when over-applied.',
        'Repair compatibility is critical — using a water-based product to patch solvent-based intumescent is not acceptable without manufacturer approval.',
      ],
      rationale: 'Cracking consistent with over-application of solvent-based intumescent is a workmanship issue. Inspection of per-coat WFT records and applicator method is required.',
    },
  },

  {
    id: 'SYS-05',
    name: 'Internal-Only System Used in Exposed/External Location',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      (i.observedConcern === 'Blistering / Bubbling' ||
        i.observedConcern === 'Delamination' ||
        i.aiObservation?.toLowerCase().includes('degrad') ||
        i.aiObservation?.toLowerCase().includes('fail') ||
        i.aiObservation?.toLowerCase().includes('moisture')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Not all intumescent products are suitable for external or exposed environments — product system data sheets define the maximum exposure category.',
        'Using an internal-only rated system in an external environment is a specification error with durability and potentially fire performance consequences.',
      ],
      manufacturerLogicNotes: [
        'Internal-only intumescent products typically use formulations that absorb moisture rapidly when exposed to weather — this is the primary cause of rapid blistering and delamination in incorrect applications.',
        'Retrospective topcoat application may partially mitigate but cannot fully restore a product applied outside its stated service category.',
      ],
      intumescentSystemNotes: [
        'External-grade intumescent systems incorporate additional moisture barriers and UV-stable topcoat requirements not present in internal products.',
        'The fire expansion performance of an internal product degraded by moisture exposure is unreliable.',
      ],
      rationale: 'Rapid degradation in an exposed environment suggests a possible specification error — the intumescent product may not be rated for external use. Confirm product data sheet vs actual exposure category.',
    },
  },

  {
    id: 'SYS-06',
    name: 'Patch Repair — Incompatible System',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('patch') ||
        i.aiObservation?.toLowerCase().includes('repair') ||
        i.aiObservation?.toLowerCase().includes('different colour') ||
        i.aiObservation?.toLowerCase().includes('different color') ||
        i.aiObservation?.toLowerCase().includes('inconsistent texture')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Verification',
      standardsNotes: [
        'Repair materials must be compatible with the original coating system — mixing intumescent formulations from different manufacturers or of different types (water-based vs solvent-based vs epoxy) may not be acceptable.',
        'Best practice requires repair compliance to be confirmed against the original product specification.',
      ],
      manufacturerLogicNotes: [
        'Intumescent manufacturers typically specify that repairs must use the same product from the original approved system.',
        'Different intumescent products may expand at different temperatures, rates, or volumes — mixed systems create unpredictable fire performance at the repair interface.',
      ],
      intumescentSystemNotes: [
        'Visual evidence of a different texture or colour at repair areas is a reliable indicator that a different product batch or product type was used.',
        'Repair DFT must also match the original specification to ensure equivalent fire performance.',
      ],
      rationale: 'Visible evidence of an inconsistent repair area requires verification that the repair product is compatible with the original system specification and that DFT has been measured at the repair.',
    },
  },

  {
    id: 'SYS-07',
    name: 'Topcoat Failure — Intumescent Durability Compromised',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.aiObservation?.toLowerCase().includes('topcoat') ||
        i.aiObservation?.toLowerCase().includes('seal coat') ||
        i.aiObservation?.toLowerCase().includes('finish coat')) &&
      (i.observedConcern === 'Delamination' ||
        i.observedConcern === 'Damage' ||
        i.aiObservation?.toLowerCase().includes('fail') ||
        i.aiObservation?.toLowerCase().includes('broken')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'The topcoat serves as the primary durability barrier for the intumescent system — topcoat failure triggers a maintenance obligation to reinstate the sealing layer.',
        'Durability guidance consistent with AS/NZS 2312 protective coating principles requires the complete system to be maintained through its rated design life.',
      ],
      manufacturerLogicNotes: [
        'Replacement topcoat must be confirmed as compatible with the underlying intumescent product — not all topcoat products are approved for use over all intumescent formulations.',
        'Some intumescent manufacturers require a tie-coat or seal coat to be applied before overcoating with a new topcoat after the intumescent has been in service.',
      ],
      intumescentSystemNotes: [
        'The topcoat on an intumescent system performs two functions: weather protection and physical protection of the soft intumescent matrix beneath.',
        'Once the topcoat has failed, the exposed intumescent begins moisture uptake immediately — reinstatement urgency depends on environmental exposure category.',
      ],
      rationale: 'Topcoat failure on an intumescent system is a maintenance scope item. However, reinstatement requires confirmation of product compatibility with the underlying intumescent.',
    },
  },

  // ─── NZ/AU STANDARDS LAYER ────────────────────────────────────────────────

  {
    id: 'STD-01',
    name: 'AS 3894 — New Work Holiday or Coverage Defect',
    match: (i) =>
      i.isNewInstall &&
      (i.observedConcern === 'Missing Material' ||
        i.aiObservation?.toLowerCase().includes('holiday') ||
        i.aiObservation?.toLowerCase().includes('pinhole') ||
        i.aiObservation?.toLowerCase().includes('miss') ||
        i.aiObservation?.toLowerCase().includes('bare')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'AS 3894 (Protective Coating Inspection) provides the framework for workmanship inspection of new protective coating work — holidays and bare areas in new work represent non-conformances under this inspection framework.',
        'New work with coating misses should be reviewed against the ITP and documented as a workmanship non-conformance for contractor response.',
      ],
      manufacturerLogicNotes: [
        'All coating manufacturers specify that coating coverage must be complete and holiday-free — misses invalidate any product warranty.',
        'Holiday detection testing (wet sponge or high-voltage) is the standard method for confirming holiday-free coverage.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Coating holidays or bare areas on new work represent a workmanship non-conformance. Holiday detector testing is recommended to define the full extent before remediation.',
    },
  },

  {
    id: 'STD-02',
    name: 'AS/NZS 2312 — Maintenance Coating Life Exceeded',
    match: (i) =>
      !i.isNewInstall &&
      i.systemType === 'Protective Coating' &&
      (i.observedConcern === 'Rust / Corrosion' || i.observedConcern === 'Delamination') &&
      (i.aiObservation?.toLowerCase().includes('widespread') ||
        i.aiObservation?.toLowerCase().includes('general') ||
        i.aiObservation?.toLowerCase().includes('overall') ||
        i.aiObservation?.toLowerCase().includes('age')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'AS/NZS 2312.1 (Guide to the protection of structural steel against atmospheric corrosion) provides guidance on maintenance intervals based on environment and coating system design life.',
        'General corrosion and delamination across a structure indicates the coating has reached or exceeded its design maintenance interval — a full refurbishment assessment is warranted.',
      ],
      manufacturerLogicNotes: [
        'Overcoating an end-of-life system without full preparation is unlikely to achieve the specified system performance life.',
        'A condition survey report quantifying the percentage of areas at each condition grade (per ISO 4628 or AS 3894 criteria) is the recommended basis for refurbishment scope.',
      ],
      intumescentSystemNotes: [],
      rationale: 'General coating breakdown consistent with end-of-design-life indicates a maintenance scope assessment aligned to AS/NZS 2312 principles is required, not localised repair.',
    },
  },

  {
    id: 'STD-03',
    name: 'AS 4072.1 — Firestopping Continuity Concern',
    match: (i) =>
      i.systemType === 'Firestopping' &&
      (i.observedConcern === 'Missing Material' ||
        i.observedConcern === 'Damage' ||
        i.aiObservation?.toLowerCase().includes('gap') ||
        i.aiObservation?.toLowerCase().includes('open') ||
        i.aiObservation?.toLowerCase().includes('breach') ||
        i.aiObservation?.toLowerCase().includes('unsealed')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'AS 4072.1 (Components for the protection of openings in fire-resistant separating elements) governs the performance requirements for firestopping seals through fire-rated elements in Australian/NZ construction.',
        'Any breach, gap, or unsealed penetration through a fire-rated element represents a direct continuity concern under the FRL intent of the rated assembly.',
        'Under NCC/NZBC performance requirements, the fire resistance of the element must be maintained through any penetrating service.',
      ],
      manufacturerLogicNotes: [
        'Third-party assessed firestopping systems are required — they must be installed per the system test evidence (Codemark, CodeMark, or ETA certificate) to be considered compliant.',
        'The specific penetrating service type and element construction must both fall within the tested scope of the seal system certificate.',
      ],
      intumescentSystemNotes: [],
      rationale: 'An unsealed or damaged penetration through a fire-rated element is a direct concern under AS 4072.1 and the FRL intent of the rated construction. Remediation should be prioritised.',
    },
  },

  {
    id: 'STD-04',
    name: 'ISO 4628 — Rust Degree Classification',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Rust / Corrosion',
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'ISO 4628-3 provides a standardised method for evaluating the degree of rusting in coatings using reference photographic grades (Ri 0 to Ri 5).',
        'Documenting the rust grade per ISO 4628-3 provides a quantitative basis for condition assessment and remediation scope definition.',
        'AS 3894 inspection reporting may reference ISO 4628 grades as part of formal condition assessment documentation.',
      ],
      manufacturerLogicNotes: [
        'Most protective coating manufacturers specify maximum acceptable corrosion grades on the surface before overcoating during maintenance cycles.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Rust noted — ISO 4628-3 rust degree grading is recommended to quantify condition and support remediation scope definition.',
    },
  },

  {
    id: 'STD-05',
    name: 'AS 4100 Context — Structural Steel Corrosion Risk',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      (i.element === 'Beam' || i.element === 'Column') &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('section') ||
        i.aiObservation?.toLowerCase().includes('flange') ||
        i.aiObservation?.toLowerCase().includes('pit') ||
        i.aiObservation?.toLowerCase().includes('thickness')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'AS 4100 (Steel structures) governs the structural design of steel elements — significant section loss from corrosion can reduce load-carrying capacity below the design requirements.',
        'Where corrosion with visible section loss or pitting is identified on a primary structural element, a structural engineering review may be warranted.',
        'The protective coating inspection role is to identify the need for structural assessment — section loss measurement is a structural engineering function.',
      ],
      manufacturerLogicNotes: [],
      intumescentSystemNotes: [],
      rationale: 'Corrosion on a primary structural steel element with possible section loss indicators requires escalation to structural review alongside the coating remediation assessment.',
    },
  },

  {
    id: 'STD-06',
    name: 'NZBC / NCC — FRR Performance Intent Concern',
    match: (i) =>
      i.systemType === 'Intumescent' &&
      (i.observedConcern === 'Missing Material' ||
        i.observedConcern === 'Damage' ||
        i.observedConcern === 'Rust / Corrosion') &&
      (i.aiObservation?.toLowerCase().includes('exposed') ||
        i.aiObservation?.toLowerCase().includes('steel') ||
        i.aiObservation?.toLowerCase().includes('missing') ||
        i.aiObservation?.toLowerCase().includes('bare')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Under the New Zealand Building Code (Clause C — Protection from Fire) and the NCC, structural steel elements in fire-rated assemblies must maintain their FRR throughout the building life.',
        'Any exposed or unprotected steel on an element with an FRR requirement represents a performance concern against the intent of the fire rating.',
        'The FRR of the element should be confirmed from structural drawings before assessing the compliance concern level.',
      ],
      manufacturerLogicNotes: [
        'Intumescent product assessments and test certificates specify the minimum DFT required to achieve each FRR rating — bare steel has zero FRR contribution.',
      ],
      intumescentSystemNotes: [
        'Even small areas of exposed steel on an FRR-rated element can compromise the thermal performance of the element at that location in a fire event.',
      ],
      rationale: 'Exposed steel on an element with an FRR requirement is a building code compliance concern under NZBC Clause C / NCC C2 requirements. Immediate localised reinstatement is required.',
    },
  },

  {
    id: 'STD-07',
    name: 'AS 3894 — DFT Non-Conformance on New Work',
    match: (i) =>
      i.isNewInstall &&
      i.systemType === 'Intumescent' &&
      (i.aiObservation?.toLowerCase().includes('thin') ||
        i.aiObservation?.toLowerCase().includes('dft') ||
        i.aiObservation?.toLowerCase().includes('thickness') ||
        i.aiObservation?.toLowerCase().includes('low build') ||
        i.aiObservation?.toLowerCase().includes('insufficient')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'AS 3894.3 (Site testing of protective coatings — Determination of dry film thickness) specifies the measurement method for verifying DFT compliance.',
        'For intumescent coatings, the DFT must meet the minimum required by the FRR/FRL assessment for the specific steel section and protection type.',
        'Under-thickness on new work is a workmanship non-conformance — repair or build-up must be documented and verified by further DFT measurement.',
      ],
      manufacturerLogicNotes: [
        'Intumescent manufacturers specify different minimum DFTs for different structural steel sections, fire ratings, and heating profiles — the correct DFT target must be confirmed from the project-specific assessment.',
        'Under-thickness at one location may indicate a systemic application control issue requiring broader DFT survey.',
      ],
      intumescentSystemNotes: [
        'Insufficient DFT means insufficient intumescent expansion volume in a fire — the FRR cannot be achieved.',
      ],
      rationale: 'DFT non-conformance on intumescent new work is a critical workmanship issue directly affecting fire performance. DFT survey to AS 3894.3 is required to quantify scope.',
    },
  },

  // ─── COMPLIANCE HEURISTIC LAYER ───────────────────────────────────────────

  {
    id: 'CHR-01',
    name: 'Isolated Localised Damage — Maintenance Classification',
    match: (i) =>
      !i.isNewInstall &&
      i.observedConcern === 'Damage' &&
      (i.aiObservation?.toLowerCase().includes('small') ||
        i.aiObservation?.toLowerCase().includes('local') ||
        i.aiObservation?.toLowerCase().includes('isolated') ||
        i.aiObservation?.toLowerCase().includes('single') ||
        i.aiObservation?.toLowerCase().includes('minor')),
    output: {
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'Isolated localised damage to an in-service coating is a routine maintenance item — it does not necessarily indicate systemic failure or non-conformance.',
      ],
      manufacturerLogicNotes: [
        'Localised repair to an isolated damage area is acceptable where the surrounding coating is intact and properly adhered.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Small isolated damage is a maintenance repair scope item. Verify surrounding coating integrity before treating as localised only — tap and DFT check the adjacent area.',
    },
  },

  {
    id: 'CHR-02',
    name: 'Repeated Same Defect — Systemic Classification',
    match: (i) =>
      (i.aiObservation?.toLowerCase().includes('repeat') ||
        i.aiObservation?.toLowerCase().includes('multiple') ||
        i.aiObservation?.toLowerCase().includes('pattern') ||
        i.aiObservation?.toLowerCase().includes('widespread') ||
        i.aiObservation?.toLowerCase().includes('consistent')),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Systemic',
      standardsNotes: [
        'A repeated defect pattern across multiple elements typically indicates a systemic specification, application, or process issue rather than isolated maintenance.',
        'AS 3894 inspection principles recommend that systemic patterns be investigated at root cause level before individual remediation is commenced.',
      ],
      manufacturerLogicNotes: [
        'Coating manufacturers typically investigate batch-related failures separately from application-technique failures — batch records and application conditions should be reviewed if pattern is systemic.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Repeated pattern defect — classify as systemic pending root cause investigation. Individual repair without root cause resolution is likely to fail again.',
    },
  },

  {
    id: 'CHR-03',
    name: 'UV Fade Only — Cosmetic / Low Priority',
    match: (i) =>
      (i.environment === 'External' || i.environment === 'Exposed / Harsh') &&
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('chalk') ||
        i.aiObservation?.toLowerCase().includes('fade') ||
        i.aiObservation?.toLowerCase().includes('dull') ||
        i.aiObservation?.toLowerCase().includes('colour')) &&
      !(i.observedConcern === 'Rust / Corrosion' ||
        i.observedConcern === 'Delamination' ||
        i.aiObservation?.toLowerCase().includes('rust') ||
        i.aiObservation?.toLowerCase().includes('crack') ||
        i.aiObservation?.toLowerCase().includes('blister')),
    output: {
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'Topcoat chalking and fading due to UV exposure is an expected weathering process in organic coatings — ISO 4628-6 addresses chalking assessment.',
        'Chalking alone without associated corrosion or adhesion failure is a low-priority maintenance cosmetic item under AS/NZS 2312 guidance.',
      ],
      manufacturerLogicNotes: [
        'UV degradation of the topcoat eventually exposes the intermediate coat — the maintenance trigger is typically when the topcoat has degraded to 50% of its original thickness or the intermediate coat becomes visible.',
      ],
      intumescentSystemNotes: [],
      rationale: 'UV chalking without underlying corrosion or adhesion failure is a routine cosmetic maintenance item. Monitor and recoat per the maintenance schedule.',
    },
  },

  {
    id: 'CHR-04',
    name: 'Water Trap Geometry — Detailing Issue',
    match: (i) =>
      (i.aiObservation?.toLowerCase().includes('water trap') ||
        i.aiObservation?.toLowerCase().includes('drainage') ||
        i.aiObservation?.toLowerCase().includes('ponding') ||
        i.aiObservation?.toLowerCase().includes('ledge') ||
        i.aiObservation?.toLowerCase().includes('hollow section') ||
        i.aiObservation?.toLowerCase().includes('standing water')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Water trap geometries in structural steelwork are a known corrosion risk — AS/NZS 2312.1 design guidance recommends avoiding water-collecting details or providing adequate drain holes.',
        'Where existing water traps cannot be modified, a higher corrosion environment classification and corresponding coating specification may be required.',
      ],
      manufacturerLogicNotes: [
        'Standard coating specifications are based on uniform environmental exposure — micro-environments created by water traps can accelerate corrosion at many times the ambient rate.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Water trap geometry identified — a design or detailing issue that creates a more aggressive local corrosion environment. Drain modification and/or enhanced coating specification should be considered.',
    },
  },

  {
    id: 'CHR-05',
    name: 'Post-Install Breach — Services Contractor Scope',
    match: (i) =>
      !i.isNewInstall &&
      (i.aiObservation?.toLowerCase().includes('cable') ||
        i.aiObservation?.toLowerCase().includes('pipe') ||
        i.aiObservation?.toLowerCase().includes('service') ||
        i.aiObservation?.toLowerCase().includes('drill') ||
        i.aiObservation?.toLowerCase().includes('penetrat') ||
        i.aiObservation?.toLowerCase().includes('recent')) &&
      (i.observedConcern === 'Damage' || i.observedConcern === 'Missing Material'),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Post-installation damage to applied coatings or firestopping by subsequent services trades is a workmanship and contract management issue.',
        'Permit-to-penetrate and permit-to-work systems are the standard control mechanism for managing this risk in construction and building management.',
      ],
      manufacturerLogicNotes: [
        'Services contractors are not typically trained in coating reinstatement — damage caused by services installation should be formally documented and directed back to the coating contractor for reinstatement.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Damage from post-install services activity is a workmanship scope issue for the responsible services contractor. Document, photograph, and raise formal NCR for reinstatement direction.',
    },
  },

  {
    id: 'CHR-06',
    name: 'No Traceability / Documentation — Verification Issue',
    match: (i) =>
      (i.aiObservation?.toLowerCase().includes('no label') ||
        i.aiObservation?.toLowerCase().includes('no tag') ||
        i.aiObservation?.toLowerCase().includes('no documentation') ||
        i.aiObservation?.toLowerCase().includes('unidentified') ||
        i.aiObservation?.toLowerCase().includes('unknown product') ||
        i.aiObservation?.toLowerCase().includes('no record')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Verification',
      standardsNotes: [
        'Traceability records including product data sheets, batch numbers, application records, and inspection test plans are required to demonstrate compliance of applied coatings and firestopping.',
        'AS 3894 inspection framework specifies that documentation records form part of the inspection deliverables.',
      ],
      manufacturerLogicNotes: [
        'Without product identification, compatibility of future repairs cannot be confirmed and warranty claims cannot be processed.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Absence of labelling or traceability is a verification concern — the system cannot be confirmed as compliant without identifying the installed products. Request documentation from installer.',
    },
  },

  {
    id: 'CHR-07',
    name: 'New Install — Workmanship Review Recommended',
    match: (i) =>
      i.isNewInstall &&
      (i.observedConcern !== 'Unsure') &&
      (i.observedConcern === 'Cracking' ||
        i.observedConcern === 'Missing Material' ||
        i.observedConcern === 'Delamination'),
    output: {
      complianceConcernLevel: 'High',
      likelyIssueType: 'Workmanship',
      standardsNotes: [
        'Defects identified on new work should be formally documented as non-conformances under the project quality plan.',
        'AS 3894 inspection provides the framework for formal non-conformance reporting on new protective coatings work.',
        'Contractor response, root cause analysis, and remediation verification records should be obtained before the work is accepted.',
      ],
      manufacturerLogicNotes: [
        'Defects on new work during application indicate either a process control failure or a specification issue — both require formal investigation before reinstatement.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Defect identified on new installation work — classify as workmanship non-conformance and initiate formal NCR process with contractor response required.',
    },
  },

  {
    id: 'CHR-08',
    name: 'Corrosion at Joint / Seam — Design Detail Concern',
    match: (i) =>
      i.systemType === 'Protective Coating' &&
      i.observedConcern === 'Rust / Corrosion' &&
      (i.aiObservation?.toLowerCase().includes('joint') ||
        i.aiObservation?.toLowerCase().includes('seam') ||
        i.aiObservation?.toLowerCase().includes('weld') ||
        i.aiObservation?.toLowerCase().includes('fillet') ||
        i.aiObservation?.toLowerCase().includes('interface')),
    output: {
      complianceConcernLevel: 'Moderate',
      likelyIssueType: 'Maintenance',
      standardsNotes: [
        'Corrosion concentrated at joints, welds, and seams is frequently associated with crevice corrosion or inadequate coating coverage at complex geometry.',
        'AS/NZS 2312 design guidance recommends that all joints and seams be sealed or otherwise designed to prevent crevice moisture retention.',
      ],
      manufacturerLogicNotes: [
        'Stripe coat application to all welds and joints is specified by most manufacturers to ensure adequate film build at critical geometry.',
      ],
      intumescentSystemNotes: [],
      rationale: 'Joint/seam corrosion may indicate a combination of design detail and maintenance issues. Review stripe coat application records and consider design modification to eliminate water-collecting joint geometry.',
    },
  },
];

const CONCERN_RANK: Record<ComplianceConcernLevel, number> = { Low: 1, Moderate: 2, High: 3 };
const ISSUE_PRIORITY: Record<LikelyIssueType, number> = {
  Maintenance: 1,
  Verification: 2,
  Workmanship: 3,
  Systemic: 4,
};

export function runRulebookV2(input: V2RuleInput): V2RulebookResult {
  const triggered = V2_RULES
    .filter((r) => {
      try { return r.match(input); } catch { return false; }
    })
    .map((r): V2RuleOutput => ({ ruleId: r.id, ruleName: r.name, ...r.output }));

  if (triggered.length === 0) {
    return {
      triggeredV2Rules: [],
      complianceConcernLevel: 'Low',
      likelyIssueType: 'Maintenance',
      standardsNotes: [],
      manufacturerLogicNotes: [],
      intumescentSystemNotes: [],
      complianceRationale: null,
    };
  }

  const topConcern = triggered.reduce(
    (best, r) => CONCERN_RANK[r.complianceConcernLevel] > CONCERN_RANK[best.complianceConcernLevel] ? r : best,
    triggered[0]
  );

  const topIssue = triggered.reduce(
    (best, r) => ISSUE_PRIORITY[r.likelyIssueType] > ISSUE_PRIORITY[best.likelyIssueType] ? r : best,
    triggered[0]
  );

  const allStandards = Array.from(new Set(triggered.flatMap((r) => r.standardsNotes)));
  const allManufacturer = Array.from(new Set(triggered.flatMap((r) => r.manufacturerLogicNotes)));
  const allIntumescent = Array.from(new Set(triggered.flatMap((r) => r.intumescentSystemNotes)));

  return {
    triggeredV2Rules: triggered,
    complianceConcernLevel: topConcern.complianceConcernLevel,
    likelyIssueType: topIssue.likelyIssueType,
    standardsNotes: allStandards.slice(0, 4),
    manufacturerLogicNotes: allManufacturer.slice(0, 3),
    intumescentSystemNotes: allIntumescent.slice(0, 3),
    complianceRationale: topConcern.rationale,
  };
}
