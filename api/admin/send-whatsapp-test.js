import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

// Support both VITE_-prefixed names (frontend) and plain names (server-side)
function getEnv(...names) {
  for (const name of names) {
    const val = process.env[name];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Resolve env vars (lazy, inside handler — avoids module-level crash) ──
  const SUPABASE_URL  = getEnv("SUPABASE_URL",             "VITE_SUPABASE_URL");
  const SUPABASE_KEY  = getEnv("SUPABASE_SERVICE_ROLE_KEY","VITE_SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_SID    = getEnv("TWILIO_ACCOUNT_SID");
  const TWILIO_TOKEN  = getEnv("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM   = getEnv("TWILIO_WHATSAPP_NUMBER");

  // ── Log env status (visible in Vercel Function Logs) ──────────────────────
  const envStatus = {
    SUPABASE_URL:              SUPABASE_URL  ? "✅ loaded" : "❌ MISSING",
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY  ? "✅ loaded" : "❌ MISSING",
    TWILIO_ACCOUNT_SID:        TWILIO_SID    ? "✅ loaded" : "❌ MISSING",
    TWILIO_AUTH_TOKEN:         TWILIO_TOKEN  ? "✅ loaded" : "❌ MISSING",
    TWILIO_WHATSAPP_NUMBER:    TWILIO_FROM   ? "✅ loaded" : "❌ MISSING",
  };
  console.log("[whatsapp-test] env:", JSON.stringify(envStatus));

  // ── Validate — return 500 with clear list instead of crashing ─────────────
  const missing = Object.entries(envStatus)
    .filter(([, v]) => v.startsWith("❌"))
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error("[whatsapp-test] missing vars:", missing);
    return res.status(500).json({
      error: "Server misconfigured — missing environment variables",
      missing,
      hint: "Set these in Vercel → Project → Settings → Environment Variables",
    });
  }

  // ── Supabase admin client (initialized here, not at module level) ─────────
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Verify JWT ─────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized — Authorization header missing" });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    console.error("[whatsapp-test] auth error:", authErr?.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // ── Role guard ─────────────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return res.status(403).json({ error: "Could not verify role", detail: profileErr?.message });
  }
  if (profile.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin only" });
  }

  // ── Validate body ──────────────────────────────────────────────────────────
  const { phone, message } = req.body ?? {};
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  // ── Send WhatsApp ──────────────────────────────────────────────────────────
  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    const msg = await client.messages.create({
      from: `whatsapp:${TWILIO_FROM}`,
      to:   `whatsapp:${phone}`,
      body: message,
    });
    console.log("[whatsapp-test] sent — SID:", msg.sid);
    return res.status(200).json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error("[whatsapp-test] Twilio error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
