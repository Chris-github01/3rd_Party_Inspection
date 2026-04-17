import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PROMPT_VERSION = "3.0";
const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_TIER1_MODEL = "gpt-4o-mini";
const OPENAI_TIER2_MODEL = "gpt-4o";
const ANTHROPIC_MODEL = "claude-opus-4-5";

const VALID_DEFECT_TYPES = [
  "Delamination", "Cracking", "Mechanical Damage", "Missing Coating",
  "Corrosion Breakthrough", "Blistering", "Spalling", "Voids",
  "Incomplete Firestopping", "Surface Deterioration", "Moisture Damage", "Unknown",
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitteredBackoff(attempt: number): number {
  return Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
}

async function retrieveKBContext(supabaseUrl: string, serviceKey: string, systemType: string): Promise<string> {
  try {
    const sb = createClient(supabaseUrl, serviceKey);
    const lower = systemType.toLowerCase();

    const systemCategory =
      lower.includes("intumescent") ? "intumescent" :
      lower.includes("cementitious") || lower.includes("vermiculite") ? "cementitious" :
      lower.includes("protective") || lower.includes("anti-corrosion") ? "protective_coating" :
      lower.includes("firestopping") || lower.includes("penetration") ? "firestopping" :
      "general";

    const [defectsRes, productsRes, standardsRes] = await Promise.all([
      sb.rpc("get_pf_defects_for_system", { p_system_type: systemCategory }).limit(8),
      sb.rpc("get_pf_products_for_system", { p_system_type: systemCategory }).limit(6),
      sb.from("pf_standards").select("standard_code, title, key_clause").eq("active", true).limit(5),
    ]);

    const parts: string[] = [];

    if (defectsRes.data && defectsRes.data.length > 0) {
      const defectLines = (defectsRes.data as Array<{defect_name: string; description: string; severity_guidance: string}>)
        .map((d) => `  - ${d.defect_name}: ${d.description}${d.severity_guidance ? ` [${d.severity_guidance}]` : ""}`)
        .join("\n");
      parts.push(`KNOWN DEFECTS FOR THIS SYSTEM:\n${defectLines}`);
    }

    if (productsRes.data && productsRes.data.length > 0) {
      const productLines = (productsRes.data as Array<{brand: string; product_name: string; notes: string}>)
        .map((p) => `  - ${p.brand} ${p.product_name}${p.notes ? `: ${p.notes}` : ""}`)
        .join("\n");
      parts.push(`COMMON NZ/AU PRODUCTS:\n${productLines}`);
    }

    if (standardsRes.data && standardsRes.data.length > 0) {
      const stdLines = (standardsRes.data as Array<{standard_code: string; title: string; key_clause: string}>)
        .map((s) => `  - ${s.standard_code}: ${s.title}${s.key_clause ? ` (${s.key_clause})` : ""}`)
        .join("\n");
      parts.push(`APPLICABLE STANDARDS:\n${stdLines}`);
    }

    return parts.length > 0
      ? `\n\n--- KNOWLEDGE BASE CONTEXT ---\n${parts.join("\n\n")}\n--- END KB CONTEXT ---`
      : "";
  } catch {
    return "";
  }
}

const BASE_SYSTEM_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of NZ/AU field experience.

Analyse ONE inspection photograph only. Follow ALL steps in order.

STEP 0 — IMAGE QUALITY GATE:
If blurry, poorly lit, low resolution, obscured, or too oblique: set requires_manual_review=true, escalation_reason="poor image quality — [reason]", confidence<40.

STEP 1 — IDENTIFY SYSTEM:
Intumescent | Cementitious | Protective Coating | Firestopping | Unknown

STEP 2 — ISO 12944 CORROSIVITY: C1–C5 or Unknown. C4/C5 + corrosion = automatic escalation.

STEP 3 — VISUAL OBSERVATIONS: Only visible evidence. Never invent hidden defects.

STEP 4 — ROOT CAUSE: Mechanical impact | Moisture ingress | Corrosion from substrate | Application defect | Movement/vibration | UV/weather ageing | Poor surface prep | Incompatible repair | Thermal movement | Adhesion failure | Unknown

STEP 5 — DEFECT CLASSIFICATION (one only):
Mechanical Damage (clear gouge/dent/abrasion only) | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

DISAMBIGUATION: Rust bleed = Corrosion Breakthrough, NOT Mechanical Damage. Cementitious chunk loss = Spalling. Penetration gap = Incomplete Firestopping. Unknown if genuinely uncertain.

STEP 6 — SEVERITY:
High: exposed substrate, active corrosion, missing fire protection, safety breach.
Medium: local failure, isolated moisture, moderate damage.
Low: cosmetic, minor marking.

STEP 7 — GEOMETRY:
location_on_member | pattern | extent | likely_mechanism | urgent_action

STEP 8 — CONFIDENCE (0–100): <50 → requires_manual_review=true. <70 → escalate.

STEP 9 — ESCALATION triggers: confidence<70 | Corrosion Breakthrough on structural | Incomplete Firestopping | Spalling with exposed substrate | Delamination >300mm | Missing coating on fire-rated member.

RETURN ONLY VALID JSON — no markdown, no extra text:
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

const SPECIALIST_ADDENDA: Record<string, string> = {
  intumescent: `
INTUMESCENT SPECIALIST MODE:
FRL continuity is mandatory. Any breach (even <50mm) = High severity + escalate=true, escalation_reason includes "FRL continuity breach".
Auto-High: cracking penetrating depth | flaking exposing steel | delamination to bare steel | missing coating | voids.
Products: Nullifire S607/S802/S908, Jotun Steelmaster WB/SB/EP, International Interchar, Carboline Interam, Sherwin-Williams Firetex FX.
Connection zones: cracking at bolt/weld toe = thermal/movement, not workmanship.`,

  cementitious: `
CEMENTITIOUS/VERMICULITE SPECIALIST MODE:
Granular pebbled texture 12–50mm, NOT paint. Products: Cafco 300/400, Isolatek Blaze-Shield, GCP Monokote.
Spalling (chunk loss exposing steel) = always High + escalate.
Surface crazing = Low. Full-depth cracking = High.
Efflorescence = moisture movement, Medium. Missing material = High + escalate.
Set escalation_reason: "Cementitious system integrity concern — FRL continuity requires verification".`,

  protective_coating: `
PROTECTIVE COATING SPECIALIST MODE:
Multi-coat paint system, NOT fire-rated. Primary risk = corrosion.
Apply ISO 4628-3 rust grading (Ri 0–5). Ri 3+ = High severity + escalate.
C3+ + Ri 2+ = escalate. Cathodic disbondment under blisters = High.
Products: Jotun Hardtop, Carboline Carboguard, International Interzinc/Interzone, Sherwin-Williams Zinc Clad.`,

  firestopping: `
FIRESTOPPING SPECIALIST MODE:
ANY gap or breach = code non-compliance and life-safety risk. No "cosmetic" category.
Open penetration gap = always High + escalate + escalation_reason="FRL breach — open penetration gap".
Unrated expanding foam alone = Incomplete Firestopping + escalate + escalation_reason="Non-rated expanding foam — non-compliant".
Post-install breach (new service through old seal) = always High + escalate.
Products: Hilti CP 601/606/620, Sika Pyroplug/Pyroflex, 3M Fire Barrier, Promat Promaseal, FSi Fireflex.`,
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

function buildUserPrompt(
  systemType: string | undefined,
  element: string | undefined,
  environment: string | undefined,
  isNewInstall: boolean | undefined,
  observedConcern: string | undefined
): string {
  return [
    `Inspector-confirmed system type: ${systemType ?? "Unknown"}`,
    `Element: ${element ?? "Unknown"}`,
    `Environment: ${environment ?? "Not specified"}`,
    `Installation status: ${isNewInstall ? "New installation (assess workmanship defects)" : "Existing/aged system (assess maintenance and degradation)"}`,
    `Inspector observed concern: ${observedConcern ?? "Not specified"}`,
    `\nAnalyse the photograph. Follow all steps. Apply correct specialist mode for the system type above. Populate all geometry fields. Never default to Mechanical Damage without a visible impact mark.`,
  ].join("\n");
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; error: string }> {
  if (attempt > 1) await sleep(jitteredBackoff(attempt - 1));

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
              { text: userPrompt },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1400,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => `http_${res.status}`);
      return { parsed: null, error: `gemini_http_${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { parsed: null, error: "gemini_empty_response" };

    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      return { parsed: null, error: "gemini_invalid_json" };
    }

    const { valid, reason } = validateSchema(parsed);
    if (!valid) return { parsed: null, error: `gemini_schema:${reason}` };

    return { parsed, error: "" };
  } catch (e) {
    return { parsed: null, error: `gemini_network: ${String(e)}` };
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; error: string }> {
  if (attempt > 1) await sleep(jitteredBackoff(attempt - 1));

  try {
    const maxTokens = model === OPENAI_TIER1_MODEL ? 700 : 1400;
    const imageDetail = model === OPENAI_TIER1_MODEL ? "low" : "high";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: imageDetail } },
              { type: "text", text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) return { parsed: null, error: "openai_rate_limited" };
    if (!res.ok) {
      const errText = await res.text().catch(() => `http_${res.status}`);
      return { parsed: null, error: `openai_http_${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { parsed: null, error: "openai_empty_response" };

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(content); } catch { return { parsed: null, error: "openai_invalid_json" }; }

    const { valid, reason } = validateSchema(parsed);
    if (!valid) return { parsed: null, error: `openai_schema:${reason}` };

    return { parsed, error: "" };
  } catch (e) {
    return { parsed: null, error: `openai_network: ${String(e)}` };
  }
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string,
  mimeType: string,
  attempt: number
): Promise<{ parsed: Record<string, unknown> | null; error: string }> {
  if (attempt > 1) await sleep(jitteredBackoff(attempt - 1));

  const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
    ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    : "image/jpeg";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: validMime, data: imageBase64 } },
            { type: "text", text: userPrompt },
          ],
        }],
      }),
    });

    if (res.status === 429 || res.status === 529) return { parsed: null, error: "anthropic_rate_limited" };
    if (!res.ok) {
      const errText = await res.text().catch(() => `http_${res.status}`);
      return { parsed: null, error: `anthropic_http_${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return { parsed: null, error: "anthropic_empty_response" };

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { parsed: null, error: "anthropic_no_json" };

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return { parsed: null, error: "anthropic_invalid_json" }; }

    const { valid, reason } = validateSchema(parsed);
    if (!valid) return { parsed: null, error: `anthropic_schema:${reason}` };

    return { parsed, error: "" };
  } catch (e) {
    return { parsed: null, error: `anthropic_network: ${String(e)}` };
  }
}

function validateSchema(parsed: Record<string, unknown>): { valid: boolean; reason: string } {
  if (typeof parsed.defect_type !== "string" || !parsed.defect_type) return { valid: false, reason: "missing_defect_type" };
  if (!["Low", "Medium", "High"].includes(String(parsed.severity ?? ""))) return { valid: false, reason: "invalid_severity" };
  if (typeof parsed.confidence !== "number") return { valid: false, reason: "missing_confidence" };
  if (typeof parsed.observation !== "string") return { valid: false, reason: "missing_observation" };
  if (String(parsed.defect_type) === "Unknown" && String(parsed.severity) === "High") return { valid: false, reason: "impossible_unknown_high" };
  if (!parsed.geometry || typeof parsed.geometry !== "object") return { valid: false, reason: "missing_geometry" };
  return { valid: true, reason: "" };
}

function normaliseDefectType(raw: string): string {
  const cleaned = raw.trim();
  const exact = VALID_DEFECT_TYPES.find((d) => d.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const partial = VALID_DEFECT_TYPES.find((d) => cleaned.toLowerCase().includes(d.toLowerCase()));
  return partial ?? "Unknown";
}

const needsConsensus = (severity: string, confidence: number): boolean =>
  severity === "High" || confidence < 70;

function compareResults(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return (
    normaliseDefectType(String(a.defect_type ?? "")) === normaliseDefectType(String(b.defect_type ?? "")) &&
    String(a.severity ?? "") === String(b.severity ?? "")
  );
}

function mergeConsensus(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const avgConfidence = Math.round((Number(a.confidence ?? 0) + Number(b.confidence ?? 0)) / 2);
  return {
    ...a,
    confidence: avgConfidence,
    observation: `${String(a.observation ?? "")} [Consensus: ${String(b.observation ?? "")}]`.trim(),
    consensus_mode: true,
    conflict_detected: false,
  };
}

function buildNormalisedResult(
  parsed: Record<string, unknown>,
  provider: string,
  model: string,
  tier: number,
  latencyMs: number,
  consensusMode: boolean,
  conflictDetected: boolean,
  kbContextUsed: boolean
): Record<string, unknown> {
  const severity = ["Low", "Medium", "High"].includes(String(parsed.severity ?? ""))
    ? String(parsed.severity) : "Medium";
  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
  const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));
  const requiresManualReview = Boolean(parsed.requires_manual_review) || confidence < 50 || conflictDetected;

  const corrosivityCategory = ["C1", "C2", "C3", "C4", "C5", "Unknown"].includes(String(parsed.corrosivity_category ?? ""))
    ? String(parsed.corrosivity_category) : "Unknown";
  const isHighCorrosivity = corrosivityCategory === "C4" || corrosivityCategory === "C5";
  const isCorrosionDefect = ["Corrosion Breakthrough", "Missing Coating", "Surface Deterioration"].includes(defectType);
  const corrosivityEscalate = isHighCorrosivity && isCorrosionDefect;

  const escalationReasons: string[] = [];
  if (parsed.escalation_reason) escalationReasons.push(String(parsed.escalation_reason));
  if (corrosivityEscalate) escalationReasons.push(`High corrosivity (${corrosivityCategory}) + corrosion defect`);
  if (conflictDetected) escalationReasons.push("AI provider consensus conflict — requires manual review");

  const rawGeometry = parsed.geometry as Record<string, unknown> | undefined;
  const geometry = rawGeometry ? {
    location_on_member: String(rawGeometry.location_on_member ?? ""),
    pattern: String(rawGeometry.pattern ?? ""),
    extent: String(rawGeometry.extent ?? ""),
    likely_mechanism: String(rawGeometry.likely_mechanism ?? ""),
    urgent_action: String(rawGeometry.urgent_action ?? ""),
  } : null;

  const passFail = conflictDetected ? "review" :
    (severity === "High" || (Boolean(parsed.escalate) || confidence < 70)) ? "fail" : "pass";

  const drawingPinReady = !requiresManualReview && !conflictDetected && confidence >= 70;

  const estimatedScopeHours = (() => {
    if (severity === "High") return 4.0;
    if (severity === "Medium") return 2.0;
    return 0.5;
  })();

  return {
    success: true,
    defect_type: defectType,
    severity,
    observation: String(parsed.observation ?? ""),
    confidence,
    likely_cause: String(parsed.likely_cause ?? ""),
    visible_evidence: Array.isArray(parsed.visible_evidence)
      ? (parsed.visible_evidence as unknown[]).map((c) => String(c)).slice(0, 10) : [],
    next_checks: Array.isArray(parsed.next_checks)
      ? (parsed.next_checks as unknown[]).map((c) => String(c)).slice(0, 5) : [],
    escalate: Boolean(parsed.escalate) || confidence < 70 || corrosivityEscalate || conflictDetected,
    escalation_reason: escalationReasons.join("; "),
    remediation_guidance: String(parsed.remediation_guidance ?? ""),
    requires_manual_review: requiresManualReview,
    system_type_detected: String(parsed.system_type ?? ""),
    corrosivity_category: corrosivityCategory,
    geometry,
    tier_used: tier,
    model_used: model,
    provider_used: provider,
    pass_fail: passFail,
    drawing_pin_ready: drawingPinReady,
    estimated_scope_hours: estimatedScopeHours,
    prompt_version: PROMPT_VERSION,
    consensus_mode: consensusMode,
    conflict_detected: conflictDetected,
    kb_context_used: kbContextUsed,
    metadata: { latency_ms: latencyMs },
  };
}

async function storeResultHistory(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string | undefined,
  itemId: string | undefined,
  orgId: string | undefined,
  result: Record<string, unknown>
): Promise<void> {
  if (!jobId && !itemId) return;
  try {
    const sb = createClient(supabaseUrl, serviceKey);
    await sb.from("inspection_ai_result_history").insert({
      job_id: jobId ?? null,
      item_id: itemId ?? null,
      organization_id: orgId ?? null,
      provider: String(result.provider_used ?? ""),
      model: String(result.model_used ?? ""),
      prompt_version: PROMPT_VERSION,
      latency_ms: Number((result.metadata as Record<string, unknown> | undefined)?.latency_ms ?? 0),
      confidence: Number(result.confidence ?? 0),
      severity: String(result.severity ?? ""),
      defect_type: String(result.defect_type ?? ""),
      pass_fail: String(result.pass_fail ?? ""),
      requires_manual_review: Boolean(result.requires_manual_review),
      schema_valid: true,
      normalized_json: result,
    });
  } catch {
    // non-fatal
  }
}

async function trackProviderMetrics(
  supabaseUrl: string,
  serviceKey: string,
  orgId: string | undefined,
  provider: string,
  model: string,
  success: boolean,
  latencyMs: number,
  confidence: number
): Promise<void> {
  if (!orgId) return;
  try {
    const sb = createClient(supabaseUrl, serviceKey);
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    await sb.rpc("upsert_provider_metrics", {
      p_org_id: orgId,
      p_provider: provider,
      p_model: model,
      p_success: success,
      p_latency_ms: latencyMs,
      p_confidence: confidence,
      p_hour: hour.toISOString(),
    });
  } catch {
    // non-fatal
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!geminiApiKey && !openaiApiKey && !anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, reason: "configuration_error", error: "No AI provider API key configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      image_base64, mime_type, system_type, element, environment,
      observed_concern, is_new_install, force_tier2,
      job_id, item_id, organization_id,
    } = body;

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, reason: "missing_image", error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveMime = mime_type ?? "image/jpeg";
    const userPrompt = buildUserPrompt(system_type, element, environment, is_new_install, observed_concern);

    const kbContext = (supabaseUrl && serviceKey)
      ? await retrieveKBContext(supabaseUrl, serviceKey, system_type ?? "")
      : "";
    const kbContextUsed = kbContext.length > 0;
    const systemPrompt = buildSystemPrompt(system_type ?? "", kbContext);

    const forceHighTier = Boolean(force_tier2);
    const alwaysHighTier = (() => {
      const lower = (system_type ?? "").toLowerCase();
      return lower.includes("intumescent") || lower.includes("firestopping") || lower.includes("cementitious");
    })();

    let primaryParsed: Record<string, unknown> | null = null;
    let primaryProvider = "";
    let primaryModel = "";
    let primaryTier = 2;

    if (!forceHighTier && !alwaysHighTier && geminiApiKey) {
      const { parsed } = await callGemini(geminiApiKey, buildSystemPrompt(system_type ?? "", ""), userPrompt, image_base64, effectiveMime, 1);
      if (parsed && Number(parsed.confidence ?? 0) >= 70 && String(parsed.severity ?? "") !== "High") {
        primaryParsed = parsed;
        primaryProvider = "gemini";
        primaryModel = GEMINI_MODEL;
        primaryTier = 1;
      }
    }

    if (!primaryParsed && geminiApiKey) {
      const { parsed } = await callGemini(geminiApiKey, systemPrompt, userPrompt, image_base64, effectiveMime, 1);
      if (parsed) {
        primaryParsed = parsed;
        primaryProvider = "gemini";
        primaryModel = GEMINI_MODEL;
        primaryTier = 2;
      }
    }

    if (!primaryParsed && openaiApiKey) {
      const model = alwaysHighTier || forceHighTier ? OPENAI_TIER2_MODEL : OPENAI_TIER1_MODEL;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const { parsed, error } = await callOpenAI(openaiApiKey, model, systemPrompt, userPrompt, image_base64, effectiveMime, attempt);
        if (parsed) {
          primaryParsed = parsed;
          primaryProvider = "openai";
          primaryModel = model;
          primaryTier = model === OPENAI_TIER2_MODEL ? 2 : 1;
          break;
        }
        if (!error.includes("rate_limited") && !error.includes("network")) break;
      }
    }

    if (!primaryParsed && openaiApiKey && !alwaysHighTier) {
      const { parsed } = await callOpenAI(openaiApiKey, OPENAI_TIER2_MODEL, systemPrompt, userPrompt, image_base64, effectiveMime, 1);
      if (parsed) {
        primaryParsed = parsed;
        primaryProvider = "openai";
        primaryModel = OPENAI_TIER2_MODEL;
        primaryTier = 2;
      }
    }

    if (!primaryParsed && anthropicApiKey) {
      const { parsed } = await callAnthropic(anthropicApiKey, systemPrompt, userPrompt, image_base64, effectiveMime, 1);
      if (parsed) {
        primaryParsed = parsed;
        primaryProvider = "anthropic";
        primaryModel = ANTHROPIC_MODEL;
        primaryTier = 2;
      }
    }

    if (!primaryParsed) {
      return new Response(
        JSON.stringify({ success: false, reason: "ai_unavailable", error: "All AI providers are unavailable. Please classify manually." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const primaryConf = Number(primaryParsed.confidence ?? 0);
    const primarySev = String(primaryParsed.severity ?? "");
    let finalParsed = primaryParsed;
    let consensusMode = false;
    let conflictDetected = false;

    if (needsConsensus(primarySev, primaryConf)) {
      consensusMode = true;

      let secondParsed: Record<string, unknown> | null = null;
      const secondProviders: Array<() => Promise<{ parsed: Record<string, unknown> | null; error: string }>> = [];

      if (primaryProvider !== "gemini" && geminiApiKey) {
        secondProviders.push(() => callGemini(geminiApiKey, systemPrompt, userPrompt, image_base64, effectiveMime, 1));
      }
      if (primaryProvider !== "openai" && openaiApiKey) {
        secondProviders.push(() => callOpenAI(openaiApiKey, OPENAI_TIER2_MODEL, systemPrompt, userPrompt, image_base64, effectiveMime, 1));
      }
      if (primaryProvider !== "anthropic" && anthropicApiKey) {
        secondProviders.push(() => callAnthropic(anthropicApiKey, systemPrompt, userPrompt, image_base64, effectiveMime, 1));
      }

      for (const providerFn of secondProviders) {
        const { parsed } = await providerFn();
        if (parsed) { secondParsed = parsed; break; }
      }

      if (secondParsed) {
        if (compareResults(primaryParsed, secondParsed)) {
          finalParsed = mergeConsensus(primaryParsed, secondParsed);
          conflictDetected = false;
        } else {
          finalParsed = { ...primaryParsed, conflict_result: secondParsed };
          conflictDetected = true;
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    const result = buildNormalisedResult(
      finalParsed, primaryProvider, primaryModel, primaryTier,
      latencyMs, consensusMode, conflictDetected, kbContextUsed
    );

    if (supabaseUrl && serviceKey) {
      EdgeRuntime.waitUntil(Promise.all([
        storeResultHistory(supabaseUrl, serviceKey, job_id, item_id, organization_id, result),
        trackProviderMetrics(supabaseUrl, serviceKey, organization_id, primaryProvider, primaryModel, true, latencyMs, primaryConf),
      ]));
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[inspection-ai-analyse] Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, reason: "internal_error", error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
