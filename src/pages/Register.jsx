import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, Gamepad2, ShieldCheck, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Shape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = "from-indigo-500/[0.12]" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100, rotate: rotate - 12 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.2 } }}
      className={`absolute pointer-events-none ${className}`}
    >
      <motion.div
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height }}
      >
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r to-transparent ${gradient}`}
          style={{ border: "1.5px solid rgba(255,255,255,0.1)", backdropFilter: "blur(2px)", boxShadow: "0 8px 32px rgba(255,255,255,0.04)" }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", fullName: "", freeFireId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    if (formData.password !== formData.confirmPassword) { setError("Les mots de passe ne correspondent pas"); setLoading(false); return; }
    if (formData.password.length < 6) { setError("Mot de passe trop court (6 caractères min)"); setLoading(false); return; }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
      if (authError) throw authError;
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          free_fire_id: formData.freeFireId,
          role: "user",
          verification_status: "verified",
          coins: 0, xp: 0, level: 1,
        });
        if (profileError) throw profileError;
      }
      setSuccess("Compte créé avec succès ! Bienvenue chez CipherPool.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div className="min-h-screen text-white flex overflow-hidden font-sans relative" style={{ background: "#030305" }}>

      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,0.12) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 0% 80%, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Shape delay={0.3} width={550} height={130} rotate={-12} gradient="from-violet-500/[0.13]" className="right-[-6%] top-[15%]" />
        <Shape delay={0.5} width={400} height={100} rotate={14}  gradient="from-indigo-500/[0.11]" className="left-[-4%] top-[55%]" />
        <Shape delay={0.4} width={240} height={68}  rotate={8}   gradient="from-blue-500/[0.10]"   className="right-[5%] bottom-[10%]" />
        <Shape delay={0.6} width={170} height={50}  rotate={-20} gradient="from-indigo-400/[0.09]" className="left-[18%] top-[6%]" />
        <Shape delay={0.7} width={120} height={38}  rotate={30}  gradient="from-violet-400/[0.07]" className="right-[24%] top-[3%]" />
      </div>

      {/* Left panel */}
      <div className="hidden md:flex md:w-5/12 relative z-10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-3xl font-black text-white"
            style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", boxShadow: "0 0 60px rgba(79,70,229,0.45), 0 0 120px rgba(79,70,229,0.15)" }}
          >
            CP
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-5 tracking-tight leading-tight"
          >
            DOMINE LE JEU.
            <br />
            <span style={{ background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              REJOINS L'ÉLITE.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 text-sm leading-relaxed mb-8"
          >
            La plateforme n°1 pour les tournois Free Fire au Maroc. Gagne des récompenses réelles.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { val: "10K+", label: "Joueurs" },
              { val: "500+", label: "Tournois" },
              { val: "100k CP", label: "Distribués" },
              { val: "150+", label: "Clans" },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black" style={{ background: "linear-gradient(135deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.val}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.a
            href="https://t.me/cipherpool"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-6 flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold w-full transition-all hover:-translate-y-0.5"
            style={{ background: "rgba(0,136,204,0.1)", border: "1px solid rgba(0,136,204,0.25)", color: "#39b0e3" }}
          >
            <Send size={15} />
            Rejoindre la communauté Telegram
          </motion.a>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="md:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-white" style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)" }}>CP</div>
          <span className="font-black text-lg tracking-wider">CIPHERPOOL</span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div
            className="p-7 rounded-3xl"
            style={{ background: "rgba(8,8,20,0.88)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 0 80px rgba(79,70,229,0.07), 0 32px 80px rgba(0,0,0,0.4)" }}
          >
            <div className="mb-6">
              <h1 className="text-2xl font-black mb-1.5 tracking-tight">Inscription</h1>
              <p className="text-white/35 text-sm">Commence ton aventure en quelques secondes.</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl flex gap-2.5 items-center"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl flex gap-2.5 items-center"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-green-300 text-xs">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-4">
              {[
                { name: "fullName",   label: "Nom complet",  icon: User,     type: "text",  placeholder: "Mohamed Alami" },
                { name: "freeFireId", label: "ID Free Fire", icon: Gamepad2, type: "text",  placeholder: "123456789" },
                { name: "email",      label: "Email",        icon: Mail,     type: "email", placeholder: "nom@exemple.com" },
              ].map(field => (
                <div key={field.name} className="group">
                  <label className="block text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-1.5 group-focus-within:text-indigo-400 transition-colors">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name]}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder-white/15 outline-none transition-all"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.45)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "password",        label: "Mot de passe", icon: Lock,        placeholder: "••••••••" },
                  { name: "confirmPassword", label: "Confirmation",  icon: ShieldCheck, placeholder: "••••••••" },
                ].map(field => (
                  <div key={field.name} className="group">
                    <label className="block text-[10px] font-black text-white/25 uppercase tracking-[0.2em] mb-1.5 group-focus-within:text-indigo-400 transition-colors">{field.label}</label>
                    <div className="relative">
                      <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="password"
                        name={field.name}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder-white/15 outline-none transition-all"
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.45)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.07)"}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-90 mt-2"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 8px 30px rgba(79,70,229,0.35)" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Créer mon compte <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Community section */}
            <div className="mt-6">
              <div className="relative flex items-center justify-center mb-4">
                <div className="border-t border-white/[0.06] absolute w-full" />
                <div className="px-4 relative text-white/25 text-[10px] font-mono uppercase tracking-widest" style={{ background: "rgba(8,8,20,0.88)" }}>
                  communauté
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <a
                  href="https://t.me/cipherpool"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,136,204,0.35)"; e.currentTarget.style.background = "rgba(0,136,204,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <Send size={15} color="#39b0e3" />
                  <span className="text-[10px] text-white/30 font-mono">Telegram</span>
                </a>
                <a
                  href="#"
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(88,101,242,0.35)"; e.currentTarget.style.background = "rgba(88,101,242,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.084.116 18.11.135 18.127a19.861 19.861 0 0 0 5.993 3.029.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.029.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  <span className="text-[10px] text-white/30 font-mono">Discord</span>
                </a>
                <div
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.35)"; e.currentTarget.style.background = "rgba(249,115,22,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <span className="text-lg leading-none">🎮</span>
                  <span className="text-[10px] text-white/30 font-mono">Free Fire</span>
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm text-white/30">
                Déjà un compte ?{" "}
                <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Connexion</Link>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex gap-6 text-[10px] font-bold text-white/15 uppercase tracking-[0.2em]">
          <span>© 2026 CIPHERPOOL</span>
          <span className="cursor-pointer hover:text-white/30 transition-colors">Privacy</span>
          <span className="cursor-pointer hover:text-white/30 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  );
}
