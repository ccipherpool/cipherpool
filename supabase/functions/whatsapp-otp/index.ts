import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

function otp6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { action, phone, code } = await req.json();

    // ── Privileged client (bypasses RLS) ─────────────────────
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Verify caller JWT ─────────────────────────────────────
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ══════════════════════════════════════════════════════════
    // ACTION: send — generate OTP, store it, send via Twilio
    // ══════════════════════════════════════════════════════════
    if (action === "send") {
      const normalized = (phone ?? "").trim();
      if (!/^\+\d{8,15}$/.test(normalized)) {
        return json({ error: "Format invalide. Utilisez +212XXXXXXXXX" }, 400);
      }

      // Rate-limit: max 3 sends per 10 minutes per user
      const { count } = await admin
        .from("whatsapp_verification_codes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if ((count ?? 0) >= 3) {
        return json({ error: "Trop de tentatives. Attendez 10 minutes." }, 429);
      }

      // Invalidate any active codes for this user
      await admin
        .from("whatsapp_verification_codes")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Generate + store new code
      const newCode  = otp6();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertErr } = await admin
        .from("whatsapp_verification_codes")
        .insert({ user_id: user.id, phone: normalized, code: newCode, expires_at: expiresAt });
      if (insertErr) throw new Error("DB insert failed: " + insertErr.message);

      // Save phone to profile immediately (so broadcasts can use it even before verify)
      await admin.from("profiles").update({ whatsapp_number: normalized }).eq("id", user.id);

      // ── Send via Twilio WhatsApp ──────────────────────────
      const twilioSid   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
      const twilioFrom  = Deno.env.get("TWILIO_WHATSAPP_FROM")!; // "whatsapp:+14155238886"

      const msgBody = `🎮 *CipherPool Arena*\n\nVotre code de vérification WhatsApp :\n\n*${newCode}*\n\nCe code expire dans 10 minutes.\nNe le partagez pas.`;

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          },
          body: new URLSearchParams({
            From: twilioFrom,
            To:   `whatsapp:${normalized}`,
            Body: msgBody,
          }).toString(),
        }
      );

      if (!twilioRes.ok) {
        const t = await twilioRes.json().catch(() => ({}));
        console.error("Twilio error:", t);
        throw new Error(t.message ?? "Échec de l'envoi WhatsApp");
      }

      return json({ success: true });

    // ══════════════════════════════════════════════════════════
    // ACTION: verify — check OTP, mark profile verified
    // ══════════════════════════════════════════════════════════
    } else if (action === "verify") {
      const normalized = (phone ?? "").trim();
      const input      = (code ?? "").trim();

      if (input.length !== 6 || !/^\d{6}$/.test(input)) {
        return json({ error: "Code invalide (6 chiffres requis)" }, 400);
      }

      // Fetch active code
      const { data: row, error: rowErr } = await admin
        .from("whatsapp_verification_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("phone", normalized)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rowErr || !row) {
        return json({ error: "Code expiré ou introuvable. Demandez-en un nouveau." }, 400);
      }

      // Max-attempts guard (5 tries per code)
      if (row.attempts >= 5) {
        await admin.from("whatsapp_verification_codes").update({ used: true }).eq("id", row.id);
        return json({ error: "Trop de tentatives. Demandez un nouveau code." }, 429);
      }

      if (row.code !== input) {
        await admin.from("whatsapp_verification_codes")
          .update({ attempts: row.attempts + 1 }).eq("id", row.id);
        const left = 4 - row.attempts;
        return json({ error: `Code incorrect. ${left} tentative${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}.` }, 400);
      }

      // ✅ Correct code — mark used + verify profile
      await admin.from("whatsapp_verification_codes").update({ used: true }).eq("id", row.id);
      await admin.from("profiles").update({
        whatsapp_verified:    true,
        whatsapp_verified_at: new Date().toISOString(),
        whatsapp_number:      normalized,
      }).eq("id", user.id);

      return json({ success: true });

    } else {
      return json({ error: "Unknown action" }, 400);
    }

  } catch (err) {
    console.error("whatsapp-otp:", err);
    return json({ error: err instanceof Error ? err.message : "Erreur interne" }, 500);
  }
});
