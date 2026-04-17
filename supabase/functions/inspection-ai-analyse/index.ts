import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_DEFECT_TYPES = [
  "Delamination",
  "Cracking",
  "Mechanical Damage",
  "Missing Coating",
  "Corrosion Breakthrough",
  "Blistering",
  "Spalling",
  "Voids",
  "Incomplete Firestopping",
  "Surface Deterioration",
  "Moisture Damage",
  "Unknown",
];

const TIER1_MODEL_OPENAI = "gpt-4o-mini";
const TIER2_MODEL_OPENAI = "gpt-4o";
const TIER2_MODEL_ANTHROPIC = "claude-opus-4-5";

const TIER1_PROMPT = `You are a senior coatings and passive fire protection inspector. Analyse the inspection photograph and return a JSON classification.

IMAGE QUALITY CHECK (do this first, before any defect analysis):
- If the image is blurry, out of focus, poorly lit, overexposed, underexposed, or too low resolution to make reliable observations, set requires_manual_review = true and escalation_reason = "poor image quality — unable to make reliable assessment". Still attempt classification but use confidence < 40.

DEFECT TYPES (choose one only):
Mechanical Damage | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

RULES:
- Return Unknown if you are not confident — do NOT guess
- Mechanical Damage ONLY if a clear physical impact mark (gouge, dent, abrasion) is visible
- Severity: Low = cosmetic, Medium = local failure, High = exposed substrate or safety breach
- Confidence: 0-100. Use < 70 if there is any ambiguity.
- Populate all geometry fields

Return ONLY valid JSON:
{
  "system_type": "",
  "defect_type": "",
  "severity": "Low|Medium|High",
  "confidence": 0,
  "observation": "",
  "likely_cause": "",
  "visible_evidence": [],
  "next_checks": [],
  "escalate": false,
  "escalation_reason": "",
  "remediation_guidance": "",
  "requires_manual_review": false,
  "corrosivity_category": "C1|C2|C3|C4|C5|Unknown",
  "geometry": {
    "location_on_member": "",
    "pattern": "",
    "extent": "",
    "likely_mechanism": "",
    "urgent_action": ""
  }
}`;

const TIER2_BASE_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of field experience across New Zealand and Australia.

Your task is to analyse ONE inspection photograph only.

You specialise in:
1. Intumescent coatings (thin-film and thick-film, waterborne and solventborne epoxy)
2. Cementitious and vermiculite-based fireproofing (spray-applied, wet mix, dense and lightweight)
3. Protective and anti-corrosion coatings (epoxy, zinc-rich, polyurethane, alkyds)
4. Passive fire board systems (calcium silicate, gypsum fire board, shaft wall)
5. Firestopping systems (intumescent sealants, collars, wraps, batt systems, foam seals)

NZ/AU CONTEXT:
You work within NZBC Clause C / NCC fire provisions. Common manufacturers in this market include Nullifire, Carboline, Jotun Steelmaster, International Interchar, Sherwin-Williams, Promat, Hilti CP, Tremco Fyre-Shield, Sika Pyroplug/Pyroflex, 3M, FSi, Isolatek/Cafco, and GCP/Grace legacy cementitious systems. You understand NZ field conditions: coastal exposure (C3-C4), high UV, wet construction cycles, and common subcontractor workmanship patterns.

You must classify ONLY visible evidence. Do NOT invent hidden defects unless marked as POSSIBLE. Never default to Mechanical Damage unless you can see a clear physical impact — a gouge, dent, or abrasion mark.

--------------------------------------------------
STEP 0 — IMAGE QUALITY ASSESSMENT (do this first, before any other analysis)
Assess whether the photograph provides sufficient clarity to make a reliable inspection finding.

If ANY of these conditions apply, set requires_manual_review = true and set escalation_reason = "poor image quality — [specific reason]":
- Image is blurry or out of focus
- Lighting is too dark, too bright, or heavily shadowed over the defect area
- Resolution is too low to resolve coating texture or defect detail
- Subject is obscured by glare, flash reflection, or obstruction
- Camera angle is too oblique to assess defect extent

If image quality is poor, still attempt classification but cap confidence at 40 and note the limitation in observation.

--------------------------------------------------
STEP 1 — IDENTIFY LIKELY SYSTEM
Choose one: Intumescent | Cementitious | Protective Coating | Firestopping | Unknown

