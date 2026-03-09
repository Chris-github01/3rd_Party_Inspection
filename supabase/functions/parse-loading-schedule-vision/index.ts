import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.67.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParseRequest {
  pdfUrl: string;
  projectId: string;
  scheduleReference?: string;
}

interface ScheduleItem {
  member_mark: string;
  section_size_raw: string;
  section_size_normalized: string;
  element_type: string;
  frr_minutes: number | null;
  coating_product: string | null;
  dft_required_microns: number | null;
  confidence: number;
  needs_review: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    const { pdfUrl, projectId, scheduleReference }: ParseRequest = await req.json();

    console.log(`[Vision Parser] Starting parse for project ${projectId}`);
    console.log(`[Vision Parser] PDF URL: ${pdfUrl}`);

    // Download PDF from Supabase storage
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
    }

    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    console.log(`[Vision Parser] PDF downloaded, size: ${pdfBytes.byteLength} bytes`);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Create the extraction prompt
    const extractionPrompt = `You are analyzing a fire protection loading schedule from Altex Coatings. This document contains a table with the following columns:

ITEM CODE | ELEMENT NAME | CONFIGURATION | SIDES | Hp/A | LINEAL Metres | AREA Metre^2 | FRR Minutes | DFT Microns | SC902 LITRES | COMMENTS | Check WFT

Your task is to extract ALL rows from the table and return them as a JSON array. For each row, extract:
- member_mark: The value from "ITEM CODE" column (e.g., "150PFC", "150*90*10UA")
- section_size_raw: The value from "ELEMENT NAME" column
- element_type: "beam", "column", or "brace" based on CONFIGURATION column
- frr_minutes: The numeric value from "FRR Minutes" column (e.g., 60)
- dft_required_microns: The numeric value from "DFT Microns" column (NOT Hp/A!)
- coating_product: Extract from document title (e.g., "NULLIFIRE SC902")

CRITICAL: The "DFT Microns" column contains values like 918, 802, 1114, 872, etc.
DO NOT use values from the "Hp/A" column (208, 173, 267, 194) - those are different!

Also extract from the document header:
- schedule_reference: The "Schedule Reference" value
- project_name: The "Project" value
- customer_name: The "Customer" value

Return ONLY valid JSON in this exact format:
{
  "schedule_reference": "CST-240505A",
  "project_name": "Auckland Airport, Baggage Handling Enabling - 60 min FRR",
  "customer_name": "Carien Pretorius - Optimal Fire",
  "coating_product": "NULLIFIRE SC902",
  "items": [
    {
      "member_mark": "150PFC",
      "section_size_raw": "150PFC",
      "element_type": "beam",
      "frr_minutes": 60,
      "dft_required_microns": 918
    }
  ]
}

Extract ALL items from the table. Do not skip any rows. Return ONLY the JSON, no other text.`;

    console.log(`[Vision Parser] Calling OpenAI GPT-4 Vision API...`);

    // Call OpenAI Vision API with PDF support
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extractionPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    console.log(`[Vision Parser] OpenAI API response received`);

    // Extract the JSON from OpenAI's response
    const responseText = completion.choices[0]?.message?.content || "";
    console.log(`[Vision Parser] Raw response: ${responseText.substring(0, 500)}...`);

    // Parse the JSON response
    let parsedData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                        responseText.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, responseText];
      const jsonText = jsonMatch[1] || responseText;
      parsedData = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error(`[Vision Parser] Failed to parse JSON:`, parseError);
      console.error(`[Vision Parser] Response text:`, responseText);
      throw new Error(`Failed to parse OpenAI's JSON response: ${parseError.message}`);
    }

    console.log(`[Vision Parser] Parsed ${parsedData.items?.length || 0} items`);

    // Normalize and validate the extracted items
    const normalizedItems: ScheduleItem[] = parsedData.items.map((item: any) => {
      // Normalize section size (remove spaces, asterisks, etc.)
      let normalized = item.section_size_raw
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/\*/g, "X");

      // Calculate confidence based on missing fields
      let missingFields = 0;
      if (!item.frr_minutes) missingFields++;
      if (!item.dft_required_microns) missingFields++;
      if (!parsedData.coating_product) missingFields += 0.5;

      const confidence = Math.max(0.8, 1.0 - missingFields * 0.1);
      const needsReview = missingFields >= 1;

      return {
        member_mark: item.member_mark || normalized,
        section_size_raw: item.section_size_raw,
        section_size_normalized: normalized,
        element_type: item.element_type?.toLowerCase() || "beam",
        frr_minutes: item.frr_minutes || null,
        coating_product: parsedData.coating_product || null,
        dft_required_microns: item.dft_required_microns || null,
        confidence,
        needs_review: needsReview,
      };
    });

    const result = {
      success: true,
      schedule_reference: parsedData.schedule_reference || scheduleReference,
      project_name: parsedData.project_name,
      customer_name: parsedData.customer_name,
      coating_product: parsedData.coating_product,
      items: normalizedItems,
      parser_type: "openai_vision",
      model: "gpt-4o",
    };

    console.log(`[Vision Parser] Successfully parsed ${result.items.length} items`);
    console.log(`[Vision Parser] Schedule: ${result.schedule_reference}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(`[Vision Parser] Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
