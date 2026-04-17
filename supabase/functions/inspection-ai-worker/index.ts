import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PROMPT_VERSION = "3.0";
const VALID_DEFECT_TYPES = [
  "Delamination", "Cracking", "Mechanical Damage", "Missing Coating",
  "Corrosion Breakthrough", "Blistering", "Spalling", "Voids",
  "Incomplete Firestopping", "Surface Deterioration", "Moisture Damage", "Unknown",
];

const MAX_JOBS_PER_RUN = 5;
const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_TIER2_MODEL = "gpt-4o";
const ANTHROPIC_MODEL = "claude-opus-4-5";

const BASE_SYSTEM_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of NZ/AU field experience.

Analyse ONE inspection photograph. Return ONLY valid JSON — no markdown, no extra text.

DEFECT TYPES (one only): Mechanical Damage | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

DISAMBIGUATION: Rust bleed = Corrosion Breakthrough. Layer separation = Delamination. Cementitious chunk loss = Spalling. Unknown if genuinely unclear — do NOT guess. Mechanical Damage ONLY for clear gouge/dent/abrasion.

SEVERITY: Low = cosmetic | Medium = local failure | High = exposed substrate or safety breach
CONFIDENCE: 90-100 = clear | 70-89 = likely | 50-69 = uncertain | <50 = poor image quality

IMAGE QUALITY: If blurry, dark, low resolution, or obscured — set requires_manual_review=true, confidence<40.

CORROSIVITY: Classify environment as C1–C5 or Unknown (ISO 12944). C4/C5 + corrosion = escalate=true.

ESCALATION triggers: confidence<70 | Corrosion Breakthrough structural | Incomplete Firestopping | Spalling exposing substrate | Delamination >300mm | Missing coating on fire-rated member.

Return this JSON:
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
  "corrosivity_category": "C1|C2|C3|C4|C5|Unknown",
  "geometry": {
    "location_on_member": "",
    "pattern": "",
    "extent": "",
    "likely_mechanism": "",
    "urgent_action": ""
  }
}`;

const SPECIALIST_ADDENDA: Record<string, string> = {
  intumescent: `\nINTUMESCENT MODE: FRL continuity mandatory. Any breach = High + escalate. Auto-High: cracking through depth, flaking, delamination to bare steel, missing coating, voids. Products: Nullifire, Jotun Steelmaster, Interchar, Carboline Interam.`,
  cementitious: `\nCEMENTITIOUS MODE: Granular 12–50mm NOT paint. Spalling (chunk loss) = always High + escalate. Surface crazing = Low. Full-depth crack = High. Missing material = High + escalate. Products: Cafco, Isolatek, GCP Monokote.`,
  protective_coating: `\nPROTECTIVE COATING MODE: Multi-coat paint, NOT fire-rated. ISO 4628-3 rust grading. Ri 3+ = High + escalate. C3+ + Ri 2+ = escalate. Products: Jotun Hardtop, Carboline Carboguard, Interzinc.`,
  firestopping: `\nFIRESTOPPING MODE: ANY gap = non-compliant + High + escalate. Unrated foam = Incomplete Firestopping + escalate. Post-install breach = High + escalate. Products: Hilti CP, Sika Pyroplug, 3M Fire Barrier.`,
};

function buildSystemPrompt(systemType: string, kbContext: string): string {
  const lower = (systemType ?? "").toLowerCase();
  let addendum = "";
  if (lower.includes("intumescent")) addendum = SPECIALIST_ADDENDA.intumescent;
  else if (lower.includes("cementitious") || lower.includes("vermiculite")) addendum = SPECIALIST_ADDENDA.cementitious;
  else if (lower.includes("protective") || lower.includes("anti-corrosion") || lower.includes("coating")) addendum = SPECIALIST_ADDENDA.protective_coating;
  else if (lower.includes("firestopping") || lower.includes("penetration") || lower.includes("seal")) addendum = SPECIALIST_ADDENDA.firestopping;
  return BASE_SYSTEM_PROMPT + addendum + kbContext;
}

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
  if (typeof parsed.defect_type !== "string" || !parsed.defect_type) return { valid: false, reason: "missing_defect_type" };
  if (!["Low", "Medium", "High"].includes(String(parsed.severity))) return { valid: false, reason: "invalid_severity" };
  if (typeof parsed.confidence !== "number") return { valid: false, reason: "missing_confidence" };
  if (typeof parsed.observation !== "string") return { valid: false, reason: "missing_observation" };
  if (String(parsed.defect_type) === "Unknown" && String(parsed.severity) === "High") return { valid: false, reason: "impossible_combo_unknown_high" };
  if (!parsed.geometry || typeof parsed.geometry !== "object") return { valid: false, reason: "missing_geometry" };
  return { valid: true, reason: "" };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return { base64: btoa(binary), mimeType };
}

async function retrieveKBContext(supabase: ReturnType<typeof createClient>, systemType: string): Promise<string> {
  try {
    const lower = (systemType ?? "").toLowerCase();
    const category =
      lower.includes("intumescent") ? "intumescent" :
      lower.includes("cementitious") || lower.includes("vermiculite") ? "cementitious" :
      lower.includes("protective") || lower.includes("anti-corrosion") ? "protective_coating" :
      lower.includes("firestopping") || lower.includes("penetration") ? "firestopping" :
      "general";

    const [defectsRes, productsRes] = await Promise.all([
      supabase.rpc("get_pf_defects_for_system", { p_system_type: category }).limit(6),
      supabase.rpc("get_pf_products_for_system", { p_system_type: category }).limit(4),
    ]);

    const parts: string[] = [];
    if (defectsRes.data?.length > 0) {
      const lines = (defectsRes.data as Array<{defect_name: string; description: string; severity_guidance: string}>)
        .map((d) => `  - ${d.defect_name}: ${d.description}${d.severity_guidance ? ` [${d.severity_guidance}]` : ""}`)
        .join("\n");
      parts.push(`KNOWN DEFECTS:\n${lines}`);
    }
    if (productsRes.data?.length > 0) {
      const lines = (productsRes.data as Array<{brand: string; product_name: string}>)
        .map((p) => `  - ${p.brand} ${p.product_name}`)
        .join("\n");
      parts.push(`NZ/AU PRODUCTS:\n${lines}`);
    }
    return parts.length > 0 ? `\n\n--- KB ---\n${parts.join("\n\n")}\n--- END KB ---` : "";
  } catch {
    return "";
  }
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  contextPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number; error: string }> {
  if (attempt > 1) await sleep(jitter(Math.pow(2, attempt - 2) * 2000));
  const t0 = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: contextPrompt },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
        }),
      }
    );

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
  } catch (err) {
    return { parsed: null, latencyMs: Date.now() - t0, error: `gemini_network:${String(err)}` };
  }
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  contextPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number; error: string }> {
  if (attempt > 1) await sleep(jitter(Math.pow(2, attempt - 2) * 2000));
  const t0 = Date.now();

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_TIER2_MODEL,
        max_tokens: 1200,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
              { type: "text", text: contextPrompt },
            ],
          },
        ],
      }),
    });

    const latencyMs = Date.now() - t0;
    if (res.status === 429) return { parsed: null, latencyMs, error: "rate_limited" };
    if (!res.ok) {
      const txt = await res.text().catch(() => `http_${res.status}`);
      return { parsed: null, latencyMs, error: `openai_${res.status}:${txt.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { parsed: null, latencyMs, error: "openai_empty_response" };

    try {
      const parsed = JSON.parse(content);
      return { parsed, latencyMs, error: "" };
    } catch {
      return { parsed: null, latencyMs, error: "openai_invalid_json" };
    }
  } catch (err) {
    return { parsed: null, latencyMs: Date.now() - t0, error: `openai_network:${String(err)}` };
  }
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  contextPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; latencyMs: number; error: string }> {
  if (attempt > 1) await sleep(jitter(Math.pow(2, attempt - 2) * 2000));
  const t0 = Date.now();

  const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
    ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    : "image/jpeg";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: validMime, data: imageBase64 } },
            { type: "text", text: contextPrompt },
          ],
        }],
      }),
    });

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
  } catch (err) {
    return { parsed: null, latencyMs: Date.now() - t0, error: `anthropic_network:${String(err)}` };
  }
}