SYSTEM IDENTIFICATION GUIDANCE:
- Intumescent: smooth or slightly textured film on steel, typically 1-5mm DFT, may show runs/striations, can be white/grey/cream/coloured
- Cementitious / vermiculite: rough, granular or pebbled texture, matte finish, grey or brown tones, may show powder loss or surface erosion, typically thicker application (12-50mm)
- Protective coating: smooth painted finish on steel, not fire-rated by itself, may be zinc-rich primer, epoxy, or polyurethane; does not expand
- Board system: flat panels mechanically fixed, visible joints, screws, tape; calcium silicate is white/cream with uniform face
- Firestopping: seals around penetrations (cables, pipes, ducts), typically sealant bead, foam, collar, wrap, or batt packing
- Unknown: insufficient evidence to classify

--------------------------------------------------
STEP 1B — ISO 12944 CORROSIVITY CLASSIFICATION
Based on visible clues in the photograph (surface rust, moisture staining, condensation, coastal exposure, industrial contamination, sheltered vs exposed conditions), classify the likely environment:

C1 — Very low: heated interior, dry, no condensation
C2 — Low: unheated interior, rural/suburban exterior, minimal moisture
C3 — Medium: coastal/urban exterior, moderate humidity, light industrial
C4 — High: marine splash zone, industrial chemical exposure, high humidity interior
C5 — Very high: offshore, severe industrial, permanent condensation or chemical immersion

Add your classification as "corrosivity_category": "C1" through "C5" in the JSON output. If visual clues are insufficient, use "Unknown".
Note: High corrosivity (C4–C5) combined with any corrosion defect is automatic escalation regardless of severity.

--------------------------------------------------
STEP 2 — VISUAL OBSERVATIONS
Describe only what is visible in the photograph. Examples: cracking, edge splitting, rust staining, coating loss, impact gouge, blistering, delamination, missing material, patch repair, exposed steel, moisture staining, erosion, voids, surface contamination, powdering, spalling, adhesion loss, efflorescence.

--------------------------------------------------
STEP 3 — ROOT CAUSE REASONING
Choose the most likely cause: Mechanical impact | Moisture ingress | Corrosion from substrate | Application defect | Movement / vibration | UV / weather ageing | Poor surface preparation | Incompatible repair | Thermal movement | Adhesion failure | Exposure mismatch | Unknown

--------------------------------------------------
STEP 4 — CONTROLLED DEFECT CLASSIFICATION
Choose ONE only from this exact list:
- Mechanical Damage: clear evidence of physical impact — gouge, dent, abrasion. NOT delamination.
- Cracking: visible fissures, fractures, hairline cracks in coating or matrix
- Delamination: coating or material separating in layers, peeling, lifting from substrate
- Missing Coating: bare steel or substrate exposed where coating should be present
- Corrosion Breakthrough: rust staining visible through or at edges of coating
- Blistering: bubbles, raised domes, hollow sections under surface
- Spalling: fragments breaking off, chunking, surface material loss (cementitious systems)
- Voids: gaps, holes, unfilled sections
- Incomplete Firestopping: firestopping system not fully sealed or installed
- Surface Deterioration: generalised weathering, chalking, fading, powdering, erosion — no specific defect mechanism
- Moisture Damage: water staining, efflorescence, wet/damp coating with no active rust
- Unknown: insufficient image evidence to classify reliably

DISAMBIGUATION RULES:
- Mechanical Damage vs Delamination: If you see a gouge/scrape/abrasion = Mechanical Damage. If you see lifting/peeling/layer separation = Delamination.
- Rust bleed through topcoat = Corrosion Breakthrough, NOT Mechanical Damage.
- Cementitious chunk loss = Spalling, NOT Mechanical Damage.
- Cementitious surface erosion / powdering = Surface Deterioration.
- Penetration gaps or incomplete seals = Incomplete Firestopping.
- If genuinely uncertain = Unknown. Never guess Mechanical Damage by default.

--------------------------------------------------
STEP 5 — SEVERITY
Choose: Low | Medium | High

HIGH if: exposed substrate, active corrosion, missing fire protection, widespread detachment, safety-critical breach, full-depth cementitious spall, penetration gap.
MEDIUM if: local failure, cracking, moderate impact damage, isolated moisture issue, surface erosion without substrate exposure.
LOW if: cosmetic wear, minor marking, light fade, superficial scuff, minor powdering.

--------------------------------------------------
STEP 6 — DEFECT GEOMETRY
Describe WHERE and HOW the defect presents on the element.

location_on_member: where on the element (e.g. "lower flange edge", "web midspan", "column base", "around bolt group", "penetration perimeter", "connection plate junction", "top flange", "soffit", "column face", "beam soffit")
pattern: how it distributes (e.g. "linear", "radial from point", "isolated patch", "widespread", "repeated at intervals", "edge-following", "circumferential", "full face")
extent: how much area is affected (e.g. "< 50mm isolated", "50-200mm localised", "200-500mm moderate", "> 500mm widespread", "full element")
likely_mechanism: specific mechanism given location and pattern (e.g. "steel connection movement causing stress crack", "moisture tracking from penetration", "impact from construction traffic", "thermal cycling at unprotected edge", "adhesion loss from contaminated substrate", "freeze-thaw cycling in wet cementitious")
urgent_action: site action priority (e.g. "monitor", "document and notify", "temporary protection required", "repair before next inspection", "immediate repair — safety critical")

