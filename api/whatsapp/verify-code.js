import { createClient } from "@supabase/supabase-js";

function getEnv(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

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

  // ── Env ───────────────────────────────────────────────────────────────────
  const SUPABASE_URL = getEnv("SUPABASE_URL",              "VITE_SUPABASE_URL");
  const SUPABASE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY");

  console.log("[verify-code] env diagnostic:", {
    SUPABASE_URL:  SUPABASE_URL  ? "✅ " + SUPABASE_URL.slice(0, 30) : "❌ MISSING",
    SUPABASE_KEY:  maskKey(SUPABASE_KEY),
    key_type_guess: SUPABASE_KEY
      ? (SUPABASE_KEY.length > 200 ? "likely service_role ✅" : "⚠️  possibly anon key")
      : "MISSING",
  });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Server misconfigured — missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-supabase-role": "service_role" } },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized — no token" });

  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) {
    console.error("[verify-code] auth error:", authErr?.message);
    return res.status(401).json({ error: "Invalid token" });
  }
  console.log("[verify-code] authenticated user:", user.id);

  // ── Validate body ─────────────────────────────────────────────────────────
  const { phone, code } = req.body ?? {};
  if (!phone || !code) {
    return res.status(400).json({ error: "phone and code are required" });
  }

  const normalized    = phone.trim().replace(/\s/g, "");
  const submittedCode = String(code).trim();

  // ── Fetch active code ─────────────────────────────────────────────────────
  const { data: activeCode, error: selectErr } = await db
    .from("whatsapp_verification_codes")
    .select("id, code, expires_at, used, attempts")
    .eq("user_id", user.id)
    .eq("phone", normalized)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectErr) {
    console.error("[verify-code] ❌ SELECT error:", {
      code:    selectErr.code,
      message: selectErr.message,
      hint:    selectErr.hint,
    });
    return res.status(500).json({
      error:  "Database error while looking up code",
      detail: selectErr.message,
      code:   selectErr.code,
      fix:    selectErr.code === "42501"
              ? "GRANT missing — run sql/79_whatsapp_grants.sql in Supabase SQL Editor"
              : undefined,
    });
  }

  if (!activeCode) {
    return res.status(400).json({
      error: "No active code found for this number. Please request a new code.",
    });
  }

  // ── Increment attempt counter ─────────────────────────────────────────────
  const { error: updateErr } = await db
    .from("whatsapp_verification_codes")
    .update({ attempts: activeCode.attempts + 1 })
    .eq("id", activeCode.id);

  if (updateErr) {
    console.error("[verify-code] ❌ UPDATE attempts error:", updateErr.message);
  }

  // ── Rate-limit on attempts ────────────────────────────────────────────────
  if (activeCode.attempts >= 10) {
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("id", activeCode.id);
    return res.status(429).json({
      error: "Too many incorrect attempts. This code has been invalidated. Please request a new one.",
    });
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  if (new Date(activeCode.expires_at) < new Date()) {
    await db
      .from("whatsapp_verification_codes")
      .update({ used: true })
      .eq("id", activeCode.id);
    return res.status(400).json({
      error:   "This code has expired. Please request a new one.",
      expired: true,
    });
  }

  // ── Code match ────────────────────────────────────────────────────────────
  if (activeCode.code !== submittedCode) {
    const remaining = 10 - (activeCode.attempts + 1);
    console.log("[verify-code] wrong code attempt, remaining:", remaining);
    return res.status(400).json({
      error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      attempts_remaining: remaining,
    });
  }

  // ── Valid — mark used & update profile ────────────────────────────────────
  const { error: markErr } = await db
    .from("whatsapp_verification_codes")
    .update({ used: true })
    .eq("id", activeCode.id);

  if (markErr) {
    console.error("[verify-code] mark used error:", markErr.message);
  }

  const { error: profileErr } = await db
    .from("profiles")
    .update({
      whatsapp_verified:    true,
      whatsapp_phone:       normalized,
      whatsapp_verified_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("[verify-code] ❌ profile UPDATE error:", {
      code:    profileErr.code,
      message: profileErr.message,
      hint:    profileErr.hint,
    });
    return res.status(500).json({
      error:  "Verification succeeded but profile update failed",
      detail: profileErr.message,
      code:   profileErr.code,
    });
  }

  console.log("[verify-code] ✅ verified:", user.id, normalized);
  return res.status(200).json({ success: true, message: "WhatsApp number verified successfully." });
}
