// CipherPool — Edge Function: send-seat-notification
// Called after enter_tournament_room or approve_tournament_participant succeeds.
// Sends WhatsApp confirmation via Twilio.
// Email is handled by the existing send-notification-email trigger.
//
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

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

  let body: {
    user_id?:      string;
    tournament_id?: string;
    seat_number?:  number;
    team_number?:  number;
    type?:         string;
  } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const {
    user_id,
    tournament_id,
    seat_number,
    team_number,
    type = "seat_assigned",
  } = body;

  if (!user_id || !tournament_id) {
    return json({ error: "user_id and tournament_id are required" }, 400);
  }

  // Authorisation: caller must be the user, an organizer, or an admin
  const { data: callerProfile } = await svc
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const adminRoles = ["admin", "super_admin", "founder", "fondateur", "staff"];
  const callerIsAdmin = adminRoles.includes(callerProfile?.role ?? "");

  const { data: tournament } = await svc
    .from("tournaments").select("id, name, created_by").eq("id", tournament_id).maybeSingle();
  if (!tournament) return json({ error: "Tournament not found" }, 404);

  const isSelf       = user.id === user_id;
  const isOrganizer  = tournament.created_by === user.id;

  if (!isSelf && !isOrganizer && !callerIsAdmin) {
    return json({ error: "Unauthorized" }, 403);
  }

  // Fetch recipient profile
  const { data: profile } = await svc
    .from("profiles")
    .select("id, full_name, username, whatsapp_number, whatsapp_verified, account_status")
    .eq("id", user_id)
    .maybeSingle();

  if (!profile) return json({ error: "User not found" }, 404);

  // Safety: never notify banned/deleted/unverified users
  if (["banned", "deleted"].includes(profile.account_status ?? "")) {
    return json({ skipped: true, reason: "account_suspended" });
  }
  if (!profile.whatsapp_verified) {
    return json({ skipped: true, reason: "whatsapp_not_verified" });
  }
  if (!profile.whatsapp_number) {
    return json({ skipped: true, reason: "no_whatsapp_number" });
  }

  const name         = profile.full_name || profile.username || "Player";
  const roomUrl      = `https://cipherpool.gg/tournaments/${tournament_id}/room`;
  const isApproval   = type === "registration_approved";

  const waMessage = isApproval
    ? `✅ *CipherPool — Registration Approved!*\n\nCongratulations ${name}!\n\nYour registration for *${tournament.name}* has been approved.\n\n🪑 Seat: #${seat_number ?? "?"} | Team ${team_number ?? "?"}\n\n📌 Check in on time and enter the match center:\n${roomUrl}\n\nGood luck! 🎮`
    : `🎮 *CipherPool — Seat Reserved!*\n\nHi ${name}!\n\nYou've been assigned a seat in *${tournament.name}*!\n\n🪑 Seat: #${seat_number ?? "?"} | Team ${team_number ?? "?"}\n\n🔗 Enter room:\n${roomUrl}\n\nGood luck! 🎮`;

  const waResult = await twilioSend(profile.whatsapp_number, waMessage);

  // Log the notification
  await svc.from("notification_logs").insert({
    user_id,
    type:              "whatsapp",
    notification_type: type,
    title:             isApproval ? "Registration Approved" : "Seat Assigned",
    message:           waMessage,
    status:            waResult.ok ? "sent" : "failed",
    error_message:     waResult.ok ? null : waResult.error,
    metadata:          { tournament_id, tournament_name: tournament.name, seat_number, team_number },
  }).then(() => {}).catch(() => {});

  return json({ success: waResult.ok, whatsapp: waResult });
});