--------------------------------------------------
STEP 7 — CONFIDENCE (0 to 100)
90+: clear, obvious defect with high certainty
70-89: likely defect with good visual evidence
50-69: partial evidence, some uncertainty
0-49: insufficient image quality or ambiguous evidence — set requires_manual_review = true

--------------------------------------------------
STEP 8 — ESCALATION
Escalate if any of:
- Confidence < 70
- Corrosion Breakthrough on structural steel
- Incomplete Firestopping at any penetration
- Spalling with visible substrate (cementitious full-depth loss)
- Delamination > 300mm extent (if estimable)
- Multiple defects on same element
- Missing coating on fire-rated element

--------------------------------------------------
STEP 9 — RESPONSE FORMAT
Return ONLY a valid JSON object. No markdown. No extra text.

{
  "system_type": "",
  "defect_type": "",
  "severity": "",
  "confidence": 0,
  "observation": "",
  "likely_cause": "",
  "visible_evidence": [],
  "next_checks": [],
  "escalate": false,
  "escalation_reason": "",
  "remediation_guidance": "",
  "requires_manual_review": false,
  "corrosivity_category": "C1|C2|C3|C4|C5|Unknown",
  "geometry": {
    "location_on_member": "",
    "pattern": "",
    "extent": "",
    "likely_mechanism": "",
    "urgent_action": ""
  }
}

If confidence < 50, set requires_manual_review = true.
Never set defect_type = "Mechanical Damage" unless you can see a clear physical impact mark in the image.
If corrosivity_category is C4 or C5 and defect involves any corrosion, set escalate = true.`;

const INTUMESCENT_SPECIALIST_ADDENDUM = `

--------------------------------------------------
INTUMESCENT SPECIALIST MODE — ACTIVE
You have identified or been told this is an intumescent system. Apply these additional reasoning rules:

FRL CONTINUITY CHECK (mandatory for all intumescent assessments):
The purpose of intumescent coating is to maintain fire resistance continuity. Any visible condition that compromises coating continuity — regardless of how localised — must be treated as a fire safety risk.

AUTOMATIC High severity + escalate = true if ANY of the following are observed:
- Cracking that penetrates through the coating depth (not surface crazing only)
- Flaking, spalling, or chunk loss that exposes the steel substrate
- Delamination leaving bare or near-bare steel
- Missing coating at any location on a fire-rated member
- Visible gaps or voids in the coating

Even a small breach (< 50mm) on a fire-rated element should be escalated. The FRL of the element depends on full continuous coverage — partial failure = system failure in a fire event.
Set escalation_reason to include: "FRL continuity breach — fire protection integrity compromised"

PRODUCT FAMILY REASONING:
- Waterborne thin-film (e.g. Nullifire S607, Jotun Steelmaster 60/120WB, International Interchar 1120): internally biased, sensitive to moisture without topcoat, softer texture. Evidence: soft/tacky feel, wash marks, swelling around moisture ingress.
- Solventborne thin-film (e.g. Nullifire S802, Jotun Steelmaster 1000/2000SB): higher weather tolerance, harder film. Evidence: no softening in wet conditions, harder fracture pattern.
- Epoxy intumescent (e.g. Carboline Interam, Nullifire S908, Jotun Steelmaster EP): highest durability, used in petrochemical/harsh environments. Evidence: very hard film, chunk fracture rather than peeling.
- Hybrid fast-track (e.g. Sherwin-Williams Firetex FX): single-coat, high build, faster programme. Evidence: heavy single-coat texture, no primer colour visible below.

THIN-FILM vs THICK-FILM:
- Thin-film (<3mm): cracking often hairline, may follow steel surface profile
- Thick-film (>3mm): cracking often wider, spalling more likely if impact
- If you cannot determine thickness from image, note in observation

CONNECTION ZONE LOGIC:
- Cracking adjacent to bolts, cleats, or weld toes = thermal/movement mechanism, not workmanship
- Missing coating near bolt heads = common installation defect, note as Missing Coating

Always populate the geometry fields with specific intumescent context.`;

const CEMENTITIOUS_SPECIALIST_ADDENDUM = `

--------------------------------------------------
CEMENTITIOUS / VERMICULITE FIREPROOFING SPECIALIST MODE — ACTIVE
You have identified or been told this is a cementitious or vermiculite-based passive fire system. Apply these additional reasoning rules.

