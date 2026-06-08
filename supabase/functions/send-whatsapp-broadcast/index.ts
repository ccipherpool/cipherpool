import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Config ──────────────────────────────────────────────────────── */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")        ?? "";
const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID")        ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")         ?? "";
const TWILIO_FROM  = Deno.env.get("TWILIO_WHATSAPP_FROM")      ?? "";

/* ── CORS — identical to send-email-broadcast ────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* ── Local JWT decode (no network round-trip) ─────────────────────── */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts   = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded  = payload + "=".repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/* ── Twilio send ──────────────────────────────────────────────────── */
async function twilioSend(phone: string, message: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return false;
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
          To:   `whatsapp:${phone}`,
          Body: message,
        }).toString(),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Resolve phone numbers by audience type ──────────────────────── */
async function resolvePhones(
  svc: ReturnType<typeof createClient>,
  targetType: string,
  filters: Record<string, unknown>
): Promise<string[]> {
  const base = (q: ReturnType<typeof svc.from>) =>
    q.select("whatsapp_number")
      .eq("whatsapp_verified", true)
      .not("whatsapp_number", "is", null)
      .neq("account_status", "banned")
      .neq("account_status", "deleted")
      .limit(1000);

  switch (targetType) {
    case "all_users": {
      const { data } = await base(svc.from("profiles"));
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "online_users": {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: pres } = await svc.from("user_presence").select("user_id")
        .in("status", ["online", "idle"]).gte("last_seen", cutoff);
      if (!pres?.length) return [];
      const { data } = await base(svc.from("profiles")).in("id", pres.map((p: { user_id: string }) => p.user_id));
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "admins": {
      const { data } = await base(svc.from("profiles")).in("role", ["admin", "super_admin", "founder", "fondateur"]);
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "founders": {
      const { data } = await base(svc.from("profiles")).in("role", ["founder", "fondateur"]);
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "specific_role": {
      if (!filters.role) return [];
      const { data } = await base(svc.from("profiles")).eq("role", filters.role as string);
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "tournament_participants": {
      if (!filters.tournament_id) return [];
      const { data: tp } = await svc.from("tournament_participants").select("user_id").eq("tournament_id", filters.tournament_id as string);
      if (!tp?.length) return [];
      const { data } = await base(svc.from("profiles")).in("id", tp.map((p: { user_id: string }) => p.user_id));
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "clan_members": {
      if (!filters.clan_id) return [];
      const { data: cm } = await svc.from("clan_members").select("user_id").eq("clan_id", filters.clan_id as string);
      if (!cm?.length) return [];
      const { data } = await base(svc.from("profiles")).in("id", cm.map((m: { user_id: string }) => m.user_id));
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "team_members": {
      if (!filters.team_id) return [];
      const { data: tm } = await svc.from("team_members").select("user_id").eq("team_id", filters.team_id as string);
      if (!tm?.length) return [];
      const { data } = await base(svc.from("profiles")).in("id", tm.map((m: { user_id: string }) => m.user_id));
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    case "specific_users": {
      const ids = filters.user_ids as string[] | undefined;
      if (!ids?.length) return [];
      const { data } = await base(svc.from("profiles")).in("id", ids);
      return (data ?? []).map((r: { whatsapp_number: string }) => r.whatsapp_number);
    }
    default:
      return [];
  }
}

/* ── Main ─────────────────────────────────────────────────────────── */
serve(async (req) => {
  try {
    // OPTIONS preflight — must be first, before any auth check
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    /* 1. Bearer token ──────────────────────────────────────────────── */
    const authHeader = req.headers.get("Authorization") ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Missing Authorization header" }, 401);

    /* 2. Decode JWT locally — no network round-trip ────────────────── */
    const payload = decodeJwtPayload(token);
    const userId  = (payload?.sub as string) ?? "";
    if (!userId) return json({ error: "Invalid token" }, 401);

    /* 3. Service-role client — bypasses RLS ───────────────────────── */
    if (!SUPABASE_SVC) return json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, 500);
    const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /* 4. Role check via service role (no RLS interference) ─────────── */
    const { data: profiles } = await svc
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .limit(1);
    const role = profiles?.[0]?.role ?? "";
    if (!["founder", "fondateur", "super_admin"].includes(role)) {
      return json({ error: "Unauthorized — founder/super_admin only" }, 403);
    }

    /* 5. Parse body ─────────────────────────────────────────────────── */
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty body */ }

    /* 6. Dev test mode (single message) ─────────────────────────────── */
    if (body.test_phone && body.test_message) {
      const ok = await twilioSend(body.test_phone as string, body.test_message as string);
      return json({ success: ok, error: ok ? undefined : "Twilio send failed" });
    }

    /* 7. Broadcast mode ─────────────────────────────────────────────── */
    const message      = (body.message as string | undefined)?.trim() ?? "";
    const target_type  = (body.target_type as string | undefined) ?? "";
    const target_filters = (body.target_filters as Record<string, unknown> | undefined) ?? {};

    if (!message)     return json({ error: "message is required" }, 400);
    if (!target_type) return json({ error: "target_type is required" }, 400);

    const phones = await resolvePhones(svc, target_type, target_filters);

    if (phones.length === 0) {
      return json({ success: true, sent: 0, failed: 0, total: 0, note: "No WhatsApp-verified users in this audience" });
    }

    // Send in batches of 10 (Twilio rate limit)
    let sent = 0, failed = 0;
    for (let i = 0; i < phones.length; i += 10) {
      const results = await Promise.all(phones.slice(i, i + 10).map(p => twilioSend(p, message)));
      results.forEach(ok => ok ? sent++ : failed++);
    }

    // Log broadcast history
    await svc.from("whatsapp_broadcasts").insert({
      sent_by:        userId,
      message,
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
