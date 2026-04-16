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

const SYSTEM_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of field experience.

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
STEP 6 — CONFIDENCE (0 to 100)
90+: clear, obvious defect with high certainty
70–89: likely defect with good visual evidence
50–69: partial evidence, some uncertainty
0–49: insufficient image quality or ambiguous evidence — set requires_manual_review = true

--------------------------------------------------
STEP 7 — ESCALATION
Escalate if any of:
- Confidence < 70
- Corrosion Breakthrough on structural steel
- Incomplete Firestopping at any penetration
- Spalling with visible substrate
- Delamination > 300mm extent (if estimable)
- Multiple defects on same element

--------------------------------------------------
STEP 8 — RESPONSE FORMAT
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
  "requires_manual_review": false
}

If confidence < 50, set requires_manual_review = true.
Never set defect_type = "Mechanical Damage" unless you can see a clear physical impact mark in the image.`;

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
      max_tokens: 900,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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

    const userPrompt = `${contextBlock}

Now analyse the photograph above. Follow the 8-step reasoning process from your instructions. Classify the visible defect using only the controlled terms. Never default to Mechanical Damage unless a physical impact mark is clearly visible.`;

    const MAX_RETRIES = 3;
    let lastStatus = 0;
    let lastErrorText = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let openaiResponse: Response;
      try {
        openaiResponse = await callOpenAI(
          openaiApiKey,
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