SYSTEM CHARACTERISTICS:
Cementitious fireproofing has a rough, granular, or pebbled texture — it does NOT look like paint. It is applied thickly (typically 12-50mm) by spray or trowel. Common NZ products include Cafco 300/400, Isolatek Blaze-Shield, GCP Monokote legacy systems, and proprietary mixes. It is grey, off-white, or brown in colour.

Do NOT confuse cementitious fireproofing with:
- Concrete overspray (smooth, grey, may be thinner)
- Old plaster or render (smoother texture, architectural use)
- Aged concrete soffit (part of the structure, not a coating)
The distinguishing feature is texture: cementitious fire protection is granular/pebbled and adheres directly to structural steel.

CEMENTITIOUS-SPECIFIC DEFECT PATTERNS:

SPALLING (most common severe defect):
- Chunks or fragments of material have broken off the steel surface
- Exposed steel substrate is visible at the failure zone
- Severity = High automatically; escalate = true
- Cause: mechanical impact (most common), adhesion failure, freeze-thaw, water saturation
- Next check: full-depth probe test on adjacent areas; check for loose/hollow zones by tap test

DELAMINATION / ADHESION LOSS:
- Material lifting from substrate or between coats without chunk loss yet
- Look for cracking at substrate interface, material beginning to detach
- Severity = Medium to High; escalate if > 200mm or on primary structural member
- Often precedes full spall

CRACKING (surface or full-depth):
- Surface crazing = Low concern, cosmetic shrinkage, very common in cementitious
- Full-depth cracking (crack penetrates entire material depth to substrate) = High, escalate
- Pattern: if linear and at panel edges = shrinkage/differential thermal; if radial = impact

MOISTURE DAMAGE / EFFLORESCENCE:
- White salt deposits (efflorescence) = moisture moving through material
- Dark wet staining = active moisture; risk of adhesion loss and freeze-thaw damage
- Softened or friable surface = wet material has lost integrity
- Severity = Medium; escalate if widespread

MISSING MATERIAL:
- Areas of bare steel visible where cementitious should be present
- Always High severity; escalate = true
- Common around penetrations, at column bases, around bolt groups

SURFACE EROSION / POWDERING:
- Surface is granular/dusty, material can be rubbed off
- Indicates loss of surface hardener or ongoing moisture weathering
- Severity = Low to Medium; monitor and retest

THICKNESS ASSESSMENT:
- If you can see a cross-section or edge, try to estimate thickness
- Standard FRLs require specific DFT; note any obvious insufficient coverage
- Areas of consistent thin application (visible steel profile under material) = Missing Coating

ADHESION LOSS RISK INDICATORS:
- Hollow sound pattern (reference if mentioned): tap testing reveals hollow zones beyond visible area
- Cracks running parallel to substrate interface
- Visible delamination plane in exposed cross-section

Set escalation_reason to include: "Cementitious system integrity concern — FRL continuity requires verification" for any High severity finding.`;

const PROTECTIVE_COATING_SPECIALIST_ADDENDUM = `

--------------------------------------------------
PROTECTIVE COATING SPECIALIST MODE — ACTIVE
You have identified or been told this is a protective or anti-corrosion coating system. Apply these additional reasoning rules.

SYSTEM CHARACTERISTICS:
Protective coatings are multi-coat paint systems applied to steel for corrosion protection. They are NOT fire-rated by themselves. Common system types in NZ:
- Zinc-rich primer / epoxy MIO / polyurethane topcoat (industrial/marine)
- Epoxy primer / epoxy midcoat / polyurethane topcoat (commercial/architectural)
- Alkyd systems (older buildings, maintenance repainting)
- Hot-dip galvanizing (not a coating — integral zinc layer)
Common NZ/AU products: Jotun Hardtop, Carboline Carboguard, Dulux Luxafloor, International Interzinc/Interzone, Sherwin-Williams Zinc Clad.

CORROSION IS THE PRIMARY RISK. Apply ISO 4628-3 rust grading (Ri 0-5) and ISO 12944 corrosivity classes.

DEFECT-SPECIFIC GUIDANCE:

CORROSION BREAKTHROUGH:
- Rust visible through coating film, at coating edges, at weld toes, or under blistered areas
- Edge creep: corrosion spreading from an edge or cut into the coating film
- Ri 0-1 = Low, Ri 2-3 = Medium, Ri 3-5 = High, escalate
- Cathodic disbondment under blistered areas = treat as High severity

DELAMINATION / INTERCOAT ADHESION LOSS:
- Coating layers separating from each other or from substrate
- Osmotic blistering: domed blisters with liquid inside = intercoat failure; High severity
- Mechanical peeling = Delamination; record size and pattern

