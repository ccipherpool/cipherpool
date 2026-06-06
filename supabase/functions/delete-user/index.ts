import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// All three headers required — browser preflight fails if ANY is absent.
// Missing Access-Control-Allow-Methods was the root cause of the CORS block.
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
  // Preflight — browser sends OPTIONS first; must respond 200 with CORS headers.
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

    // ── 7. Archive + soft-delete profile via RPC ──────────────────────────
    const { data: archiveResult, error: archiveErr } = await admin.rpc("archive_and_delete_user", {
      p_user_id: userId,
      p_reason:  reason ?? null,
    });
    if (archiveErr) throw new Error("Archive failed: " + archiveErr.message);
    if (!archiveResult?.success) throw new Error(archiveResult?.error ?? "Archive failed");

    // ── 8. Audit log ──────────────────────────────────────────────────────
    await admin.from("admin_logs").insert([{
      admin_id: caller.id,
      action:   "delete_user_secure",
      details: {
        target_user:      userId,
        target_email:     archiveResult.email,
        target_username:  targetProfile?.username ?? targetProfile?.full_name ?? null,
        reason:           reason ?? null,
        banned_first:     true,
      },
    }]);

    // ── 9. Hard-delete from auth (cascades sessions / refresh tokens) ─────
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      // Log but don't fail — profile is already archived and user is banned
      console.error("auth.admin.deleteUser error (non-fatal):", deleteErr.message);
    }

    return json({ success: true, email: archiveResult.email });

  } catch (err) {
    console.error("delete-user error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
