import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_MODEL = "gpt-4o-mini";

const VALID_CATEGORIES = [
  "drawing",
  "site_photo",
  "defect_closeup",
  "document_scan",
  "screenshot",
  "mixed_content",
  "unknown",
] as const;

type ImageCategory = typeof VALID_CATEGORIES[number];

interface ClassifyResult {
  category: ImageCategory;
  confidence: number;
  short_reason: string;
  source: "gemini" | "openai";
  latency_ms: number;
}

const CLASSIFICATION_PROMPT = `You are a specialist image classifier for construction and building inspection software.

Classify the image into EXACTLY ONE of these categories:
- drawing: architectural/engineering floor plan, schematic, blueprint, section drawing, elevation drawing, or any technical drawing with lines/symbols
- site_photo: wide-angle photograph taken on a construction or building site showing structure, environment, or progress
- defect_closeup: macro or close-up photograph of a specific defect, damage, corrosion, coating failure, crack, or material issue
- document_scan: scanned paper document, form, certificate, report, specification sheet, or any text-heavy document
- screenshot: screen capture of software, app, website, or digital interface
- mixed_content: image that clearly contains multiple categories (e.g. drawing with photo inset)
- unknown: cannot be reliably classified

Respond with ONLY valid JSON in this exact format:
{
  "category": "<one of the seven categories above>",
  "confidence": <float 0.0 to 1.0>,
  "short_reason": "<one concise sentence explaining the classification, max 15 words>"
}`;

async function classifyWithGemini(
  imageUrl: string,
  apiKey: string
): Promise<ClassifyResult> {
  const t0 = Date.now();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: CLASSIFICATION_PROMPT },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 128,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);

  const category = VALID_CATEGORIES.includes(parsed.category)
    ? (parsed.category as ImageCategory)
    : "unknown";

  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    short_reason: String(parsed.short_reason ?? "").slice(0, 120),
    source: "gemini",
    latency_ms: Date.now() - t0,
  };
}

async function classifyWithGeminiUrl(
  imageUrl: string,
  apiKey: string
): Promise<ClassifyResult> {
  const t0 = Date.now();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: CLASSIFICATION_PROMPT },
              {
                file_data: {
                  file_uri: imageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 128,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini URL API error ${response.status}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);

  const category = VALID_CATEGORIES.includes(parsed.category)
    ? (parsed.category as ImageCategory)
    : "unknown";

  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    short_reason: String(parsed.short_reason ?? "").slice(0, 120),
    source: "gemini",
    latency_ms: Date.now() - t0,
  };
}

async function classifyWithOpenAI(
  imageUrl: string,
  apiKey: string
): Promise<ClassifyResult> {
  const t0 = Date.now();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CLASSIFICATION_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
          ],
        },
      ],
      max_tokens: 128,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text);

  const category = VALID_CATEGORIES.includes(parsed.category)
    ? (parsed.category as ImageCategory)
    : "unknown";

  return {
    category,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    short_reason: String(parsed.short_reason ?? "").slice(0, 120),
    source: "openai",
    latency_ms: Date.now() - t0,
  };
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const ab = await res.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { drawing_id, image_url, heuristic_category, heuristic_confidence } = body as {
      drawing_id: string;
      image_url: string;
      heuristic_category?: string;
      heuristic_confidence?: number;
    };

    if (!drawing_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "drawing_id and image_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: ClassifyResult | null = null;
    const errors: string[] = [];

    if (geminiKey) {
      try {
        const base64 = await fetchImageAsBase64(image_url);
        result = await classifyWithGemini(base64, geminiKey);
      } catch (e) {
        errors.push(`Gemini inline failed: ${e instanceof Error ? e.message : String(e)}`);
        if (geminiKey) {
          try {
            result = await classifyWithGeminiUrl(image_url, geminiKey);
          } catch (e2) {
            errors.push(`Gemini URL fallback failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
          }
        }
      }
    }

    if (!result && openaiKey) {
      try {
        result = await classifyWithOpenAI(image_url, openaiKey);
      } catch (e) {
        errors.push(`OpenAI failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!result) {
      await supabase
        .from("inspection_ai_drawings")
        .update({ image_category_pending_ai: false })
        .eq("id", drawing_id);

      return new Response(
        JSON.stringify({ error: "All AI providers failed", details: errors }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hConf = heuristic_confidence ?? 0;
    const shouldReplace =
      result.confidence > hConf ||
      !heuristic_category ||
      heuristic_category === "unknown";

    if (shouldReplace) {
      await supabase
        .from("inspection_ai_drawings")
        .update({
          image_category: result.category,
          image_category_confidence: result.confidence,
          image_category_source: result.source,
          image_category_reason: result.short_reason,
          image_category_pending_ai: false,
        })
        .eq("id", drawing_id);
    } else {
      await supabase
        .from("inspection_ai_drawings")
        .update({ image_category_pending_ai: false })
        .eq("id", drawing_id);
    }

    return new Response(
      JSON.stringify({
        drawing_id,
        category: shouldReplace ? result.category : heuristic_category,
        confidence: shouldReplace ? result.confidence : hConf,
        source: result.source,
        short_reason: result.short_reason,
        replaced_heuristic: shouldReplace,
        latency_ms: result.latency_ms,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
