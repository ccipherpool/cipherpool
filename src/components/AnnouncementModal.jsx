import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "cp_dismissed_announcements";

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function addDismissed(id) {
  const list = getDismissed();
  if (!list.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
  }
}

const TYPE_ICONS = {
  announcement: "📢",
  update:       "🔄",
  warning:      "⚠️",
  tournament:   "🏆",
};

export default function AnnouncementModal() {
  const [queue, setQueue]   = useState([]);   // array of unread announcements
  const [current, setCurrent] = useState(0);  // index in queue
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_messages")
        .select("*")
        .eq("is_global", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data?.length) return;
      const dismissed = getDismissed();
      const unseen = data.filter(m => !dismissed.includes(m.id));
      if (unseen.length > 0) {
        setQueue(unseen);
        setCurrent(0);
        setVisible(true);
      }
    };
    const t = setTimeout(load, 800); // slight delay so layout renders first
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    const msg = queue[current];
    if (msg) addDismissed(msg.id);
    if (current + 1 < queue.length) {
      setCurrent(c => c + 1);
    } else {
      setVisible(false);
    }
  };

  const msg = queue[current];
  if (!msg) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(16px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{
              width: "100%", maxWidth: 480,
              background: "linear-gradient(135deg,rgba(12,12,28,0.98),rgba(18,18,42,0.98))",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.08)",
            }}
          >
            {/* Accent line */}
            <div style={{ height: 3, background: "linear-gradient(90deg,#4f46e5,#818cf8,#a78bfa)" }} />

            <div style={{ padding: "32px 32px 28px" }}>
              {/* Icon + counter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>
                  {TYPE_ICONS[msg.type] || "📢"}
                </div>
                {queue.length > 1 && (
                  <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
                    {current + 1} / {queue.length}
                  </span>
                )}
              </div>

              {/* Badge */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: 2.5, color: "#818cf8", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", padding: "4px 12px", borderRadius: 20 }}>
                  📢 ANNONCE OFFICIELLE
                </span>
              </div>

              {/* Title */}
              <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.3 }}>
                {msg.title}
              </h2>

              {/* Content */}
              <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 8px" }}>
                {msg.content}
              </p>

              {/* Date */}
              <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 28, letterSpacing: 0.5 }}>
                {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>

              {/* OK button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={dismiss}
                style={{
                  width: "100%", padding: "14px 0",
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#4f46e5,#818cf8)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "JetBrains Mono,monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(79,70,229,0.4)",
                }}
              >
                {current + 1 < queue.length ? "SUIVANT →" : "✓ OK, J'AI LU"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
