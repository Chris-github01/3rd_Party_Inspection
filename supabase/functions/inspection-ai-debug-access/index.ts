import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated", detail: authErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const [orgUsersRes, orgMembershipsRpc, orgListRes, aiProjectsRes] = await Promise.all([
      serviceClient
        .from("organization_users")
        .select("organization_id, role")
        .eq("user_id", user.id),
      serviceClient.rpc("get_my_org_memberships"),
      serviceClient.from("organizations").select("id, name").limit(50),
      serviceClient
        .from("inspection_ai_projects")
        .select("id, project_name, organization_id")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const firstOrgId = (orgUsersRes.data?.[0] as { organization_id: string } | undefined)?.organization_id ?? null;

    let aiProjectsByOrgRes = null;
    if (firstOrgId) {
      aiProjectsByOrgRes = await serviceClient
        .from("inspection_ai_projects")
        .select("id, project_name")
        .eq("organization_id", firstOrgId)
        .order("created_at", { ascending: false })
        .limit(20);
    }

    const result = {
      auth_user_id: user.id,
      auth_email: user.email,
      organization_users: {
        data: orgUsersRes.data,
        error: orgUsersRes.error ? { message: orgUsersRes.error.message, code: orgUsersRes.error.code, details: orgUsersRes.error.details } : null,
        count: orgUsersRes.data?.length ?? 0,
      },
      get_my_org_memberships_rpc: {
        data: orgMembershipsRpc.data,
        error: orgMembershipsRpc.error ? { message: orgMembershipsRpc.error.message, code: orgMembershipsRpc.error.code } : null,
        count: (orgMembershipsRpc.data as unknown[])?.length ?? 0,
      },
      organizations_table: {
        data: orgListRes.data,
        error: orgListRes.error ? { message: orgListRes.error.message, code: orgListRes.error.code } : null,
        count: orgListRes.data?.length ?? 0,
      },
      inspection_ai_projects_all: {
        data: aiProjectsRes.data,
        error: aiProjectsRes.error ? { message: aiProjectsRes.error.message, code: aiProjectsRes.error.code, details: aiProjectsRes.error.details } : null,
        count: aiProjectsRes.data?.length ?? 0,
      },
      inspection_ai_projects_by_org: firstOrgId ? {
        org_id: firstOrgId,
        data: aiProjectsByOrgRes?.data,
        error: aiProjectsByOrgRes?.error ? { message: aiProjectsByOrgRes.error.message, code: aiProjectsByOrgRes.error.code } : null,
        count: aiProjectsByOrgRes?.data?.length ?? 0,
      } : { note: "No org membership found for this user" },
      checked_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[inspection-ai-debug-access] unhandled:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
