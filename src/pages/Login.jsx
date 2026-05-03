import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Brand & Visual (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#0f0f1a] items-center justify-center p-12 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative z-10 max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/20"
          >
            <span className="text-4xl font-black tracking-tighter">CP</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent"
          >
            RETOUR AU COMBAT. <br/>DÉFIE LES MEILLEURS.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-neutral-400 text-lg leading-relaxed mb-8"
          >
            Connecte-toi pour accéder à tes tournois, tes récompenses et ton équipe. La gloire t'attend.
          </motion.p>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 mb-12">
           <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center font-black text-sm">CP</div>
           <span className="text-xl font-bold tracking-tight">CIPHERPOOL</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Connexion</h1>
            <p className="text-neutral-500">Heureux de te revoir parmi nous.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div className="group">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-purple-500 transition-colors">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="group">
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest group-focus-within:text-purple-500 transition-colors">Mot de passe</label>
                  <Link to="/forgot-password" size="sm" className="text-[10px] font-bold text-neutral-600 hover:text-purple-500 transition-colors uppercase tracking-tighter">Oublié ?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-purple-500 transition-colors" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#0f0f1a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-600 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-2xl font-bold text-white shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-500 font-medium">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-purple-500 hover:text-purple-400 font-bold ml-1 transition-colors">
                Inscris-toi ici
              </Link>
            </p>
          </div>
        </motion.div>
        
        {/* Footer info */}
        <div className="mt-auto pt-12 flex gap-8 text-[10px] font-bold text-neutral-700 uppercase tracking-[0.2em]">
          <span>© 2026 CIPHERPOOL</span>
          <span className="cursor-pointer hover:text-neutral-500 transition-colors">Privacy</span>
          <span className="cursor-pointer hover:text-neutral-500 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  );
}
