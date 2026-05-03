import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, Gamepad2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";

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

  const inputClass = "w-full rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder-white/20 outline-none transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden font-sans">

      <div className="fixed inset-0 z-0 pointer-events-none">
        <MeshGradient
          className="absolute inset-0 w-full h-full"
          colors={["#000000", "#06b6d4", "#0891b2", "#164e63", "#f97316"]}
          speed={0.2}
          backgroundColor="#000000"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Left panel */}
      <div className="hidden md:flex md:w-5/12 relative z-10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-3xl font-black text-black"
            style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", boxShadow: "0 0 60px rgba(6,182,212,0.3)" }}
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
            <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
            {[{ val: "10K+", label: "Joueurs" }, { val: "500+", label: "Tournois" }, { val: "100k CP", label: "Distribués" }, { val: "150+", label: "Clans" }].map((s, i) => (
              <div key={i} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xl font-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.val}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="md:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
          <span className="font-black text-lg tracking-wider">CIPHERPOOL</span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div
            className="p-7 rounded-3xl"
            style={{ background: "rgba(12,12,26,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="mb-6">
              <h1 className="text-2xl font-black mb-1.5 tracking-tight">Inscription</h1>
              <p className="text-white/40 text-sm">Commence ton aventure en quelques secondes.</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl flex gap-2.5 items-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-xs">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 rounded-xl flex gap-2.5 items-center"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-green-300 text-xs">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-4">
              {[
                { name: "fullName",  label: "Nom complet",  icon: User,     type: "text",     placeholder: "Mohamed Alami" },
                { name: "freeFireId", label: "ID Free Fire", icon: Gamepad2, type: "text",     placeholder: "123456789" },
                { name: "email",     label: "Email",         icon: Mail,     type: "email",    placeholder: "nom@exemple.com" },
              ].map(field => (
                <div key={field.name} className="group">
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 group-focus-within:text-cyan-500 transition-colors">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name]}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "password",        label: "Mot de passe",  icon: Lock,        placeholder: "••••••••" },
                  { name: "confirmPassword", label: "Confirmation",   icon: ShieldCheck, placeholder: "••••••••" },
                ].map(field => (
                  <div key={field.name} className="group">
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 group-focus-within:text-cyan-500 transition-colors">{field.label}</label>
                    <div className="relative">
                      <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-cyan-500 transition-colors" />
                      <input
                        type="password"
                        name={field.name}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-90 mt-2"
                style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", boxShadow: "0 8px 30px rgba(6,182,212,0.3)" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>Créer mon compte <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-white/30">
                Déjà un compte ?{" "}
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">Connexion</Link>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex gap-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <span>© 2026 CIPHERPOOL</span>
          <span className="cursor-pointer hover:text-white/40 transition-colors">Privacy</span>
          <span className="cursor-pointer hover:text-white/40 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  );
}
