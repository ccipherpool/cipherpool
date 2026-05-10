import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, User, Gamepad2,
  AlertCircle, CheckCircle2, ChevronLeft, Send
} from "lucide-react";

const VIDEO_URL = "https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-and-purple-smoke-background-30043-large.mp4";

function VideoBackground() {
  const ref = useRef(null);
  useEffect(() => { ref.current?.play().catch(() => {}); }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 z-10" />
      <video ref={ref} autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25">
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
    </div>
  );
}

function GradientBg() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[#030308]" />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.22), transparent 65%)", filter: "blur(80px)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 65%)", filter: "blur(70px)" }}
      />
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
    </div>
  );
}

function NeonInput({ icon, type = "text", placeholder, name, value, onChange, required = true, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none"
        style={{ color: focused ? "#10b981" : "rgba(255,255,255,0.2)" }}>
        {icon}
      </div>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full pl-11 py-3.5 rounded-xl text-white text-sm outline-none transition-all duration-300"
        style={{
          paddingRight: right ? "3rem" : "1rem",
          background: focused ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${focused ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(16,185,129,0.05)" : "none",
        }}
      />
      {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

const STATS = [
  { val: "1K+",   label: "Joueurs",      color: "#10b981" },
  { val: "50+",   label: "Tournois",     color: "#6366f1" },
  { val: "10K CP", label: "Distribués",  color: "#f97316" },
  { val: "20+",   label: "Clans actifs", color: "#a78bfa" },
];

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", fullName: "", freeFireId: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false); return;
    }
    if (formData.password.length < 6) {
      setError("Mot de passe trop court (6 caractères min)");
      setLoading(false); return;
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
        options: { data: { full_name: formData.fullName } },
      });
      if (authError) throw authError;
      if (authData?.user?.identities?.length === 0) throw new Error("Un compte avec cet email existe déjà. Connectez-vous.");
      if (authData?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          { id: authData.user.id, full_name: formData.fullName, email: formData.email, free_fire_id: formData.freeFireId, role: "user", verification_status: "verified", level: 1 },
          { onConflict: "id" }
        );
        if (profileError) {
          if (profileError.message?.includes("column") || profileError.code === "42703") {
            await supabase.from("profiles").upsert({ id: authData.user.id, full_name: formData.fullName, email: formData.email, free_fire_id: formData.freeFireId }, { onConflict: "id" });
          } else { throw profileError; }
        }
        try { await supabase.from("wallets").insert({ user_id: authData.user.id, balance: 0 }); } catch (_) {}
      }
      if (authData?.session) {
        setSuccess("Compte créé! Redirection...");
        setTimeout(() => navigate("/dashboard"), 1200);
      } else {
        setSuccess("✅ Compte créé! Vérifie ton email avant de te connecter.");
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered") || err.status === 422)
        setError("Un compte avec cet email existe déjà.");
      else if (msg.includes("rate limit") || msg.includes("too many"))
        setError("Trop de tentatives. Attends quelques minutes.");
      else if (msg.includes("invalid") && msg.includes("email"))
        setError("Adresse email invalide.");
      else setError(msg || "Erreur lors de l'inscription.");
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden">
      {/* Background */}
      <div className="hidden md:block absolute inset-0"><VideoBackground /></div>
      <GradientBg />

      {/* ── LEFT PANEL (desktop only) ── */}
      <div className="hidden md:flex flex-col justify-center relative z-10 w-[420px] shrink-0 px-14 py-16">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-16"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base rotate-3"
            style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 0 24px rgba(16,185,129,0.3)" }}>
            <span className="-rotate-3">CP</span>
          </div>
          <span className="font-heading font-black text-xl tracking-tighter text-white">
            CIPHER<span className="text-mint">POOL</span>
          </span>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 8px rgba(167,139,250,0.6)", animation: "pulse 2s infinite" }} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400">Rejoins l'Élite</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-heading font-black text-white leading-[1.05] tracking-tighter">
            DOMINE LE JEU.<br />
            <span className="bg-gradient-to-r from-violet-400 to-mint bg-clip-text text-transparent">
              ÉCRIS L'HISTOIRE.
            </span>
          </h1>
          <p className="text-white/35 leading-relaxed max-w-xs">
            La plateforme n°1 pour les tournois Free Fire au Maroc. Crée ton compte et commence à gagner.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3 mt-10"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="px-4 py-4 rounded-2xl border border-white/7"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p className="font-heading font-black text-2xl leading-none mb-1" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[11px] text-white/30">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex items-center gap-4"
        >
          <div className="flex -space-x-2">
            {["🦊","⚔️","🏆","🎯","🔥"].map((e, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#030308] flex items-center justify-center text-xs"
                style={{ background: "rgba(99,102,241,0.2)", zIndex: 5 - i }}>
                {e}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/30">
            <span className="text-white font-bold">+50 joueurs</span> ont rejoint cette semaine
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT: FORM ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-10 relative z-10">
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)" }}>CP</div>
          <span className="font-heading font-black tracking-tighter text-white">CIPHER<span className="text-mint">POOL</span></span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Back link — mobile only */}
          <div className="md:hidden mb-5 flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors group">
              <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Retour à l'accueil</span>
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/8 p-7 sm:p-9 relative overflow-hidden"
            style={{ background: "rgba(5,5,18,0.92)", backdropFilter: "blur(40px)" }}>

            {/* Top glow */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.07), transparent)" }} />

            <div className="mb-7">
              <h2 className="text-2xl font-heading font-black text-white tracking-tight">Inscription</h2>
              <p className="text-white/30 text-sm mt-1">Commence ton aventure en quelques secondes.</p>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold mb-5"
                  style={{ background: "rgba(239,68,68,0.07)" }}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl border border-mint/20 text-mint text-xs font-bold mb-5"
                  style={{ background: "rgba(16,185,129,0.07)" }}
                >
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <NeonInput
                  icon={<User size={15} />} name="fullName" placeholder="Nom complet"
                  value={formData.fullName} onChange={handleChange}
                />
                <NeonInput
                  icon={<Gamepad2 size={15} />} name="freeFireId" placeholder="Free Fire ID"
                  value={formData.freeFireId} onChange={handleChange} required={false}
                />
              </div>

              <NeonInput
                icon={<Mail size={15} />} type="email" name="email" placeholder="Adresse email"
                value={formData.email} onChange={handleChange}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <NeonInput
                  icon={<Lock size={15} />} type={showPwd ? "text" : "password"}
                  name="password" placeholder="Mot de passe"
                  value={formData.password} onChange={handleChange}
                  right={
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="text-white/25 hover:text-white transition-colors">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                <NeonInput
                  icon={<Lock size={15} />} type={showCPwd ? "text" : "password"}
                  name="confirmPassword" placeholder="Confirmer"
                  value={formData.confirmPassword} onChange={handleChange}
                  right={
                    <button type="button" onClick={() => setShowCPwd(!showCPwd)}
                      className="text-white/25 hover:text-white transition-colors">
                      {showCPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading || !!success}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-4 rounded-xl font-heading font-black text-sm uppercase tracking-[0.15em] text-white transition-all duration-300 mt-1"
                style={{
                  background: success ? "rgba(16,185,129,0.9)" : "linear-gradient(135deg, #6366f1, #8b5cf6, #10b981)",
                  boxShadow: "0 0 30px rgba(99,102,241,0.25)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Création du compte...
                  </span>
                ) : success ? "✓ Compte créé!" : "Créer mon compte →"}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-[1px] bg-white/5" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Rejoindre via</span>
              <div className="flex-1 h-[1px] bg-white/5" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <a href="https://t.me/cipherpool" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/7 hover:border-blue-400/40 hover:bg-blue-400/5 group transition-all"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <Send size={16} className="text-white/25 group-hover:text-blue-400 transition-colors" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/50 transition-colors">Telegram</span>
              </a>
              <a href="https://discord.gg/cipherpool" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/7 hover:border-indigo-400/40 hover:bg-indigo-400/5 group transition-all"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/25 group-hover:text-indigo-400 transition-colors">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.093.12 18.128.15 18.15a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/50 transition-colors">Discord</span>
              </a>
              <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/7 hover:border-orange-400/40 hover:bg-orange-400/5 group transition-all cursor-pointer"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <span className="text-base leading-none text-white/25 group-hover:text-orange-400 transition-colors">🔥</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/50 transition-colors">Free Fire</span>
              </div>
            </div>

            <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
              Déjà un compte?{" "}
              <Link to="/login" className="text-mint hover:text-white transition-colors">Se connecter</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
