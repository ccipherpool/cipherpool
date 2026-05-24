// CipherPool — Edge Function: send-email-broadcast
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — Resend API key (re_...)
//   FROM_EMAIL       — sender address e.g. "CipherPool <noreply@cipherpool.gg>"
//
// Auto-injected by Supabase runtime (do NOT set manually):
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

const BATCH_SIZE    = 50;
const RATE_DELAY_MS = 400;

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

/* ── Email HTML template ─────────────────────────────────────────── */
function buildHtml(p: {
  title: string; message: string; type: string; priority: string;
  actionUrl?: string | null; imageUrl?: string | null;
  icon?: string | null; username?: string;
}): string {
  const colors: Record<string, string> = {
    announcement: "#06b6d4", warning: "#f59e0b", achievement: "#f59e0b",
    gift: "#ec4899", system: "#6366f1", update: "#6366f1",
    season: "#f59e0b", broadcast: "#06b6d4",
  };
  const accent = colors[p.type] ?? "#8b5cf6";
  const greeting = p.username
    ? `Hey <strong style="color:#f4f4f5;">${p.username}</strong>,`
    : "Hey there,";
  const imgBlock = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:20px;display:block;"/>`
    : "";
  const ctaBlock = p.actionUrl
    ? `<div style="text-align:center;margin-top:28px;">
         <a href="${p.actionUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,${accent},#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;">
           Open in CipherPool →
         </a>
       </div>`
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
}