async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: Record<string, unknown>,
  geminiKey: string | undefined,
  openaiKey: string | undefined,
  anthropicKey: string | undefined
): Promise<{ success: boolean; jobId: string; error?: string }> {
  const jobId = String(job.id);
  const context = (job.context_json as Record<string, unknown>) ?? {};
  const systemType = String(context.system_type ?? "");
  const orgId = String(job.organization_id ?? context.organization_id ?? "");

  const kbContext = await retrieveKBContext(supabase, systemType);
  const kbContextUsed = kbContext.length > 0;
  const systemPrompt = buildSystemPrompt(systemType, kbContext);

  const contextPrompt = [
    "Inspector context (photo evidence overrides these):",
    `System type: ${systemType || "Unknown"}`,
    `Element: ${context.element ?? "Unknown"}`,
    `Environment: ${context.environment ?? "Not specified"}`,
    `Installation: ${context.is_new_install ? "New installation" : "Existing/aged system"}`,
    `Observed concern: ${context.observed_concern ?? "Not specified"}`,
    "",
    "Analyse the photograph. Populate all geometry fields. Apply specialist mode for the system type. Use only the controlled defect terms.",
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
        status: "failed", error_message: errMsg, completed_at: new Date().toISOString(),
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
      const { parsed: p, latencyMs, error } = await callGemini(geminiKey, systemPrompt, contextPrompt, imageBase64, mimeType, attempt);
      totalLatency += latencyMs;
      if (p) {
        const { valid, reason } = validateSchema(p);
        if (valid) { parsed = p; usedProvider = "gemini"; usedModel = GEMINI_MODEL; break; }
        lastError = `schema_invalid:${reason}`;
      } else {
        lastError = error;
        if (error === "rate_limited" && attempt < 2) await sleep(jitter(15000));
      }
    }
  }

  if (!parsed && openaiKey) {
    console.log(`[worker] Gemini failed, trying OpenAI for job ${jobId}`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { parsed: p, latencyMs, error } = await callOpenAI(openaiKey, systemPrompt, contextPrompt, imageBase64, mimeType, attempt);
      totalLatency += latencyMs;
      if (p) {
        const { valid, reason } = validateSchema(p);
        if (valid) { parsed = p; usedProvider = "openai"; usedModel = OPENAI_TIER2_MODEL; break; }
        lastError = `openai_schema_invalid:${reason}`;
      } else {
        lastError = error;
        if (error === "rate_limited" && attempt < 2) await sleep(jitter(15000));
      }
    }
  }

  if (!parsed && anthropicKey) {
    console.log(`[worker] Falling back to Anthropic for job ${jobId}`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { parsed: p, latencyMs, error } = await callAnthropic(anthropicKey, systemPrompt, contextPrompt, imageBase64, mimeType, attempt);
      totalLatency += latencyMs;
      if (p) {
        const { valid, reason } = validateSchema(p);
        if (valid) { parsed = p; usedProvider = "anthropic"; usedModel = ANTHROPIC_MODEL; break; }
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
      status: newStatus, attempts, error_message: lastError,
      completed_at: newStatus === "failed" ? new Date().toISOString() : null,
    }).eq("id", jobId);
    return { success: false, jobId, error: lastError };
  }

  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
  const requiresManualReview = Boolean(parsed.requires_manual_review) || confidence < 50;
  const finalStatus = requiresManualReview ? "review_required" : "complete";
  const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));
  const severity = ["Low", "Medium", "High"].includes(String(parsed.severity)) ? String(parsed.severity) : "Medium";
  const geometry = parsed.geometry as Record<string, unknown> | undefined;

  const corrosivityCategory = ["C1", "C2", "C3", "C4", "C5", "Unknown"].includes(String(parsed.corrosivity_category ?? ""))
    ? String(parsed.corrosivity_category) : "Unknown";
  const isHighCorrosivity = corrosivityCategory === "C4" || corrosivityCategory === "C5";
  const isCorrosionDefect = ["Corrosion Breakthrough", "Missing Coating", "Surface Deterioration"].includes(defectType);
  const corrosivityEscalate = isHighCorrosivity && isCorrosionDefect;

  const passFail = severity === "High" || (Boolean(parsed.escalate) || confidence < 70 || corrosivityEscalate) ? "fail" : "pass";
  const drawingPinReady = !requiresManualReview && confidence >= 70;
  const estimatedScopeHours = severity === "High" ? 4.0 : severity === "Medium" ? 2.0 : 0.5;

  const normalizedResult = {
    ...parsed,
    defect_type: defectType,
    severity,
    confidence,
    provider_used: usedProvider,
    model_used: usedModel,
    geometry: geometry ?? null,
    requires_manual_review: requiresManualReview,
    corrosivity_category: corrosivityCategory,
    pass_fail: passFail,
    drawing_pin_ready: drawingPinReady,
    estimated_scope_hours: estimatedScopeHours,
    prompt_version: PROMPT_VERSION,
    kb_context_used: kbContextUsed,
  };

  await supabase.from("inspection_ai_results").insert({
    job_id: jobId,
    item_id: job.item_id ?? null,
    provider: usedProvider,
    model: usedModel,
    latency_ms: totalLatency,
    confidence,
    schema_valid: true,
    raw_json: parsed,
  });

  await supabase.from("inspection_ai_result_history").insert({
    job_id: jobId,
    item_id: job.item_id ?? null,
    organization_id: orgId || null,
    provider: usedProvider,
    model: usedModel,
    prompt_version: PROMPT_VERSION,
    latency_ms: totalLatency,
    confidence,
    severity,
    defect_type: defectType,
    pass_fail: passFail,
    requires_manual_review: requiresManualReview,
    schema_valid: true,
    normalized_json: normalizedResult,
  });

  if (job.item_id) {
    await supabase.from("inspection_ai_items").update({
      defect_type: defectType,
      severity,
      observation: String(parsed.observation ?? ""),
      non_conformance: String(parsed.observation ?? ""),
      recommendation: String(parsed.remediation_guidance ?? ""),
      confidence,
      model_used: usedModel,
      tier_used: usedProvider === "gemini" ? 1 : 2,
      latency_ms: totalLatency,
      pass_fail: passFail,
      drawing_pin_ready: drawingPinReady,
      estimated_scope_hours: estimatedScopeHours,
      ai_result: normalizedResult,
    }).eq("id", String(job.item_id));
  }

  await supabase.from("inspection_ai_jobs").update({
    status: finalStatus,
    provider: usedProvider,
    model: usedModel,
    latency_ms: totalLatency,
    prompt_version: PROMPT_VERSION,
    kb_context_used: kbContextUsed,
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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!geminiKey && !openaiKey && !anthropicKey) {
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
      const result = await processJob(supabase, job as Record<string, unknown>, geminiKey, openaiKey, anthropicKey);
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
