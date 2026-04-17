import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function checkGemini(apiKey: string | undefined): Promise<{ online: boolean; latency_ms: number }> {
  if (!apiKey) return { online: false, latency_ms: 0 };
  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    return { online: res.ok || res.status === 400, latency_ms: Date.now() - t0 };
  } catch {
    return { online: false, latency_ms: Date.now() - t0 };
  }
}

async function checkOpenAI(apiKey: string | undefined): Promise<{ online: boolean; latency_ms: number }> {
  if (!apiKey) return { online: false, latency_ms: 0 };
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return { online: res.ok, latency_ms: Date.now() - t0 };
  } catch {
    return { online: false, latency_ms: Date.now() - t0 };
  }
}

async function checkAnthropic(apiKey: string | undefined): Promise<{ online: boolean; latency_ms: number }> {
  if (!apiKey) return { online: false, latency_ms: 0 };
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(5000),
    });
    return { online: res.ok || res.status === 400, latency_ms: Date.now() - t0 };
  } catch {
    return { online: false, latency_ms: Date.now() - t0 };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    const url = new URL(req.url);
    const orgId = url.searchParams.get("organization_id") ?? undefined;

    const [geminiStatus, openaiStatus, anthropicStatus] = await Promise.all([
      checkGemini(geminiKey),
      checkOpenAI(openaiKey),
      checkAnthropic(anthropicKey),
    ]);

    const supabase = createClient(supabaseUrl, serviceKey);

    const queueStatsQuery = supabase
      .from("inspection_ai_jobs")
      .select("status", { count: "exact", head: false });
    if (orgId) queueStatsQuery.eq("organization_id", orgId);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [queuedRes, processingRes, failedRes, completedRes, latencyRes, historyRes] = await Promise.all([
      supabase.from("inspection_ai_jobs").select("id", { count: "exact", head: true })
        .eq("status", "queued"),
      supabase.from("inspection_ai_jobs").select("id", { count: "exact", head: true })
        .eq("status", "processing"),
      supabase.from("inspection_ai_jobs").select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", oneHourAgo),
      supabase.from("inspection_ai_jobs").select("id", { count: "exact", head: true })
        .eq("status", "complete")
        .gte("completed_at", oneHourAgo),
      supabase.from("inspection_ai_result_history")
        .select("latency_ms")
        .gte("created_at", oneHourAgo)
        .limit(100),
      supabase.from("inspection_ai_result_history")
        .select("provider, model, confidence, latency_ms")
        .gte("created_at", oneHourAgo)
        .limit(200),
    ]);

    const latencies = (latencyRes.data ?? []).map((r: {latency_ms: number}) => r.latency_ms).filter(Boolean);
    const avgLatencyMs = latencies.length > 0
      ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length)
      : 0;

    const providerBreakdown: Record<string, { calls: number; avg_confidence: number; avg_latency_ms: number }> = {};
    for (const row of (historyRes.data ?? []) as Array<{provider: string; model: string; confidence: number; latency_ms: number}>) {
      const key = row.provider;
      if (!providerBreakdown[key]) providerBreakdown[key] = { calls: 0, avg_confidence: 0, avg_latency_ms: 0 };
      const entry = providerBreakdown[key];
      const prev = entry.calls;
      entry.avg_confidence = Math.round((entry.avg_confidence * prev + (row.confidence ?? 0)) / (prev + 1));
      entry.avg_latency_ms = Math.round((entry.avg_latency_ms * prev + (row.latency_ms ?? 0)) / (prev + 1));
      entry.calls += 1;
    }

    const primaryProvider = geminiStatus.online ? "gemini"
      : openaiStatus.online ? "openai"
      : anthropicStatus.online ? "anthropic"
      : "none";

    const configured = {
      gemini: !!geminiKey,
      openai: !!openaiKey,
      anthropic: !!anthropicKey,
    };

    const health = {
      status: primaryProvider !== "none" ? "operational" : "degraded",
      primary_provider: primaryProvider,
      prompt_version: "3.0",
      providers: {
        gemini: {
          configured: configured.gemini,
          online: geminiStatus.online,
          latency_ms: geminiStatus.latency_ms,
        },
        openai: {
          configured: configured.openai,
          online: openaiStatus.online,
          latency_ms: openaiStatus.latency_ms,
        },
        anthropic: {
          configured: configured.anthropic,
          online: anthropicStatus.online,
          latency_ms: anthropicStatus.latency_ms,
        },
      },
      queue: {
        queued_jobs: queuedRes.count ?? 0,
        processing_jobs: processingRes.count ?? 0,
        failed_last_hour: failedRes.count ?? 0,
        completed_last_hour: completedRes.count ?? 0,
      },
      performance: {
        avg_latency_ms: avgLatencyMs,
        provider_breakdown: providerBreakdown,
      },
      checked_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[inspection-ai-health] unhandled:", err);
    return new Response(
      JSON.stringify({ status: "error", error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
