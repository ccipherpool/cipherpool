// CipherPool — Edge Function: send-notification-email
//
// Called via pg_net HTTP POST when a notification row is inserted
// and the recipient has email_notifications = true.
//
// Secrets needed (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY, FROM_EMAIL
// Auto-injected:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") ?? "CipherPool <noreply@cipherpool.gg>";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

/* ── Email HTML builder ─────────────────────────────────────────── */
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

function notificationVisual(type?: string | null) {
  const key = String(type ?? "info").toLowerCase();
  if (key.includes("tournament")) return { icon: "T", label: "Tournament Intel", accent: "#00e5ff", glow: "#00e5ff33", state: "Arena update" };
  if (key.includes("announcement") || key.includes("broadcast")) return { icon: "A", label: "Announcement", accent: "#8b5cf6", glow: "#8b5cf633", state: "Global broadcast" };
  if (key.includes("admin") || key.includes("system")) return { icon: "S", label: "Admin Update", accent: "#60a5fa", glow: "#60a5fa33", state: "System signal" };
  if (key.includes("success") || key.includes("achievement")) return { icon: "V", label: "Victory Status", accent: "#22c55e", glow: "#22c55e33", state: "Success" };
  if (key.includes("error") || key.includes("warning")) return { icon: "!", label: "Action Required", accent: "#f59e0b", glow: "#f59e0b33", state: "Needs review" };
  if (key.includes("gift") || key.includes("reward") || key.includes("coins")) return { icon: "R", label: "Reward Drop", accent: "#ec4899", glow: "#ec489933", state: "Reward unlocked" };
  return { icon: "C", label: "CipherPool Signal", accent: "#00e5ff", glow: "#00e5ff33", state: "Notification" };
}

