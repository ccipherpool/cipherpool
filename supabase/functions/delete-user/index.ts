import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const ADMIN_ROLES = ["founder", "fondateur", "super_admin"] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { userId, reason } = await req.json();
    if (!userId) return json({ error: "userId required" }, 400);

    // Caller-scoped client — validates the Authorization JWT
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // Service-role client — privileged, used for all admin operations
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 1. Verify caller JWT ──────────────────────────────────────────────
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    // ── 2. Verify caller role via DB (not JWT claim) ─────────────────────
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const callerRole = callerProfile?.role ?? "";
    if (!(ADMIN_ROLES as readonly string[]).includes(callerRole)) {
      return json({ error: `Insufficient permissions — role "${callerRole}" cannot delete users` }, 403);
    }

    // ── 3. Self-delete guard ──────────────────────────────────────────────
    if (userId === caller.id) {
      return json({ error: "Cannot delete your own account" }, 400);
    }

    // ── 4. Verify target exists ───────────────────────────────────────────
    const { data: targetAuthData, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !targetAuthData?.user) {
      return json({ error: "User not found in auth system" }, 404);
    }

    const targetEmail = targetAuthData.user.email?.toLowerCase() ?? "";

    // ── 5. Protect founders — only another founder can delete one ─────────
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role, username, full_name")
      .eq("id", userId)
      .single();

    const targetRole = targetProfile?.role ?? "";
    const callerIsFounder = callerRole === "founder" || callerRole === "fondateur";
    const targetIsFounder = targetRole === "founder" || targetRole === "fondateur";

    if (targetIsFounder && !callerIsFounder) {
      return json({ error: "Only a founder can delete another founder" }, 403);
    }

    // ── 6. Ban immediately (invalidates all active JWTs for the user) ─────
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banErr) throw new Error("Failed to ban user: " + banErr.message);

    // ── 7. Snapshot full profile ──────────────────────────────────────────
    const { data: profileSnapshot } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // ── 7a. Archive to deleted_accounts (bypasses RLS via service role) ───
    // NOTE: we do NOT use archive_and_delete_user RPC here because that RPC
    // checks auth.uid() which is NULL when called from service role. Instead
    // we perform the exact same steps directly.
    const { error: archiveErr } = await admin.from("deleted_accounts").insert({
      email:            targetEmail,
      user_id:          userId,
      username:         targetProfile?.username ?? targetProfile?.full_name ?? null,
      deleted_by:       caller.id,
      reason:           reason ?? null,
      profile_snapshot: profileSnapshot ?? {},
    });
    if (archiveErr) throw new Error("Failed to archive user: " + archiveErr.message);

    // ── 7b. Soft-delete profile (fires realtime → force-logout on all clients) ─
    const { error: softDeleteErr } = await admin
      .from("profiles")
      .update({ account_status: "deleted" })
      .eq("id", userId);
    if (softDeleteErr) throw new Error("Failed to soft-delete profile: " + softDeleteErr.message);

    // ── 8. Audit log ──────────────────────────────────────────────────────
    await admin.from("admin_logs").insert([{
      admin_id: caller.id,
      action:   "delete_user_secure",
      details: {
        target_user:      userId,
        target_email:     targetEmail,
        target_username:  targetProfile?.username ?? targetProfile?.full_name ?? null,
        reason:           reason ?? null,
        banned_first:     true,
      },
    }]);

    // ── 9. Hard-delete from auth (cascades sessions / refresh tokens) ─────
    // This is the authoritative step: removes auth.users record so the email
    // cannot be used to log in again (only fresh registration with re-approval flow).
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      // Profile is already soft-deleted and user is banned — log the failure but
      // still return success to the caller since the account is functionally gone.
      // A background cleanup job can handle orphaned auth rows.
      console.error("auth.admin.deleteUser failed (non-fatal, user is banned+soft-deleted):", deleteErr.message);
    }

    return json({ success: true, email: targetEmail });

  } catch (err) {
    console.error("delete-user error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
