import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PYTHON_PARSER_URL = Deno.env.get("PYTHON_PARSER_URL") || "https://loading-schedule-parser.onrender.com";

interface ParseRequest {
  importId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("Parse loading schedule function invoked");

    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

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

    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - user not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("User authenticated:", user.id);

    const body = await req.json();
    console.log("Request body:", body);

    const { importId }: ParseRequest = body;

    if (!importId) {
      console.error("Missing importId");
      return new Response(
        JSON.stringify({ error: "importId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching import record:", importId);

    const { data: importRecord, error: fetchError } = await supabaseClient
      .from("loading_schedule_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (fetchError || !importRecord) {
      console.error("Failed to fetch import record:", fetchError);
      return new Response(
        JSON.stringify({ error: "Import not found", details: fetchError?.message || "Unknown error" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Import record found:", importRecord);

    const { data: document, error: docError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", importRecord.document_id)
      .single();

    if (docError || !document) {
      console.error("Failed to fetch document:", docError);
      await supabaseClient
        .from("loading_schedule_imports")
        .update({
          status: "failed",
          error_code: "DOCUMENT_NOT_FOUND",
          error_message: "Document record not found",
        })
        .eq("id", importId);

      return new Response(
        JSON.stringify({ error: "Document not found", details: docError?.message || "Unknown error" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document found:", document);

    await supabaseClient
      .from("loading_schedule_imports")
      .update({ status: "running" })
      .eq("id", importId);

    console.log("Downloading file from storage:", document.storage_path);

    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file:", downloadError);
      await supabaseClient
        .from("loading_schedule_imports")
        .update({
          status: "failed",
          error_code: "DOWNLOAD_ERROR",
          error_message: downloadError?.message || "Failed to download file",
        })
        .eq("id", importId);

      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError?.message || "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("File downloaded, size:", fileData.size);

    const artifact = {
      importId,
      sourceType: importRecord.source_type,
      pages: [] as any[],
      metadata: {
        fileName: document.filename,
        fileSize: fileData.size,
        parsedAt: new Date().toISOString(),
      },
    };

    let extractedItems: any[] = [];
    let parseError: string | null = null;
    let parseErrorCode: string | null = null;

    try {
      if (importRecord.source_type === "csv") {
        console.log("Parsing CSV file");
        const text = await fileData.text();
        const lines = text.split("\n").filter((line) => line.trim());
        console.log("CSV lines:", lines.length);

        const headers = lines[0].split(",").map((h) => h.trim());
        console.log("CSV headers:", headers);

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

        console.log("Extracted items from CSV:", extractedItems.length);

        artifact.pages.push({
          pageNumber: 1,
          method: "text",
          confidence: 0.95,
          lineCount: lines.length,
          errors: [],
        });
      } else if (importRecord.source_type === "pdf") {
        console.log("Parsing PDF file - calling Claude Vision parser");

        try {
          // Get public URL for the PDF
          const { data: urlData } = await supabaseClient.storage
            .from("documents")
            .getPublicUrl(document.storage_path);

          if (!urlData?.publicUrl) {
            throw new Error("Failed to get public URL for PDF");
          }

          console.log("PDF URL:", urlData.publicUrl);

          // Call the vision parser edge function
          const visionResponse = await supabaseClient.functions.invoke(
            "parse-loading-schedule-vision",
            {
              body: {
                pdfUrl: urlData.publicUrl,
                projectId: importRecord.project_id,
                scheduleReference: importRecord.schedule_reference,
              },
            }
          );

          if (visionResponse.error) {
            console.error("Vision parser error:", visionResponse.error);
            parseErrorCode = "VISION_PARSER_ERROR";
            parseError = visionResponse.error.message || "Vision parser failed";

            artifact.pages.push({
              pageNumber: 1,
              method: "claude_vision",
              confidence: 0.0,
              errors: [parseError],
            });
          } else {
            const parseResult = visionResponse.data;
            console.log("Vision parser result:", parseResult);

            if (!parseResult.success) {
              parseErrorCode = "VISION_PARSER_FAILED";
              parseError = parseResult.error || "Vision parser failed";

              artifact.pages.push({
                pageNumber: 1,
                method: "claude_vision",
                confidence: 0.0,
                errors: [parseError],
              });
            } else {
              const items = parseResult.items || [];
              console.log(`Vision parser extracted ${items.length} items`);

              for (const item of items) {
                extractedItems.push({
                  import_id: importId,
                  project_id: importRecord.project_id,
                  loading_schedule_ref: parseResult.schedule_reference || null,
                  member_mark: item.member_mark,
                  element_type: item.element_type,
                  section_size_raw: item.section_size_raw,
                  section_size_normalized: item.section_size_normalized,
                  frr_minutes: item.frr_minutes,
                  frr_format: item.frr_minutes ? `${item.frr_minutes}/-/-` : null,
                  coating_product: item.coating_product,
                  dft_required_microns: item.dft_required_microns,
                  needs_review: item.needs_review,
                  confidence: item.confidence,
                  cite_page: 1,
                  cite_line_start: 0,
                  cite_line_end: 0,
                });
              }

              artifact.metadata = {
                ...artifact.metadata,
                schedule_reference: parseResult.schedule_reference,
                project_name: parseResult.project_name,
                customer_name: parseResult.customer_name,
                coating_product: parseResult.coating_product,
                parser_type: parseResult.parser_type,
                model: parseResult.model,
              };

              artifact.pages.push({
                pageNumber: 1,
                method: "claude_vision",
                confidence: 0.95,
                lineCount: items.length,
                errors: [],
              });
            }
          }
        } catch (fetchError: any) {
          console.error("Failed to call vision parser:", fetchError);
          parseErrorCode = "VISION_PARSER_UNAVAILABLE";
          parseError = `Cannot connect to vision parser service. Error: ${fetchError.message}`;

          artifact.pages.push({
            pageNumber: 1,
            method: "claude_vision",
            confidence: 0.0,
            errors: [parseError],
          });
        }
      } else if (importRecord.source_type === "xlsx") {
        parseErrorCode = "UNSUPPORTED_FORMAT";
        parseError = "XLSX parsing not yet implemented";
        artifact.pages.push({
          pageNumber: 1,
          method: "text",
          confidence: 0.0,
          errors: [parseError],
        });
      } else {
        parseErrorCode = "UNSUPPORTED_FORMAT";
        parseError = `Unknown source type: ${importRecord.source_type}`;
        artifact.pages.push({
          pageNumber: 1,
          method: "none",
          confidence: 0.0,
          errors: [parseError],
        });
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      parseErrorCode = "PARSE_ERROR";
      parseError = error.message;
      artifact.pages.push({
        pageNumber: 1,
        method: "none",
        confidence: 0.0,
        errors: [error.message],
      });
    }

    console.log("Uploading artifact to storage");

    const artifactPath = `loading-schedules/${importId}/artifact.json`;
    await supabaseClient.storage
      .from("parsing-artifacts")
      .upload(artifactPath, JSON.stringify(artifact, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    const resultPath = `loading-schedules/${importId}/result.json`;
    await supabaseClient.storage
      .from("parsing-artifacts")
      .upload(resultPath, JSON.stringify(extractedItems, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    console.log("Inserting items into database");

    if (extractedItems.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("loading_schedule_items")
        .insert(extractedItems);

      if (insertError) {
        console.error("Error inserting items:", insertError);
      }
    }

    const needsReview = extractedItems.some((item) => item.needs_review);
    const hasErrors = artifact.pages.some((p) => p.errors.length > 0);

    let finalStatus: string;
    if (parseError && extractedItems.length === 0) {
      finalStatus = "failed";
    } else if (needsReview) {
      finalStatus = "needs_review";
    } else if (extractedItems.length > 0) {
      finalStatus = "completed";
    } else {
      finalStatus = "partial_completed";
    }

    console.log("Final status:", finalStatus);

    // Extract document metadata from artifact
    const scheduleReference = artifact.metadata?.schedule_reference || null;
    const projectNameFromSchedule = artifact.metadata?.project_name || null;
    const coatingSystemName = artifact.metadata?.coating_system || null;
    const supplierName = artifact.metadata?.supplier || null;

    await supabaseClient
      .from("loading_schedule_imports")
      .update({
        status: finalStatus,
        error_code: parseErrorCode,
        error_message: parseError,
        artifact_json_path: artifactPath,
        result_json_path: resultPath,
        page_count: artifact.pages.length,
        schedule_reference: scheduleReference,
        project_name_from_schedule: projectNameFromSchedule,
        coating_system_name: coatingSystemName,
        supplier_name: supplierName,
      })
      .eq("id", importId);

    console.log("Parse complete");

    return new Response(
      JSON.stringify({
        success: !parseError || extractedItems.length > 0,
        importId,
        status: finalStatus,
        itemsExtracted: extractedItems.length,
        needsReview,
        error: parseError,
        errorCode: parseErrorCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Unhandled error:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        name: error.name
      }),
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
  // Try multiple column name variations for section size
  // ALTEX FORMAT: "ELEMENT NAME" contains section sizes like "360UB45", "16mmPlate"
  const sectionRaw =
    row["element_name"] ||           // Altex: ELEMENT NAME
    row["Element Name"] ||
    row["ELEMENT NAME"] ||
    row["element name"] ||
    row["section"] ||                // Traditional
    row["Section"] ||
    row["section_size"] ||
    row["Section Size"] ||
    row["member_size"] ||
    row["Member Size"] ||
    row["size"] ||
    row["Size"] ||
    "";

  if (!sectionRaw) {
    return null;
  }

  const sectionNormalized = normalizeSectionSize(sectionRaw);

  // Member mark - various formats
  const memberMark =
    row["member_mark"] ||
    row["Member Mark"] ||
    row["mark"] ||
    row["Mark"] ||
    row["member"] ||
    row["Member"] ||
    "";

  // FRR - various formats
  // ALTEX FORMAT: "FRR Minutes" column
  const frrRaw =
    row["frr_minutes"] ||            // Altex: FRR Minutes
    row["FRR Minutes"] ||
    row["FRR MINUTES"] ||
    row["frr minutes"] ||
    row["frr"] ||                    // Traditional
    row["FRR"] ||
    row["fire_rating"] ||
    row["Fire Rating"] ||
    "";
  const { minutes, format } = extractFRR(frrRaw);

  // DFT - various formats
  // ALTEX FORMAT: "DFT Microns" column
  const dftRaw =
    row["dft_microns"] ||            // Altex: DFT Microns
    row["DFT Microns"] ||
    row["DFT MICRONS"] ||
    row["dft microns"] ||
    row["dft"] ||                    // Traditional
    row["DFT"] ||
    row["required_dft"] ||
    row["Required DFT"] ||
    row["thickness"] ||
    "";
  const dft = parseInt(dftRaw) || null;

  // Coating product
  const coating =
    row["coating"] ||
    row["Coating"] ||
    row["product"] ||
    row["Product"] ||
    row["coating_system"] ||
    row["Coating System"] ||
    "";

  // Element type
  // ALTEX FORMAT: "CONFIGURATION" column (Beam, Column, etc.)
  const elementTypeRaw = (
    row["configuration"] ||          // Altex: CONFIGURATION
    row["Configuration"] ||
    row["CONFIGURATION"] ||
    row["element_type"] ||           // Traditional
    row["Element Type"] ||
    row["type"] ||
    row["Type"] ||
    ""
  ).toLowerCase();

  const validElementType =
    elementTypeRaw === "beam" ||
    elementTypeRaw === "column" ||
    elementTypeRaw === "brace" ||
    elementTypeRaw === "plate" ||
    elementTypeRaw === "other"
      ? elementTypeRaw
      : null;

  // Schedule reference
  const scheduleRef =
    row["schedule_ref"] ||
    row["Schedule Ref"] ||
    row["ref"] ||
    row["Ref"] ||
    row["sheet"] ||
    row["Sheet"] ||
    "";

  // Calculate completeness
  const missingFields =
    (minutes ? 0 : 1) +
    (dft ? 0 : 1) +
    (coating ? 0 : 1);

  const confidence = Math.max(0.5, 1.0 - (missingFields * 0.15));
  const needsReview = missingFields >= 1;

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
  let normalized = raw.trim().replace(/\s+/g, "");
  normalized = normalized.toUpperCase();
  return normalized;
}

function extractFRR(raw: string): { minutes: number | null; format: string | null } {
  if (!raw) return { minutes: null, format: null };

  const match = raw.match(/\d+/);
  if (!match) return { minutes: null, format: null };

  const num = parseInt(match[0]);

  if (raw.includes("/")) {
    return { minutes: num, format: raw };
  }

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
