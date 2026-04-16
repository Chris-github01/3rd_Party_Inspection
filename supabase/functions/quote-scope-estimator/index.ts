import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a senior NZ fire protection inspection pricing specialist.
Your job is to analyse a project description and extract structured quote inputs.

You must respond ONLY with valid JSON matching this exact schema:
{
  "inspectorType": "junior" | "senior" | "principal" | "engineer" | "specialist",
  "labourHours": number,
  "reportWritingHours": number,
  "travelZone": "local" | "extended" | "regional" | "national",
  "accessDifficulty": "easy" | "scissor" | "confined" | "critical" | "shutdown",
  "serviceTier": "standard" | "priority" | "emergency",
  "estimatedPenetrations": number | null,
  "estimatedMembers": number | null,
  "suggestedServiceType": "inspection" | "reinspection" | "intumescent_audit" | "fire_stopping_survey" | "witness_inspection",
  "scopeOfWork": string,
  "lineItems": [
    { "description": string, "category": "Labour"|"Materials"|"Equipment"|"Travel"|"Subcontract"|"Other", "unit": string, "quantity": number, "unit_price": number }
  ],
  "assumptions": string[],
  "risks": string[]
}

NZ context rules:
- Standard hourly sell rates: Junior $110, Senior $145, Principal $175, Fire Engineer $210, Specialist $260
- Report writing is always separate from site hours — never lump together
- Penetration audits: ~$12-28 per penetration inspected
- Intumescent DFT reading clusters: ~$8-18 per cluster
- Always include travel as a line item
- Always include report preparation as a separate line item
- If "urgent" or "same day" mentioned, set serviceTier to "emergency"
- If hospital, data centre, or critical infrastructure mentioned, set accessDifficulty to "critical"
- If scaffolding, EWP, or access equipment mentioned, set accessDifficulty to "scissor" or higher
- Be conservative with hours — it's better to underestimate than oversell
- travelZone defaults to "local" unless a specific location suggests otherwise`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { description, context } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = context
      ? `Project description: ${description}\n\nAdditional context: ${context}`
      : `Project description: ${description}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await response.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content returned from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