BLISTERING:
- Discrete domes or bubbles in coating film
- If over rusted areas = likely osmotic corrosion cells; escalate
- If uniform small bubbles on new work = solvent entrapment; Medium severity

SURFACE DETERIORATION (weathering):
- Chalking: powdery surface, UV degradation of topcoat; Low, maintenance concern
- Gloss loss, colour fade: UV ageing; Low unless severely degraded
- Film cracking / alligatoring: coating becoming brittle; Medium, risk of moisture ingress

MISSING COATING:
- Bare metal at welds, edges, penetrations, bolt holes, or damaged areas
- High severity on structural steel or in C3+ environments; escalate

QUALITY DEFECTS (new work):
- Runs, sags, holidays, pinholes: application defects; require repair before service
- Insufficient DFT: cannot verify from image alone, but heavily textured or semi-transparent areas are a visual indicator
- Weld burn-back: coating loss at weld toes from construction welding post-coating

Always relate defect to corrosivity category. C3+ with Ri 2+ = escalate.`;

const FIRESTOPPING_SPECIALIST_ADDENDUM = `

--------------------------------------------------
FIRESTOPPING SPECIALIST MODE — ACTIVE
You have identified or been told this is a firestopping installation. Apply these additional reasoning rules.

FIRESTOPPING CONTEXT:
Firestopping seals penetrations through fire-rated walls and floors to prevent fire and smoke spread. ANY gap, breach, or missing seal is a code non-compliance and a life-safety risk. There is no "cosmetic" category for firestopping defects — all observed defects require documentation and most require remediation.

SYSTEM TYPES:
- Intumescent sealant: gun-applied bead, typically red/white/grey; expands under heat to seal gap
- Intumescent collar: pipe collar that crushes combustible pipe; metal housing with intumescent insert
- Intumescent wrap strip: tape wrapped around pipe inside the wall/floor penetration
- Firestopping pillow/batt: compressible mineral wool or intumescent batt packing for cable/pipe bundles
- Expanding foam: expanding polyurethane foam (CAUTION: non-rated foam = non-compliant, cannot substitute for rated firestop)
- Mineral wool/rockwool packing: used as backing material, NOT a firestop seal by itself unless system-tested

COMMON NZ PRODUCTS: Hilti CP 601/606/620, Sika Pyroplug/Pyroflex, 3M Fire Barrier, Promat Promaseal, FSi Fireflex, Tremco Fyre-Shield.

KEY INSPECTION POINTS:

OPEN OR UNCLOSED GAPS:
- Any visible gap between penetrating service and surrounding construction
- Always High severity; escalate = true; escalation_reason = "FRL breach — open penetration gap"
- Even 1mm gaps are non-compliant for rated penetrations

INCOMPLETE / MISSING FIRESTOP SEAL:
- Sealant not fully applied, bead not fully tooled, partial installation
- Check whether rated firestopping is present at all, or only filler/non-rated foam
- High severity; escalate

DAMAGE TO INSTALLED FIRESTOP:
- Physical damage (puncture, pull-out, cut) to installed seal
- Sealant pulled away from substrate by service movement
- Medium-High depending on whether seal integrity is broken

SHRINKAGE / JOINT SEPARATION:
- Sealant pulling away from masonry, concrete, or drywall substrate (adhesion failure)
- Common around perimeter of large penetrations
- Medium; escalate if gap has opened

UNRATED MATERIALS (expanding foam):
- Expanding polyurethane foam used alone as a "firestop" = NON-COMPLIANT
- Classify as Incomplete Firestopping; always escalate
- escalation_reason = "Non-rated expanding foam used in place of tested firestop system — non-compliant"

POST-INSTALLATION BREACHES:
- Penetration previously sealed but new service has been added through the seal without reinstatement
- Always High severity; escalate