/* ── Resend sender ────────────────────────────────────────────────── */
async function sendViaResend(
  to: string, subject: string, html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY secret is not configured" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  return { ok: false, error: `Resend HTTP ${res.status}: ${body}` };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ── Main ─────────────────────────────────────────────────────────── */
serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  /* ── 1. Bearer token ──────────────────────────────────────────── */
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return json({
      error: "Missing Authorization Bearer token",
      hint:  "Pass headers: { Authorization: 'Bearer ' + session.access_token }",
      allowed: false,
    }, 401);
  }

  /* ── 2. Validate JWT ─────────────────────────────────────────── */
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authErr } = await userClient.auth.getUser();

  if (authErr || !authData?.user) {
    return json({
      error:   "JWT validation failed — token may be expired",
      detail:  authErr?.message ?? "getUser() returned no user",
      allowed: false,
    }, 401);
  }

  const userId    = authData.user.id;
  const userEmail = authData.user.email ?? "";

  /* ── 3. Fetch profile (service-role, bypasses RLS) ───────────── */
  const svc = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Primary lookup: by auth user UUID
  let profile: { id: string; email: string | null; role: string; username?: string | null } | null = null;
  let profileError: string | null = null;

  const { data: byId, error: errById } = await svc
    .from("profiles")
    .select("id, email, role, username")
    .eq("id", userId)
    .maybeSingle();

  if (errById) {
    profileError = errById.message;
  } else if (byId) {
    profile = byId;
  } else if (userEmail) {
    // Fallback: look up by email in case the UUID doesn't match
    const { data: byEmail, error: errByEmail } = await svc
      .from("profiles")
      .select("id, email, role, username")
      .eq("email", userEmail)
      .maybeSingle();

    if (errByEmail) {
      profileError = errByEmail.message;
    } else {
      profile = byEmail;
    }
  }

  // Always return full debug info so the caller can see exactly what happened
  const debugBase = {
    authenticated_user_id: userId,
    user_email:            userEmail,
    profile:               profile,
    profile_error:         profileError,
  };

  if (!profile) {
    return json({
      ...debugBase,
      error:   profileError
        ? `Database error while fetching profile: ${profileError}`
        : `No profile found for user id=${userId} email=${userEmail}`,
      allowed: false,
    }, profileError ? 500 : 403);
  }

  /* ── 4. Role check ───────────────────────────────────────────── */
  const profileRole = (profile.role ?? "") as string;
  const allowed     = ALLOWED_ROLES.includes(profileRole);

  if (!allowed) {
    return json({
      ...debugBase,
      error:         `Role '${profileRole}' is not permitted. Allowed: ${ALLOWED_ROLES.join(", ")}`,
      allowed:       false,
      allowed_roles: ALLOWED_ROLES,
    }, 403);
  }

  /* ── 5. Parse request body ───────────────────────────────────── */
  let body: { broadcast_id?: string; test_email?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const { broadcast_id, test_email } = body;

  const dbg = { ...debugBase, allowed: true, profile_role: profileRole };

  /* ── TEST EMAIL MODE ─────────────────────────────────────────── */
  if (test_email) {
    const sendTo = userEmail || (profile.email ?? "");
    if (!sendTo) {
      return json({ ...dbg, success: false, error: "No email address available for test." }, 400);
    }
    if (!RESEND_API_KEY) {
      return json({
        ...dbg, success: false,
        error: "RESEND_API_KEY secret is not set",
        hint:  "Supabase Dashboard → Edge Functions → send-email-broadcast → Secrets",
      }, 500);
    }

    const html   = buildHtml({
      title:     "Test Notification — CipherPool",
      message:   "This is a test email from your CipherPool admin panel.\n\nIf you received this, Resend is connected and email delivery is working! 🎉",
      type:      "system",
      priority:  "normal",
      actionUrl: "https://cipherpool.gg",
      username:  profile.username ?? undefined,
    });

    const result = await sendViaResend(sendTo, "✅ CipherPool — Email Delivery Test", html);

    return json({
      ...dbg,
      success: result.ok,
      email:   sendTo,
      error:   result.error ?? null,
    });
  }

  /* ── BROADCAST MODE ──────────────────────────────────────────── */
  if (!broadcast_id) {
    return json({ ...dbg, error: "broadcast_id is required in request body" }, 400);
  }

  const { data: broadcast, error: bcastErr } = await svc
    .from("notification_broadcasts")
    .select("*")
    .eq("id", broadcast_id)
    .maybeSingle();

  if (bcastErr) return json({ ...dbg, error: "DB error fetching broadcast", detail: bcastErr.message }, 500);
  if (!broadcast) return json({ ...dbg, error: `Broadcast not found: ${broadcast_id}` }, 404);
  if (!broadcast.send_email) {
    return json({ ...dbg, error: "Broadcast has send_email = false — nothing to send." }, 400);
  }

  const { data: recipients, error: recipErr } = await svc
    .rpc("get_broadcast_email_recipients", { p_broadcast_id: broadcast_id });

  if (recipErr) return json({ ...dbg, error: "Failed to get recipients", detail: recipErr.message }, 500);

  if (!recipients || (recipients as unknown[]).length === 0) {
    await svc.from("notification_broadcasts")
      .update({ email_status: "sent", email_sent_count: 0 })
      .eq("id", broadcast_id);
    return json({ ...dbg, success: true, sent: 0, failed: 0, total: 0, note: "No eligible recipients." });
  }

  const subject = (broadcast.email_subject || broadcast.title) as string;

  await svc.from("notification_broadcasts").update({ email_status: "sending" }).eq("id", broadcast_id);

  let sentCount = 0, failedCount = 0;

  for (let i = 0; i < (recipients as unknown[]).length; i += BATCH_SIZE) {
    const batch = (recipients as Array<{ user_id: string; email: string; username: string }>)
      .slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const html   = buildHtml({
          title:     broadcast.title as string,
          message:   broadcast.message as string,
          type:      broadcast.type as string,
          priority:  broadcast.priority as string,
          actionUrl: broadcast.action_url as string ?? null,
          imageUrl:  broadcast.image_url  as string ?? null,
          icon:      broadcast.icon       as string ?? null,
          username:  r.username,
        });
        const result = await sendViaResend(r.email, subject, html);

        svc.from("notification_email_logs").insert({
          broadcast_id,
          user_id:       r.user_id,
          email:         r.email,
          status:        result.ok ? "sent" : "failed",
          error_message: result.ok ? null : result.error,
          sent_at:       result.ok ? new Date().toISOString() : null,
        }).then(() => {}).catch(() => {});

        return result;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sentCount++;
      else failedCount++;
    }

    if (i + BATCH_SIZE < (recipients as unknown[]).length) await delay(RATE_DELAY_MS);
  }

  const finalStatus = failedCount === 0 ? "sent" : sentCount === 0 ? "failed" : "partial";

  await svc.from("notification_broadcasts").update({
    email_status:       finalStatus,
    email_sent_count:   sentCount,
    email_failed_count: failedCount,
  }).eq("id", broadcast_id);

  return json({
    ...dbg,
    success: sentCount > 0,
    sent:    sentCount,
    failed:  failedCount,
    total:   (recipients as unknown[]).length,
    status:  finalStatus,
  });
});
