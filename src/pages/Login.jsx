import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, AlertCircle, ChevronLeft, Send } from "lucide-react";

const VIDEO_URL = "https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-and-purple-smoke-background-30043-large.mp4";

function VideoBackground() {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.play().catch(() => {});
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 z-10" />
      <video ref={ref} autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30">
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
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent 65%)", filter: "blur(60px)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent 65%)", filter: "blur(60px)" }}
      />
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
    </div>
  );
}

function Input({ icon, type, placeholder, value, onChange, required, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300"
        style={{ color: focused ? "#10b981" : "rgba(255,255,255,0.25)" }}>
        {icon}
      </div>
      <input
        type={type} value={value} onChange={onChange} required={required}
        placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="w-full pl-12 pr-12 py-4 rounded-2xl text-white text-sm outline-none transition-all duration-300"
        style={{
          background: focused ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${focused ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: focused ? "0 0 0 4px rgba(16,185,129,0.06), 0 0 20px rgba(16,185,129,0.08)" : "none",
        }}
      />
      {right && <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background: video on desktop, gradient on mobile */}
      <div className="hidden sm:block"><VideoBackground /></div>
      <div className="sm:hidden"><GradientBg /></div>
      <div className="hidden sm:block absolute inset-0 z-0 pointer-events-none">
        <GradientBg />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full max-w-md"
      >
        {/* Back link */}
        <div className="mb-6 flex justify-center">
          <Link to="/" className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors group">
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retour à l'accueil</span>
          </Link>
        </div>

        <div className="rounded-[2rem] border border-white/8 p-8 sm:p-10 relative overflow-hidden"
          style={{ background: "rgba(5,5,18,0.92)", backdropFilter: "blur(40px)" }}>

          {/* Inner top glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-mint/30 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16,185,129,0.07), transparent)" }} />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 rotate-3"
              style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.3)" }}>
              <span className="text-white font-black text-xl -rotate-3">CP</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tighter text-white">
              CIPHER<span className="text-mint">POOL</span>
            </h1>
            <p className="text-white/30 font-mono text-[9px] uppercase tracking-[0.5em] mt-2 animate-pulse">
              Connexion au serveur
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              icon={<Mail size={16} />}
              type="email" placeholder="Adresse email"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <Input
              icon={<Lock size={16} />}
              type={showPwd ? "text" : "password"} placeholder="Mot de passe"
              value={password} onChange={e => setPassword(e.target.value)} required
              right={
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="text-white/30 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setRemember(!remember)}
                  className="w-9 h-5 rounded-full transition-colors duration-300 relative cursor-pointer"
                  style={{ background: remember ? "#10b981" : "rgba(255,255,255,0.08)" }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 ${remember ? "left-[calc(100%-18px)]" : "left-0.5"}`} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">Se souvenir</span>
              </label>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-mint transition-colors">
                Mot de passe oublié?
              </a>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-500/20 text-red-400 text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.07)" }}
                >
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || success}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-4 rounded-2xl font-heading font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 relative overflow-hidden mt-2"
              style={{
                background: success ? "rgba(16,185,129,0.9)" : "linear-gradient(135deg, #4f46e5, #10b981)",
                color: "#fff",
                boxShadow: "0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(16,185,129,0.1)",
              }}
            >
              <span className="relative z-10">
                {success ? "✓ Connecté!" : loading ? "Connexion..." : "Se connecter"}
              </span>
              {!loading && !success && (
                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors" />
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-[1px] bg-white/5" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Rejoindre via</span>
            <div className="flex-1 h-[1px] bg-white/5" />
          </div>

          {/* Social buttons — Telegram, Discord, Free Fire */}
          <div className="grid grid-cols-3 gap-3">
            <a href="https://t.me/cipherpool" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border border-white/7 transition-all duration-300 hover:border-blue-400/40 hover:bg-blue-400/5 group"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <Send size={18} className="text-white/30 group-hover:text-blue-400 transition-colors" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors">Telegram</span>
            </a>
            <a href="https://discord.gg/cipherpool" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border border-white/7 transition-all duration-300 hover:border-indigo-400/40 hover:bg-indigo-400/5 group"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/30 group-hover:text-indigo-400 transition-colors">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.093.12 18.128.15 18.15a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors">Discord</span>
            </a>
            <div className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border border-white/7 transition-all duration-300 hover:border-orange-400/40 hover:bg-orange-400/5 group cursor-pointer"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-lg text-white/30 group-hover:text-orange-400 transition-colors leading-none">🔥</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors">Free Fire</span>
            </div>
          </div>

          {/* Register link */}
          <p className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
            Pas encore de compte?{" "}
            <Link to="/register" className="text-mint hover:text-white transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>

        {/* Footer badge */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-3 text-[8px] font-mono tracking-[0.4em] text-white/20 uppercase">
            <div className="w-1 h-1 bg-mint rounded-full animate-pulse" />
            <span>Sécurisé AES-256</span>
            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse [animation-delay:.5s]" />
            <span>SSL Encryté</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
