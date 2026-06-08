import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldOff, Clock, LogOut, Mail, RefreshCw } from "lucide-react";

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
  },
  pending_reapproval: {
    icon: Clock,
    color: C.amber,
    title: "Account Pending Review",
    subtitle: "Your account is awaiting approval from an administrator.",
    message: "A previously deleted account with this email is requesting access. Once an admin approves, you'll be redirected automatically — or click \"Check Status\" below.",
  },
};

export default function AccountRestricted() {
  const navigate                          = useNavigate();
  const { accountStatus, refreshCurrentUser } = useAuth();

  const [pageStatus, setPageStatus] = useState("pending_reapproval");
  const [checking,   setChecking]   = useState(false);
  const [approved,   setApproved]   = useState(false);
  const [lastCheck,  setLastCheck]  = useState(null);
  const didApprove                  = useRef(false);

  // Read ?status= from URL on mount
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s && CONFIGS[s]) setPageStatus(s);
  }, []);

  // ── Auto-redirect when AuthContext heals via realtime ─────────────
  // When admin approves and Supabase realtime fires, refreshCurrentUser
  // updates accountStatus to 'active'. We watch it here and redirect.
  useEffect(() => {
    if (didApprove.current) return;
    if (pageStatus === "pending_reapproval" && accountStatus === "active") {
      triggerApproved();
    }
  }, [accountStatus, pageStatus]);

  const triggerApproved = () => {
    if (didApprove.current) return;
    didApprove.current = true;
    setApproved(true);
    setTimeout(() => navigate("/dashboard", { replace: true }), 1400);
  };

  // ── Manual / polling check ────────────────────────────────────────
  const checkApprovalStatus = useCallback(async (silent = false) => {
    if (didApprove.current || pageStatus !== "pending_reapproval") return;
    if (!silent) setChecking(true);
    try {
      // 1. Call heal RPC — heals profile in DB if an approved request exists
      const { data } = await supabase.rpc("check_and_heal_reapproval");
      setLastCheck(new Date());

      const wasHealed   = !!data?.healed;    // profile just updated to active
      const isApproved  = !!data?.approved;  // approved request exists

      if (wasHealed || isApproved) {
        // Either just healed, or profile was already active — refresh context and redirect
        await refreshCurrentUser?.();
        triggerApproved();
      }
    } catch (err) {
      console.error("[AccountRestricted] check error:", err);
    } finally {
      if (!silent) setChecking(false);
    }
  }, [pageStatus, refreshCurrentUser]);

  // Auto-check every 30 s for pending accounts (silent — background polling)
  useEffect(() => {
    if (pageStatus !== "pending_reapproval") return;
    checkApprovalStatus(true); // immediate check on mount
    const id = setInterval(() => checkApprovalStatus(true), 30_000);
    return () => clearInterval(id);
  }, [pageStatus, checkApprovalStatus]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const cfg  = CONFIGS[pageStatus] || CONFIGS.pending_reapproval;
  const Icon = cfg.icon;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${approved ? C.green : cfg.color}08, transparent 70%)`,
        pointerEvents: "none", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", transition: "background 0.6s",
      }} />

      <AnimatePresence mode="wait">

        {/* ── Approved / redirecting ── */}
        {approved && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center" }}
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ fontSize: 64, marginBottom: 20 }}
            >
              🎉
            </motion.div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              Account Approved!
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginBottom: 22 }}>
              Redirecting you to the dashboard…
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", maxWidth: 240, margin: "0 auto" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: "100%" }}
                transition={{ duration: 1.3, ease: "linear" }}
                style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.green}, #06b6d4)` }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Blocked ── */}
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
            {/* Top accent */}
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
              padding: "6px 14px", borderRadius: 20, marginBottom: pageStatus === "pending_reapproval" ? 8 : 24,
              background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
                animation: pageStatus === "pending_reapproval" ? "ar-pulse 2s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {pageStatus === "banned" ? "Permanently Banned" : "Pending Admin Review"}
              </span>
            </div>

            {/* Auto-check timestamp — pending only */}
            {pageStatus === "pending_reapproval" && (
              <div style={{ fontSize: 10, color: C.text3, marginBottom: 20 }}>
                {lastCheck
                  ? `Last checked ${lastCheck.toLocaleTimeString()} · auto-checks every 30 s`
                  : "Checking approval status…"}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>

              {/* Check Status — pending only */}
              {pageStatus === "pending_reapproval" && (
                <button
                  onClick={() => checkApprovalStatus(false)}
                  disabled={checking}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 10, border: "none",
                    cursor: checking ? "wait" : "pointer",
                    background: checking ? `${C.green}0d` : `${C.green}18`,
                    color: checking ? `rgba(16,185,129,0.4)` : C.green,
                    fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!checking) e.currentTarget.style.background = `${C.green}28`; }}
                  onMouseLeave={e => { if (!checking) e.currentTarget.style.background = `${C.green}18`; }}
                >
                  {checking
                    ? <><div style={{ width: 14, height: 14, border: `2px solid rgba(16,185,129,0.2)`, borderTopColor: C.green, borderRadius: "50%", animation: "ar-spin 0.7s linear infinite" }} /> Checking…</>
                    : <><RefreshCw size={14} /> Check Approval Status</>}
                </button>
              )}

              <button
                onClick={handleSignOut}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  cursor: "pointer",
                  background: `${cfg.color}15`, color: cfg.color,
                  fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}28`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}15`; }}
              >
                <LogOut size={14} /> Sign Out
              </button>

              {pageStatus === "pending_reapproval" && (
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
              CipherPool Security System · Checks every 30 s automatically
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
