import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const CYAN   = "#00d4ff";
const VIOLET = "#8b5cf6";
const BG     = "#020617";

function CyberBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 60% at 80% 30%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 70% at 20% 70%, rgba(0,212,255,0.08) 0%, transparent 60%)` }} />
      <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", top: "5%", right: "10%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.14), transparent 70%)", filter: "blur(40px)" }} />
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{ position: "absolute", bottom: "5%", left: "8%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.1), transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(139,92,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.035) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
    </div>
  );
}

function NeonInput({ label, icon, type = "text", placeholder, name, value, onChange, required: req = true }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, letterSpacing: 3, color: focused ? CYAN : "rgba(255,255,255,0.25)", marginBottom: 7, transition: "color 0.2s", fontFamily: "monospace" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: focused ? CYAN : "rgba(255,255,255,0.2)", transition: "color 0.2s", pointerEvents: "none", fontSize: 15 }}>{icon}</div>
        <input
          type={type} name={name} placeholder={placeholder} value={value} onChange={onChange} required={req}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "12px 14px 12px 40px", borderRadius: 11, fontSize: 13, color: "#fff",
            background: "rgba(0,212,255,0.02)", outline: "none", boxSizing: "border-box",
            border: `1px solid ${focused ? "rgba(0,212,255,0.38)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: focused ? "0 0 0 3px rgba(0,212,255,0.06), 0 0 18px rgba(0,212,255,0.07)" : "none",
            transition: "all 0.22s",
          }}
        />
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", fullName: "", freeFireId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = e => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    if (formData.password !== formData.confirmPassword) { setError("Les mots de passe ne correspondent pas"); setLoading(false); return; }
    if (formData.password.length < 6) { setError("Mot de passe trop court (6 caractères min)"); setLoading(false); return; }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
        options: { data: { full_name: formData.fullName } },
      });
      if (authError) throw authError;
      if (authData?.user?.identities?.length === 0) throw new Error("Un compte avec cet email existe déjà. Connectez-vous.");
      if (authData?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({ id: authData.user.id, full_name: formData.fullName, email: formData.email, free_fire_id: formData.freeFireId, role: "user", verification_status: "verified", level: 1 }, { onConflict: "id" });
        if (profileError) {
          if (profileError.message?.includes("column") || profileError.code === "42703") {
            const { error: e2 } = await supabase.from("profiles").upsert({ id: authData.user.id, full_name: formData.fullName, email: formData.email, free_fire_id: formData.freeFireId }, { onConflict: "id" });
            if (e2) throw e2;
          } else { throw profileError; }
        }
        try { await supabase.from("wallets").insert({ user_id: authData.user.id, balance: 0 }); } catch (_) {}
      }
      if (authData?.session) { setSuccess("Compte créé ! Redirection..."); setTimeout(() => navigate("/dashboard"), 1200); }
      else { setSuccess("✅ Compte créé ! Vérifie ton email et confirme ton inscription avant de te connecter."); }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered") || err.status === 422) setError("Un compte avec cet email existe déjà. Connectez-vous.");
      else if (msg.includes("rate limit") || msg.includes("too many")) setError("Trop de tentatives. Attendez quelques minutes.");
      else if (msg.includes("invalid") && msg.includes("email")) setError("Adresse email invalide.");
      else setError(msg || "Erreur lors de l'inscription.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", overflow: "hidden", position: "relative", fontFamily: "'Inter','Space Grotesk',sans-serif" }}>
      <style>{`
        ::placeholder{color:rgba(255,255,255,0.15)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-dot{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .reg-left{display:none}@media(min-width:900px){.reg-left{display:flex!important;flex-direction:column!important}}
        .reg-mobile{display:flex}@media(min-width:900px){.reg-mobile{display:none!important}}
      `}</style>
      <CyberBg />

      {/* LEFT */}
      <div className="reg-left" style={{ position: "relative", zIndex: 10, flex: "0 0 46%", flexDirection: "column", justifyContent: "center", padding: "64px 60px" }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "Orbitron,sans-serif", boxShadow: `0 0 24px rgba(139,92,246,0.5)` }}>CP</div>
          <span style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 4, color: "#fff" }}>CIPHERPOOL</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 4, color: VIOLET, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: VIOLET, display: "inline-block", animation: "pulse-dot 2s infinite" }} />
            REJOINS L'ÉLITE
          </p>
          <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: "clamp(28px,3.5vw,46px)", lineHeight: 1.1, color: "#fff", marginBottom: 20 }}>
            DOMINE LE JEU.<br />
            <span style={{ background: `linear-gradient(90deg,${VIOLET},${CYAN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ÉCRIS L'HISTOIRE.</span>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 360 }}>
            La plateforme n°1 pour les tournois Free Fire au Maroc. Crée ton compte et commence à gagner.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 44 }}>
          {[
            { val: "10K+",    label: "Joueurs",      c: CYAN    },
            { val: "500+",    label: "Tournois",     c: VIOLET  },
            { val: "100k CP", label: "Distribués",   c: "#f97316" },
            { val: "150+",    label: "Clans actifs", c: "#10b981" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.05 }}
              style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontFamily: "Orbitron,sans-serif", fontSize: 20, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.val}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* RIGHT (FORM) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", position: "relative", zIndex: 10 }}>
        <div className="reg-mobile" style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${VIOLET},${CYAN})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff", fontFamily: "Orbitron,sans-serif" }}>CP</div>
          <span style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 15, letterSpacing: 3, color: "#fff" }}>CIPHERPOOL</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 440 }}>
          <div style={{
            padding: "32px 28px", borderRadius: 24, position: "relative",
            background: "rgba(5,7,18,0.87)", backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: `0 0 0 1px rgba(139,92,246,0.07), 0 32px 80px rgba(0,0,0,0.55), 0 0 80px rgba(139,92,246,0.05)`,
          }}>
            <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: `linear-gradient(90deg,transparent,${VIOLET},${CYAN},transparent)` }} />

            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "Orbitron,sans-serif", fontWeight: 900, fontSize: 21, color: "#fff", marginBottom: 5, letterSpacing: 1 }}>INSCRIPTION</h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Commence ton aventure en quelques secondes.</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 11, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#fca5a5", fontSize: 13 }}>
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 11, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: 13 }}>
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <NeonInput label="NOM COMPLET" icon="👤" name="fullName" placeholder="Mohamed Alami" value={formData.fullName} onChange={handleChange} />
              <NeonInput label="ID FREE FIRE" icon="🎮" name="freeFireId" placeholder="123456789" value={formData.freeFireId} onChange={handleChange} />
              <NeonInput label="ADRESSE EMAIL" icon="✉️" type="email" name="email" placeholder="nom@exemple.com" value={formData.email} onChange={handleChange} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <NeonInput label="MOT DE PASSE" icon="🔒" type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                <NeonInput label="CONFIRMATION" icon="🛡️" type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
              </div>

              <button type="submit" disabled={loading}
                style={{
                  padding: "13px", borderRadius: 13, border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4,
                  background: `linear-gradient(135deg,${VIOLET},${CYAN})`,
                  color: "#fff", fontFamily: "Orbitron,sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 2,
                  boxShadow: `0 8px 30px rgba(139,92,246,0.35)`,
                  opacity: loading ? 0.6 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = `0 12px 40px rgba(139,92,246,0.5)`; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = `0 8px 30px rgba(139,92,246,0.35)`}
              >
                {loading
                  ? <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  : <>CRÉER MON COMPTE →</>
                }
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
              Déjà un compte ?{" "}
              <Link to="/login" style={{ color: CYAN, fontWeight: 700, textDecoration: "none" }}>Se connecter →</Link>
            </p>
          </div>
        </motion.div>

        <p style={{ marginTop: 20, fontSize: 11, color: "rgba(255,255,255,0.12)", fontFamily: "monospace", letterSpacing: 2 }}>© 2026 CIPHERPOOL · Tous droits réservés</p>
      </div>
    </div>
  );
}
