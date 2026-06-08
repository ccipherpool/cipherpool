import { createClient } from "@supabase/supabase-js";

function getEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Env ───────────────────────────────────────────────────────────────────
  const SUPABASE_URL = getEnv("SUPABASE_URL",              "VITE_SUPABASE_URL");
  const SUPABASE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  // ── Validate body ─────────────────────────────────────────────────────────
  const { phone, code } = req.body ?? {};
  if (!phone || !code) {
    return res.status(400).json({ error: "phone and code are required" });
  }

  const normalized    = phone.trim().replace(/\s/g, "");
  const submittedCode = String(code).trim();

  // ── Rate limit: max 10 attempts for active codes ──────────────────────────
  const { data: activeCode } = await db
    .from("whatsapp_verification_codes")
    .select("id, code, expires_at, used, attempts")
    .eq("user_id", user.id)
    .eq("phone", normalized)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeCode) {
    return res.status(400).json({
      error: "No active code found for this number. Please request a new code.",
    });
  }

  // Increment attempt counter first (guards against timing attacks)
  await db
    .from("whatsapp_verification_codes")
    .update({ attempts: activeCode.attempts + 1 })
    .eq("id", activeCode.id);

  // Block after 10 attempts
  if (activeCode.attempts >= 10) {
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("id", activeCode.id);
    return res.status(429).json({
      error: "Too many incorrect attempts. This code has been invalidated. Please request a new one.",
    });
  }

  // Expiry check
  if (new Date(activeCode.expires_at) < new Date()) {
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("id", activeCode.id);
    return res.status(400).json({
      error: "This code has expired. Please request a new one.",
      expired: true,
    });
  }

  // Code check (constant-time safe — both are short strings)
  if (activeCode.code !== submittedCode) {
    const remaining = 10 - (activeCode.attempts + 1);
    return res.status(400).json({
      error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      attempts_remaining: remaining,
    });
  }

  // ── Valid — mark used & update profile ────────────────────────────────────
  await db
    .from("whatsapp_verification_codes")
    .update({ used: true })
    .eq("id", activeCode.id);

  const { error: profileErr } = await db
    .from("profiles")
    .update({
      whatsapp_verified:    true,
      whatsapp_phone:       normalized,
      whatsapp_verified_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("[verify-code] profile update error:", profileErr.message);
    return res.status(500).json({ error: "Verification succeeded but profile update failed. Please try again." });
  }

  console.log("[verify-code] verified:", user.id, normalized);
  return res.status(200).json({ success: true, message: "WhatsApp number verified successfully." });
}
