// CipherPool — Edge Function: send-email-broadcast
// Triggered by frontend after a broadcast is created via RPC.
// Uses Resend to send emails server-side (API key never reaches the browser).
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY          — your Resend API key (re_...)
//   FROM_EMAIL              — sender address, e.g. "CipherPool <noreply@cipherpool.gg>"
//   SUPABASE_URL            — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
//   SUPABASE_ANON_KEY       — auto-injected by Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY       = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL           = Deno.env.get("FROM_EMAIL") ?? "CipherPool <noreply@cipherpool.gg>";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const BATCH_SIZE    = 50;   // emails per Resend batch (Resend supports up to 100)
const RATE_DELAY_MS = 500;  // ms between batches

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── Email HTML template ──────────────────────────────────────────── */
function buildEmailHtml(params: {
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  username?: string;
}): string {
  const { title, message, type, priority, actionUrl, imageUrl, icon, username } = params;

  const typeColors: Record<string, string> = {
    announcement: "#06b6d4",
    warning:      "#f59e0b",
    achievement:  "#f59e0b",
    gift:         "#ec4899",
    system:       "#6366f1",
    update:       "#6366f1",
    season:       "#f59e0b",
    broadcast:    "#06b6d4",
  };
  const accentColor = typeColors[type] ?? "#8b5cf6";

  const priorityBadge = priority === "urgent"
    ? `<span style="display:inline-block;background:#ef444420;color:#ef4444;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">URGENT</span>`
    : priority === "high"
    ? `<span style="display:inline-block;background:#f59e0b20;color:#f59e0b;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">HIGH</span>`
    : "";

  const greeting = username ? `Hey <strong style="color:#f4f4f5;">${username}</strong>,` : "Hey there,";

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:20px;display:block;" />`
    : "";

  const actionBlock = actionUrl
    ? `<div style="text-align:center;margin-top:28px;">
        <a href="${actionUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,${accentColor},#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;letter-spacing:0.05em;">
          Open in CipherPool →
        </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#08091c;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#08091c;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:26px;font-weight:900;letter-spacing:-0.5px;">
                ⚡ CIPHERPOOL
              </div>
              <div style="font-size:11px;color:#52525b;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Gaming Platform</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:linear-gradient(160deg,#0d1220,#111928);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:0;overflow:hidden;">

              <!-- Accent top bar -->
              <div style="height:3px;background:linear-gradient(90deg,${accentColor},#6366f1,${accentColor});"></div>

              <div style="padding:32px 36px;">
                ${imageBlock}

                <!-- Icon + Title -->
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                  ${icon ? `<span style="font-size:32px;line-height:1;">${icon}</span>` : ""}
                  <div>
                    <h1 style="margin:0;font-size:22px;font-weight:900;color:#f4f4f5;line-height:1.2;">
                      ${title}${priorityBadge}
                    </h1>
                    <div style="font-size:11px;color:${accentColor};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">${type}</div>
                  </div>
                </div>

                <!-- Greeting + Message -->
                <p style="margin:0 0 12px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">${greeting}</p>
                <p style="margin:0;font-size:15px;color:#d4d4d8;line-height:1.75;white-space:pre-wrap;">${message}</p>

                ${actionBlock}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:11px;color:#3f3f46;">
                You received this because you're a CipherPool member.
              </p>
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                Manage your
                <a href="https://cipherpool.gg/notifications" style="color:#6366f1;text-decoration:none;">notification preferences</a>
                · <a href="https://cipherpool.gg" style="color:#6366f1;text-decoration:none;">cipherpool.gg</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── Send a single email via Resend ───────────────────────────────── */
async function sendViaResend(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });

  if (res.ok) return { ok: true };
  const body = await res.text();
  return { ok: false, error: `Resend ${res.status}: ${body}` };
}

/* ── Delay helper ─────────────────────────────────────────────────── */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ── Main handler ─────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify caller auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user-scoped client to verify identity
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service-role client for privileged DB access
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Verify admin role
  const { data: profile } = await admin.from("profiles").select("role,username").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin", "founder"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Only super_admin / founder can send email broadcasts
  if (!["super_admin", "founder"].includes(profile.role)) {
    return new Response(JSON.stringify({ error: "Email broadcasts require super_admin or founder role" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { broadcast_id?: string; test_email?: boolean };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

  const { broadcast_id, test_email } = body;

  /* ── Test email mode ──────────────────────────────────────────── */
  if (test_email) {
    const { data: au } = await admin.from("auth.users").select("email").eq("id", user.id).single()
      .catch(() => ({ data: null }));

    // Use RPC-safe auth query
    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    const testEmailAddr = authUser?.user?.email;
    if (!testEmailAddr) {
      return new Response(JSON.stringify({ error: "Could not find admin email" }), { status: 400, headers: corsHeaders });
    }

    const html = buildEmailHtml({
      title:     "Test Notification — CipherPool",
      message:   "This is a test email from your CipherPool admin panel. If you received this, your email delivery is working correctly! 🎉",
      type:      "system",
      priority:  "normal",
      actionUrl: "https://cipherpool.gg",
      username:  profile.username ?? undefined,
    });

    const result = await sendViaResend(testEmailAddr, "CipherPool — Test Notification", html);
    return new Response(JSON.stringify({ success: result.ok, email: testEmailAddr, error: result.error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  /* ── Full broadcast email flow ────────────────────────────────── */
  if (!broadcast_id) {
    return new Response(JSON.stringify({ error: "broadcast_id required" }), { status: 400, headers: corsHeaders });
  }

  // Fetch broadcast
  const { data: broadcast } = await admin
    .from("notification_broadcasts")
    .select("*")
    .eq("id", broadcast_id)
    .single();

  if (!broadcast) {
    return new Response(JSON.stringify({ error: "Broadcast not found" }), { status: 404, headers: corsHeaders });
  }
  if (!broadcast.send_email) {
    return new Response(JSON.stringify({ error: "This broadcast has send_email=false" }), { status: 400, headers: corsHeaders });
  }

  // Get recipients via RPC (handles targeting + email opt-out)
  const { data: recipients, error: recipErr } = await admin.rpc("get_broadcast_email_recipients", {
    p_broadcast_id: broadcast_id,
  });

  if (recipErr || !recipients) {
    return new Response(JSON.stringify({ error: recipErr?.message ?? "Failed to get recipients" }), {
      status: 500, headers: corsHeaders,
    });
  }

  const html = buildEmailHtml({
    title:     broadcast.title,
    message:   broadcast.message,
    type:      broadcast.type,
    priority:  broadcast.priority,
    actionUrl: broadcast.action_url,
    imageUrl:  broadcast.image_url,
    icon:      broadcast.icon,
  });

  const subject = broadcast.email_subject || broadcast.title;

  // Update broadcast to 'sending' status
  await admin.from("notification_broadcasts").update({ email_status: "sending" }).eq("id", broadcast_id);

  let sentCount   = 0;
  let failedCount = 0;

  // Batch send
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (r: { user_id: string; email: string; username: string }) => {
        const personalHtml = buildEmailHtml({
          title:     broadcast.title,
          message:   broadcast.message,
          type:      broadcast.type,
          priority:  broadcast.priority,
          actionUrl: broadcast.action_url,
          imageUrl:  broadcast.image_url,
          icon:      broadcast.icon,
          username:  r.username,
        });

        const res = await sendViaResend(r.email, subject, personalHtml);

        // Log result
        await admin.from("notification_email_logs").insert({
          broadcast_id,
          user_id:       r.user_id,
          email:         r.email,
          status:        res.ok ? "sent" : "failed",
          error_message: res.ok ? null : res.error,
          sent_at:       res.ok ? new Date().toISOString() : null,
        });

        return res;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sentCount++;
      else failedCount++;
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < recipients.length) await delay(RATE_DELAY_MS);
  }

  // Update final counts on broadcast
  const finalStatus = failedCount === 0 ? "sent" : sentCount === 0 ? "failed" : "partial";
  await admin.from("notification_broadcasts").update({
    email_status:       finalStatus,
    email_sent_count:   sentCount,
    email_failed_count: failedCount,
  }).eq("id", broadcast_id);

  return new Response(
    JSON.stringify({ success: true, sent: sentCount, failed: failedCount, total: recipients.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
