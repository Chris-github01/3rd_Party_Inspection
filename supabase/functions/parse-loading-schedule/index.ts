import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParseRequest {
  importId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { importId }: ParseRequest = await req.json();

    if (!importId) {
      return new Response(
        JSON.stringify({ error: "importId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch import record
    const { data: importRecord, error: fetchError } = await supabaseClient
      .from("loading_schedule_imports")
      .select("*, document:documents(*)")
      .eq("id", importId)
      .single();

    if (fetchError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Import not found", details: fetchError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to running
    await supabaseClient
      .from("loading_schedule_imports")
      .update({ status: "running" })
      .eq("id", importId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("documents")
      .download(importRecord.document.storage_path);

    if (downloadError || !fileData) {
      await supabaseClient
        .from("loading_schedule_imports")
        .update({
          status: "failed",
          error_code: "DOWNLOAD_ERROR",
          error_message: downloadError?.message || "Failed to download file",
        })
        .eq("id", importId);

      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse based on source type
    const artifact = {
      importId,
      sourceType: importRecord.source_type,
      pages: [] as any[],
      metadata: {
        fileName: importRecord.document.filename,
        fileSize: fileData.size,
        parsedAt: new Date().toISOString(),
      },
    };

    const extractedItems: any[] = [];

    try {
      if (importRecord.source_type === "csv") {
        // Parse CSV
        const text = await fileData.text();
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",").map((h) => h.trim());

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const row: any = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || "";
          });

          const item = extractItemFromRow(row, i, importRecord.project_id, importId);
          if (item) {
            extractedItems.push(item);
          }
        }

        artifact.pages.push({
          pageNumber: 1,
          method: "text",
          confidence: 0.95,
          lineCount: lines.length,
          errors: [],
        });
      } else if (importRecord.source_type === "xlsx") {
        // For XLSX, we'd use a library like xlsx-parse
        // For now, return a placeholder that indicates XLSX support needed
        artifact.pages.push({
          pageNumber: 1,
          method: "text",
          confidence: 0.0,
          errors: ["XLSX parsing requires additional library - not yet implemented"],
        });
      } else if (importRecord.source_type === "pdf") {
        // For PDF, we'd use pdf-parse or call external OCR service
        // For now, return a placeholder
        artifact.pages.push({
          pageNumber: 1,
          method: "text",
          confidence: 0.0,
          errors: ["PDF parsing requires external service - use parse-pdf function instead"],
        });
      }
    } catch (parseError: any) {
      artifact.pages.push({
        pageNumber: 1,
        method: "none",
        confidence: 0.0,
        errors: [parseError.message],
      });
    }

    // Upload artifact JSON
    const artifactPath = `loading-schedules/${importId}/artifact.json`;
    await supabaseClient.storage
      .from("parsing-artifacts")
      .upload(artifactPath, JSON.stringify(artifact, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    // Upload result JSON
    const resultPath = `loading-schedules/${importId}/result.json`;
    await supabaseClient.storage
      .from("parsing-artifacts")
      .upload(resultPath, JSON.stringify(extractedItems, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    // Insert items into loading_schedule_items
    if (extractedItems.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("loading_schedule_items")
        .insert(extractedItems);

      if (insertError) {
        console.error("Error inserting items:", insertError);
      }
    }

    // Determine final status
    const needsReview = extractedItems.some((item) => item.needs_review);
    const hasErrors = artifact.pages.some((p) => p.errors.length > 0);
    const finalStatus = hasErrors && extractedItems.length === 0
      ? "failed"
      : needsReview
      ? "needs_review"
      : extractedItems.length > 0
      ? "completed"
      : "partial_completed";

    // Update import record
    await supabaseClient
      .from("loading_schedule_imports")
      .update({
        status: finalStatus,
        artifact_json_path: artifactPath,
        result_json_path: resultPath,
        page_count: artifact.pages.length,
      })
      .eq("id", importId);

    return new Response(
      JSON.stringify({
        success: true,
        importId,
        status: finalStatus,
        itemsExtracted: extractedItems.length,
        needsReview,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractItemFromRow(
  row: Record<string, string>,
  lineNo: number,
  projectId: string,
  importId: string
): any | null {
  // Extract section size (try various column names)
  const sectionRaw =
    row["section"] ||
    row["Section"] ||
    row["section_size"] ||
    row["Section Size"] ||
    row["member_size"] ||
    "";

  if (!sectionRaw) return null;

  const sectionNormalized = normalizeSectionSize(sectionRaw);

  // Extract member mark
  const memberMark =
    row["member_mark"] ||
    row["Member Mark"] ||
    row["mark"] ||
    row["Mark"] ||
    row["member"] ||
    row["Member"] ||
    "";

  // Extract FRR
  const frrRaw =
    row["frr"] ||
    row["FRR"] ||
    row["frr_minutes"] ||
    row["fire_rating"] ||
    row["Fire Rating"] ||
    "";
  const { minutes, format } = extractFRR(frrRaw);

  // Extract DFT
  const dftRaw =
    row["dft"] ||
    row["DFT"] ||
    row["required_dft"] ||
    row["Required DFT"] ||
    row["thickness"] ||
    "";
  const dft = parseInt(dftRaw) || null;

  // Extract coating product
  const coating =
    row["coating"] ||
    row["Coating"] ||
    row["product"] ||
    row["Product"] ||
    row["coating_system"] ||
    row["Coating System"] ||
    "";

  // Extract element type
  const elementType = (
    row["element_type"] ||
    row["Element Type"] ||
    row["type"] ||
    row["Type"] ||
    ""
  ).toLowerCase();

  const validElementType =
    elementType === "beam" ||
    elementType === "column" ||
    elementType === "brace" ||
    elementType === "other"
      ? elementType
      : null;

  // Extract schedule ref
  const scheduleRef =
    row["schedule_ref"] ||
    row["Schedule Ref"] ||
    row["ref"] ||
    row["Ref"] ||
    row["sheet"] ||
    row["Sheet"] ||
    "";

  // Determine confidence and needs_review
  const confidence = calculateConfidence(minutes, dft, coating);
  const needsReview = confidence < 0.75 || !minutes || !dft || !coating;

  return {
    import_id: importId,
    project_id: projectId,
    loading_schedule_ref: scheduleRef || null,
    member_mark: memberMark || null,
    element_type: validElementType,
    section_size_raw: sectionRaw,
    section_size_normalized: sectionNormalized,
    frr_minutes: minutes,
    frr_format: format || null,
    coating_product: coating || null,
    dft_required_microns: dft,
    needs_review: needsReview,
    confidence,
    cite_page: 1,
    cite_line_start: lineNo,
    cite_line_end: lineNo,
  };
}

function normalizeSectionSize(raw: string): string {
  // Remove extra spaces
  let normalized = raw.trim().replace(/\s+/g, "");
  // Uppercase
  normalized = normalized.toUpperCase();
  // Standardize formats like "610 UB 125" -> "610UB125"
  return normalized;
}

function extractFRR(raw: string): { minutes: number | null; format: string | null } {
  if (!raw) return { minutes: null, format: null };

  // Try to extract number
  const match = raw.match(/\d+/);
  if (!match) return { minutes: null, format: null };

  const num = parseInt(match[0]);

  // Check for formats like "60/-/-" or "-/60/60" or "60/60/60"
  if (raw.includes("/")) {
    return { minutes: num, format: raw };
  }

  // Default format
  return { minutes: num, format: `${num}/-/-` };
}

function calculateConfidence(
  frr: number | null,
  dft: number | null,
  coating: string | null
): number {
  let confidence = 1.0;
  if (!frr) confidence -= 0.3;
  if (!dft) confidence -= 0.3;
  if (!coating) confidence -= 0.2;
  return Math.max(0, confidence);
}
