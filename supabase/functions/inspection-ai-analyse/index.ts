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

const TIER2_BASE_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of field experience.

Your task is to analyse ONE inspection photograph only.

You specialise in:
1. Intumescent coatings (thin-film and thick-film)
2. Cementitious fireproofing
3. Protective and anti-corrosion coatings
4. Firestopping systems

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
Describe only what is visible in the photograph. Examples: cracking, edge splitting, rust staining, coating loss, impact gouge, blistering, delamination, missing material, patch repair, exposed steel, moisture staining, erosion, voids, surface contamination.

--------------------------------------------------
STEP 3 — ROOT CAUSE REASONING
Choose the most likely cause: Mechanical impact | Moisture ingress | Corrosion from substrate | Application defect | Movement / vibration | UV / weather ageing | Poor surface preparation | Incompatible repair | Thermal movement | Unknown

--------------------------------------------------
STEP 4 — CONTROLLED DEFECT CLASSIFICATION
Choose ONE only from this exact list:
- Mechanical Damage: clear evidence of physical impact — gouge, dent, abrasion. NOT delamination.
- Cracking: visible fissures, fractures, hairline cracks in coating or matrix
- Delamination: coating or material separating in layers, peeling, lifting from substrate
- Missing Coating: bare steel or substrate exposed where coating should be present
- Corrosion Breakthrough: rust staining visible through or at edges of coating
- Blistering: bubbles, raised domes, hollow sections under surface
- Spalling: fragments breaking off, chunking, surface material loss (cementitious)
- Voids: gaps, holes, unfilled sections
- Incomplete Firestopping: firestopping system not fully sealed or installed
- Surface Deterioration: generalised weathering, chalking, fading with no specific defect mechanism
- Moisture Damage: water staining, efflorescence, wet/damp coating with no active rust
- Unknown: insufficient image evidence to classify reliably

DISAMBIGUATION RULES:
- Mechanical Damage vs Delamination: If you see a gouge/scrape/abrasion = Mechanical Damage. If you see lifting/peeling/layer separation = Delamination.
- Rust bleed through topcoat = Corrosion Breakthrough, NOT Mechanical Damage.
- Cementitious chunk loss = Spalling, NOT Mechanical Damage.
- Penetration gaps or incomplete seals = Incomplete Firestopping.
- If genuinely uncertain = Unknown. Never guess Mechanical Damage by default.

--------------------------------------------------
STEP 5 — SEVERITY
Choose: Low | Medium | High

HIGH if: exposed substrate, active corrosion, missing fire protection, widespread detachment, safety-critical breach.
MEDIUM if: local failure, cracking, moderate impact damage, isolated moisture issue.
LOW if: cosmetic wear, minor marking, light fade, superficial scuff.

--------------------------------------------------
STEP 6 — DEFECT GEOMETRY
Describe WHERE and HOW the defect presents on the element.

location_on_member: where on the element (e.g. "lower flange edge", "web midspan", "column base", "around bolt group", "penetration perimeter", "connection plate junction", "top flange", "soffit")
pattern: how it distributes (e.g. "linear", "radial from point", "isolated patch", "widespread", "repeated at intervals", "edge-following", "circumferential")
extent: how much area is affected (e.g. "< 50mm isolated", "50-200mm localised", "200-500mm moderate", "> 500mm widespread", "full element")
likely_mechanism: specific mechanism given location and pattern (e.g. "steel connection movement causing stress crack", "moisture tracking from penetration", "impact from construction traffic", "thermal cycling at unprotected edge")
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
- Spalling with visible substrate
- Delamination > 300mm extent (if estimable)
- Multiple defects on same element

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

FRL CONTINUITY CHECK (mandatory for all intumescent and firestopping assessments):
The purpose of intumescent coating is to maintain fire resistance continuity. Any visible condition that compromises coating continuity — regardless of how localised — must be treated as a fire safety risk.

