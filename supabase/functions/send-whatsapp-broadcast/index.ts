import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function twilioSend(phone: string, message: string): Promise<boolean> {
  const sid   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from  = Deno.env.get("TWILIO_WHATSAPP_FROM")!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:  `Basic ${btoa(`${sid}:${token}`)}`,
      },
      body: new URLSearchParams({
        From: from,
        To:   `whatsapp:${phone}`,
        Body: message,
      }).toString(),
    }
  );
  return res.ok;
}

async function resolvePhones(
  admin: ReturnType<typeof createClient>,
  targetType: string,
  filters: Record<string, unknown>
): Promise<string[]> {
  const base = (q: ReturnType<typeof admin.from>) =>
    q
      .select("whatsapp_number")
      .eq("whatsapp_verified", true)
      .not("whatsapp_number", "is", null)
      .neq("account_status", "banned")
      .neq("account_status", "deleted")
      .limit(1000);

  switch (targetType) {
    case "all_users": {
      const { data } = await base(admin.from("profiles"));
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "online_users": {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: pres } = await admin
        .from("user_presence")
        .select("user_id")
        .in("status", ["online", "idle"])
        .gte("last_seen", cutoff);
      if (!pres?.length) return [];
      const ids = pres.map((p: { user_id: string }) => p.user_id);
      const { data } = await base(admin.from("profiles")).in("id", ids);
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "admins": {
      const { data } = await base(admin.from("profiles")).in("role", ["admin", "super_admin", "founder", "fondateur"]);
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "founders": {
      const { data } = await base(admin.from("profiles")).in("role", ["founder", "fondateur"]);
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "specific_role": {
      if (!filters.role) return [];
      const { data } = await base(admin.from("profiles")).eq("role", filters.role as string);
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "tournament_participants": {
      if (!filters.tournament_id) return [];
      const { data: tp } = await admin
        .from("tournament_participants")
        .select("user_id")
        .eq("tournament_id", filters.tournament_id as string);
      if (!tp?.length) return [];
      const { data } = await base(admin.from("profiles")).in("id", tp.map((p: { user_id: string }) => p.user_id));
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "clan_members": {
      if (!filters.clan_id) return [];
      const { data: cm } = await admin
        .from("clan_members")
        .select("user_id")
        .eq("clan_id", filters.clan_id as string);
      if (!cm?.length) return [];
      const { data } = await base(admin.from("profiles")).in("id", cm.map((m: { user_id: string }) => m.user_id));
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "team_members": {
      if (!filters.team_id) return [];
      const { data: tm } = await admin
        .from("team_members")
        .select("user_id")
        .eq("team_id", filters.team_id as string);
      if (!tm?.length) return [];
      const { data } = await base(admin.from("profiles")).in("id", tm.map((m: { user_id: string }) => m.user_id));
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "specific_users": {
      const ids = filters.user_ids as string[] | undefined;
      if (!ids?.length) return [];
      const { data } = await base(admin.from("profiles")).in("id", ids);
      return (data || []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    default:
      return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")   return json({ error: "Method not allowed" }, 405);

  try {
    // ── Auth: verify caller JWT ─────────────────────────────────────
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Role check ──────────────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "";
    if (!["founder", "fondateur", "super_admin"].includes(role)) {
      return json({ error: "Unauthorized — founder/super_admin only" }, 403);
    }

    const body = await req.json();

    // ── Dev test mode ───────────────────────────────────────────────
    if (body.test_phone && body.test_message) {
      const ok = await twilioSend(body.test_phone, body.test_message);
      return json({ success: ok, error: ok ? undefined : "Twilio send failed" });
    }

    // ── Broadcast mode ──────────────────────────────────────────────
    const { message, target_type, target_filters = {} } = body;
    if (!message?.trim())  return json({ error: "message required" }, 400);
    if (!target_type)      return json({ error: "target_type required" }, 400);

    const phones = await resolvePhones(admin, target_type, target_filters);

    if (phones.length === 0) {
      return json({
        success:    true,
        sent:       0,
        failed:     0,
        total:      0,
        note:       "No WhatsApp-verified users in this audience",
      });
    }

    // ── Send in batches of 10 (respect Twilio rate limits) ──────────
    let sent = 0, failed = 0;
    const BATCH = 10;
    for (let i = 0; i < phones.length; i += BATCH) {
      const batch   = phones.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(p => twilioSend(p, message)));
      results.forEach(ok => ok ? sent++ : failed++);
    }

    // ── Log broadcast ───────────────────────────────────────────────
    await admin.from("whatsapp_broadcasts").insert({
      sent_by:        user.id,
      message:        message.trim(),
      target_type,
      target_filters,
      total_count:    phones.length,
      sent_count:     sent,
      failed_count:   failed,
    });

    return json({ success: true, sent, failed, total: phones.length });

  } catch (err) {
    console.error("send-whatsapp-broadcast:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