Always populate geometry with penetration location (wall, floor, service type) and note whether a Codemark or third-party assessed system is visible.`;

function buildTier2Prompt(systemType: string): string {
  const lower = (systemType ?? "").toLowerCase();
  if (lower.includes("intumescent")) {
    return TIER2_BASE_PROMPT + INTUMESCENT_SPECIALIST_ADDENDUM;
  }
  if (lower.includes("cementitious") || lower.includes("vermiculite") || lower.includes("spray")) {
    return TIER2_BASE_PROMPT + CEMENTITIOUS_SPECIALIST_ADDENDUM;
  }
  if (lower.includes("protective") || lower.includes("anti-corrosion") || lower.includes("coating")) {
    return TIER2_BASE_PROMPT + PROTECTIVE_COATING_SPECIALIST_ADDENDUM;
  }
  if (lower.includes("firestopping") || lower.includes("penetration") || lower.includes("seal")) {
    return TIER2_BASE_PROMPT + FIRESTOPPING_SPECIALIST_ADDENDUM;
  }
  return TIER2_BASE_PROMPT;
}

function requiresTier2(systemType: string, tier1Result?: Record<string, unknown>): boolean {
  const lower = (systemType ?? "").toLowerCase();
  if (lower.includes("intumescent") || lower.includes("firestopping")) return true;
  if (lower.includes("cementitious") || lower.includes("vermiculite")) return true;
  if (!tier1Result) return false;
  const confidence = Number(tier1Result.confidence ?? 0);
  if (confidence < 70) return true;
  if (String(tier1Result.severity) === "High") return true;
  if (String(tier1Result.defect_type) === "Unknown") return true;
  return false;
}

function buildContextBlock(
  system_type: string | undefined,
  element: string | undefined,
  environment: string | undefined,
  is_new_install: boolean | undefined,
  observed_concern: string | undefined
): string {
  const lower = (system_type ?? "").toLowerCase();

  const systemNote = lower.includes("cementitious") || lower.includes("vermiculite")
    ? `\nSYSTEM NOTE: This is a CEMENTITIOUS / VERMICULITE fireproofing system — granular textured spray-applied material, NOT intumescent paint. Reason about cementitious-specific defects (spalling, adhesion loss, powder loss, cracking, moisture damage). Do not apply intumescent reasoning.`
    : lower.includes("protective") || lower.includes("anti-corrosion")
    ? `\nSYSTEM NOTE: This is a PROTECTIVE / ANTI-CORROSION COATING system (paint, not fire-rated by itself). Focus on corrosion breakthrough, delamination, blistering, film breakdown. Apply ISO 4628 rust grading.`
    : lower.includes("firestopping") || lower.includes("penetration")
    ? `\nSYSTEM NOTE: This is a FIRESTOPPING system at a service penetration. Check for open gaps, incomplete seals, non-rated materials, post-install breaches. Any gap = non-compliant.`
    : lower.includes("intumescent")
    ? `\nSYSTEM NOTE: This is an INTUMESCENT COATING system. Check film continuity, edge protection, connection zones, topcoat, and any substrate exposure.`
    : "";

  return [
    `Inspector-confirmed system type: ${system_type ?? "Unknown"}`,
    `Element: ${element ?? "Unknown"}`,
    `Environment: ${environment ?? "Not specified"}`,
    `Installation status: ${is_new_install ? "New installation (assess for workmanship defects)" : "Existing / aged system (assess for maintenance and degradation)"}`,
    `Inspector's observed concern: ${observed_concern ?? "Not specified"}`,
    systemNote,
  ].filter(Boolean).join("\n");
}

function normaliseDefectType(raw: string): string {
  const cleaned = raw.trim();
  const exact = VALID_DEFECT_TYPES.find(
    (d) => d.toLowerCase() === cleaned.toLowerCase()
  );
  if (exact) return exact;
  const partial = VALID_DEFECT_TYPES.find((d) =>
    cleaned.toLowerCase().includes(d.toLowerCase())
  );
  return partial ?? "Unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitteredBackoff(attempt: number): number {
  const base = Math.pow(2, attempt - 1) * 1000;
  const jitter = Math.random() * 500;
  return base + jitter;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
  attempt: number
): Promise<Response> {
  if (attempt > 1) {
    await sleep(jitteredBackoff(attempt - 1));
  }

  const maxTokens = model === TIER1_MODEL_OPENAI ? 700 : 1200;
  const imageDetail = model === TIER1_MODEL_OPENAI ? "low" : "high";

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: imageDetail,
              },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    }),
  });
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
  attempt: number
): Promise<Response> {
  if (attempt > 1) {
    await sleep(jitteredBackoff(attempt - 1));
  }

  const validMime = (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/webp")
    ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    : "image/jpeg";

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: TIER2_MODEL_ANTHROPIC,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: validMime,
                data: imageBase64,
              },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    }),
  });
}

function validateOutputSchema(parsed: Record<string, unknown>): { valid: boolean; reason: string } {
  if (typeof parsed.defect_type !== "string" || !parsed.defect_type) {
    return { valid: false, reason: "missing_defect_type" };
  }
  if (typeof parsed.severity !== "string" || !["Low", "Medium", "High"].includes(parsed.severity as string)) {
    return { valid: false, reason: "invalid_severity" };
  }
  if (typeof parsed.confidence !== "number") {
    return { valid: false, reason: "missing_confidence" };
  }
  if (typeof parsed.observation !== "string") {
    return { valid: false, reason: "missing_observation" };
  }

  const defect = String(parsed.defect_type);
  const severity = String(parsed.severity);
  const geometryOk = parsed.geometry && typeof parsed.geometry === "object";

  if (defect === "Unknown" && severity === "High") {
    return { valid: false, reason: "impossible_unknown_high" };
  }

  if (!geometryOk) {
    return { valid: false, reason: "missing_geometry" };
  }

  return { valid: true, reason: "" };
}

