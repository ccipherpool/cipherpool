// CipherPool — Edge Function: send-email-broadcast
// Safe server-side email via Resend. API key never reaches the browser.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — Resend API key (re_...)
//   FROM_EMAIL       — sender, e.g. "CipherPool <noreply@cipherpool.gg>"
//
// Auto-injected by Supabase (do NOT set these manually):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── Env ─────────────────────────────────────────────────────────── */
const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY")          ?? "";
const FROM_EMAIL      = Deno.env.get("FROM_EMAIL")              ?? "CipherPool <noreply@cipherpool.gg>";
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")            ?? "";
const SUPABASE_ANON   = Deno.env.get("SUPABASE_ANON_KEY")       ?? "";
const SUPABASE_SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BATCH_SIZE    = 50;
const RATE_DELAY_MS = 400;

/* ── CORS headers — must be on EVERY response ─────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ── Response helpers ─────────────────────────────────────────────── */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/* ── Supabase client factories ────────────────────────────────────── */
// User-scoped client — validates the caller's JWT without DB privileges
function makeUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
    auth:   { autoRefreshToken: false, persistSession: false },
  });
}

// Service-role client — bypasses RLS, used only after role is confirmed
function makeServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ── Email template ───────────────────────────────────────────────── */
function buildHtml(p: {
  title: string; message: string; type: string; priority: string;
  actionUrl?: string | null; imageUrl?: string | null; icon?: string | null; username?: string;
}): string {
  const colors: Record<string, string> = {
    announcement: "#06b6d4", warning: "#f59e0b", achievement: "#f59e0b",
    gift: "#ec4899", system: "#6366f1", update: "#6366f1", season: "#f59e0b", broadcast: "#06b6d4",
  };
  const accent = colors[p.type] ?? "#8b5cf6";

  const priorityBadge = p.priority === "urgent"
    ? `<span style="display:inline-block;background:#ef444420;color:#ef4444;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">URGENT</span>`
    : p.priority === "high"
    ? `<span style="display:inline-block;background:#f59e0b20;color:#f59e0b;font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;">HIGH</span>`
    : "";

  const greeting  = p.username ? `Hey <strong style="color:#f4f4f5;">${p.username}</strong>,` : "Hey there,";
  const imgBlock  = p.imageUrl  ? `<img src="${p.imageUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:20px;display:block;" />` : "";
  const ctaBlock  = p.actionUrl
    ? `<div style="text-align:center;margin-top:28px;"><a href="${p.actionUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,${accent},#6366f1);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;letter-spacing:0.05em;">Open in CipherPool →</a></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${p.title}</title>
</head>
<body style="margin:0;padding:0;background:#08091c;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#08091c;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
<!-- Logo -->
<tr><td style="padding:0 0 24px;text-align:center;">
  <div style="font-size:26px;font-weight:900;color:#06b6d4;letter-spacing:-0.5px;">⚡ CIPHERPOOL</div>
  <div style="font-size:11px;color:#52525b;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Gaming Platform</div>
</td></tr>
<!-- Card -->
<tr><td style="background:linear-gradient(160deg,#0d1220,#111928);border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden;">
  <div style="height:3px;background:linear-gradient(90deg,${accent},#6366f1,${accent});"></div>
  <div style="padding:32px 36px;">
    ${imgBlock}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      ${p.icon ? `<span style="font-size:32px;line-height:1;">${p.icon}</span>` : ""}
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:900;color:#f4f4f5;line-height:1.2;">${p.title}${priorityBadge}</h1>
        <div style="font-size:11px;color:${accent};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">${p.type}</div>
      </div>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#a1a1aa;line-height:1.6;">${greeting}</p>
    <p style="margin:0;font-size:15px;color:#d4d4d8;line-height:1.75;white-space:pre-wrap;">${p.message}</p>
    ${ctaBlock}
  </div>
</td></tr>
<!-- Footer -->
<tr><td style="padding:24px 0 0;text-align:center;">
  <p style="margin:0 0 8px;font-size:11px;color:#3f3f46;">You received this because you are a CipherPool member.</p>
  <p style="margin:0;font-size:11px;color:#3f3f46;">
    Manage your <a href="https://cipherpool.gg/notifications" style="color:#6366f1;text-decoration:none;">notification preferences</a>
    · <a href="https://cipherpool.gg" style="color:#6366f1;text-decoration:none;">cipherpool.gg</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ── Resend sender ────────────────────────────────────────────────── */
async function sendViaResend(
  to: string, subject: string, html: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY secret is not set in Edge Function secrets" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (res.ok) return { ok: true };
  const errBody = await res.text();
  return { ok: false, error: `Resend HTTP ${res.status}: ${errBody}` };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ── Main handler ─────────────────────────────────────────────────── */
serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // ── Step 1: Authorization header ──────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({
      error: "Missing Authorization header",
      hint:  "Supabase JS sends this automatically when you call supabase.functions.invoke(). Ensure the user is signed in.",
    }, 401);
  }

  // ── Step 2: Verify JWT — get the caller's user record ─────────────
  const userClient = makeUserClient(authHeader);
  const { data: authData, error: authErr } = await userClient.auth.getUser();

  if (authErr) {
    return json({
      error:  "JWT validation failed",
      detail: authErr.message,
      hint:   "The access token may be expired — call supabase.auth.refreshSession() and retry.",
    }, 401);
  }
  if (!authData?.user) {
    return json({ error: "No user found in JWT — the token may be malformed or expired." }, 401);
  }

  const callerId = authData.user.id;
  const callerEmail = authData.user.email ?? "";

  // ── Step 3: Fetch profile role using service-role (bypasses RLS) ───
  const svc = makeServiceClient();

  const { data: profile, error: profileErr } = await svc
    .from("profiles")
    .select("id, role, username")
    .eq("id", callerId)
    .maybeSingle(); // maybeSingle returns null without error if not found

  if (profileErr) {
    return json({
      error:  "Failed to fetch caller profile from database",
      detail: profileErr.message,
    }, 500);
  }
  if (!profile) {
    return json({
      error: `No profile row found for user id ${callerId}. Ensure a row exists in the public.profiles table.`,
    }, 403);
  }

  // ── Step 4: Role check ────────────────────────────────────────────
  const EMAIL_ALLOWED_ROLES = ["super_admin", "founder"];
  if (!EMAIL_ALLOWED_ROLES.includes(profile.role)) {
    return json({
      error:       "Forbidden — email broadcasts require super_admin or founder role",
      your_role:   profile.role,
      your_id:     callerId,
      allowed:     EMAIL_ALLOWED_ROLES,
      hint:        profile.role === "admin"
        ? "Regular admins can send in-app notifications but not email broadcasts. Ask a founder to promote your account."
        : "Your account does not have the required role.",
    }, 403);
  }

  // ── Step 5: Parse request body ─────────────────────────────────────
  let body: { broadcast_id?: string; test_email?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON in request body" }, 400);
  }

  const { broadcast_id, test_email } = body;

  /* ────────────────────────────────────────────────────────────────
     TEST EMAIL MODE
     Sends a sample email to the caller's own address to verify Resend.
  ──────────────────────────────────────────────────────────────── */
  if (test_email) {
    if (!callerEmail) {
      return json({ error: "Your account has no email address on record." }, 400);
    }

    if (!RESEND_API_KEY) {
      return json({
        error: "RESEND_API_KEY is not configured",
        hint:  "Go to Supabase Dashboard → Edge Functions → send-email-broadcast → Secrets, and add RESEND_API_KEY.",
      }, 500);
    }

    const html = buildHtml({
      title:     "Test Notification — CipherPool",
      message:   "This is a test email from your CipherPool admin panel.\n\nIf you received this, your email delivery is working correctly! 🎉\n\nYou can now send email broadcasts to your users.",
      type:      "system",
      priority:  "normal",
      actionUrl: "https://cipherpool.gg",
      username:  profile.username ?? undefined,
    });

    const result = await sendViaResend(callerEmail, "✅ CipherPool — Email Delivery Test", html);

    return json({
      success:   result.ok,
      email:     callerEmail,
      error:     result.error ?? null,
      role:      profile.role,
    });
  }

  /* ────────────────────────────────────────────────────────────────
     BROADCAST MODE
  ──────────────────────────────────────────────────────────────── */
  if (!broadcast_id) {
    return json({ error: "broadcast_id is required in request body" }, 400);
  }

  // Fetch broadcast record
  const { data: broadcast, error: broadcastErr } = await svc
    .from("notification_broadcasts")
    .select("*")
    .eq("id", broadcast_id)
    .maybeSingle();

  if (broadcastErr) {
    return json({ error: "Failed to fetch broadcast", detail: broadcastErr.message }, 500);
  }
  if (!broadcast) {
    return json({ error: `Broadcast not found: ${broadcast_id}` }, 404);
  }
  if (!broadcast.send_email) {
    return json({ error: "This broadcast was created with send_email = false." }, 400);
  }

  // Get target recipients (RPC handles targeting logic + email opt-out filtering)
  const { data: recipients, error: recipErr } = await svc.rpc("get_broadcast_email_recipients", {
    p_broadcast_id: broadcast_id,
  });

  if (recipErr) {
    return json({ error: "Failed to get email recipients", detail: recipErr.message }, 500);
  }
  if (!recipients || recipients.length === 0) {
    // Update broadcast status and return gracefully
    await svc.from("notification_broadcasts")
      .update({ email_status: "sent", email_sent_count: 0 })
      .eq("id", broadcast_id);
    return json({ success: true, sent: 0, failed: 0, total: 0, note: "No eligible recipients (all opted out or no emails on file)." });
  }

  const subject = broadcast.email_subject || broadcast.title;

  // Mark as sending
  await svc.from("notification_broadcasts")
    .update({ email_status: "sending" })
    .eq("id", broadcast_id);

  let sentCount   = 0;
  let failedCount = 0;

  // Send in batches with rate-limiting
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = (recipients as Array<{ user_id: string; email: string; username: string }>)
      .slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const html = buildHtml({
          title:     broadcast.title,
          message:   broadcast.message,
          type:      broadcast.type,
          priority:  broadcast.priority,
          actionUrl: broadcast.action_url ?? null,
          imageUrl:  broadcast.image_url  ?? null,
          icon:      broadcast.icon       ?? null,
          username:  r.username,
        });

        const result = await sendViaResend(r.email, subject, html);

        // Log per-user delivery result (fire and forget)
        svc.from("notification_email_logs").insert({
          broadcast_id,
          user_id:       r.user_id,
          email:         r.email,
          status:        result.ok ? "sent" : "failed",
          error_message: result.ok ? null : result.error,
          sent_at:       result.ok ? new Date().toISOString() : null,
        }).then(() => {/* ignore */}).catch(() => {/* ignore */});

        return result;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sentCount++;
      else failedCount++;
    }

    // Rate-limit between batches
    if (i + BATCH_SIZE < recipients.length) await delay(RATE_DELAY_MS);
  }

  // Final status update
  const finalStatus = failedCount === 0
    ? "sent"
    : sentCount === 0
    ? "failed"
    : "partial";

  await svc.from("notification_broadcasts").update({
    email_status:       finalStatus,
    email_sent_count:   sentCount,
    email_failed_count: failedCount,
  }).eq("id", broadcast_id);

  return json({
    success: sentCount > 0,
    sent:    sentCount,
    failed:  failedCount,
    total:   recipients.length,
    status:  finalStatus,
  });
});
