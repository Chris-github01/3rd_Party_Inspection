import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PROMPT_VERSION = "3.0";
const GEMINI_MODEL = "gemini-2.0-flash";
const OPENAI_TIER2_MODEL = "gpt-4o";
const ANTHROPIC_MODEL = "claude-opus-4-5";

const VALID_DEFECT_TYPES = [
  "Delamination", "Cracking", "Mechanical Damage", "Missing Coating",
  "Corrosion Breakthrough", "Blistering", "Spalling", "Voids",
  "Incomplete Firestopping", "Surface Deterioration", "Moisture Damage", "Unknown",
];

const BASE_SYSTEM_PROMPT = `You are a senior Level 3 coatings and passive fire protection inspector with 25 years of NZ/AU field experience.

Analyse ONE inspection photograph. Return ONLY valid JSON — no markdown, no extra text.

DEFECT TYPES (one only): Mechanical Damage | Cracking | Delamination | Missing Coating | Corrosion Breakthrough | Blistering | Spalling | Voids | Incomplete Firestopping | Surface Deterioration | Moisture Damage | Unknown

DISAMBIGUATION: Rust bleed = Corrosion Breakthrough. Layer separation = Delamination. Cementitious chunk loss = Spalling. Unknown if genuinely unclear. Mechanical Damage ONLY for clear gouge/dent/abrasion.

SEVERITY: Low = cosmetic | Medium = local failure | High = exposed substrate or safety breach
CONFIDENCE: 90-100 = clear | 70-89 = likely | 50-69 = uncertain | <50 = poor image quality
CORROSIVITY: C1–C5 or Unknown (ISO 12944). C4/C5 + corrosion = escalate=true.

IMAGE QUALITY: If blurry, dark, low resolution, or obscured — set requires_manual_review=true, confidence<40.

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

function normaliseDefectType(raw: string): string {
  const cleaned = (raw ?? "").trim();
  const exact = VALID_DEFECT_TYPES.find((d) => d.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const partial = VALID_DEFECT_TYPES.find((d) => cleaned.toLowerCase().includes(d.toLowerCase()));
  return partial ?? "Unknown";
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

async function runInference(
  geminiKey: string | undefined,
  openaiKey: string | undefined,
  anthropicKey: string | undefined,
  systemPrompt: string,
  contextPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<{ parsed: Record<string, unknown> | null; provider: string; model: string; latencyMs: number }> {
  const t0 = Date.now();

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
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
            generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: "application/json" },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (validateSchema(parsed).valid) {
              return { parsed, provider: "gemini", model: GEMINI_MODEL, latencyMs: Date.now() - t0 };
            }
          } catch { /* fall through */ }
        }
      }
    } catch { /* fall through */ }
  }

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: OPENAI_TIER2_MODEL,
          max_tokens: 1200,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
              { type: "text", text: contextPrompt },
            ]},
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            if (validateSchema(parsed).valid) {
              return { parsed, provider: "openai", model: OPENAI_TIER2_MODEL, latencyMs: Date.now() - t0 };
            }
          } catch { /* fall through */ }
        }
      }
    } catch { /* fall through */ }
  }

  if (anthropicKey) {
    const validMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
      ? mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp" : "image/jpeg";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: validMime, data: imageBase64 } },
            { type: "text", text: contextPrompt },
          ]}],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (validateSchema(parsed).valid) {
              return { parsed, provider: "anthropic", model: ANTHROPIC_MODEL, latencyMs: Date.now() - t0 };
            }
          } catch { /* fall through */ }
        }
      }
    } catch { /* fall through */ }
  }

  return { parsed: null, provider: "", model: "", latencyMs: Date.now() - t0 };
}

async function rerunItem(
  supabase: ReturnType<typeof createClient>,
  itemId: string,
  geminiKey: string | undefined,
  openaiKey: string | undefined,
  anthropicKey: string | undefined
): Promise<{ itemId: string; success: boolean; error?: string }> {
  const { data: item, error: itemErr } = await supabase
    .from("inspection_ai_items")
    .select("*, inspection_evidence_photos(*)")
    .eq("id", itemId)
    .maybeSingle();

  if (itemErr || !item) return { itemId, success: false, error: itemErr?.message ?? "item_not_found" };

  const systemType = String(item.system_type ?? item.ai_result?.system_type ?? "");
  const orgId = String(item.organization_id ?? "");

  const photos = (item.inspection_evidence_photos ?? []) as Array<{storage_url: string; mime_type?: string}>;
  if (photos.length === 0) return { itemId, success: false, error: "no_photos" };

  let imageBase64 = "";
  let mimeType = "image/jpeg";
  try {
    const fetched = await fetchImageAsBase64(photos[0].storage_url);
    imageBase64 = fetched.base64;
    mimeType = photos[0].mime_type ?? fetched.mimeType;
  } catch (e) {
    return { itemId, success: false, error: `image_fetch_failed: ${String(e)}` };
  }

  const kbContext = await retrieveKBContext(supabase, systemType);
  const systemPrompt = buildSystemPrompt(systemType, kbContext);

  const contextPrompt = [
    "REANALYSIS with updated prompts v" + PROMPT_VERSION,
    `System type: ${systemType || "Unknown"}`,
    `Element: ${item.element ?? "Unknown"}`,
    `Environment: ${item.environment ?? "Not specified"}`,
    `Original observation: ${item.observation ?? "Not specified"}`,
    "",
    "Re-examine this photograph with fresh eyes. Apply all current reasoning rules.",
  ].join("\n");

  const { parsed, provider, model, latencyMs } = await runInference(
    geminiKey, openaiKey, anthropicKey,
    systemPrompt, contextPrompt, imageBase64, mimeType
  );

  if (!parsed) return { itemId, success: false, error: "all_providers_failed" };

  const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
  const severity = ["Low", "Medium", "High"].includes(String(parsed.severity ?? "")) ? String(parsed.severity) : "Medium";
  const defectType = normaliseDefectType(String(parsed.defect_type ?? "Unknown"));
  const requiresManualReview = Boolean(parsed.requires_manual_review) || confidence < 50;
  const passFail = severity === "High" || confidence < 70 || Boolean(parsed.escalate) ? "fail" : "pass";
  const drawingPinReady = !requiresManualReview && confidence >= 70;
  const estimatedScopeHours = severity === "High" ? 4.0 : severity === "Medium" ? 2.0 : 0.5;

  const normalizedResult = {
    ...parsed,
    defect_type: defectType,
    severity,
    confidence,
    provider_used: provider,
    model_used: model,
    requires_manual_review: requiresManualReview,
    pass_fail: passFail,
    drawing_pin_ready: drawingPinReady,
    estimated_scope_hours: estimatedScopeHours,
    prompt_version: PROMPT_VERSION,
    kb_context_used: kbContext.length > 0,
    rerun: true,
  };

  await supabase.from("inspection_ai_result_history").insert({
    item_id: itemId,
    organization_id: orgId || null,
    provider,
    model,
    prompt_version: PROMPT_VERSION,
    latency_ms: latencyMs,
    confidence,
    severity,
    defect_type: defectType,
    pass_fail: passFail,
    requires_manual_review: requiresManualReview,
    schema_valid: true,
    normalized_json: normalizedResult,
  });

  await supabase.from("inspection_ai_items").update({
    defect_type: defectType,
    severity,
    observation: String(parsed.observation ?? ""),
    recommendation: String(parsed.remediation_guidance ?? ""),
    confidence,
    model_used: model,
    tier_used: provider === "gemini" ? 1 : 2,
    latency_ms: latencyMs,
    pass_fail: passFail,
    drawing_pin_ready: drawingPinReady,
    estimated_scope_hours: estimatedScopeHours,
    ai_result: normalizedResult,
    requires_manual_review: requiresManualReview,
  }).eq("id", itemId);

  return { itemId, success: true };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!geminiKey && !openaiKey && !anthropicKey) {
      return new Response(
        JSON.stringify({ success: false, error: "No AI provider configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { item_id, project_id, organization_id } = body;

    if (!item_id && !project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "item_id or project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let itemIds: string[] = [];

    if (item_id) {
      itemIds = [String(item_id)];
    } else {
      const query = supabase
        .from("inspection_ai_items")
        .select("id")
        .eq("project_id", project_id);

      if (organization_id) query.eq("organization_id", organization_id);

      const { data, error } = await query;
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      itemIds = (data ?? []).map((r: {id: string}) => r.id);
    }

    if (itemIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No items found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    for (const id of itemIds) {
      await sleep(200);
      const result = await rerunItem(supabase, id, geminiKey, openaiKey, anthropicKey);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded,
        failed,
        prompt_version: PROMPT_VERSION,
        duration_ms: Date.now() - startTime,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[inspection-ai-rerun] unhandled:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
