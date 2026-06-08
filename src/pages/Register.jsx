import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, User, Hash, MapPin, Calendar,
  Aperture, Play, MessageCircle, Music2, ChevronRight,
  ChevronLeft, Check, Zap, AlertCircle, Gamepad2, Swords,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import GamingLogin from "../components/ui/GamingLogin";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done }) => (
  <div style={{
    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 11, flexShrink: 0,
    background: done ? "rgba(99,102,241,0.9)" : active ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
    border: `1.5px solid ${done ? "#6366f1" : active ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.12)"}`,
    color: done ? "#fff" : active ? "#a5b4fc" : "rgba(255,255,255,0.25)",
    transition: "all 0.3s",
  }}>
    {done ? <Check size={12} /> : n}
  </div>
);

const StepLine = ({ done }) => (
  <div style={{ flex: 1, height: 1.5, borderRadius: 2, margin: "0 4px", transition: "background 0.3s",
    background: done ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)" }} />
);

const Input = ({ icon: Icon, iconColor = "#6366f1", type = "text", placeholder, value, onChange, required, endAdornment, error }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <Icon size={15} style={{ color: error ? "#f87171" : iconColor, opacity: 0.7 }} />
    </div>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      style={{
        width: "100%", padding: "10px 12px 10px 38px", borderRadius: 10,
        border: `1px solid ${error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.1)"}`,
        background: "rgba(255,255,255,0.04)", color: "#f1f5f9", fontSize: 13,
        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
        paddingRight: endAdornment ? 44 : 12, transition: "border-color 0.2s",
      }}
      onFocus={e => { e.target.style.borderColor = error ? "rgba(248,113,113,0.5)" : "rgba(99,102,241,0.5)"; }}
      onBlur={e  => { e.target.style.borderColor = error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.1)"; }}
    />
    {endAdornment && (
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
        {endAdornment}
      </div>
    )}
    {error && (
      <p style={{ fontSize: 11, color: "#f87171", margin: "4px 0 0 4px" }}>{error}</p>
    )}
  </div>
);

const STEP_LABELS = ["Gaming ID", "Location", "Socials"];

// ══════════════════════════════════════════════════════════════════════════════
export default function Register() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPass, setShowPass] = useState(false);

  // Step 1 — Gaming ID + Account
  const [username, setUsername] = useState("");
  const [uid, setUid]           = useState("");
  const [ffName, setFfName]     = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");

  // Step 2 — Location
  const [country, setCountry] = useState("");
  const [city, setCity]       = useState("");
  const [age, setAge]         = useState("");

  // Step 3
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok]       = useState("");
  const [discord, setDiscord]     = useState("");
  const [youtube, setYoutube]     = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!username.trim() || username.trim().length < 3) e.username = "At least 3 characters";
    if (!uid.trim()) e.uid = "Free Fire UID is required";
    else if (!/^\d+$/.test(uid.trim())) e.uid = "UID must be numeric (numbers only)";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email required";
    if (!password || password.length < 8) e.password = "At least 8 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!country.trim()) e.country = "Country is required";
    if (!age) e.age = "Age is required";
    else if (Number(age) < 13) e.age = "Must be 13 or older";
    else if (Number(age) > 100) e.age = "Invalid age";
    return e;
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setStep(2);
    } else if (step === 2) {
      const errs = validateStep2();
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setStep(3);
    }
  };

  const submit = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/email-confirmed`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { username: username.trim() },
        },
      });
      if (authError) throw authError;

      if (authData.user?.identities?.length === 0) {
        throw new Error("Un compte avec cet email existe déjà.");
      }

      if (authData.user && authData.session) {
        const profileUpdate = {
          id:              authData.user.id,
          username:        username.trim(),
          email:           email.trim(),
          role:            "user",
          free_fire_uid:   uid.trim() || null,
          free_fire_name:  ffName.trim() || null,
          country:         country.trim() || null,
          city:            city.trim() || null,
          age:             age ? Number(age) : null,
          instagram:       instagram.trim() || null,
          tiktok:          tiktok.trim() || null,
          discord:         discord.trim() || null,
          youtube:         youtube.trim() || null,
        };
        await supabase.from("profiles").upsert(profileUpdate, { onConflict: "id" });
        await supabase.from("wallets").upsert({ user_id: authData.user.id, balance: 50 }, { onConflict: "user_id" });
        await refreshCurrentUser?.(authData.user.id);
      }

      navigate("/verify-whatsapp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step < 3) nextStep();
      else submit();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden", background: "#060810" }}>
      <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 11 }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 20, width: "100%", maxWidth: 440 }}
        onKeyDown={handleKeyDown}
      >
        <div style={{
          borderRadius: 20, overflow: "hidden",
          background: "rgba(8,8,18,0.88)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>

          {/* ── Login / Register toggle ── */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <Link
              to="/login"
              style={{
                flex: 1, padding: "16px 0", textAlign: "center", textDecoration: "none",
                fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)",
                borderRight: "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.2s",
              }}
            >
              Log In
            </Link>
            <div style={{
              flex: 1, padding: "16px 0", textAlign: "center",
              fontSize: 13, fontWeight: 700, color: "#a5b4fc",
              background: "rgba(99,102,241,0.08)",
              position: "relative",
            }}>
              Create Account
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 40, height: 2, borderRadius: 2, background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,0.8)" }} />
            </div>
          </div>

          {/* ── Header ── */}
          <div style={{ padding: "22px 28px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>
              <Swords size={20} style={{ color: "#fff" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.3 }}>
              Join CipherPool Arena
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Free Fire tournament platform — Morocco &amp; MENA
            </p>
          </div>

          {/* ── Step indicator ── */}
          <div style={{ padding: "0 28px 18px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", flex: n < 3 ? 1 : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <StepDot n={n} active={active} done={done} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: done || active ? "#a5b4fc" : "rgba(255,255,255,0.2)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
                        {label}
                      </span>
                    </div>
                    {n < 3 && <StepLine done={done} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Form body ── */}
          <div style={{ padding: "0 28px 28px" }}>
            <AnimatePresence mode="wait">

              {/* ── Step 1: Gaming ID + Account ── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  {/* Gaming identity banner */}
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Gamepad2 size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
                      Enter your <span style={{ color: "#fbbf24", fontWeight: 700 }}>Free Fire UID</span> — required to join tournaments.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Input
                      icon={User} placeholder="Username (your platform name)"
                      value={username} onChange={e => setUsername(e.target.value)} required
                      error={fieldErrors.username}
                    />
                    <Input
                      icon={Hash} placeholder="Free Fire UID (numbers only, e.g. 123456789)"
                      value={uid} onChange={e => setUid(e.target.value.replace(/\D/g, ""))} required
                      error={fieldErrors.uid}
                      iconColor="#f59e0b"
                    />
                    <Input
                      icon={Gamepad2} placeholder="Free Fire name (in-game nickname, optional)"
                      value={ffName} onChange={e => setFfName(e.target.value)}
                      iconColor="#f59e0b"
                    />

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 0.5 }}>ACCOUNT</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                    </div>

                    <Input
                      icon={Mail} type="email" placeholder="Email address"
                      value={email} onChange={e => setEmail(e.target.value)} required
                      error={fieldErrors.email}
                    />
                    <Input
                      icon={Lock} type={showPass ? "text" : "password"} placeholder="Password (min 8 chars)"
                      value={password} onChange={e => setPassword(e.target.value)} required
                      error={fieldErrors.password}
                      endAdornment={
                        <button type="button" onClick={() => setShowPass(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 2, display: "flex" }}>
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      }
                    />
                    <Input
                      icon={Lock} type="password" placeholder="Confirm password"
                      value={confirm} onChange={e => setConfirm(e.target.value)} required
                      error={fieldErrors.confirm}
                    />
                  </div>

                  <button onClick={nextStep} style={{
                    width: "100%", marginTop: 16, padding: "11px 0", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                  }}>
                    Continue <ChevronRight size={16} />
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Location ── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 14 }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
                      Your <span style={{ color: "#6ee7b7", fontWeight: 700 }}>location</span> helps us match you with players in your region.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Input
                      icon={MapPin} placeholder="Country code (e.g. MA, DZ, TN)"
                      value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))} required
                      error={fieldErrors.country}
                      iconColor="#10b981"
                    />
                    <Input
                      icon={MapPin} placeholder="City (optional)"
                      value={city} onChange={e => setCity(e.target.value)}
                      iconColor="#10b981"
                    />
                    <Input
                      icon={Calendar} type="number" placeholder="Age (must be 13+)"
                      value={age} onChange={e => setAge(e.target.value)} required
                      error={fieldErrors.age}
                      iconColor="#06b6d4"
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => setStep(1)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button onClick={nextStep} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      Continue <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Socials ── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 14 }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                      All social links are <span style={{ color: "#6ee7b7", fontWeight: 700 }}>optional</span> — you can skip this step.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Input icon={Aperture}      placeholder="Instagram URL (optional)" value={instagram} onChange={e => setInstagram(e.target.value)} iconColor="#e1306c" />
                    <Input icon={Music2}        placeholder="TikTok URL (optional)"    value={tiktok}    onChange={e => setTiktok(e.target.value)}    iconColor="#69c9d0" />
                    <Input icon={MessageCircle} placeholder="Discord tag or link"      value={discord}   onChange={e => setDiscord(e.target.value)}   iconColor="#5865f2" />
                    <Input icon={Play}          placeholder="YouTube URL (optional)"   value={youtube}   onChange={e => setYoutube(e.target.value)}   iconColor="#ff0000" />
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
                      display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10,
                      background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", marginTop: 12,
                    }}>
                      <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{error}</p>
                    </motion.div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button onClick={() => setStep(2)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button onClick={submit} disabled={loading} style={{
                      flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                      background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                    }}>
                      {loading ? "Creating…" : (<>Join Arena <Zap size={14} /></>)}
                    </button>
                  </div>
                  <button onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                    Skip socials and finish
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>
          © 2026 CipherPool Arena. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
