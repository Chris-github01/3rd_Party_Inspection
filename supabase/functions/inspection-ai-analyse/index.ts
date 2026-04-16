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
];

const SYSTEM_PROMPT = `You are a Senior Passive Fire Protection and Protective Coatings Inspector with 20+ years of field experience.

You are assisting a junior or intermediate inspector onsite. Your role is not just to classify the defect — you must reason like a senior inspector and guide the inspector on what to do next.

VISUAL ANALYSIS RULES:
- Analyse ONLY what is physically visible in the photograph
- Do NOT infer coating thickness, fire ratings, or internal conditions
- Do NOT reference product brands or proprietary system names
- Use plain, professional consultant language
- Be specific about the defect you can see. Do not default to "Mechanical Damage" unless you can see clear physical impact evidence.

DEFECT CLASSIFICATION — use ONLY one of these exact terms:
  Delamination | Cracking | Mechanical Damage | Missing Coating |
  Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping

CHOOSING THE RIGHT DEFECT TYPE:
- Delamination: coating or material separating in layers, peeling, detachment from substrate
- Cracking: visible fissures, fractures, hairline cracks in coating or matrix
- Mechanical Damage: clear evidence of physical impact — gouges, dents, scrapes
- Missing Coating: bare steel or substrate exposed where coating should be present
- Corrosion Breakthrough: rust staining visible through or at edges of coating
- Blistering: bubbles, raised domes, hollow sections under surface
- Spalling: fragments breaking off, chunking, surface material loss
- Voids: gaps, holes, unfilled penetrations
- Incomplete Firestopping: firestopping system not fully sealed or installed

CONTEXT-AWARE REASONING:
You will receive the system type, element type, environment, and the inspector's observed concern.
Use this context to:
1. Determine the most likely defect type and root cause
2. Assess whether this could indicate a wider systemic issue
3. Identify what the inspector should check next on-site
4. Determine if escalation to a senior engineer is required

REASONING RULES BY SYSTEM TYPE:
- Intumescent: Edge cracking at connections = movement risk. Delamination = adhesion failure. Always check adjacent members for repeat pattern.
- Cementitious: Spalling or cracking = substrate or impact. Check for hollow sections by tapping. Check for corrosion evidence.
- Protective Coating: Blistering = moisture ingress. Corrosion breakthrough = active corrosion beneath. Check full element and adjacent structure.
- Firestopping: Any gap, void, or incomplete seal = critical. Always escalate. Check penetration schedule compliance.

ESCALATION CRITERIA:
Escalate to senior if ANY of:
- Confidence < 70
- Corrosion Breakthrough on structural steel
- Incomplete Firestopping at any penetration
- Spalling with visible substrate
- Delamination > 300mm extent
- Multiple defects on same element

Respond ONLY with a valid JSON object. No markdown. No extra text. Use this exact format:
{
  "defect_type": "<one of the nine terms>",
  "severity": "<Low | Medium | High>",
  "observation": "<1-3 sentences of visible observations only>",
  "confidence": <integer 0-100>,
  "likely_cause": "<1-2 sentences explaining probable root cause based on context>",
  "next_checks": ["<check 1>", "<check 2>", "<check 3>"],
  "escalate": <true | false>,
  "escalation_reason": "<brief reason if escalate is true, empty string if false>",
  "remediation_guidance": "<1-2 sentences on recommended action>"
}`;

function normaliseDefectType(raw: string): string {
  const cleaned = raw.trim();
  const exact = VALID_DEFECT_TYPES.find(
    (d) => d.toLowerCase() === cleaned.toLowerCase()
  );
  if (exact) return exact;
  const partial = VALID_DEFECT_TYPES.find((d) =>
    cleaned.toLowerCase().includes(d.toLowerCase())
  );
  return partial ?? "Mechanical Damage";
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
      max_tokens: 700,
      temperature: 0.15,
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

    const contextLines = [
      `System type: ${system_type ?? "Unknown"}`,
      `Element type: ${element ?? "Unknown"}`,
      `Environment: ${environment ?? "Not specified"}`,
      `Installation status: ${is_new_install ? "New installation" : "Existing / aged system"}`,
      `Inspector's observed concern: ${observed_concern ?? "Not specified"}`,
    ];

    const userPrompt = `Inspect this photograph and provide your senior inspector assessment.

Context:
${contextLines.join("\n")}

Analyse only what is visible. Apply your domain expertise and the context above to reason about the likely defect, its cause, what to check next, and whether escalation is required.`;

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

      const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 50)));

      const nextChecks = Array.isArray(parsed.next_checks)
        ? (parsed.next_checks as unknown[]).map((c) => String(c)).slice(0, 5)
        : [];

      const result = {
        success: true,
        defect_type: normaliseDefectType(String(parsed.defect_type ?? "")),
        severity,
        observation: String(parsed.observation ?? ""),
        confidence,
        likely_cause: String(parsed.likely_cause ?? ""),
        next_checks: nextChecks,
        escalate: Boolean(parsed.escalate) || confidence < 70,
        escalation_reason: String(parsed.escalation_reason ?? ""),
        remediation_guidance: String(parsed.remediation_guidance ?? ""),
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
