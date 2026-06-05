import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { ShieldOff, Clock, LogOut, Mail } from "lucide-react";

const C = {
  bg: "#06080f", surface: "#0a0e1a", border: "rgba(255,255,255,0.07)",
  red: "#ef4444", amber: "#f59e0b", text: "#f1f5f9", text2: "rgba(255,255,255,0.45)", text3: "rgba(255,255,255,0.2)",
};

const CONFIGS = {
  banned: {
    icon: ShieldOff,
    color: C.red,
    title: "Account Permanently Banned",
    subtitle: "Your account has been permanently removed from CipherPool.",
    message: "This decision is final. If you believe this is an error, contact support.",
    emoji: "🚫",
  },
  pending_reapproval: {
    icon: Clock,
    color: C.amber,
    title: "Account Pending Review",
    subtitle: "Your account is awaiting approval from an administrator.",
    message: "A previously deleted account with this email is requesting access. An admin will review your request shortly.",
    emoji: "⏳",
  },
};

export default function AccountRestricted() {
  const navigate  = useNavigate();
  const [status, setStatus] = useState("banned");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s && CONFIGS[s]) setStatus(s);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const cfg = CONFIGS[status] || CONFIGS.banned;
  const Icon = cfg.icon;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${cfg.color}08, transparent 70%)`,
        pointerEvents: "none", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%", maxWidth: 460,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: 40, textAlign: "center",
          position: "relative", overflow: "hidden",
          boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.color}15`,
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
          background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
          borderRadius: "0 0 4px 4px",
        }} />

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
          background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 32px ${cfg.color}20`,
        }}>
          <Icon size={28} color={cfg.color} />
        </div>

        {/* Logo */}
        <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>
          CIPHERPOOL
        </div>

        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: -0.3 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
          {cfg.subtitle}
        </div>

        <div style={{
          padding: "14px 18px", borderRadius: 12, marginBottom: 28,
          background: `${cfg.color}08`, border: `1px solid ${cfg.color}20`,
          fontSize: 12, color: C.text2, lineHeight: 1.7,
        }}>
          {cfg.message}
        </div>

        {/* Status badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, marginBottom: 28,
          background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {status === "banned" ? "Permanently Banned" : "Pending Admin Review"}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%", padding: "12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: `${cfg.color}15`, color: cfg.color,
              fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}25`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}15`; }}
          >
            <LogOut size={14} /> Sign Out
          </button>

          {status === "pending_reapproval" && (
            <a
              href="mailto:support@cipherpool.gg"
              style={{
                padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`,
                color: C.text2, fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
            >
              <Mail size={14} /> Contact Support
            </a>
          )}
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: C.text3 }}>
          CipherPool Security System · Account ID: {window.location.search.includes("uid=") ? new URLSearchParams(window.location.search).get("uid")?.slice(0, 8) + "…" : "N/A"}
        </div>
      </motion.div>
    </div>
  );
}
