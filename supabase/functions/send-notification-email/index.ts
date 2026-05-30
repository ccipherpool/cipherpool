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
function buildHtml(opts: {
  username?: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string | null;
}): string {
  const { username, title, message, type, actionUrl } = opts;

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