async function runOpenAIInference(
  apiKey: string,
  model: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
  maxRetries: number
): Promise<{ parsed: Record<string, unknown> | null; lastStatus: number; lastErrorText: string }> {
  let lastStatus = 0;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await callOpenAI(apiKey, model, systemPrompt, imageBase64, mimeType, userPrompt, attempt);
    } catch (fetchErr) {
      lastErrorText = `network_error:${String(fetchErr)}`;
      if (attempt < maxRetries) continue;
      break;
    }

    lastStatus = res.status;

    if (res.status === 429) {
      lastErrorText = "rate_limited";
      if (attempt < maxRetries) {
        await sleep(jitteredBackoff(attempt) * 2);
        continue;
      }
      break;
    }

    if (!res.ok) {
      lastErrorText = await res.text().catch(() => `http_${res.status}`);
      if (attempt < maxRetries) continue;
      break;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      lastErrorText = "empty_response";
      if (attempt < maxRetries) continue;
      break;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      lastErrorText = "invalid_json";
      if (attempt < maxRetries) continue;
      break;
    }

    const { valid, reason } = validateOutputSchema(parsed);
    if (!valid) {
      lastErrorText = `schema_invalid:${reason}`;
      if (attempt < maxRetries) continue;
      break;
    }

    return { parsed, lastStatus: res.status, lastErrorText: "" };
  }

  return { parsed: null, lastStatus, lastErrorText };
}

async function runAnthropicInference(
  apiKey: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
  maxRetries: number
): Promise<{ parsed: Record<string, unknown> | null; lastStatus: number; lastErrorText: string }> {
  let lastStatus = 0;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await callAnthropic(apiKey, systemPrompt, imageBase64, mimeType, userPrompt, attempt);
    } catch (fetchErr) {
      lastErrorText = `anthropic_network_error:${String(fetchErr)}`;
      if (attempt < maxRetries) continue;
      break;
    }

    lastStatus = res.status;

    if (res.status === 429 || res.status === 529) {
      lastErrorText = "rate_limited";
      if (attempt < maxRetries) {
        await sleep(jitteredBackoff(attempt) * 2);
        continue;
      }
      break;
    }

    if (!res.ok) {
      lastErrorText = await res.text().catch(() => `anthropic_http_${res.status}`);
      if (attempt < maxRetries) continue;
      break;
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      lastErrorText = "anthropic_empty_response";
      if (attempt < maxRetries) continue;
      break;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      lastErrorText = "anthropic_no_json_in_response";
      if (attempt < maxRetries) continue;
      break;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      lastErrorText = "anthropic_invalid_json";
      if (attempt < maxRetries) continue;
      break;
    }

    const { valid, reason } = validateOutputSchema(parsed);
    if (!valid) {
      lastErrorText = `anthropic_schema_invalid:${reason}`;
      if (attempt < maxRetries) continue;
      break;
    }

    return { parsed, lastStatus: res.status, lastErrorText: "" };
  }

  return { parsed: null, lastStatus, lastErrorText };
}

