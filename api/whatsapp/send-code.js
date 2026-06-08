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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Env ───────────────────────────────────────────────────────────────────
  const SUPABASE_URL  = getEnv("SUPABASE_URL",              "VITE_SUPABASE_URL");
  const SUPABASE_KEY  = getEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_SID    = getEnv("TWILIO_ACCOUNT_SID");
  const TWILIO_TOKEN  = getEnv("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM   = getEnv("TWILIO_WHATSAPP_NUMBER");

  const missing = [
    !SUPABASE_URL  && "SUPABASE_URL",
    !SUPABASE_KEY  && "SUPABASE_SERVICE_ROLE_KEY",
    !TWILIO_SID    && "TWILIO_ACCOUNT_SID",
    !TWILIO_TOKEN  && "TWILIO_AUTH_TOKEN",
    !TWILIO_FROM   && "TWILIO_WHATSAPP_NUMBER",
  ].filter(Boolean);

  if (missing.length) {
    console.error("[send-code] missing env:", missing);
    return res.status(500).json({ error: "Server misconfigured", missing });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  // ── Validate phone ────────────────────────────────────────────────────────
  const { phone } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: "phone is required" });

  const normalized = phone.trim().replace(/\s/g, "");
  if (!/^\+\d{8,15}$/.test(normalized)) {
    return res.status(400).json({ error: "Phone must be in international format: +212600000000" });
  }

  // ── Rate limit: max 5 OTP requests per phone per hour ─────────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await db
    .from("whatsapp_verification_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", oneHourAgo);

  if (recentCount >= 5) {
    return res.status(429).json({
      error: "Too many requests. Maximum 5 codes per hour. Please wait before requesting a new code.",
      retry_after: 3600,
    });
  }

  // ── Invalidate previous unused codes for this user ────────────────────────
  await db
    .from("whatsapp_verification_codes")
    .update({ used: true })
    .eq("user_id", user.id)
    .eq("used", false);

  // ── Generate & store OTP ──────────────────────────────────────────────────
  const code      = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await db
    .from("whatsapp_verification_codes")
    .insert({ user_id: user.id, phone: normalized, code, expires_at: expiresAt });

  if (insertErr) {
    console.error("[send-code] insert error:", insertErr.message);
    return res.status(500).json({ error: "Failed to create verification code" });
  }

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
    await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to:   `whatsapp:${normalized}`,
      body: message,
    });
    console.log("[send-code] OTP sent to", normalized, "user:", user.id);
    return res.status(200).json({ success: true, expires_in: 600 });
  } catch (err) {
    // Remove stored code if Twilio failed
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("code", code);
    console.error("[send-code] Twilio error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
