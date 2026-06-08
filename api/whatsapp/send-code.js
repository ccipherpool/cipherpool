import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

function getEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Show first 12 + last 4 chars — enough to identify anon vs service_role key
function maskKey(k) {
  if (!k) return "MISSING";
  return `${k.slice(0, 12)}...${k.slice(-4)} (len=${k.length})`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Env resolution ────────────────────────────────────────────────────────
  const SUPABASE_URL  = getEnv("SUPABASE_URL",              "VITE_SUPABASE_URL");
  const SUPABASE_KEY  = getEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_SID    = getEnv("TWILIO_ACCOUNT_SID");
  const TWILIO_TOKEN  = getEnv("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM   = getEnv("TWILIO_WHATSAPP_NUMBER");

  // ── Diagnostic log (always) ───────────────────────────────────────────────
  console.log("[send-code] env diagnostic:", {
    SUPABASE_URL:              SUPABASE_URL  ? "✅ " + SUPABASE_URL.slice(0, 30) : "❌ MISSING",
    SUPABASE_SERVICE_ROLE_KEY: maskKey(SUPABASE_KEY),
    // Detect if accidentally using anon key (anon keys are much shorter than service_role keys)
    key_type_guess: SUPABASE_KEY
      ? (SUPABASE_KEY.length > 200 ? "likely service_role ✅" : "⚠️  possibly anon key — check Vercel env")
      : "MISSING",
    TWILIO_ACCOUNT_SID:     TWILIO_SID   ? "✅ " + TWILIO_SID.slice(0, 10) + "…"  : "❌ MISSING",
    TWILIO_AUTH_TOKEN:      TWILIO_TOKEN ? "✅ loaded"                              : "❌ MISSING",
    TWILIO_WHATSAPP_NUMBER: TWILIO_FROM  ? "✅ " + TWILIO_FROM                      : "❌ MISSING",
  });

  const missing = [
    !SUPABASE_URL  && "SUPABASE_URL",
    !SUPABASE_KEY  && "SUPABASE_SERVICE_ROLE_KEY",
    !TWILIO_SID    && "TWILIO_ACCOUNT_SID",
    !TWILIO_TOKEN  && "TWILIO_AUTH_TOKEN",
    !TWILIO_FROM   && "TWILIO_WHATSAPP_NUMBER",
  ].filter(Boolean);

  if (missing.length) {
    console.error("[send-code] ❌ missing vars:", missing);
    return res.status(500).json({ error: "Server misconfigured", missing });
  }

  // ── Supabase client (service_role — bypasses RLS rows but needs GRANT) ────
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-supabase-role": "service_role" } },
  });

  // ── Auth: verify caller JWT ───────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized — no token" });

  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) {
    console.error("[send-code] auth error:", authErr?.message);
    return res.status(401).json({ error: "Invalid token" });
  }
  console.log("[send-code] authenticated user:", user.id);

  // ── Validate phone ────────────────────────────────────────────────────────
  const { phone } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: "phone is required" });

  const normalized = phone.trim().replace(/\s/g, "");
  if (!/^\+\d{8,15}$/.test(normalized)) {
    return res.status(400).json({ error: "Phone must be in international format: +212600000000" });
  }

  // ── Rate limit: max 5 OTP requests per user per hour ─────────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countErr } = await db
    .from("whatsapp_verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (countErr) {
    console.error("[send-code] rate-limit SELECT error:", countErr.code, countErr.message, countErr.hint);
    // "permission denied" here means GRANT is missing — run sql/79_whatsapp_grants.sql
    return res.status(500).json({
      error:  "Database permission error on rate-limit check",
      detail: countErr.message,
      code:   countErr.code,
      fix:    "Run sql/79_whatsapp_grants.sql in Supabase SQL Editor",
    });
  }

  if (recentCount >= 5) {
    return res.status(429).json({
      error: "Too many requests. Maximum 5 codes per hour.",
      retry_after: 3600,
    });
  }

  // ── Invalidate previous unused codes for this user ────────────────────────
  const { error: invalidateErr } = await db
    .from("whatsapp_verification_codes")
    .update({ used: true })
    .eq("user_id", user.id)
    .eq("used", false);

  if (invalidateErr) {
    console.warn("[send-code] invalidate prior codes error:", invalidateErr.message);
    // Non-fatal — continue
  }

  // ── Generate & store OTP ──────────────────────────────────────────────────
  const code      = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  console.log("[send-code] inserting OTP for user:", user.id, "phone:", normalized);

  const { data: inserted, error: insertErr } = await db
    .from("whatsapp_verification_codes")
    .insert({ user_id: user.id, phone: normalized, code, expires_at: expiresAt })
    .select("id");

  if (insertErr) {
    console.error("[send-code] ❌ INSERT error:", {
      code:    insertErr.code,
      message: insertErr.message,
      hint:    insertErr.hint,
      details: insertErr.details,
    });
    return res.status(500).json({
      error:  "Failed to create verification code",
      detail: insertErr.message,
      code:   insertErr.code,
      // Guide the user to the fix
      fix:    insertErr.code === "42501"
              ? "GRANT missing — run sql/79_whatsapp_grants.sql in Supabase SQL Editor"
              : undefined,
    });
  }

  console.log("[send-code] ✅ OTP stored, row id:", inserted?.[0]?.id);

  // ── Send via Twilio ───────────────────────────────────────────────────────
  const fromNumber = TWILIO_FROM.replace(/^whatsapp:/i, "");
  const message = [
    "🏆 *CipherPool Verification*",
    "",
    `Your verification code: *${code}*`,
    "",
    "This code expires in 10 minutes.",
    "Never share this code with anyone.",
  ].join("\n");

  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    const msg = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to:   `whatsapp:${normalized}`,
      body: message,
    });
    console.log("[send-code] ✅ Twilio message sent, SID:", msg.sid);
    return res.status(200).json({ success: true, expires_in: 600 });
  } catch (err) {
    // Roll back: mark stored code as used so it can't be submitted
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("code", code);
    console.error("[send-code] ❌ Twilio error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
