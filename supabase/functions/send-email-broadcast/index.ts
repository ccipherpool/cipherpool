// CipherPool — Edge Function: send-email-broadcast
//
// Secrets needed (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY, FROM_EMAIL
// Auto-injected by Supabase (do NOT set manually):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Config ──────────────────────────────────────────────────────── */
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")            ?? "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")                ?? "CipherPool <noreply@cipherpool.gg>";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_ANON  = Deno.env.get("SUPABASE_ANON_KEY")         ?? "";
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ROLES  = ["super_admin", "founder", "admin"];
const BATCH_SIZE     = 50;
const RATE_DELAY_MS  = 400;

/* ── CORS ────────────────────────────────────────────────────────── */
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

/* ── Decode JWT payload (no verification — we trust Supabase auth) ─ */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded  = payload + "=".repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/* ── Profile lookup — service role FIRST, user JWT as fallback ───── */
// Service role bypasses RLS and always works.
// User JWT is only used if SUPABASE_SVC is somehow missing.
async function fetchProfile(
  userId: string,
  userToken: string,
): Promise<{
  profile: { id: string; email: string | null; role: string; username: string | null } | null;
  strategy: string;
}> {
  const pgHeaders = (key: string) => ({
    "apikey":        key,
    "Authorization": `Bearer ${key}`,
    "Accept":        "application/json",
  });

  // Strategy 1: Service role by UUID — bypasses all RLS (preferred)
  if (SUPABASE_URL && SUPABASE_SVC) {
    try {
      console.log("QUERYING:", "profiles (svc_by_id)", userId);
      const res  = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,email,role,username&limit=1`,
        { headers: pgHeaders(SUPABASE_SVC) },
      );
      const body = await res.json();
      console.log("FULL ERROR (svc_by_id response):", res.status, JSON.stringify(body));
      if (res.ok && Array.isArray(body) && body.length > 0) {
        return { profile: body[0], strategy: "svc_by_id" };
      }
    } catch (e) {
      console.error("PROFILE ERROR (svc_by_id exception):", String(e));
    }
  }

  // Strategy 2: User JWT by UUID — may be blocked by RLS
  if (SUPABASE_URL && userToken) {
    try {
      console.log("QUERYING:", "profiles (jwt_by_id fallback)");
      const res  = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id,email,role,username&limit=1`,
        {
          headers: {
            "apikey":        SUPABASE_ANON,
            "Authorization": `Bearer ${userToken}`,
            "Accept":        "application/json",
          },
        },
      );
      const body = await res.json();
      if (res.ok && Array.isArray(body) && body.length > 0) {
        return { profile: body[0], strategy: "jwt_by_id" };
      }
    } catch { /* fall through */ }
  }

  return { profile: null, strategy: "all_failed" };
}

/* ── Email HTML template ─────────────────────────────────────────── */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lineBreaks(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://cipherpool.gg");
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return escapeHtml(url.toString());
  } catch {
    return null;
  }
}

function visualFor(type?: string | null, priority?: string | null) {
  const key = String(type ?? "info").toLowerCase();
  if (priority === "urgent") return { icon: "!", label: "Critical Alert", accent: "#ff4d6d", glow: "#ff4d6d33" };
  if (key.includes("tournament")) return { icon: "T", label: "Tournament Intel", accent: "#00e5ff", glow: "#00e5ff33" };
  if (key.includes("announcement") || key.includes("broadcast")) return { icon: "A", label: "Announcement", accent: "#8b5cf6", glow: "#8b5cf633" };
  if (key.includes("admin") || key.includes("system")) return { icon: "S", label: "Admin Update", accent: "#60a5fa", glow: "#60a5fa33" };
  if (key.includes("success") || key.includes("achievement")) return { icon: "V", label: "Victory Status", accent: "#22c55e", glow: "#22c55e33" };
  if (key.includes("error") || key.includes("warning")) return { icon: "!", label: "Action Required", accent: "#f59e0b", glow: "#f59e0b33" };
  if (key.includes("gift") || key.includes("reward") || key.includes("coins")) return { icon: "R", label: "Reward Drop", accent: "#ec4899", glow: "#ec489933" };
  return { icon: "C", label: "CipherPool Signal", accent: "#00e5ff", glow: "#00e5ff33" };
}

