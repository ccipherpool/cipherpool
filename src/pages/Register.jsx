import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  bg:           "#0a0a0f",
  card:         "#0f0f17",
  border:       "#1f1f2f",
  primary:      "#8b3dff",
  primaryGlow:  "rgba(139,61,255,0.45)",
  cyan:         "#00e5ff",
  cyanGlow:     "rgba(0,229,255,0.35)",
  danger:       "#ff4757",
  success:      "#2ecc71",
  text:         "#fff",
  textMid:      "rgba(255,255,255,0.55)",
  textLow:      "rgba(255,255,255,0.25)",
};

const CITIES = ["Casablanca","Rabat","Fès","Marrakech","Agadir","Tanger","Meknès","Oujda","Kénitra","Tétouan","Salé","Safi","Mohammedia","El Jadida","Béni Mellal","Nador","Taza","Settat","Khouribga","Berrechid","Autre"];

function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 2, color: C.textLow, display: "block", marginBottom: 7 }}>
        {label}
      </label>
      {children}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.danger, marginTop: 5, letterSpacing: 0.5 }}>
          {error}
        </motion.p>
      )}
    </div>
  );
}

function Input({ type = "text", value, onChange, placeholder, error, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "12px 16px",
        borderRadius: 12,
        border: `1px solid ${error ? C.danger + "66" : focused ? C.primary + "88" : C.border}`,
        background: "rgba(255,255,255,0.04)",
        color: C.text,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 14,
        outline: "none",
        transition: "all .22s",
        boxShadow: focused ? `0 0 0 3px ${C.primary}18` : "none",
      }}
      onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
    />
  );
}

