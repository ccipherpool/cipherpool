import { supabase } from "./supabase";

export async function sendWhatsApp({ phone, message }) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/send-whatsapp-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });
  return res.json();
}
