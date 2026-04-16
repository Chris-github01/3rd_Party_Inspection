import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a passive fire protection and protective coatings inspector conducting a visual-only field assessment.

Analyse the provided image and identify ONLY visible, observable non-conforming conditions.

DO NOT assume or infer:
- coating thickness or dry film thickness
- fire resistance ratings or period of fire resistance
- internal material conditions
- product specifications or brands
- compliance status beyond what is directly visible

ONLY identify and describe visible conditions such as:
- surface damage
- coating failure
- missing material
- cracking or fracturing
- delamination or disbondment
- corrosion breakthrough or rust staining
- blistering or bubbling
- erosion or abrasion wear

If the image appears to show no defects or is unclear, report defect_type as "No visible defect identified" with severity "Low" and confidence proportional to image clarity.

NEVER mention specific product brands, manufacturers, or proprietary systems.
NEVER state compliance or non-compliance with specific standards.
NEVER infer fire ratings or structural capacity.

Respond ONLY with a valid JSON object in this exact format:
{
  "defect_type": "<concise defect type label, e.g. 'Delamination', 'Surface Cracking', 'Corrosion Breakthrough'>",
  "severity": "<exactly one of: Low | Medium | High>",
  "observation": "<1-3 sentences describing only what is visibly observed in the image>",
  "confidence": <integer 0-100 reflecting confidence based on image quality and clarity of defect>
}`;

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
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { image_base64, mime_type, system_type, element } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Please analyse this image of a ${element ?? "structural element"} with a ${system_type ?? "coating"} system applied. Identify any visible non-conforming conditions.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 500,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
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
              {
                type: "text",
                text: userPrompt,
              },
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
      ? parsed.severity
      : "Low";

    const result = {
      defect_type: String(parsed.defect_type ?? "Unknown defect"),
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
