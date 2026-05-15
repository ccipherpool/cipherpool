import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Mail, ArrowLeft, CheckCircle, Send, Loader } from "lucide-react";
import GamingLogin from "../components/ui/GamingLogin";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-obsidian-deep">
      <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 w-full max-w-md"
      >
        <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/55 border border-white/10 shadow-2xl">

          <AnimatePresence mode="wait">
            {status !== "sent" ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Icon */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-amber-500/20"
                  />
                  <div className="relative w-16 h-16 rounded-full bg-amber-900/30 border border-amber-500/25 flex items-center justify-center">
                    <KeyRound size={26} className="text-amber-400" />
                  </div>
                </div>

                <div className="text-center mb-6">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    Password Recovery
                  </span>
                  <h1 className="text-2xl font-black text-white mt-4 mb-2 tracking-tight">
                    Forgot your password?
                  </h1>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                    />
                  </div>

                  {status === "error" && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
                      {errorMsg}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading" || !email.trim()}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900/30 disabled:text-amber-700 text-black font-black text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {status === "loading"
                      ? <><Loader size={14} className="animate-spin" /> Sending...</>
                      : <><Send size={14} /> Send Reset Link</>
                    }
                  </button>
                </form>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-white/30 text-xs hover:text-white/60 transition-colors mt-5"
                >
                  <ArrowLeft size={11} /> Back to login
                </Link>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                {/* Success state */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-green-500/20"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="relative w-20 h-20 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center"
                  >
                    <CheckCircle size={34} className="text-green-400" />
                  </motion.div>
                </div>

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                  Email Sent
                </span>

                <h1 className="text-2xl font-black text-white mt-5 mb-2 tracking-tight">
                  Check your inbox!
                </h1>
                <p className="text-white/50 text-sm mb-2">
                  We sent a password reset link to:
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-6 break-all">
                  <span className="text-white text-sm font-semibold">{email}</span>
                </div>
                <p className="text-white/30 text-xs mb-7 leading-relaxed">
                  The link expires in 1 hour. Check your spam folder if needed.
                </p>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors"
                >
                  <ArrowLeft size={11} /> Back to login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] z-20">
        © 2026 CIPHERPOOL ARENA. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