function buildResult(
  parsed: Record<string, unknown>,
  tier: 1 | 2,
  provider: "openai" | "anthropic"
): Record<string, unknown> {
  const validSeverities = ["Low", "Medium", "High"];
  const severity = validSeverities.includes(String(parsed.severity))
    ? String(parsed.severity)
    : "Medium";

  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
  const requiresManualReview = Boolean(parsed.requires_manual_review) || confidence < 50;

  const nextChecks = Array.isArray(parsed.next_checks)
    ? (parsed.next_checks as unknown[]).map((c) => String(c)).slice(0, 5)
    : [];

  const visibleEvidence = Array.isArray(parsed.visible_evidence)
    ? (parsed.visible_evidence as unknown[]).map((c) => String(c)).slice(0, 10)
    : [];

  const rawGeometry = parsed.geometry as Record<string, unknown> | undefined;
  const geometry = rawGeometry
    ? {
        location_on_member: String(rawGeometry.location_on_member ?? ""),
        pattern: String(rawGeometry.pattern ?? ""),
        extent: String(rawGeometry.extent ?? ""),
        likely_mechanism: String(rawGeometry.likely_mechanism ?? ""),
        urgent_action: String(rawGeometry.urgent_action ?? ""),
      }
    : null;

  const validCorrosivityCategories = ["C1", "C2", "C3", "C4", "C5", "Unknown"];
  const corrosivityCategory = validCorrosivityCategories.includes(String(parsed.corrosivity_category ?? ""))
    ? String(parsed.corrosivity_category)
    : "Unknown";

  const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));
  const isCorrosionDefect = ["Corrosion Breakthrough", "Missing Coating", "Surface Deterioration"].includes(defectType);
  const isHighCorrosivity = corrosivityCategory === "C4" || corrosivityCategory === "C5";
  const corrosivityEscalate = isHighCorrosivity && isCorrosionDefect;

  const escalationReasons: string[] = [];
  if (parsed.escalation_reason) escalationReasons.push(String(parsed.escalation_reason));
  if (corrosivityEscalate) escalationReasons.push(`High corrosivity environment (${corrosivityCategory}) with corrosion defect — accelerated deterioration risk`);

  return {
    success: true,
    defect_type: defectType,
    severity,
    observation: String(parsed.observation ?? ""),
    confidence,
    likely_cause: String(parsed.likely_cause ?? ""),
    visible_evidence: visibleEvidence,
    next_checks: nextChecks,
    escalate: Boolean(parsed.escalate) || confidence < 70 || corrosivityEscalate,
    escalation_reason: escalationReasons.join("; "),
    remediation_guidance: String(parsed.remediation_guidance ?? ""),
    requires_manual_review: requiresManualReview,
    system_type_detected: String(parsed.system_type ?? ""),
    corrosivity_category: corrosivityCategory,
    geometry,
    tier_used: tier,
    model_used: provider === "anthropic" ? TIER2_MODEL_ANTHROPIC : (tier === 1 ? TIER1_MODEL_OPENAI : TIER2_MODEL_OPENAI),
    provider_used: provider,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!openaiApiKey && !anthropicApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "configuration_error",
          error: "No AI provider API key configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const {
      image_base64,
      mime_type,
      system_type,
      element,
      environment,
      observed_concern,
      is_new_install,
      force_tier2,
    } = body;

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, reason: "missing_image", error: "image_base64 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contextBlock = buildContextBlock(system_type, element, environment, is_new_install, observed_concern);

    const userPrompt = `${contextBlock}

Now analyse the photograph above. Follow all reasoning steps in order. The inspector-confirmed system type above is authoritative — use it to guide your reasoning and apply the correct specialist mode. Populate all geometry fields with specific location and pattern detail. Classify the visible defect using only the controlled terms. Never default to Mechanical Damage unless a physical impact mark is clearly visible.`;

    const skipTier1 = Boolean(force_tier2) || requiresTier2(system_type ?? "", undefined);
    const effectiveMime = mime_type ?? "image/jpeg";

    let tier: 1 | 2 = 1;
    let finalParsed: Record<string, unknown> | null = null;
    let usedProvider: "openai" | "anthropic" = "openai";

    if (!skipTier1 && openaiApiKey) {
      const tier1 = await runOpenAIInference(
        openaiApiKey,
        TIER1_MODEL_OPENAI,
        TIER1_PROMPT,
        image_base64,
        effectiveMime,
        userPrompt,
        2
      );

      if (tier1.parsed && !requiresTier2(system_type ?? "", tier1.parsed)) {
        finalParsed = tier1.parsed;
        tier = 1;
        usedProvider = "openai";
      }
    }

    if (!finalParsed) {
      tier = 2;
      const tier2SystemPrompt = buildTier2Prompt(system_type ?? "");

      if (openaiApiKey) {
        const tier2 = await runOpenAIInference(
          openaiApiKey,
          TIER2_MODEL_OPENAI,
          tier2SystemPrompt,
          image_base64,
          effectiveMime,
          userPrompt,
          3
        );

        if (tier2.parsed) {
          finalParsed = tier2.parsed;
          usedProvider = "openai";
        } else if (tier2.lastErrorText === "rate_limited" || tier2.lastStatus === 429) {
          console.warn("[inspection-ai] OpenAI rate limited — attempting Anthropic fallback");
        }
      }

      if (!finalParsed && anthropicApiKey) {
        console.log("[inspection-ai] Using Anthropic fallback provider");
        const anthropicResult = await runAnthropicInference(
          anthropicApiKey,
          tier2SystemPrompt,
          image_base64,
          effectiveMime,
          userPrompt,
          2
        );

        if (anthropicResult.parsed) {
          finalParsed = anthropicResult.parsed;
          usedProvider = "anthropic";
        }
      }

      if (!finalParsed) {
        return new Response(
          JSON.stringify({
            success: false,
            reason: "ai_unavailable",
            error: "All AI providers are unavailable. Please classify manually.",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const result = buildResult(finalParsed, tier, usedProvider);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        reason: "internal_error",
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
