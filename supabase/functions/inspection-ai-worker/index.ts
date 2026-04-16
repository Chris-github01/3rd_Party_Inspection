import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_DEFECT_TYPES = [
  "Delamination","Cracking","Mechanical Damage","Missing Coating",
  "Corrosion Breakthrough","Blistering","Spalling","Voids",
  "Incomplete Firestopping","Surface Deterioration","Moisture Damage","Unknown",
];

const MAX_JOBS_PER_RUN = 5;
const GEMINI_FLASH_MODEL = "gemini-2.0-flash";
const ANTHROPIC_FALLBACK_MODEL = "claude-opus-4-5";

const SYSTEM_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of field experience.

Analyse the inspection photograph and return ONLY a valid JSON object. No markdown, no explanation, no extra text.

DEFECT TYPES — choose exactly one:
Mechanical Damage | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

DISAMBIGUATION:
- Mechanical Damage ONLY if a clear physical gouge/dent/abrasion is visible — NOT for delamination or missing material
- Rust bleed through coating = Corrosion Breakthrough
- Layer separation/peeling = Delamination
- Cementitious chunk loss = Spalling
- Unknown if genuinely unclear — do NOT guess

SEVERITY: Low = cosmetic | Medium = local failure | High = exposed substrate or safety breach

CONFIDENCE: 90-100 = clear evidence | 70-89 = likely | 50-69 = uncertain | <50 = poor image quality

Return this exact JSON structure:
{
  "system_type": "Intumescent|Cementitious|Protective Coating|Firestopping|Unknown",
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
}

If confidence < 50, set requires_manual_review = true.
If no fire protection system is visible, set defect_type = "Unknown" and requires_manual_review = true.`;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms: number): number {
  return ms + Math.random() * (ms * 0.3);
}

function normaliseDefectType(raw: string): string {
  const cleaned = (raw ?? "").trim();
  const exact = VALID_DEFECT_TYPES.find((d) => d.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const partial = VALID_DEFECT_TYPES.find((d) => cleaned.toLowerCase().includes(d.toLowerCase()));
  return partial ?? "Unknown";
}

function validateSchema(parsed: Record<string, unknown>): { valid: boolean; reason: string } {
  if (typeof parsed.defect_type !== "string" || !parsed.defect_type) {
    return { valid: false, reason: "missing_defect_type" };
  }
  if (!["Low", "Medium", "High"].includes(String(parsed.severity))) {
    return { valid: false, reason: "invalid_severity" };
  }
  if (typeof parsed.confidence !== "number") {
    return { valid: false, reason: "missing_confidence" };
  }
  if (typeof parsed.observation !== "string") {
    return { valid: false, reason: "missing_observation" };
  }
  if (String(parsed.defect_type) === "Unknown" && String(parsed.severity) === "High") {
    return { valid: false, reason: "impossible_combo_unknown_high" };
  }
  if (!parsed.geometry || typeof parsed.geometry !== "object") {
    return { valid: false, reason: "missing_geometry" };
  }
  return { valid: true, reason: "" };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { base64: btoa(binary), mimeType };
}

async function callGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  contextPrompt: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number; error: string }> {
  if (attempt > 1) await sleep(jitter(Math.pow(2, attempt - 2) * 2000));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`;
  const t0 = Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT + "\n\n" + contextPrompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (err) {
    return { parsed: null, latencyMs: Date.now() - t0, error: `gemini_network:${String(err)}` };
  }

  const latencyMs = Date.now() - t0;

  if (res.status === 429) return { parsed: null, latencyMs, error: "rate_limited" };
  if (!res.ok) {
    const txt = await res.text().catch(() => `http_${res.status}`);
    return { parsed: null, latencyMs, error: `gemini_${res.status}:${txt.slice(0, 200)}` };
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) return { parsed: null, latencyMs, error: "gemini_empty_response" };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { parsed: null, latencyMs, error: "gemini_no_json" };

  try {
    const parsed = JSON.parse(match[0]);
    return { parsed, latencyMs, error: "" };
  } catch {
    return { parsed: null, latencyMs, error: "gemini_invalid_json" };
  }
}

async function callAnthropic(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  contextPrompt: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number; error: string }> {
  if (attempt > 1) await sleep(jitter(Math.pow(2, attempt - 2) * 2000));

  const validMime = ["image/jpeg","image/png","image/gif","image/webp"].includes(mimeType)
    ? mimeType as "image/jpeg"|"image/png"|"image/gif"|"image/webp"
    : "image/jpeg";

  const t0 = Date.now();
  let res: Response;

  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_FALLBACK_MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: validMime, data: imageBase64 } },
            { type: "text", text: contextPrompt },
          ],
        }],
      }),
    });
  } catch (err) {
    return { parsed: null, latencyMs: Date.now() - t0, error: `anthropic_network:${String(err)}` };
  }

  const latencyMs = Date.now() - t0;

  if (res.status === 429 || res.status === 529) return { parsed: null, latencyMs, error: "rate_limited" };
  if (!res.ok) {
    const txt = await res.text().catch(() => `http_${res.status}`);
    return { parsed: null, latencyMs, error: `anthropic_${res.status}:${txt.slice(0, 200)}` };
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  if (!text) return { parsed: null, latencyMs, error: "anthropic_empty_response" };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { parsed: null, latencyMs, error: "anthropic_no_json" };

  try {
    const parsed = JSON.parse(match[0]);
    return { parsed, latencyMs, error: "" };
  } catch {
    return { parsed: null, latencyMs, error: "anthropic_invalid_json" };
  }
}

