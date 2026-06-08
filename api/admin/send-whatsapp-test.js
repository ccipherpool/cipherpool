import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // Verify JWT
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  // Role guard — super_admin only
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin only" });
  }

  const { phone, message } = req.body ?? {};
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  try {
    const msg = await client.messages.create({
      from: `whatsapp:${from}`,
      to:   `whatsapp:${phone}`,
      body: message,
    });
    return res.status(200).json({ success: true, sid: msg.sid });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
