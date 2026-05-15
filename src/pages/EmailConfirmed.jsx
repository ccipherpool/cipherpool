import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { ShieldCheck, Loader, AlertTriangle, ArrowRight } from "lucide-react";
import GamingLogin from "../components/ui/GamingLogin";
import { useAuth } from "../contexts/AuthContext";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    handleCallback();
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) { navigate("/dashboard"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  const handleCallback = async () => {
    try {
      // PKCE flow: code in query params
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setErrorMsg(error.message); setStatus("error"); return; }
        if (data?.session?.user) await refreshCurrentUser?.(data.session.user.id);
        setStatus("success");
        return;
      }

      // Legacy hash-based flow or already signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await refreshCurrentUser?.(session.user.id);
        setStatus("success");
        return;
      }

      // Wait for onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          setStatus("success");
        }
      });

      // Timeout after 6 seconds
      setTimeout(() => {
        subscription.unsubscribe();
        if (status === "loading") {
          setErrorMsg("Verification timed out. Please try again.");
          setStatus("error");
        }
      }, 6000);

    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-obsidian-deep">
      <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 w-full max-w-md"
      >
        <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/55 border border-white/10 shadow-2xl text-center">

          {/* Loading */}
          {status === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center">
                <Loader size={32} className="text-indigo-400 animate-spin" />
              </div>
              <h1 className="text-xl font-black text-white mb-2">Verifying your email...</h1>
              <p className="text-white/40 text-sm">Please wait a moment.</p>
            </motion.div>
          )}

          {/* Success */}
          {status === "success" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Glowing shield */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-green-500/20"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="relative w-24 h-24 rounded-full bg-green-900/40 border border-green-500/40 flex items-center justify-center"
                >
                  <ShieldCheck size={40} className="text-green-400" />
                </motion.div>
              </div>

              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                Identity Verified
              </span>

              <h1 className="text-2xl font-black text-white mt-5 mb-2 tracking-tight">
                Email Confirmed!
              </h1>
              <p className="text-white/50 text-sm mb-8">
                Welcome to CipherPool. Your account is now active.
              </p>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="text-3xl font-black text-green-400">{countdown}</div>
                <p className="text-white/40 text-xs text-left">
                  Redirecting to<br />dashboard...
                </p>
              </div>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-black font-black text-sm transition-all flex items-center justify-center gap-2"
              >
                Enter CipherPool <ArrowRight size={15} />
              </button>
            </motion.div>
          )}

          {/* Error */}
          {status === "error" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle size={34} className="text-red-400" />
              </div>

              <h1 className="text-xl font-black text-white mb-2">Verification Failed</h1>
              <p className="text-white/40 text-sm mb-2">
                {errorMsg || "The verification link may have expired."}
              </p>
              <p className="text-white/30 text-xs mb-7">
                Links expire after 24 hours. Request a new one below.
              </p>

              <button
                onClick={() => navigate("/verify-email")}
                className="w-full py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm hover:bg-indigo-600/30 transition-all mb-3"
              >
                Resend verification email
              </button>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:text-white/80 transition-all"
              >
                Back to login
              </button>
            </motion.div>
          )}

        </div>
      </motion.div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] z-20">
        © 2026 CIPHERPOOL ARENA. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