function buildHtml(p: {
  title: string; message: string; type: string; priority: string;
  actionUrl?: string | null; imageUrl?: string | null;
  icon?: string | null; username?: string;
}): string {
  const visual = visualFor(p.type, p.priority);
  const safeTitle = escapeHtml(p.title || "CipherPool Update");
  const safeType = escapeHtml(p.type || "system");
  const safeMessage = lineBreaks(p.message || "");
  const safeUsername = p.username ? escapeHtml(p.username) : "";
  const safeActionUrl = safeUrl(p.actionUrl);
  const safeImageUrl = safeUrl(p.imageUrl);
  const safeIcon = escapeHtml(p.icon || visual.icon);
  const priorityValue = String(p.priority || "normal").toLowerCase();
  const priorityLabel = priorityValue === "urgent" ? "URGENT" : priorityValue === "high" ? "HIGH PRIORITY" : "";
  const preheader = escapeHtml(`${visual.label}: ${p.title}`.slice(0, 140));
  const heroImage = safeImageUrl ? `
                    <tr>
                      <td style="padding:0 0 22px 0;">
                        <img src="${safeImageUrl}" width="560" alt="" style="width:100%;max-width:560px;height:auto;display:block;border:0;border-radius:18px;" />
                      </td>
                    </tr>` : "";
  const cta = safeActionUrl ? `
                    <tr>
                      <td align="center" style="padding:28px 0 6px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td bgcolor="${visual.accent}" style="border-radius:14px;box-shadow:0 16px 42px ${visual.glow};">
                              <a href="${safeActionUrl}" target="_blank" style="display:inline-block;padding:15px 30px;border:1px solid rgba(255,255,255,0.34);border-radius:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.6px;text-decoration:none;text-transform:uppercase;background:${visual.accent};">
                                Open Command Link
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>` : "";
  const badge = priorityLabel ? `
                                <td align="right" style="padding-left:12px;">
                                  <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#2a1120;color:#ffb4c2;font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">${priorityLabel}</span>
                                </td>` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="dark light">
    <title>${safeTitle}</title>
    <style>
      @media only screen and (max-width: 640px) {
        .cp-container { width: 100% !important; }
        .cp-pad { padding-left: 22px !important; padding-right: 22px !important; }
        .cp-title { font-size: 27px !important; line-height: 33px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#050712;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050712" style="background:#050712;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="cp-container" style="width:640px;max-width:640px;">
            <tr>
              <td align="center" style="padding:0 0 18px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" width="46" height="46" bgcolor="#0c1328" style="border-radius:14px;border:1px solid #24314d;color:${visual.accent};font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:900;">CP</td>
                    <td style="padding-left:12px;text-align:left;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:1.4px;color:#f8fbff;">CIPHERPOOL</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:2.6px;color:#7dd3fc;text-transform:uppercase;">Esports Command Network</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#0a1020" style="border-radius:26px;overflow:hidden;background:#0a1020;border:1px solid #1e2b45;box-shadow:0 28px 80px rgba(0,0,0,0.48);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td height="4" bgcolor="${visual.accent}" style="height:4px;background:${visual.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td class="cp-pad" style="padding:34px 40px 18px 40px;background:#0b1224;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${heroImage}
                        <tr>
                          <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td width="68" valign="top">
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                      <td align="center" width="58" height="58" bgcolor="#111b33" style="width:58px;height:58px;border-radius:18px;background:#111b33;border:1px solid #2d3d63;color:${visual.accent};font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;box-shadow:0 0 34px ${visual.glow};">${safeIcon}</td>
                                    </tr>
                                  </table>
                                </td>
                                <td valign="top">
                                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:${visual.accent};font-weight:900;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(visual.label)} / ${safeType}</div>
                                  <h1 class="cp-title" style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:38px;font-weight:900;color:#ffffff;letter-spacing:-0.2px;">${safeTitle}</h1>
                                </td>
                                ${badge}
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="cp-pad" style="padding:14px 40px 38px 40px;background:#0b1224;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#10182d" style="background:#10182d;border:1px solid #25324e;border-radius:20px;">
                        <tr>
                          <td style="padding:26px 26px 8px 26px;">
                            <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#aab6d3;">${safeUsername ? `Hey <strong style="color:#ffffff;">${safeUsername}</strong>,` : "Hey there,"}</p>
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:27px;color:#e6ecff;">${safeMessage}</p>
                          </td>
                        </tr>
                        ${cta}
                        <tr><td height="24" style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 18px 0 18px;">
                <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#76829e;">You received this because your CipherPool email notifications are enabled.</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
                  <a href="https://cipherpool.gg/notifications" style="color:#93c5fd;text-decoration:none;">Manage preferences</a>
                  &nbsp;|&nbsp;
                  <a href="https://cipherpool.gg" style="color:#93c5fd;text-decoration:none;">cipherpool.gg</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  /*
  const colors: Record<string, string> = {
    announcement: "#06b6d4", warning: "#f59e0b", achievement: "#f59e0b",
    gift: "#ec4899", system: "#6366f1", update: "#6366f1",
    season: "#f59e0b", broadcast: "#06b6d4",
  };
  const accent   = colors[p.type] ?? "#8b5cf6";
  const greeting = p.username ? `Hey <strong style="color:#f4f4f5;">${p.username}</strong>,` : "Hey there,";
  const imgBlock = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:20px;display:block;"/>`
    : "";
  const ctaBlock = p.actionUrl
    ? `<div style="text-align:center;margin-top:28px;"><a href="${p.actionUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,${accent},#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;">Open in CipherPool →</a></div>`
    : "";
  const badge = p.priority === "urgent"
    ? `<span style="background:#ef444420;color:#ef4444;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">URGENT</span>`
    : p.priority === "high"
    ? `<span style="background:#f59e0b20;color:#f59e0b;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">HIGH</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${p.title}</title></head>
<body style="margin:0;padding:0;background:#08091c;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08091c;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 24px;text-align:center;">
  <div style="font-size:26px;font-weight:900;color:#06b6d4;">⚡ CIPHERPOOL</div>
  <div style="font-size:11px;color:#52525b;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Gaming Platform</div>
</td></tr>
<tr><td style="background:linear-gradient(160deg,#0d1220,#111928);border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden;">
  <div style="height:3px;background:linear-gradient(90deg,${accent},#6366f1,${accent});"></div>
  <div style="padding:32px 36px;">
    ${imgBlock}
    <div style="margin-bottom:20px;">
      ${p.icon ? `<span style="font-size:32px;line-height:1;display:block;margin-bottom:10px;">${p.icon}</span>` : ""}
      <h1 style="margin:0;font-size:22px;font-weight:900;color:#f4f4f5;">${p.title}${badge}</h1>
      <div style="font-size:11px;color:${accent};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">${p.type}</div>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#a1a1aa;line-height:1.6;">${greeting}</p>
    <p style="margin:0;font-size:15px;color:#d4d4d8;line-height:1.75;white-space:pre-wrap;">${p.message}</p>
    ${ctaBlock}
  </div>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;">
  <p style="margin:0 0 8px;font-size:11px;color:#3f3f46;">You received this as a CipherPool member.</p>
  <p style="margin:0;font-size:11px;color:#3f3f46;">
    <a href="https://cipherpool.gg/notifications" style="color:#6366f1;text-decoration:none;">Manage preferences</a>
    &nbsp;·&nbsp;<a href="https://cipherpool.gg" style="color:#6366f1;text-decoration:none;">cipherpool.gg</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`;
  */
}

/* ── Resend ───────────────────────────────────────────────────────── */
async function sendViaResend(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY secret not set in Edge Function settings" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (res.ok) return { ok: true };
    const txt = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${txt}` };
  } catch (e) {
    return { ok: false, error: `Resend fetch error: ${e}` };
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ── Main ─────────────────────────────────────────────────────────── */
serve(async (req) => {
  // Top-level try/catch — never let an unhandled exception return a raw 500
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

    /* 1. Bearer token ──────────────────────────────────────────────── */
    const authHeader = req.headers.get("Authorization") ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return json({ error: "Missing Authorization header — make sure you are signed in", allowed: false }, 401);
    }

    /* 2. Extract user ID from JWT (local decode — no network round-trip) */
    const payload = decodeJwtPayload(token);
    const userId  = (payload?.sub as string) ?? "";
    console.log("USER ID:", userId);
    if (!userId) {
      return json({ error: "Invalid token — cannot extract user ID. Please sign out and sign in again.", allowed: false }, 401);
    }

    /* 3. Validate token against Supabase auth (detects expired tokens) */
    let userEmail = (payload?.email as string) ?? "";
    try {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth:   { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData } = await authClient.auth.getUser();
      if (authData?.user?.email) userEmail = authData.user.email;
    } catch {
      // If auth validation fails, we still have userId from JWT decode.
      // We proceed and let the role check catch unauthorized access.
    }

    /* 4. Fetch profile — service role first, JWT fallback ──────────── */
    const { profile, strategy } = await fetchProfile(userId, token);
    console.log("PROFILE RESULT:", JSON.stringify({ found: profile !== null, strategy, role: profile?.role ?? null, email: profile?.email ?? null }));

    const debugBase = {
      user_id:          userId,
      user_email:       userEmail,
      profile_found:    profile !== null,
      profile_role:     profile?.role ?? null,
      lookup_strategy:  strategy,
      env: {
        supabase_url:  SUPABASE_URL  ? "set" : "MISSING",
        anon_key:      SUPABASE_ANON ? "set" : "MISSING",
        svc_key:       SUPABASE_SVC  ? "set" : "MISSING",
        resend_key:    RESEND_API_KEY? "set" : "MISSING",
      },
    };

    if (!profile) {
      return json({
        ...debugBase,
        error: "Your profile was not found in the database. Make sure your account profile exists.",
        allowed: false,
      }, 403);
    }

    /* 5. Role check ────────────────────────────────────────────────── */
    const profileRole = profile.role ?? "";
    if (!ALLOWED_ROLES.includes(profileRole)) {
      return json({
        ...debugBase,
        error: `Your role '${profileRole}' does not have permission to send email broadcasts. Required: admin, founder, or super_admin.`,
        allowed: false,
      }, 403);
    }

    /* 6. Parse request body ────────────────────────────────────────── */
    let body: { broadcast_id?: string; test_email?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body is ok */ }
    const { broadcast_id, test_email } = body;

    const dbg = { ...debugBase, allowed: true };

    /* 7. Service-role client for DB operations ──────────────────────── */
    if (!SUPABASE_SVC) {
      return json({ ...dbg, error: "SUPABASE_SERVICE_ROLE_KEY not configured in edge function environment", success: false }, 500);
    }
    const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /* ── TEST EMAIL ─────────────────────────────────────────────────── */
    if (test_email) {
      const sendTo = userEmail || profile.email;
      if (!sendTo) {
        return json({ ...dbg, success: false, error: "No email address found for your account. Make sure your email is set in your profile." }, 400);
      }
      if (!RESEND_API_KEY) {
        return json({ ...dbg, success: false, error: "RESEND_API_KEY secret is not configured. Go to Supabase Dashboard → Edge Functions → Secrets." }, 500);
      }
      const html   = buildHtml({ title: "Test — CipherPool", message: "Email delivery is working! 🎉", type: "system", priority: "normal", actionUrl: "https://cipherpool.gg", username: profile.username ?? undefined });
      const result = await sendViaResend(sendTo, "✅ CipherPool — Email Test", html);
      return json({ ...dbg, success: result.ok, email: sendTo, profile_email: sendTo, error: result.error ?? null });
    }

    /* ── BROADCAST ──────────────────────────────────────────────────── */
    if (!broadcast_id) {
      return json({ ...dbg, error: "broadcast_id is required in the request body" }, 400);
    }

    console.log("QUERYING:", "notification_broadcasts (select broadcast)");
    const { data: broadcast, error: bcastErr } = await svc
      .from("notification_broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .maybeSingle();

    if (bcastErr) {
      console.error("FULL ERROR:", JSON.stringify(bcastErr, null, 2));
      console.error(bcastErr);
      return json({ ...dbg, error: `Failed to load broadcast: ${bcastErr.message}`, success: false }, 500);
    }
    if (!broadcast) {
      return json({ ...dbg, error: `Broadcast not found: ${broadcast_id}` }, 404);
    }
    if (!broadcast.send_email) {
      return json({ ...dbg, error: "This broadcast has email disabled (send_email = false)" }, 400);
    }

    console.log("QUERYING:", "RPC get_broadcast_email_recipients");
    const { data: recipients, error: recipErr } = await svc.rpc("get_broadcast_email_recipients", { p_broadcast_id: broadcast_id });
    if (recipErr) {
      console.error("FULL ERROR:", JSON.stringify(recipErr, null, 2));
      console.error(recipErr);
      return json({ ...dbg, error: `Failed to fetch email recipients: ${recipErr.message}`, success: false }, 500);
    }

    if (!recipients || (recipients as unknown[]).length === 0) {
      console.log("QUERYING:", "notification_broadcasts (update email_status=sent, 0 recipients)");
      await svc.from("notification_broadcasts").update({ email_status: "sent", email_sent_count: 0 }).eq("id", broadcast_id);
      return json({ ...dbg, success: true, sent: 0, failed: 0, total: 0, note: "No eligible recipients with email notifications enabled." });
    }

    const subject = (broadcast.email_subject || broadcast.title) as string;
    console.log("QUERYING:", "notification_broadcasts (update email_status=sending)");
    await svc.from("notification_broadcasts").update({ email_status: "sending" }).eq("id", broadcast_id);

    let sentCount = 0, failedCount = 0;
    for (let i = 0; i < (recipients as unknown[]).length; i += BATCH_SIZE) {
      const batch   = (recipients as Array<{ user_id: string; email: string; username: string }>).slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (r) => {
        const html   = buildHtml({
          title:     broadcast.title     as string,
          message:   broadcast.message   as string,
          type:      broadcast.type      as string,
          priority:  broadcast.priority  as string,
          actionUrl: broadcast.action_url as string ?? null,
          imageUrl:  broadcast.image_url  as string ?? null,
          icon:      broadcast.icon       as string ?? null,
          username:  r.username,
        });
        const result = await sendViaResend(r.email, subject, html);
        console.log("QUERYING:", "notification_email_logs (insert log for", r.email, ")");
        svc.from("notification_email_logs").insert({
          broadcast_id,
          user_id:       r.user_id,
          email:         r.email,
          status:        result.ok ? "sent" : "failed",
          error_message: result.ok ? null : result.error,
          sent_at:       result.ok ? new Date().toISOString() : null,
        }).then(() => {}).catch(() => {});
        return result;
      }));

      for (const r of results) {
        if (r.status === "fulfilled" && r.value.ok) sentCount++; else failedCount++;
      }
      if (i + BATCH_SIZE < (recipients as unknown[]).length) await delay(RATE_DELAY_MS);
    }

    const finalStatus = failedCount === 0 ? "sent" : sentCount === 0 ? "failed" : "partial";
    console.log("QUERYING:", "notification_broadcasts (update final status:", finalStatus, ")");
    await svc.from("notification_broadcasts")
      .update({ email_status: finalStatus, email_sent_count: sentCount, email_failed_count: failedCount })
      .eq("id", broadcast_id);

    return json({ ...dbg, success: sentCount > 0, sent: sentCount, failed: failedCount, total: (recipients as unknown[]).length, status: finalStatus });

  } catch (err) {
    console.error("FULL ERROR:", JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Error ? err : {}), 2));
    console.error(err);
    return json({ error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`, success: false }, 500);
  }
});