function buildHtml(opts: {
  username?: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string | null;
}): string {
  const { username, title, message, type, actionUrl } = opts;
  const visual = notificationVisual(type);
  const safeTitle = escapeHtml(title || "Nouvelle notification");
  const safeType = escapeHtml(type || "info");
  const safeMessage = lineBreaks(message || "");
  const safeUsername = username ? escapeHtml(username) : "";
  const safeActionUrl = safeUrl(actionUrl);
  const preheader = escapeHtml(`${visual.label}: ${title}`.slice(0, 140));
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
                        <tr>
                          <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td width="68" valign="top">
                                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                      <td align="center" width="58" height="58" bgcolor="#111b33" style="width:58px;height:58px;border-radius:18px;background:#111b33;border:1px solid #2d3d63;color:${visual.accent};font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;box-shadow:0 0 34px ${visual.glow};">${visual.icon}</td>
                                    </tr>
                                  </table>
                                </td>
                                <td valign="top">
                                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:${visual.accent};font-weight:900;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(visual.label)} / ${safeType}</div>
                                  <h1 class="cp-title" style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:38px;font-weight:900;color:#ffffff;letter-spacing:-0.2px;">${safeTitle}</h1>
                                </td>
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
                          <td style="padding:24px 26px 0 26px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td bgcolor="#0b1224" style="border-radius:999px;border:1px solid #263550;padding:7px 12px;color:#b9c6e4;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(visual.state)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:18px 26px 8px 26px;">
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
  const typeColors: Record<string, string> = {
    tournament:     "#7C3AED",
    achievement:    "#F59E0B",
    coins_received: "#10B981",
    announcement:   "#06B6D4",
    system:         "#818CF8",
    broadcast:      "#06B6D4",
    warning:        "#F97316",
    gift:           "#EC4899",
    season:         "#F59E0B",
    info:           "#60A5FA",
  };
  const accentColor = typeColors[type] ?? "#7C3AED";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0B1020;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1020;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#12182B;border-radius:20px 20px 0 0;border:1px solid rgba(255,255,255,0.07);border-bottom:none;padding:28px 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7C3AED,#4F46E5);display:flex;align-items:center;justify-content:center;">
                      <span style="color:white;font-size:16px;">⚡</span>
                    </div>
                    <span style="font-family:'Segoe UI',Arial,sans-serif;font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.5px;">CIPHER<span style="color:#A78BFA;">POOL</span></span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Accent line -->
        <tr>
          <td style="background:linear-gradient(to right,${accentColor},#06B6D4,${accentColor});height:2px;"></td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#12182B;border:1px solid rgba(255,255,255,0.07);border-top:none;border-bottom:none;padding:36px 36px 28px;">

            ${username ? `<p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 6px;">Bonjour <strong style="color:rgba(255,255,255,0.8);">${username}</strong>,</p>` : ''}

            <!-- Notification card -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid ${accentColor}30;border-radius:16px;padding:24px;margin:16px 0 24px;">
              <div style="display:inline-block;background:${accentColor}18;border:1px solid ${accentColor}35;border-radius:8px;padding:3px 10px;font-size:10px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;">${type}</div>
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:900;color:#F8FAFC;line-height:1.2;">${title}</h1>
              <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.55);">${message}</p>
            </div>

            ${actionUrl ? `
            <div style="text-align:center;margin-top:8px;">
              <a href="${actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;text-decoration:none;font-size:13px;font-weight:800;padding:13px 32px;border-radius:12px;letter-spacing:0.5px;text-transform:uppercase;">
                Voir la notification →
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0D1428;border:1px solid rgba(255,255,255,0.07);border-top:none;border-radius:0 0 20px 20px;padding:20px 36px;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.6;">
              Tu reçois cet email car tu as activé les notifications email sur CipherPool.<br/>
              <a href="https://cipherpool.gg/notifications" style="color:rgba(167,139,250,0.6);text-decoration:none;">Gérer mes préférences</a>
              &nbsp;·&nbsp;
              <a href="https://cipherpool.gg" style="color:rgba(167,139,250,0.6);text-decoration:none;">cipherpool.gg</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  */
}

/* ── Send via Resend ─────────────────────────────────────────────── */
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ── Handler ─────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { notification_id?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { notification_id } = body;
  if (!notification_id) return json({ error: "notification_id required" }, 400);

  if (!SUPABASE_URL || !SUPABASE_SVC) return json({ error: "Supabase env vars missing" }, 500);

  const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* Fetch notification + user profile + email preferences in parallel */
  const [{ data: notif, error: notifErr }, ] = await Promise.all([
    svc.from("notifications").select("id, user_id, type, title, message, action_url").eq("id", notification_id).maybeSingle(),
  ]);

  if (notifErr) return json({ error: "DB error", detail: notifErr.message }, 500);
  if (!notif)  return json({ error: "Notification not found" }, 404);

  /* Check email preferences */
  const { data: prefs } = await svc
    .from("notification_preferences")
    .select("email_notifications")
    .eq("user_id", notif.user_id)
    .maybeSingle();

  if (!prefs?.email_notifications) {
    return json({ skipped: true, reason: "User has email_notifications disabled" });
  }

  /* Get user email */
  const { data: profile } = await svc
    .from("profiles")
    .select("username, email")
    .eq("id", notif.user_id)
    .maybeSingle();

  const email = profile?.email;
  if (!email) return json({ skipped: true, reason: "No email on profile" });

  /* Build and send */
  const html    = buildHtml({ username: profile?.username ?? undefined, title: notif.title ?? "Nouvelle notification", message: notif.message ?? "", type: notif.type ?? "info", actionUrl: notif.action_url });
  const subject = `🔔 ${notif.title ?? "Nouvelle notification"} — CipherPool`;
  const result  = await sendEmail(email, subject, html);

  /* Log result */
  await svc.from("notification_email_logs").insert({
    notification_id,
    user_id: notif.user_id,
    email,
    status: result.ok ? "sent" : "failed",
    error_message: result.ok ? null : result.error,
    sent_at: result.ok ? new Date().toISOString() : null,
  }).then(() => {}).catch(() => {});

  return json({ success: result.ok, email, error: result.error ?? null });
});
