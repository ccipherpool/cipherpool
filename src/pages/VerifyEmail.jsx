import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, ArrowLeft, CheckCircle, Shield } from "lucide-react";
import GamingLogin from "../components/ui/GamingLogin";

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || localStorage.getItem("pending_verify_email") || "";
  const [cooldown, setCooldown] = useState(60);
  const [resendStatus, setResendStatus] = useState(null); // 'sent' | 'error' | null
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (email) localStorage.setItem("pending_verify_email", email);
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setResendStatus(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/email-confirmed` },
    });
    setResending(false);
    if (error) {
      setResendStatus("error");
    } else {
      setResendStatus("sent");
      setCooldown(60);
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
        <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/55 border border-white/10 shadow-2xl text-center">

          {/* Animated icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-indigo-500/25"
            />
            <div className="relative w-20 h-20 rounded-full bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center">
              <Mail size={34} className="text-indigo-300" />
            </div>
          </div>

          {/* Badge */}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Email Verification Required
          </span>

          <h1 className="text-2xl font-black text-white mt-5 mb-2 tracking-tight">
            Check your inbox!
          </h1>

          <p className="text-white/50 text-sm mb-3 leading-relaxed">
            We sent a verification link to:
          </p>

          {email && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-5 break-all">
              <span className="text-white text-sm font-semibold">{email}</span>
            </div>
          )}

          <p className="text-white/35 text-xs mb-7 leading-relaxed">
            Click the link in the email to activate your CipherPool account.
            <br />If you don't see it, check your spam folder.
          </p>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mb-3 ${
              cooldown > 0 || resending
                ? "bg-white/5 border border-white/10 text-white/25 cursor-not-allowed"
                : "bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-600/25 hover:border-indigo-500/40"
            }`}
          >
            <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend verification email"}
          </button>

          <AnimatePresence>
            {resendStatus === "sent" && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-green-400 text-xs mb-3 flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={12} /> New verification email sent!
              </motion.p>
            )}
            {resendStatus === "error" && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs mb-3"
              >
                Failed to resend. Try again later.
              </motion.p>
            )}
          </AnimatePresence>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-white/30 text-xs hover:text-white/60 transition-colors mt-2"
          >
            <ArrowLeft size={11} /> Back to login
          </Link>
        </div>
      </motion.div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] z-20">
        © 2026 CIPHERPOOL ARENA. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
