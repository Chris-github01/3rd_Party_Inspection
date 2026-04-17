import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isHeic = file.type === "image/heic" || file.type === "image/heif" || ext === "heic" || ext === "heif";

    if (!isHeic) {
      return new Response(
        JSON.stringify({ error: "File is not HEIC/HEIF format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const sharp = await import("npm:sharp@0.33.5");
    const jpegBuffer = await sharp.default(Buffer.from(arrayBuffer))
      .rotate()
      .jpeg({ quality: 88 })
      .toBuffer();

    return new Response(jpegBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.[^.]+$/, "")}.jpg"`,
        "X-Original-Name": file.name,
        "X-Converted-From": "heic",
      },
    });
  } catch (err) {
    console.error("HEIC conversion error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Conversion failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
