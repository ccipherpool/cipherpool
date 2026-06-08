import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldOff, Clock, LogOut, Mail, RefreshCw, CheckCircle } from "lucide-react";

const C = {
  bg: "#06080f", surface: "#0a0e1a", border: "rgba(255,255,255,0.07)",
  red: "#ef4444", amber: "#f59e0b", green: "#10b981",
  text: "#f1f5f9", text2: "rgba(255,255,255,0.45)", text3: "rgba(255,255,255,0.2)",
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
    message: "A previously deleted account with this email is requesting access. An admin will review your request shortly. Once approved, click \"Check Status\" below — you'll be let in immediately.",
    emoji: "⏳",
  },
};

export default function AccountRestricted() {
  const navigate  = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [status,   setStatus]   = useState("pending_reapproval");
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s && CONFIGS[s]) setStatus(s);
  }, []);

  // Check if admin approved the request — calls the heal RPC
  const checkApprovalStatus = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_and_heal_reapproval");
      setLastCheck(new Date());

      if (error) {
        console.error("[AccountRestricted] heal RPC error:", error);
        return;
      }

      if (data?.healed) {
        // Profile updated in DB — refresh context and navigate
        setApproved(true);
        await refreshCurrentUser?.();
        setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  }, [navigate, refreshCurrentUser]);

  // Auto-check every 30 s for pending_reapproval accounts
  useEffect(() => {
    if (status !== "pending_reapproval") return;

    // Check immediately on mount (silent)
    checkApprovalStatus(true);

    const interval = setInterval(() => checkApprovalStatus(true), 30_000);
    return () => clearInterval(interval);
  }, [status, checkApprovalStatus]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const cfg  = CONFIGS[status] || CONFIGS.pending_reapproval;
  const Icon = cfg.icon;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${approved ? C.green : cfg.color}08, transparent 70%)`,
        pointerEvents: "none", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        transition: "background 0.5s",
      }} />

      <AnimatePresence mode="wait">

        {/* ── Approved state ── */}
        {approved && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center" }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ fontSize: 64, marginBottom: 16 }}
            >
              🎉
            </motion.div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
              Account Approved!
            </h2>
            <p style={{ fontSize: 13, color: C.text2, margin: "0 0 20px" }}>
              Redirecting you to the dashboard…
            </p>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", maxWidth: 240, margin: "0 auto" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: "100%" }}
                transition={{ duration: 1.1, ease: "linear" }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${C.green}, #06b6d4)`, borderRadius: 2 }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Blocked state ── */}
        {!approved && (
          <motion.div
            key="blocked"
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
              padding: "14px 18px", borderRadius: 12, marginBottom: 20,
              background: `${cfg.color}08`, border: `1px solid ${cfg.color}20`,
              fontSize: 12, color: C.text2, lineHeight: 1.7, textAlign: "left",
            }}>
              {cfg.message}
            </div>

            {/* Status badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, marginBottom: 24,
              background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`, animation: status === "pending_reapproval" ? "ar-pulse 2s ease-in-out infinite" : "none" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {status === "banned" ? "Permanently Banned" : "Pending Admin Review"}
              </span>
            </div>

            {/* Auto-check timestamp */}
            {status === "pending_reapproval" && lastCheck && (
              <div style={{ fontSize: 10, color: C.text3, marginBottom: 16 }}>
                Last checked: {lastCheck.toLocaleTimeString()} · auto-checks every 30s
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>

              {/* Check Status — only for pending_reapproval */}
              {status === "pending_reapproval" && (
                <button
                  onClick={() => checkApprovalStatus(false)}
                  disabled={checking}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: checking ? "wait" : "pointer",
                    background: checking ? `${C.green}10` : `${C.green}18`,
                    color: checking ? `${C.green}70` : C.green,
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                >
                  {checking
                    ? <><div style={{ width: 14, height: 14, border: `2px solid ${C.green}30`, borderTopColor: C.green, borderRadius: "50%", animation: "ar-spin 0.7s linear infinite" }} /> Checking…</>
                    : <><RefreshCw size={14} /> Check Approval Status</>
                  }
                </button>
              )}

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
              CipherPool Security System · Auto-checks for approval every 30s
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        @keyframes ar-spin  { to { transform: rotate(360deg); } }
        @keyframes ar-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