function PasswordInput({ value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "12px 44px 12px 16px",
          borderRadius: 12,
          border: `1px solid ${error ? C.danger + "66" : focused ? C.primary + "88" : C.border}`,
          background: "rgba(255,255,255,0.04)",
          color: C.text,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 14,
          outline: "none",
          transition: "all .22s",
          boxShadow: focused ? `0 0 0 3px ${C.primary}18` : "none",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.4, color: "#fff" }}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalErr, setGlobalErr] = useState("");

  const [form, setForm] = useState({
    fullName: "", age: "", city: "", email: "",
    freeFireId: "", password: "", confirmPassword: "",
  });

  const set = field => e => { setForm(f => ({ ...f, [field]: e.target.value })); setErrors(er => ({ ...er, [field]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Nom requis";
    if (!form.age || parseInt(form.age) < 13) e.age = "Âge minimum 13 ans";
    if (!form.city) e.city = "Ville requise";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Email invalide";
    if (!form.freeFireId.trim()) e.freeFireId = "ID Free Fire requis";
    if (form.password.length < 6) e.password = "Minimum 6 caractères";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Les mots de passe ne correspondent pas";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGlobalErr("");
    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("Erreur lors de la création du compte");

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.fullName.trim(),
        age: parseInt(form.age),
        city: form.city,
        country: "Maroc",
        free_fire_id: form.freeFireId.trim(),
        role: "user",
        verification_status: "approved",
        verification_level: 1,
        coins: 100,
      }, { onConflict: "id" });

      if (profileErr) throw profileErr;

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2200);
    } catch (err) {
      setGlobalErr(
        err.message.includes("already registered") ? "Cet email est déjà utilisé." :
        err.message.includes("Password should be") ? "Mot de passe trop faible (min. 6 caractères)." :
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px", position: "relative", overflow: "hidden" }}>

      {/* BG orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: 600, height: 600, background: `radial-gradient(${C.primary}16, transparent 65%)` }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 500, height: 500, background: `radial-gradient(${C.cyan}10, transparent 65%)` }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", width: 300, height: 300, background: `radial-gradient(rgba(46,204,113,0.08), transparent 65%)` }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, select::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0f0f17; color: #fff; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <motion.div whileHover={{ rotate: 5, scale: 1.08 }}
            style={{ width: 52, height: 52, borderRadius: 15, background: `linear-gradient(135deg, ${C.primary}, #4f46e5)`, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 32px ${C.primaryGlow}`, marginBottom: 14 }}>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#fff", letterSpacing: 1 }}>CP</span>
          </motion.div>
          <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, letterSpacing: 4, color: "#fff", margin: "0 0 6px" }}>
            CIPHER<span style={{ color: C.primary, textShadow: `0 0 24px ${C.primaryGlow}` }}>POOL</span>
          </h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3, color: C.textLow }}>CRÉER UN COMPTE</p>
        </div>

        {/* Success state */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              style={{
                background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)",
                borderRadius: 22, padding: "48px 40px", textAlign: "center",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              }}
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }} style={{ fontSize: 60, marginBottom: 16 }}>✅</motion.div>
              <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, letterSpacing: 3, color: C.success, marginBottom: 8 }}>COMPTE CRÉÉ !</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: "rgba(46,204,113,0.6)" }}>REDIRECTION EN COURS...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        {!success && (
          <div style={{
            background: "rgba(15,15,23,0.92)", backdropFilter: "blur(24px)",
            border: `1px solid ${C.border}`, borderRadius: 22, padding: "32px 30px",
            boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)`,
            position: "relative", overflow: "hidden",
          }}>
            {/* gradient top border */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.primary}80, ${C.cyan}80, transparent)` }} />

            <AnimatePresence>
              {globalErr && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.25)", borderRadius: 10, padding: "11px 15px", marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: C.danger }}>
                  {globalErr}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Field label="NOM COMPLET" error={errors.fullName}>
                  <Input value={form.fullName} onChange={set("fullName")} placeholder="Mohamed Amine" error={errors.fullName} />
                </Field>
                <Field label="ÂGE" error={errors.age}>
                  <Input type="number" value={form.age} onChange={set("age")} placeholder="20" error={errors.age} min="13" max="60" />
                </Field>
              </div>

              <Field label="VILLE" error={errors.city}>
                <select value={form.city} onChange={set("city")}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    border: `1px solid ${errors.city ? C.danger + "66" : C.border}`,
                    background: "rgba(255,255,255,0.04)", color: form.city ? C.text : "rgba(255,255,255,0.2)",
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: "none",
                  }}>
                  <option value="" disabled>Sélectionne ta ville</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.city && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: C.danger, marginTop: 5 }}>{errors.city}</p>}
              </Field>

              <Field label="EMAIL" error={errors.email}>
                <Input type="email" value={form.email} onChange={set("email")} placeholder="ton@email.com" error={errors.email} />
              </Field>

              <Field label="FREE FIRE ID / BLOOD STRIKE ID" error={errors.freeFireId}>
                <Input value={form.freeFireId} onChange={set("freeFireId")} placeholder="123456789" error={errors.freeFireId} />
              </Field>

              <Field label="MOT DE PASSE" error={errors.password}>
                <PasswordInput value={form.password} onChange={set("password")} placeholder="••••••••" error={errors.password} />
              </Field>

              <Field label="CONFIRMER LE MOT DE PASSE" error={errors.confirmPassword}>
                <PasswordInput value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" error={errors.confirmPassword} />
              </Field>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                style={{
                  width: "100%", padding: "14px", borderRadius: 13,
                  background: loading ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${C.primary}, #4f46e5)`,
                  border: "none", color: loading ? "rgba(255,255,255,0.3)" : "#fff",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 2, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : `0 8px 28px ${C.primaryGlow}`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  transition: "all .25s",
                }}
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%" }} />
                    CRÉATION EN COURS...
                  </>
                ) : "⚡ CRÉER MON COMPTE"}
              </motion.button>
            </form>

            <p style={{ textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: C.textMid, marginTop: 22 }}>
              Déjà un compte ?{" "}
              <Link to="/login" style={{ color: C.primary, textDecoration: "none", fontWeight: 700 }}>Se connecter</Link>
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: C.textLow, letterSpacing: 2, marginTop: 18 }}>
          🔒 COMPTE ACTIF IMMÉDIATEMENT · 100 COINS DE BIENVENUE
        </p>
      </motion.div>
    </div>
  );
}
