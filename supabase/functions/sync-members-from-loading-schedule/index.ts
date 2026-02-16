import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  importId: string;
  mode?: "create_missing_only" | "update_all";
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

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { importId, mode = "create_missing_only" }: SyncRequest = body;

    if (!importId) {
      return new Response(
        JSON.stringify({ error: "importId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch import record
    const { data: importRecord, error: fetchError } = await supabaseClient
      .from("loading_schedule_imports")
      .select("project_id")
      .eq("id", importId)
      .single();

    if (fetchError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Import not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectId = importRecord.project_id;

    // Fetch all items for this import
    const { data: items, error: itemsError } = await supabaseClient
      .from("loading_schedule_items")
      .select("*")
      .eq("import_id", importId);

    if (itemsError || !items) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch schedule items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing members for this project
    const { data: existingMembers, error: membersError } = await supabaseClient
      .from("members")
      .select("*")
      .eq("project_id", projectId);

    if (membersError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch existing members" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stats = {
      itemsProcessed: 0,
      membersCreated: 0,
      membersLinked: 0,
      membersSkipped: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      stats.itemsProcessed++;

      try {
        // Try to find existing member
        let existingMember = null;

        if (item.member_mark) {
          existingMember = existingMembers?.find(
            (m) => m.member_mark === item.member_mark
          );
        }

        if (!existingMember && item.section_size_normalized && item.loading_schedule_ref) {
          existingMember = existingMembers?.find(
            (m) =>
              m.section_size === item.section_size_normalized &&
              m.loading_schedule_item_id
          );
        }

        if (existingMember) {
          // Link existing member to schedule item if not already linked
          if (!existingMember.loading_schedule_item_id) {
            const { error: linkError } = await supabaseClient
              .from("members")
              .update({ loading_schedule_item_id: item.id })
              .eq("id", existingMember.id);

            if (linkError) {
              console.error("Error linking member:", linkError);
              stats.errors.push(`Link error: ${linkError.message}`);
            } else {
              stats.membersLinked++;
            }
          } else {
            stats.membersSkipped++;
          }
        } else {
          // Create new member
          const newMember = {
            project_id: projectId,
            member_mark: item.member_mark || `ITEM-${stats.itemsProcessed}`,
            element_type: item.element_type || "other",
            section: item.section_size_normalized || "UNKNOWN",
            section_size: item.section_size_normalized || "UNKNOWN",
            frr_minutes: item.frr_minutes || null,
            frr_format: item.frr_format || null,
            coating_system: item.coating_product || null,
            required_dft_microns: item.dft_required_microns || null,
            source: "schedule",
            loading_schedule_item_id: item.id,
            status: "not_started",
            notes: item.loading_schedule_ref
              ? `From loading schedule: ${item.loading_schedule_ref}`
              : "From loading schedule",
          };

          const { data: createdMember, error: createError } = await supabaseClient
            .from("members")
            .insert(newMember)
            .select();

          if (createError) {
            console.error("Error creating member:", createError);
            console.error("Failed member data:", newMember);
            stats.errors.push(`Insert error for ${newMember.member_mark}: ${createError.message}`);
          } else {
            stats.membersCreated++;
          }
        }
      } catch (itemError: any) {
        console.error("Error processing item:", itemError);
        stats.errors.push(`Processing error: ${itemError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        importId,
        projectId,
        stats,
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
