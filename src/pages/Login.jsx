import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ── Design tokens ─────────────────────────────────────────────────────────────
const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const BG     = "#020617";

// ── Hex grid background ───────────────────────────────────────────────────────
function CyberBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Deep gradient base */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 20% 50%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 50%, rgba(0,212,255,0.08) 0%, transparent 60%)` }} />
      {/* Animated orbs */}
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)", filter: "blur(40px)" }} />
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ position: "absolute", bottom: "10%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.12), transparent 70%)", filter: "blur(40px)" }} />
      {/* Scanlines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)", pointerEvents: "none" }} />
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
    </div>
  );
}

// ── Neon input ─────────────────────────────────────────────────────────────────
function NeonInput({ label, icon, type, placeholder, value, onChange, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: focused ? CYAN : "rgba(255,255,255,0.25)", letterSpacing: 3, marginBottom: 8, transition: "color 0.2s", fontFamily: "monospace" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focused ? CYAN : "rgba(255,255,255,0.2)", transition: "color 0.2s", pointerEvents: "none" }}>{icon}</div>
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange} required
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "13px 44px 13px 42px", borderRadius: 12, fontSize: 14, color: "#fff",
            background: "rgba(0,212,255,0.03)", outline: "none", boxSizing: "border-box",
            border: `1px solid ${focused ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: focused ? `0 0 0 3px rgba(0,212,255,0.07), 0 0 20px rgba(0,212,255,0.08)` : "none",
            transition: "all 0.25s",
          }}
        />
        {right && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>{right}</div>}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Email not confirmed") || msg.includes("not confirmed")) setError("📧 Confirme ton email d'abord — vérifie ta boîte mail (et les spams).");
      else if (msg.includes("Invalid login") || msg.includes("invalid credentials") || msg.includes("Invalid credentials")) setError("Email ou mot de passe incorrect.");
      else if (msg.includes("rate limit") || msg.includes("too many")) setError("Trop de tentatives. Attends quelques minutes.");
      else setError(msg || "Erreur de connexion.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", overflow: "hidden", position: "relative", fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        ::placeholder { color: rgba(255,255,255,0.15) !important; }
        @keyframes pulse-dot { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes scan { 0%{top:0} 100%{top:100%} }
      `}</style>

      <CyberBg />

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div style={{ display: "none", position: "relative", zIndex: 10, flex: "0 0 52%", flexDirection: "column", justifyContent: "center", padding: "64px 72px" }}
        className="login-left">
        <style>{`.login-left{display:none}@media(min-width:900px){.login-left{display:flex!important;flex-direction:column!important}}`}</style>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 64 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "Orbitron,sans-serif", boxShadow: `0 0 24px rgba(139,92,246,0.5)` }}>CP</div>
          <span style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 4, color: "#fff" }}>CIPHERPOOL</span>
        </motion.div>

        {/* Main headline */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 4, color: CYAN, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: CYAN, display: "inline-block", animation: "pulse-dot 2s infinite" }} />
            ARÈNE FREE FIRE MAROC
          </p>
          <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1, color: "#fff", marginBottom: 20 }}>
            RETOUR AU<br />
            <span style={{ background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>COMBAT.</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 380 }}>
            Rejoins les meilleurs joueurs Free Fire du Maroc. Compétis, grimpe le classement et décroche la gloire.
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 48 }}>
          {[
            { val: "10K+", label: "Joueurs actifs", icon: "👥", c: CYAN   },
            { val: "500+", label: "Tournois joués",  icon: "🏆", c: VIOLET },
            { val: "24/7", label: "Serveurs actifs", icon: "⚡", c: "#10b981" },
            { val: "100%", label: "Free Fire Only",  icon: "🎮", c: "#f97316" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.05 }}
              style={{ padding: "18px 20px", borderRadius: 14, background: `rgba(255,255,255,0.02)`, border: `1px solid rgba(255,255,255,0.07)`, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div>
                <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 18, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{s.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Telegram */}
        <motion.a href="https://t.me/cipherpool" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 12, background: "rgba(0,136,204,0.1)", border: "1px solid rgba(0,136,204,0.25)", color: "#39b0e3", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.2s", width: "fit-content" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,136,204,0.18)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(0,136,204,0.1)"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
          Rejoindre la communauté Telegram
        </motion.a>
      </div>

      {/* ── RIGHT PANEL (FORM) ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative", zIndex: 10 }}>

        {/* Mobile logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }} className="login-mobile-logo">
          <style>{`.login-mobile-logo{display:flex}@media(min-width:900px){.login-mobile-logo{display:none!important}}`}</style>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", fontFamily: "Orbitron,sans-serif" }}>CP</div>
          <span style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: 3, color: "#fff" }}>CIPHERPOOL</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 420 }}>

          {/* Card */}
          <div style={{
            padding: "36px 32px", borderRadius: 24,
            background: "rgba(6,8,20,0.85)", backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: `0 0 0 1px rgba(139,92,246,0.08), 0 32px 80px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.06)`,
          }}>
            {/* Top neon line */}
            <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: `linear-gradient(90deg, transparent, ${VIOLET}, ${CYAN}, transparent)`, borderRadius: 1 }} />

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", marginBottom: 6, letterSpacing: 1 }}>CONNEXION</h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Heureux de te revoir parmi nous.</p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <NeonInput
                label="ADRESSE EMAIL"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>}
                type="email" placeholder="nom@exemple.com" value={email} onChange={e => setEmail(e.target.value)}
              />
              <NeonInput
                label="MOT DE PASSE"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                right={
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 4 }}>
                    {showPwd
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                }
              />

              <button type="submit" disabled={loading}
                style={{
                  padding: "14px", borderRadius: 13, border: "none", cursor: loading ? "not-allowed" : "pointer",
                  background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`,
                  color: "#fff", fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2,
                  boxShadow: `0 8px 32px rgba(139,92,246,0.35)`,
                  opacity: loading ? 0.6 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = `0 12px 40px rgba(139,92,246,0.5)`; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = `0 8px 32px rgba(139,92,246,0.35)`}
              >
                {loading
                  ? <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  : <>SE CONNECTER <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg></>
                }
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 3 }}>COMMUNAUTÉ</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Social links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Telegram", color: "#39b0e3", href: "https://t.me/cipherpool",
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg> },
                { label: "Discord", color: "#5865F2", href: "#",
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.084.116 18.11.135 18.127a19.861 19.861 0 0 0 5.993 3.029.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
                { label: "Free Fire", color: "#f97316", href: "#",
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg> },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: s.color, textDecoration: "none", transition: "all 0.2s", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${s.color}12`; e.currentTarget.style.borderColor = `${s.color}40`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                >
                  {s.icon}
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{s.label}</span>
                </a>
              ))}
            </div>

            {/* Register link */}
            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              Pas encore de compte ?{" "}
              <Link to="/register" style={{ color: CYAN, fontWeight: 700, textDecoration: "none" }}>
                Créer un compte →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
