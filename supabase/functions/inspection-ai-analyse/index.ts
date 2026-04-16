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

const BASE_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of field experience.

Your task is to analyse ONE inspection photograph only.

You specialise in:
1. Intumescent coatings (thin-film and thick-film)
2. Cementitious fireproofing
3. Protective and anti-corrosion coatings
4. Firestopping systems

You must classify ONLY visible evidence. Do NOT invent hidden defects unless marked as POSSIBLE. Never default to Mechanical Damage unless you can see a clear physical impact — a gouge, dent, or abrasion mark.

--------------------------------------------------
STEP 1 — IDENTIFY LIKELY SYSTEM
Choose one: Intumescent | Cementitious | Protective Coating | Firestopping | Unknown

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
  "geometry": {
    "location_on_member": "",
    "pattern": "",
    "extent": "",
    "likely_mechanism": "",
    "urgent_action": ""
  }
}

If confidence < 50, set requires_manual_review = true.
Never set defect_type = "Mechanical Damage" unless you can see a clear physical impact mark in the image.`;

const INTUMESCENT_SPECIALIST_ADDENDUM = `

--------------------------------------------------
INTUMESCENT SPECIALIST MODE — ACTIVE
You have identified or been told this is an intumescent system. Apply these additional reasoning rules:

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

const SHORT_PROMPT = `You are a senior coatings and passive fire protection inspector.

Analyse the inspection photograph and return a JSON classification.

DEFECT TYPES (choose one only):
Mechanical Damage | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

RULES:
- Unknown if insufficient evidence
- Mechanical Damage only if physical impact mark is clearly visible
- Return all geometry fields even if brief

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
  "geometry": {
    "location_on_member": "",
    "pattern": "",
    "extent": "",
    "likely_mechanism": "",
    "urgent_action": ""
  }
}`;

function buildSystemPrompt(systemType: string, shortPrompt: boolean): string {
  if (shortPrompt) return SHORT_PROMPT;
  const isIntumescent = systemType?.toLowerCase().includes("intumescent");
  return isIntumescent
    ? BASE_PROMPT + INTUMESCENT_SPECIALIST_ADDENDUM
    : BASE_PROMPT;
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

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userPrompt: string,
  attempt: number
): Promise<Response> {
  if (attempt > 1) {
    await sleep(Math.pow(2, attempt - 1) * 1000);
  }

  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1100,
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
                detail: "high",
              },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    }),
  });
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
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "configuration_error",
          error: "OpenAI API key not configured",
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
      short_prompt,
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

    const systemPrompt = buildSystemPrompt(system_type ?? "", Boolean(short_prompt));

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

    const MAX_RETRIES = 3;
    let lastStatus = 0;
    let lastErrorText = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let openaiResponse: Response;
      try {
        openaiResponse = await callOpenAI(
          openaiApiKey,
          systemPrompt,
          image_base64,
          mime_type ?? "image/jpeg",
          userPrompt,
          attempt
        );
      } catch (fetchErr) {
        lastErrorText = `Network error on attempt ${attempt}: ${String(fetchErr)}`;
        console.error(lastErrorText);
        if (attempt < MAX_RETRIES) continue;
        break;
      }

      lastStatus = openaiResponse.status;

      if (openaiResponse.status === 429) {
        lastErrorText = "rate_limited";
        console.warn(`OpenAI rate limited on attempt ${attempt}`);
        if (attempt < MAX_RETRIES) continue;
        break;
      }

      if (!openaiResponse.ok) {
        lastErrorText = await openaiResponse.text().catch(() => `HTTP ${openaiResponse.status}`);
        console.error(`OpenAI error on attempt ${attempt}:`, lastErrorText);
        if (attempt < MAX_RETRIES) continue;
        break;
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content;

      if (!content) {
        lastErrorText = "empty_response";
        console.error("Empty AI response on attempt", attempt);
        if (attempt < MAX_RETRIES) continue;
        break;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastErrorText = "invalid_json";
        console.error("AI returned invalid JSON on attempt", attempt, content.slice(0, 200));
        if (attempt < MAX_RETRIES) continue;
        break;
      }

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

      const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));

      const result = {
        success: true,
        defect_type: defectType,
        severity,
        observation: String(parsed.observation ?? ""),
        confidence,
        likely_cause: String(parsed.likely_cause ?? ""),
        visible_evidence: visibleEvidence,
        next_checks: nextChecks,
        escalate: Boolean(parsed.escalate) || confidence < 70,
        escalation_reason: String(parsed.escalation_reason ?? ""),
        remediation_guidance: String(parsed.remediation_guidance ?? ""),
        requires_manual_review: requiresManualReview,
        system_type_detected: String(parsed.system_type ?? ""),
        geometry,
        intumescent_mode: isIntumescent,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isRateLimit = lastErrorText === "rate_limited" || lastStatus === 429;

    return new Response(
      JSON.stringify({
        success: false,
        reason: isRateLimit ? "rate_limit" : "ai_unavailable",
        error: isRateLimit
          ? "AI service is temporarily rate limited. Please retry in a moment."
          : "AI analysis service is currently unavailable. Classify manually.",
      }),
      {
        status: isRateLimit ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