AUTOMATIC High severity + escalate = true if ANY of the following are observed:
- Cracking that penetrates through the coating depth (not surface crazing only)
- Flaking, spalling, or chunk loss that exposes the steel substrate
- Delamination leaving bare or near-bare steel
- Missing coating at any location on a fire-rated member
- Incomplete seal at a firestopping penetration
- Visible gaps or voids in cementitious or board-based fire protection

Even a small breach (< 50mm) on a fire-rated element should be escalated. The FRL of the element depends on full continuous coverage — partial failure = system failure in a fire event.
Set escalation_reason to include: "FRL continuity breach — fire protection integrity compromised"

INTUMESCENT-SPECIFIC DEFECT PATTERNS:
- Edge cracking at connection plates / bolt groups = movement stress. Classify as Cracking. Escalate always.
- Topcoat crazing or microcracking without delamination = UV/thermal ageing. Classify as Surface Deterioration or Cracking (if penetrating).
- Lifting or peeling at steel edges = Delamination. Common at unprotected flange edges and web stiffeners.
- Overbuild texture clues (orange peel, ribbing, runs) = application defect. Note in observation, classify primary visible defect.
- Waterborne system softening: if coating appears tacky, swollen, or discoloured near water ingress = Moisture Damage.
- Repair patch mismatch: visible colour/texture boundary = note patch repair in visible_evidence. Classify underlying defect if visible.
- Missing material at open sections = Missing Coating. Always high priority on structural fire protection.
- Impact on intumescent: look for depression without peeling — if gouge is present = Mechanical Damage. If no impact mark but material loss = Delamination or Spalling.

THIN-FILM vs THICK-FILM REASONING:
- Thin-film (<3mm): cracking often hairline, may follow steel surface profile
- Thick-film (>3mm): cracking often wider, spalling more likely if impact
- If you cannot determine thickness from image, note in observation

CONNECTION ZONE LOGIC:
- Cracking adjacent to bolts, cleats, or weld toes = thermal/movement mechanism, not workmanship
- Missing coating near bolt heads = common installation defect, note as Missing Coating

Always populate the geometry fields with specific intumescent context.`;

function buildTier2Prompt(systemType: string): string {
  const lower = (systemType ?? "").toLowerCase();
  if (lower.includes("intumescent") || lower.includes("firestopping")) {
    return TIER2_BASE_PROMPT + INTUMESCENT_SPECIALIST_ADDENDUM;
  }
  return TIER2_BASE_PROMPT;
}

function requiresTier2(systemType: string, tier1Result?: Record<string, unknown>): boolean {
  const lower = (systemType ?? "").toLowerCase();
  if (lower.includes("intumescent") || lower.includes("firestopping")) return true;
  if (!tier1Result) return false;
  const confidence = Number(tier1Result.confidence ?? 0);
  if (confidence < 70) return true;
  if (String(tier1Result.severity) === "High") return true;
  if (String(tier1Result.defect_type) === "Unknown") return true;
  return false;
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

  const maxTokens = model === TIER1_MODEL_OPENAI ? 700 : 1100;
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
      max_tokens: 1100,
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

    const contextBlock = [
      "Inspector context (use as supporting information only — photo evidence overrides these assumptions):",
      `Likely system: ${system_type ?? "Unknown"}`,
      `Element: ${element ?? "Unknown"}`,
      `Environment: ${environment ?? "Not specified"}`,
      `Installation status: ${is_new_install ? "New installation" : "Existing / aged system"}`,
      `Inspector's observed concern: ${observed_concern ?? "Not specified"}`,
    ].join("\n");

    const isIntumescent = (system_type ?? "").toLowerCase().includes("intumescent");
    const modeNote = isIntumescent
      ? "\nIntumescent Specialist Mode is active. Apply intumescent-specific reasoning rules."
      : "";

    const userPrompt = `${contextBlock}${modeNote}

Now analyse the photograph above. Follow all reasoning steps. Populate all geometry fields with specific location and pattern detail. Classify the visible defect using only the controlled terms. Never default to Mechanical Damage unless a physical impact mark is clearly visible.`;

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
