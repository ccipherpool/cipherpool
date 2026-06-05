// CipherPool — Edge Function: send-welcome-email
//
// Called via pg_net HTTP POST when a new profile row is created.
// Sends a branded welcome email using Resend.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY, FROM_EMAIL
// Auto-injected:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "CipherPool <noreply@cipherpool.gg>";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL        = Deno.env.get("APP_URL") ?? "https://cipherpool.gg";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Welcome email HTML ──────────────────────────────────────────────
function buildWelcomeEmail(username: string, email: string): string {
  const year = new Date().getFullYear();
  const safeUsername = escapeHtml(username);
  const safeEmail    = escapeHtml(email);
  const u = (path: string) => `${APP_URL}${path}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Welcome to CipherPool</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background: #060912; color: #f1f5f9; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  .container { max-width: 580px; margin: 0 auto; }
</style>
</head>
<body style="background:#060912; padding: 32px 16px;">
<div class="container">

  <!-- HEADER GLOW -->
  <div style="text-align:center; padding: 40px 0 32px; position: relative;">
    <div style="
      background: radial-gradient(ellipse at center, rgba(99,102,241,0.2) 0%, transparent 70%);
      position: absolute; inset: 0; pointer-events: none;
    "></div>
    <!-- Logo wordmark -->
    <div style="
      display: inline-block;
      font-size: 26px; font-weight: 900; letter-spacing: -0.5px;
      background: linear-gradient(135deg, #6366f1, #a78bfa, #06b6d4);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    ">CIPHERPOOL</div>
    <div style="font-size: 11px; color: rgba(255,255,255,0.3); letter-spacing: 2px; text-transform: uppercase;">Competitive Gaming Platform</div>
  </div>

  <!-- HERO CARD -->
  <div style="
    background: linear-gradient(135deg, #0f1629, #1a1040);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 20px;
    padding: 40px 36px;
    text-align: center;
    position: relative;
    overflow: hidden;
    margin-bottom: 20px;
  ">
    <!-- Glow accent top-left -->
    <div style="position:absolute; top:-40px; left:-40px; width:200px; height:200px;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
      pointer-events:none;"></div>
    <!-- Glow accent bottom-right -->
    <div style="position:absolute; bottom:-40px; right:-40px; width:200px; height:200px;
      background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
      pointer-events:none;"></div>

    <div style="font-size: 52px; margin-bottom: 16px; position: relative;">🎮</div>
    <h1 style="font-size: 26px; font-weight: 900; color: #f1f5f9; margin-bottom: 8px; position: relative;">
      Welcome to CipherPool!
    </h1>
    <p style="font-size: 15px; color: rgba(255,255,255,0.55); margin-bottom: 24px; position: relative;">
      Hello <strong style="color: #a78bfa;">${safeUsername}</strong> — your account is verified and ready.
    </p>
    <div style="
      display: inline-block;
      background: rgba(16,185,129,0.12);
      border: 1px solid rgba(16,185,129,0.3);
      color: #10b981;
      padding: 8px 20px; border-radius: 50px;
      font-size: 12px; font-weight: 700; letter-spacing: 1px;
      position: relative;
    ">✓ EMAIL VERIFIED — ACCOUNT ACTIVE</div>
  </div>

  <!-- GET STARTED STEPS -->
  <div style="
    background: #0a0e1a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 20px;
  ">
    <h2 style="font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px;">
      🚀 GET STARTED IN 5 STEPS
    </h2>
    ${[
      ["1", "#6366f1", "Complete your profile", "Add avatar, bio, and Free Fire ID"],
      ["2", "#8b5cf6", "Verify gaming information", "Link your Free Fire account"],
      ["3", "#06b6d4", "Join your first tournament", "Browse open registrations"],
      ["4", "#f59e0b", "Earn rewards & CP Coins", "Win matches to unlock items"],
      ["5", "#10b981", "Build your reputation", "Climb the leaderboard"],
    ].map(([num, color, title, desc]) => `
    <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px;">
      <div style="
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
        background: ${color}20; border: 1px solid ${color}40;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 800; color: ${color};
      ">${num}</div>
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #f1f5f9;">${title}</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 2px;">${desc}</div>
      </div>
    </div>`).join("")}
  </div>

  <!-- QUICK LINKS -->
  <div style="
    background: #0a0e1a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 20px;
  ">
    <h2 style="font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px;">
      ⚡ QUICK LINKS
    </h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      ${[
        ["🏠 Dashboard",    "/",             "#6366f1"],
        ["👤 Profile",      "/profile",      "#8b5cf6"],
        ["🏆 Arena",        "/arena",        "#f59e0b"],
        ["🎮 Tournaments",  "/tournaments",  "#10b981"],
        ["🛡️ Clans",        "/clans",        "#06b6d4"],
        ["📊 Rankings",     "/leaderboard",  "#f43f5e"],
        ["💰 Wallet",       "/wallet",       "#f59e0b"],
        ["❓ Support",      "/support",      "#64748b"],
      ].map(([label, path, color]) => `
      <a href="${u(path)}" style="
        display: block;
        background: ${color}10;
        border: 1px solid ${color}20;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 12px; font-weight: 600; color: #f1f5f9;
        text-decoration: none;
      ">${label}</a>`).join("")}
    </div>
  </div>

  <!-- REWARDS SECTION -->
  <div style="
    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08));
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 20px;
    text-align: center;
  ">
    <h2 style="font-size: 14px; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
      🎁 AS A NEW PLAYER YOU CAN
    </h2>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
      ${["Join tournaments", "Earn CP Coins", "Gain XP", "Unlock achievements", "Join clans", "Reach seasonal leaderboards"].map(item => `
      <span style="
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 5px 12px;
        font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6);
      ">✓ ${item}</span>`).join("")}
    </div>
  </div>

  <!-- CTA BUTTONS -->
  <div style="text-align: center; margin-bottom: 20px;">
    <a href="${u("/arena")}" style="
      display: inline-block;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; font-size: 14px; font-weight: 800;
      padding: 14px 32px; border-radius: 12px;
      text-decoration: none; margin: 6px 4px;
      box-shadow: 0 4px 20px rgba(99,102,241,0.4);
      letter-spacing: 0.5px;
    ">⚔️ ENTER ARENA</a>
    <a href="${u("/tournaments")}" style="
      display: inline-block;
      background: transparent;
      border: 1px solid rgba(99,102,241,0.4);
      color: #a78bfa; font-size: 14px; font-weight: 700;
      padding: 14px 32px; border-radius: 12px;
      text-decoration: none; margin: 6px 4px;
    ">🏆 JOIN TOURNAMENTS</a>
  </div>

  <!-- FAIR PLAY -->
  <div style="
    background: rgba(239,68,68,0.05);
    border: 1px solid rgba(239,68,68,0.15);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
  ">
    <div style="font-size: 12px; font-weight: 800; color: #ef4444; margin-bottom: 8px; letter-spacing: 0.5px;">⚖️ FAIR PLAY REQUIRED</div>
    <div style="font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.6;">
      No cheating · No emulator abuse · No account sharing · Respect community guidelines.<br/>
      Violations may result in suspension or permanent ban.
    </div>
  </div>

  <!-- FOOTER -->
  <div style="text-align: center; padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.06);">
    <div style="font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.3); letter-spacing: 2px; margin-bottom: 6px;">CIPHERPOOL</div>
    <div style="font-size: 10px; color: rgba(255,255,255,0.2); margin-bottom: 12px;">Competitive Gaming Platform</div>
    <div style="font-size: 10px; color: rgba(255,255,255,0.2);">
      © ${year} CipherPool · You're receiving this because you registered at ${safeEmail}
    </div>
    <div style="margin-top: 10px; display: flex; gap: 12px; justify-content: center;">
      <a href="${u("/support")}" style="font-size: 10px; color: rgba(255,255,255,0.3);">Support</a>
      <a href="${u("/terms")}" style="font-size: 10px; color: rgba(255,255,255,0.3);">Terms</a>
      <a href="${u("/privacy")}" style="font-size: 10px; color: rgba(255,255,255,0.3);">Privacy</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── Main handler ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (!RESEND_API_KEY) {
    return json({ success: false, error: "RESEND_API_KEY not configured" }, 500);
  }

  let body: { user_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { user_id } = body;
  if (!user_id) {
    return json({ success: false, error: "user_id required" }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch profile + auth email
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, welcome_email_sent")
    .eq("id", user_id)
    .single();

  if (profileErr || !profile) {
    return json({ success: false, error: "Profile not found" }, 404);
  }

  // Idempotency guard
  if (profile.welcome_email_sent) {
    return json({ success: true, skipped: true, reason: "already_sent" });
  }

  // Get auth email via admin API
  const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.admin.getUserById(user_id);
  if (authErr || !authUser?.email) {
    return json({ success: false, error: "Could not retrieve user email" }, 404);
  }

  const email    = authUser.email;
  const username = profile.full_name || profile.username || email.split("@")[0];

  // Send email via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: "🎮 Welcome to CipherPool – Your Journey Starts Now",
      html:    buildWelcomeEmail(username, email),
    }),
  });

  const resendData = await resendRes.json().catch(() => ({}));

  if (!resendRes.ok) {
    // Log failure
    await supabaseAdmin.from("email_logs").insert({
      user_id,
      email,
      template: "welcome",
      status:   "failed",
      metadata: resendData,
    });
    return json({ success: false, error: resendData?.message || "Resend error", details: resendData }, 500);
  }

  // Mark welcome_email_sent = true (idempotency)
  await supabaseAdmin
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", user_id);

  // Log success
  await supabaseAdmin.from("email_logs").insert({
    user_id,
    email,
    template: "welcome",
    status:   "sent",
    metadata: { resend_id: resendData?.id },
  });

  return json({ success: true, email_id: resendData?.id });
});
