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

const SYSTEM_PROMPT = `You are a passive fire protection and protective coatings inspector conducting a visual-only field assessment.

Analyse the provided image and identify ONLY visible, observable non-conforming conditions.

STRICT CLASSIFICATION RULES:
You MUST classify the defect using ONLY one of the following exact terms (copy exactly as written):
  - Delamination
  - Cracking
  - Mechanical Damage
  - Missing Coating
  - Corrosion Breakthrough
  - Blistering
  - Spalling
  - Voids
  - Incomplete Firestopping

DO NOT invent new defect names or use synonyms. Select the closest match from the list above.

DO NOT assume or infer:
- coating thickness or dry film thickness
- fire resistance ratings or period of fire resistance
- internal material conditions
- product specifications or brands
- compliance status beyond what is directly visible

Your observation must describe ONLY what is physically visible in the image.
Use plain, professional language. Do not reference product brands or proprietary systems.

If no defect is visible or the image is unclear, use defect_type "Mechanical Damage" with severity "Low" and confidence below 50.

Respond ONLY with a valid JSON object in this exact format with no additional text:
{
  "defect_type": "<one of the nine terms above>",
  "severity": "<exactly one of: Low | Medium | High>",
  "observation": "<1-3 sentences describing only what is visibly observed>",
  "confidence": <integer 0-100>
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
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { image_base64, mime_type, system_type, element } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Analyse this image of a ${element ?? "structural element"} with a ${system_type ?? "coating"} system applied. Classify any visible defect using only the permitted defect types listed in your instructions.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 400,
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
                  url: `data:${mime_type ?? "image/jpeg"};base64,${image_base64}`,
                  detail: "high",
                },
              },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI error:", errText);
      return new Response(
        JSON.stringify({ error: `OpenAI request failed: ${openaiResponse.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty response from AI model" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "AI response was not valid JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSeverities = ["Low", "Medium", "High"];
    const severity = validSeverities.includes(String(parsed.severity))
      ? String(parsed.severity)
      : "Low";

    const result = {
      defect_type: normaliseDefectType(String(parsed.defect_type ?? "")),
      severity,
      observation: String(parsed.observation ?? ""),
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 50))),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
