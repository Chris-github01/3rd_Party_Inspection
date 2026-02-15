import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParseRequest {
  jobId: string;
}

interface PageData {
  page: number;
  method: "text" | "ocr" | "none";
  confidence: number;
  text: string;
  lines: Array<{ line: number; text: string }>;
  errors: string[];
}

interface ArtifactPack {
  jobId: string;
  documentId: string;
  source: { bucket: string; path: string };
  pageCount: number;
  pages: PageData[];
  lowConfidencePages: number[];
  errors: Array<{ code: string; message: string }>;
  createdAt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { jobId } = (await req.json()) as ParseRequest;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("parsing_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (job.status === "running") {
      return new Response(
        JSON.stringify({ error: "Job already running" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("parsing_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempt_count: job.attempt_count + 1,
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(job.storage_bucket)
      .download(job.storage_path);

    if (downloadError || !pdfData) {
      await updateJobFailed(supabase, jobId, "DOWNLOAD_FAILED", downloadError?.message || "Failed to download PDF");
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await pdfData.arrayBuffer();
    const artifact = await extractPDFContent(pdfBuffer, jobId, job.document_id, job.storage_bucket, job.storage_path);

    const artifactPath = `jobs/${jobId}/artifact.json`;
    const { error: artifactUploadError } = await supabase.storage
      .from("parsing-artifacts")
      .upload(artifactPath, JSON.stringify(artifact, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (artifactUploadError) {
      console.error("Failed to upload artifact:", artifactUploadError);
    }

    const resultJson = await generateStructuredOutput(artifact, supabase, jobId);

    const resultPath = `jobs/${jobId}/result.json`;
    await supabase.storage
      .from("parsing-artifacts")
      .upload(resultPath, JSON.stringify(resultJson, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    const hasLowConfidence = artifact.lowConfidencePages.length > 0;
    const finalStatus = hasLowConfidence ? "partial_completed" : "completed";

    await supabase
      .from("parsing_jobs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        page_count: artifact.pageCount,
        text_pages: artifact.pages.filter((p) => p.method === "text").map((p) => p.page),
        ocr_pages: artifact.pages.filter((p) => p.method === "ocr").map((p) => p.page),
        low_confidence_pages: artifact.lowConfidencePages,
        artifact_json_path: artifactPath,
        result_json_path: resultPath,
      })
      .eq("id", jobId);

    await supabase.from("parsed_documents").insert({
      parsing_job_id: jobId,
      document_id: job.document_id,
      title: resultJson.title,
      doc_type: resultJson.documentType,
      summary: resultJson.meta?.summary || null,
      confidence_score: calculateOverallConfidence(resultJson),
      needs_review: hasLowConfidence,
    });

    return new Response(
      JSON.stringify({ success: true, jobId, status: finalStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse PDF error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractPDFContent(
  pdfBuffer: ArrayBuffer,
  jobId: string,
  documentId: string,
  bucket: string,
  path: string
): Promise<ArtifactPack> {
  const artifact: ArtifactPack = {
    jobId,
    documentId,
    source: { bucket, path },
    pageCount: 0,
    pages: [],
    lowConfidencePages: [],
    errors: [],
    createdAt: new Date().toISOString(),
  };

  try {
    const pdfDoc = await import("npm:pdf-parse@1.1.1").then((m) => m.default);
    const data = await pdfDoc(Buffer.from(pdfBuffer));

    artifact.pageCount = data.numpages;

    const textPerPage = splitTextIntoPages(data.text, data.numpages);

    for (let i = 0; i < data.numpages; i++) {
      const pageNum = i + 1;
      const pageText = textPerPage[i] || "";
      const lines = pageText.split("\n").filter((l) => l.trim().length > 0);
      const charCount = pageText.replace(/\s/g, "").length;
      const wordCount = pageText.split(/\s+/).filter((w) => w.length > 0).length;

      let method: "text" | "ocr" | "none" = "text";
      let confidence = 1.0;

      if (charCount < 50 || wordCount < 10) {
        method = "none";
        confidence = 0.0;
        artifact.lowConfidencePages.push(pageNum);
      } else if (wordCount < 30) {
        confidence = 0.5;
        artifact.lowConfidencePages.push(pageNum);
      }

      artifact.pages.push({
        page: pageNum,
        method,
        confidence,
        text: pageText,
        lines: lines.map((text, idx) => ({ line: idx + 1, text })),
        errors: [],
      });
    }
  } catch (error) {
    artifact.errors.push({
      code: "EXTRACTION_FAILED",
      message: error.message,
    });
    artifact.pages.push({
      page: 1,
      method: "none",
      confidence: 0,
      text: "",
      lines: [],
      errors: [error.message],
    });
  }

  return artifact;
}

function splitTextIntoPages(fullText: string, numPages: number): string[] {
  const pages: string[] = [];
  const sections = fullText.split(/\f/);

  if (sections.length === numPages) {
    return sections;
  }

  const avgCharsPerPage = Math.ceil(fullText.length / numPages);
  let currentPos = 0;

  for (let i = 0; i < numPages; i++) {
    const endPos = Math.min(currentPos + avgCharsPerPage, fullText.length);
    pages.push(fullText.substring(currentPos, endPos));
    currentPos = endPos;
  }

  return pages;
}

async function generateStructuredOutput(artifact: ArtifactPack, supabase: any, jobId: string): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    return createFallbackResult(artifact);
  }

  const chunks = createDeterministicChunks(artifact);
  const fullText = chunks.map((c) => c.text).join("\n\n");

  const prompt = `You are a document parser. Extract structured information from this document.

Return ONLY valid JSON matching this schema. NEVER invent values. Add citations with page and line numbers.

Document text with line numbers:
${fullText.substring(0, 12000)}

Extract:
- documentType (quote/boq/spec/drawing/report/invoice/other)
- title
- parties (issuer, recipient)
- dates (issueDate, validUntil)
- currency
- totals (subtotal, gst, total) with citations
- lineItems with citations
- terms with citations
- exclusions with citations

For every extracted field, provide citation: {page: number, lineStart: number, lineEnd: number}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a document parser that returns structured JSON with citations." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const parsedData = JSON.parse(result.choices[0].message.content);

    return {
      ...parsedData,
      warnings: artifact.lowConfidencePages.length > 0
        ? [{ code: "LOW_CONFIDENCE", message: "Some pages have low confidence", pages: artifact.lowConfidencePages }]
        : [],
      meta: {
        jobId,
        pageCount: artifact.pageCount,
        parserVersion: "1.0.0",
      },
    };
  } catch (error) {
    console.error("OpenAI parsing failed:", error);
    return createFallbackResult(artifact);
  }
}

function createDeterministicChunks(artifact: ArtifactPack) {
  const chunks = [];
  let currentChunk = { pages: [], text: "", charCount: 0 };

  for (const page of artifact.pages) {
    if (currentChunk.charCount + page.text.length > 12000 && currentChunk.charCount > 0) {
      chunks.push(currentChunk);
      currentChunk = { pages: [], text: "", charCount: 0 };
    }

    currentChunk.pages.push(page.page);
    currentChunk.text += `\n\n=== PAGE ${page.page} ===\n` + page.lines.map((l) => `${l.line}: ${l.text}`).join("\n");
    currentChunk.charCount += page.text.length;
  }

  if (currentChunk.charCount > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function createFallbackResult(artifact: ArtifactPack): any {
  return {
    documentType: "other",
    title: null,
    parties: { issuer: null, recipient: null },
    dates: { issueDate: null, validUntil: null },
    currency: null,
    totals: {
      subtotal: { value: 0, citation: null },
      gst: { value: 0, citation: null },
      total: { value: 0, citation: null },
    },
    lineItems: [],
    terms: [],
    exclusions: [],
    warnings: [
      { code: "EXTRACTION_FAILED", message: "Failed to parse document structure", pages: [] },
    ],
    meta: {
      jobId: artifact.jobId,
      pageCount: artifact.pageCount,
      parserVersion: "1.0.0",
    },
  };
}

function calculateOverallConfidence(resultJson: any): number {
  const items = resultJson.lineItems || [];
  if (items.length === 0) return 0.5;

  const avgConfidence = items.reduce((sum: number, item: any) => sum + (item.confidence || 0.5), 0) / items.length;
  return avgConfidence;
}

async function updateJobFailed(supabase: any, jobId: string, errorCode: string, errorMessage: string) {
  await supabase
    .from("parsing_jobs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_code: errorCode,
      error_message: errorMessage,
    })
    .eq("id", jobId);
}
