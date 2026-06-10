// CipherPool — Edge Function: process-reminders
// Processes pending tournament_reminders that are due, sends WhatsApp via Twilio.
// Called by Supabase cron (Dashboard > Edge Functions > Scheduled) every 5 minutes.
// In-app notifications are handled by process_due_reminders() SQL function.
//
// Cron expression: */5 * * * *

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TWILIO_SID    = Deno.env.get("TWILIO_ACCOUNT_SID")        ?? "";
const TWILIO_TOKEN  = Deno.env.get("TWILIO_AUTH_TOKEN")         ?? "";
const TWILIO_FROM   = Deno.env.get("TWILIO_WHATSAPP_FROM")      ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function twilioSend(to: string, body: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return false;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
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
    return res.ok;
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Process in-app notifications via SQL function
  const { data: processedCount, error: procErr } = await svc.rpc("process_due_reminders");
  if (procErr) {
    console.error("process_due_reminders error:", procErr);
  }

  // 2. Fetch reminders that were just marked sent (in last 2 minutes) to send WhatsApp
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: dueReminders } = await svc
    .from("tournament_reminders")
    .select(`
      id, type, tournament_id, user_id,
      profiles:user_id ( whatsapp_number, whatsapp_verified, account_status, full_name, username ),
      tournaments:tournament_id ( name, start_time )
    `)
    .eq("sent", true)
    .gte("remind_at", twoMinAgo)  // only recently processed ones
    .lte("remind_at", new Date().toISOString());

  const results: Array<{ id: string; wa: boolean }> = [];

  for (const r of dueReminders ?? []) {
    const profile     = r.profiles as { whatsapp_number?: string; whatsapp_verified?: boolean; account_status?: string; full_name?: string; username?: string } | null;
    const tournament  = r.tournaments as { name?: string; start_time?: string } | null;

    if (!profile?.whatsapp_verified || !profile?.whatsapp_number) continue;
    if (["banned", "deleted"].includes(profile.account_status ?? "")) continue;

    const name  = profile.full_name || profile.username || "Player";
    const tName = tournament?.name ?? "Your tournament";
    const label = r.type === "24h" ? "24 hours" : r.type === "1h" ? "1 hour" : "15 minutes";
    const emoji = r.type === "15m" ? "🚨" : r.type === "1h" ? "⚡" : "⏰";
    const roomUrl = `https://cipherpool.gg/tournaments/${r.tournament_id}/room`;

    const msg =
      `${emoji} *${tName} starts in ${label}!*\n\n` +
      `Hi ${name}, don't miss your match!\n\n` +
      (tournament?.start_time
        ? `📅 ${new Date(tournament.start_time).toLocaleString()}\n\n`
        : "") +
      `🎮 Enter the match center now:\n${roomUrl}`;

    const ok = await twilioSend(profile.whatsapp_number, msg);

    await svc.from("notification_logs").insert({
      user_id:           r.user_id,
      type:              "whatsapp",
      notification_type: `reminder_${r.type}`,
      title:             `${tName} starts in ${label}`,
      message:           msg,
      status:            ok ? "sent" : "failed",
      metadata:          { tournament_id: r.tournament_id, reminder_type: r.type },
    }).catch(() => {});

    results.push({ id: r.id, wa: ok });
  }

  return json({
    success:          true,
    in_app_processed: processedCount ?? 0,
    whatsapp_sent:    results.filter(r => r.wa).length,
    whatsapp_failed:  results.filter(r => !r.wa).length,
  });
});