async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Record<string, unknown>,
  geminiKey: string | undefined,
  anthropicKey: string | undefined
): Promise<{ success: boolean; jobId: string; error?: string }> {
  const jobId = String(job.id);
  const context = (job.context_json as Record<string, unknown>) ?? {};

  const contextPrompt = [
    "Inspector context (photo evidence overrides these):",
    `System type: ${context.system_type ?? "Unknown"}`,
    `Element: ${context.element ?? "Unknown"}`,
    `Environment: ${context.environment ?? "Not specified"}`,
    `Installation: ${context.is_new_install ? "New installation" : "Existing / aged system"}`,
    `Observed concern: ${context.observed_concern ?? "Not specified"}`,
    "",
    "Analyse the photograph. Populate all geometry fields. Use only the controlled defect terms.",
  ].join("\n");

  let imageBase64 = String(job.image_base64 ?? "");
  let mimeType = String(job.mime_type ?? "image/jpeg");

  if (!imageBase64 && job.image_url) {
    try {
      const fetched = await fetchImageAsBase64(String(job.image_url));
      imageBase64 = fetched.base64;
      mimeType = fetched.mimeType;
    } catch (err) {
      const errMsg = `image_fetch_failed:${String(err)}`;
      await supabase.from("inspection_ai_jobs").update({
        status: "failed",
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
      return { success: false, jobId, error: errMsg };
    }
  }

  let parsed: Record<string, unknown> | null = null;
  let usedProvider = "";
  let usedModel = "";
  let totalLatency = 0;
  let lastError = "";

  if (geminiKey) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { parsed: p, latencyMs, error } = await callGemini(geminiKey, imageBase64, mimeType, contextPrompt, attempt);
      totalLatency += latencyMs;
      if (p) {
        const { valid, reason } = validateSchema(p);
        if (valid) {
          parsed = p;
          usedProvider = "gemini";
          usedModel = GEMINI_FLASH_MODEL;
          break;
        }
        lastError = `schema_invalid:${reason}`;
      } else {
        lastError = error;
        if (error === "rate_limited" && attempt < 2) await sleep(jitter(15000));
      }
    }
  }

  if (!parsed && anthropicKey) {
    console.log(`[worker] Falling back to Anthropic for job ${jobId}`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { parsed: p, latencyMs, error } = await callAnthropic(anthropicKey, imageBase64, mimeType, contextPrompt, attempt);
      totalLatency += latencyMs;
      if (p) {
        const { valid, reason } = validateSchema(p);
        if (valid) {
          parsed = p;
          usedProvider = "anthropic";
          usedModel = ANTHROPIC_FALLBACK_MODEL;
          break;
        }
        lastError = `anthropic_schema_invalid:${reason}`;
      } else {
        lastError = error;
        if (error === "rate_limited" && attempt < 2) await sleep(jitter(15000));
      }
    }
  }

  if (!parsed) {
    const attempts = Number(job.attempts ?? 0) + 1;
    const maxAttempts = Number(job.max_attempts ?? 3);
    const newStatus = attempts >= maxAttempts ? "failed" : "queued";

    await supabase.from("inspection_ai_jobs").update({
      status: newStatus,
      attempts,
      error_message: lastError,
      completed_at: newStatus === "failed" ? new Date().toISOString() : null,
    }).eq("id", jobId);

    return { success: false, jobId, error: lastError };
  }

  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
  const requiresManualReview = Boolean(parsed.requires_manual_review) || confidence < 50;
  const finalStatus = requiresManualReview ? "review_required" : "complete";

  const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));
  const severity = ["Low","Medium","High"].includes(String(parsed.severity)) ? String(parsed.severity) : "Medium";
  const geometry = parsed.geometry as Record<string, unknown> | undefined;

  const resultRow = {
    job_id: jobId,
    item_id: job.item_id ?? null,
    provider: usedProvider,
    model: usedModel,
    latency_ms: totalLatency,
    confidence,
    schema_valid: true,
    raw_json: parsed,
  };

  await supabase.from("inspection_ai_results").insert(resultRow);

  if (job.item_id) {
    await supabase.from("inspection_ai_items").update({
      defect_type,
      severity,
      observation: String(parsed.observation ?? ""),
      non_conformance: String(parsed.observation ?? ""),
      recommendation: String(parsed.remediation_guidance ?? ""),
      confidence,
      model_used: usedModel,
      tier_used: usedProvider === "gemini" ? 1 : 2,
      latency_ms: totalLatency,
      ai_result: {
        ...parsed,
        defect_type,
        severity,
        provider_used: usedProvider,
        model_used: usedModel,
        geometry: geometry ?? null,
        requires_manual_review: requiresManualReview,
      },
    }).eq("id", String(job.item_id));
  }

  await supabase.from("inspection_ai_jobs").update({
    status: finalStatus,
    provider: usedProvider,
    model: usedModel,
    latency_ms: totalLatency,
    error_message: null,
    image_base64: null,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  return { success: true, jobId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!geminiKey && !anthropicKey) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: jobs, error: fetchErr } = await supabase
      .from("inspection_ai_jobs")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(MAX_JOBS_PER_RUN);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No queued jobs" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jobIds = jobs.map((j: Record<string, unknown>) => j.id);
    await supabase
      .from("inspection_ai_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .in("id", jobIds);

    const results = [];
    for (const job of jobs) {
      const result = await processJob(supabase, job as Record<string, unknown>, geminiKey, anthropicKey);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ processed: results.length, succeeded, failed, jobs: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[inspection-ai-worker] unhandled:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
