// CipherPool — Edge Function: send-welcome-notification
// Called by the frontend after account approval + WhatsApp verification.
// Sends WhatsApp welcome message + open tournament info via Twilio.
// Email is handled by the existing DB trigger (notifications table INSERT).
//
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")         ?? "";
const TWILIO_SID    = Deno.env.get("TWILIO_ACCOUNT_SID")        ?? "";
const TWILIO_TOKEN  = Deno.env.get("TWILIO_AUTH_TOKEN")         ?? "";
const TWILIO_FROM   = Deno.env.get("TWILIO_WHATSAPP_FROM")      ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function twilioSend(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { ok: false, error: "Twilio not configured" };
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method:  "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:  `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To:   `whatsapp:${to}`,
          Body: body,
        }).toString(),
      }
    );
    if (!res.ok) {
      const t = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: t.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  // Verify caller JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Only send for self (or admin sending for a user)
  let body: { user_id?: string } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const targetUserId = body.user_id ?? user.id;

  // Authorisation: self or admin
  if (targetUserId !== user.id) {
    const { data: callerProfile } = await svc
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    const adminRoles = ["admin", "super_admin", "founder", "fondateur"];
    if (!adminRoles.includes(callerProfile?.role ?? "")) {
      return json({ error: "Unauthorized" }, 403);
    }
  }

  // Fetch target profile
  const { data: profile } = await svc
    .from("profiles")
    .select("id, full_name, username, whatsapp_number, whatsapp_verified, account_status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!profile) return json({ error: "User not found" }, 404);

  // Safety gate — must be approved + verified + active
  if (["banned", "deleted"].includes(profile.account_status ?? "")) {
    return json({ skipped: true, reason: "account_suspended" });
  }
  if (profile.account_status !== "approved") {
    return json({ skipped: true, reason: "not_yet_approved" });
  }
  if (!profile.whatsapp_verified) {
    return json({ skipped: true, reason: "whatsapp_not_verified" });
  }
  if (!profile.whatsapp_number) {
    return json({ skipped: true, reason: "no_whatsapp_number" });
  }

  const name = profile.full_name || profile.username || "Player";

  // Build welcome message
  const welcomeMsg =
    `🎮 *Welcome to CipherPool, ${name}!* 🎮\n\n` +
    `Your account has been approved. You're now ready to:\n` +
    `• 🏆 Register for tournaments\n` +
    `• 🎯 Compete for prizes\n` +
    `• 📊 Climb the leaderboard\n\n` +
    `Check out open tournaments and get in the game:\nhttps://cipherpool.gg/tournaments\n\n` +
    `Good luck! 🔥`;

  const waResult = await twilioSend(profile.whatsapp_number, welcomeMsg);

  // Log
  await svc.from("notification_logs").insert({
    user_id:           targetUserId,
    type:              "whatsapp",
    notification_type: "welcome",
    title:             "Welcome to CipherPool",
    message:           welcomeMsg,
    status:            waResult.ok ? "sent" : "failed",
    error_message:     waResult.ok ? null : waResult.error,
    metadata:          { trigger: "account_approved" },
  }).then(() => {}).catch(() => {});

  // Also fetch up to 2 open tournaments and notify about them
  const { data: openTournaments } = await svc
    .from("tournaments")
    .select("id, name, prize, start_time, mode")
    .in("status", ["registration_open"])
    .order("created_at", { ascending: false })
    .limit(2);

  const tournamentResults: Array<{ id: string; ok: boolean }> = [];

  for (const t of openTournaments ?? []) {
    const tMsg =
      `🏆 *Tournament Open: ${t.name}*\n\n` +
      `Registration is now open!\n` +
      (t.prize ? `💰 Prize: ${t.prize}\n` : "") +
      (t.start_time ? `📅 Starts: ${new Date(t.start_time).toLocaleString()}\n` : "") +
      `\nRegister now:\nhttps://cipherpool.gg/tournaments/${t.id}\n\n` +
      `Don't miss your spot! 🎮`;

    const tResult = await twilioSend(profile.whatsapp_number, tMsg);
    tournamentResults.push({ id: t.id, ok: tResult.ok });

    await svc.from("notification_logs").insert({
      user_id:           targetUserId,
      type:              "whatsapp",
      notification_type: "tournament_available",
      title:             `Tournament Available: ${t.name}`,
      message:           tMsg,
      status:            tResult.ok ? "sent" : "failed",
      error_message:     tResult.ok ? null : tResult.error,
      metadata:          { tournament_id: t.id, tournament_name: t.name },
    }).then(() => {}).catch(() => {});
  }

  return json({
    success:     waResult.ok,
    whatsapp:    waResult,
    tournaments: tournamentResults,
  });
});
