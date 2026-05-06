import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    freeFireId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Fix: Remove 'coins' and 'xp' as they don't exist in 'profiles' table
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            full_name: formData.fullName,
            email: formData.email,
            free_fire_id: formData.freeFireId,
            role: "user",
            verification_status: "verified",
            level: 1
          }, { onConflict: 'id' });

        if (profileError) console.error("Profile error:", profileError);

        // Fix: Create wallet using try/catch to avoid .catch() issues
        try {
          await supabase.from("wallets").insert({
            user_id: authData.user.id,
            balance: 0
          });
        } catch (walletErr) {
          console.error("Wallet error:", walletErr);
        }
      }

      setSuccess("Compte créé avec succès! Bienvenue.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">CP</div>
          <h1 className="text-2xl font-black tracking-tight">Inscription</h1>
          <p className="text-neutral-500 text-sm">Crée ton compte CipherPool</p>
        </div>

        <div className="bg-[#131320] p-6 rounded-2xl border border-white/5 shadow-xl">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-300 text-xs">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-2 items-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-green-300 text-xs">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1 ml-1">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input type="text" name="fullName" placeholder="Mohamed Alami" value={formData.fullName} onChange={handleChange} required className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1 ml-1">ID Free Fire</label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input type="text" name="freeFireId" placeholder="123456789" value={formData.freeFireId} onChange={handleChange} required className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input type="email" name="email" placeholder="nom@exemple.com" value={formData.email} onChange={handleChange} required className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1 ml-1">Pass</label>
                <input type="password" name="password" placeholder="••••" value={formData.password} onChange={handleChange} required className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-purple-500/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1 ml-1">Confirmer</label>
                <input type="password" name="confirmPassword" placeholder="••••" value={formData.confirmPassword} onChange={handleChange} required className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-purple-500/50" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-sm mt-4 transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Déjà un compte ? <Link to="/login" className="text-purple-500 font-bold">Connexion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
