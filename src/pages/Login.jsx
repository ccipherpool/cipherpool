import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MeshGradient } from "@paper-design/shaders-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden font-sans">

      {/* Background */}
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
      <div className="hidden md:flex md:w-1/2 relative z-10 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-3xl font-black text-black shadow-2xl"
            style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", boxShadow: "0 0 60px rgba(6,182,212,0.3)" }}
          >
            CP
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-black mb-6 tracking-tight leading-tight"
          >
            RETOUR AU
            <br />
            <span style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              COMBAT.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/40 text-base leading-relaxed"
          >
            Connecte-toi pour accéder à tes tournois, tes récompenses et ton équipe. La gloire t'attend.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10 grid grid-cols-2 gap-4"
          >
            {[{ val: "10K+", label: "Joueurs actifs" }, { val: "500+", label: "Tournois organisés" }].map((s, i) => (
              <div key={i} className="p-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-2xl font-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.val}</p>
                <p className="text-xs text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
          <span className="font-black text-lg tracking-wider">CIPHERPOOL</span>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div
            className="p-8 rounded-3xl"
            style={{ background: "rgba(12,12,26,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-black mb-2 tracking-tight">Connexion</h1>
              <p className="text-white/40 text-sm">Heureux de te revoir parmi nous.</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl flex gap-3 items-center"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="group">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 group-focus-within:text-cyan-500 transition-colors">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-cyan-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder-white/20 outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
              </div>

              <div className="group">
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] group-focus-within:text-cyan-500 transition-colors">Mot de passe</label>
                  <span className="text-[10px] text-white/25 cursor-pointer hover:text-cyan-500 transition-colors uppercase tracking-tighter">Oublié ?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-cyan-500 transition-colors" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder-white/20 outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(6,182,212,0.4)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)", boxShadow: "0 8px 30px rgba(6,182,212,0.3)" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>Se connecter <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/30">
                Pas encore de compte ?{" "}
                <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
                  Inscris-toi
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex gap-6 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <span>© 2026 CIPHERPOOL</span>
          <span className="cursor-pointer hover:text-white/40 transition-colors">Privacy</span>
          <span className="cursor-pointer hover:text-white/40 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  );
}
