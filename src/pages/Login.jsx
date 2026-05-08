import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  ChevronLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Terminal
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { ShaderBackground } from "../components/ui/ShaderBackground";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-obsidian-deep flex items-center justify-center p-6 overflow-hidden">
      {/* 2026 Background Engine */}
      <ShaderBackground className="!absolute inset-0 z-0" />
      
      {/* Dynamic Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-mint/10 blur-[150px] rounded-full animate-pulse-slow" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-purple/10 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Terminal Header */}
        <div className="mb-10 text-center space-y-4">
           <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors group mb-8">
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return to Base</span>
           </Link>
           
           <div className="flex justify-center">
              <div className="w-20 h-20 bg-mint rounded-[2rem] flex items-center justify-center text-obsidian shadow-neon-mint rotate-45 group hover:rotate-90 transition-transform duration-700">
                <ShieldCheck size={40} className="-rotate-45 group-hover:rotate-0 transition-transform duration-700" />
              </div>
           </div>

           <div className="space-y-1">
              <h2 className="text-4xl font-heading font-black tracking-tighter text-white uppercase">Initialize<br/>Access</h2>
              <div className="flex items-center justify-center gap-3">
                 <Terminal size={12} className="text-mint" />
                 <p className="text-[10px] font-mono tracking-[0.4em] text-mint/60 uppercase">Protocol: Secure Uplink v4.0</p>
              </div>
           </div>
        </div>

        {/* Access Terminal Form */}
        <div className="ultra-glass border-white/10 p-10 space-y-8 relative overflow-hidden group">
           {/* Scanline Effect */}
           <div className="absolute top-0 left-0 w-full h-[1px] bg-mint/30 -translate-y-full group-hover:translate-y-[400px] transition-transform duration-[3s] ease-linear repeat-infinite pointer-events-none" />
           
           <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                    <Mail size={12} /> Identity Hash
                 </label>
                 <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER_EMAIL_PROTOCOL"
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-mint/50 focus:bg-white/[0.06] transition-all duration-500 font-mono tracking-widest placeholder:text-slate-700 uppercase"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                    <Lock size={12} /> Access Sequence
                 </label>
                 <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ENTER_ACCESS_KEY"
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-mint/50 focus:bg-white/[0.06] transition-all duration-500 font-mono tracking-widest placeholder:text-slate-700 uppercase"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                 </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 bg-red-400/10 border border-red-400/20 p-4 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest"
                  >
                    <AlertCircle size={16} />
                    <span>Access Denied: {error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-4">
                 <Button 
                   variant="primary" 
                   size="xl" 
                   type="submit" 
                   loading={loading}
                   className="w-full py-5 rounded-2xl text-sm tracking-[0.3em] shadow-neon-mint group overflow-hidden"
                 >
                   <span className="relative z-10 flex items-center gap-3">
                     ESTABLISH LINK <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </span>
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                 </Button>
              </div>
           </form>

           <div className="flex flex-col items-center gap-4 pt-6 border-t border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active profile?</p>
              <Link 
                to="/register" 
                className="text-xs font-heading font-black text-white hover:text-mint transition-colors uppercase tracking-widest flex items-center gap-2 group"
              >
                Create New Unit <Sparkles size={14} className="text-cyber-gold group-hover:scale-125 transition-transform" />
              </Link>
           </div>
        </div>

        {/* Terminal Footer Info */}
        <div className="mt-12 flex justify-between items-center opacity-30 px-6">
           <div className="flex items-center gap-4 text-[8px] font-mono tracking-[0.3em] text-slate-500 uppercase">
              <div className="flex items-center gap-1.5">
                 <div className="w-1 h-1 rounded-full bg-mint" />
                 <span>Secure_AES-256</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-1 h-1 rounded-full bg-mint" />
                 <span>Encrypted_Link</span>
              </div>
           </div>
           <Cpu size={14} className="text-slate-500" />
        </div>
      </motion.div>
    </div>
  );
}
