import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { userId, reason } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), { status: 400, headers: cors });
    }

    // Caller-scoped client (verifies auth token)
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Service-role client for privileged operations
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller identity
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    // Verify caller role via DB (not JWT claim — more reliable)
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!["founder", "super_admin"].includes(callerProfile?.role ?? "")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: cors });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: cors });
    }

    // Verify target exists in auth
    const { data: targetAuthData, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !targetAuthData?.user) {
      return new Response(JSON.stringify({ error: "User not found in auth system" }), { status: 404, headers: cors });
    }

    // Prevent non-founder deleting a founder
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, username, full_name")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "founder" && callerProfile?.role !== "founder") {
      return new Response(JSON.stringify({ error: "Only a founder can delete another founder" }), { status: 403, headers: cors });
    }

    // ── Step 1: Immediately ban in auth (invalidates all active JWTs) ──
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banErr) throw new Error("Failed to ban user: " + banErr.message);

    // ── Step 2: Archive to deleted_accounts + soft-delete profile ──
    const { data: archiveResult, error: archiveErr } = await admin.rpc("archive_and_delete_user", {
      p_user_id: userId,
      p_reason: reason ?? null,
    });
    if (archiveErr) throw new Error("Archive failed: " + archiveErr.message);
    if (!archiveResult?.success) throw new Error(archiveResult?.error ?? "Archive failed");

    // ── Step 3: Log the action ──
    await admin.from("admin_logs").insert([{
      admin_id: caller.id,
      action: "delete_user_secure",
      details: {
        target_user:    userId,
        target_email:   archiveResult.email,
        target_username: targetProfile?.username ?? targetProfile?.full_name,
        reason:         reason ?? null,
        banned_first:   true,
      },
    }]);

    // ── Step 4: Delete auth user (cascades sessions, refresh tokens) ──
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      // Auth user deleted but log if something went wrong
      console.error("deleteUser error (may be partial):", deleteErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, email: archiveResult.email }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("delete-user error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: cors }
    );
  }
});
