import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader, ShieldCheck, ArrowRight } from "lucide-react";
import GamingLogin from "../components/ui/GamingLogin";
import { useAuth } from "../contexts/AuthContext";

const MotionDiv = motion.div;

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#10b981"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: i < score ? colors[score - 1] : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
      <div className="flex justify-between">
        {checks.map(c => (
          <span key={c.label} className="text-[9px]" style={{ color: c.ok ? "#10b981" : "rgba(255,255,255,0.2)" }}>
            {c.ok ? "✓" : "○"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [stage, setStage] = useState("loading"); // 'loading' | 'form' | 'success' | 'error'
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [initError, setInitError] = useState("");

  async function initSession() {
    let timeoutId;
    let subscription;

    try {
      // PKCE: exchange code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setInitError(error.message); setStage("error"); return; }
        setStage("form");
        return;
      }

      // Hash-based recovery flow
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      const errorDescription = hashParams.get("error_description");

      if (errorDescription) {
        setInitError(errorDescription.replace(/\+/g, " "));
        setStage("error");
        return;
      }

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setInitError(error.message);
          setStage("error");
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);
        setStage("form");
        return;
      }

      if (type === "recovery") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setStage("form"); return; }
      }

      // Wait for onAuthStateChange
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          subscription.unsubscribe();
          clearTimeout(timeoutId);
          setStage("form");
        }
      });
      subscription = data.subscription;

      timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        setInitError("This reset link has expired or is invalid. Please request a new one.");
        setStage("error");
      }, 5000);

    } catch (err) {
      setInitError(err.message);
      setStage("error");
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(initSession, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setFormError("Passwords do not match."); return; }

    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) { setFormError(error.message); return; }

    if (data?.user) await refreshCurrentUser?.(data.user.id);
    await supabase.auth.signOut();
    setStage("success");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-obsidian-deep">
      <GamingLogin.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <MotionDiv
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-20 w-full max-w-md"
      >
        <div className="p-8 rounded-2xl backdrop-blur-sm bg-black/55 border border-white/10 shadow-2xl">

          <AnimatePresence mode="wait">

            {/* Loading */}
            {stage === "loading" && (
              <MotionDiv key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center">
                  <Loader size={26} className="text-indigo-400 animate-spin" />
                </div>
                <p className="text-white/50 text-sm">Verifying reset link...</p>
              </MotionDiv>
            )}

            {/* Form */}
            {stage === "form" && (
              <MotionDiv key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-6">
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <MotionDiv animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-indigo-500/20" />
                    <div className="relative w-16 h-16 rounded-full bg-indigo-900/30 border border-indigo-500/25 flex items-center justify-center">
                      <Lock size={24} className="text-indigo-300" />
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                    Set New Password
                  </span>
                  <h1 className="text-2xl font-black text-white mt-4 mb-1 tracking-tight">New password</h1>
                  <p className="text-white/40 text-xs">Choose a strong password for your account.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  {/* New password */}
                  <div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"><Lock size={15} /></div>
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="New password"
                        required
                        className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors text-sm"
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  {/* Confirm password */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"><Lock size={15} /></div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className={`w-full pl-10 pr-10 py-3 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors text-sm border ${confirmPassword && password !== confirmPassword ? "border-red-500/40" : confirmPassword && password === confirmPassword ? "border-green-500/40" : "border-white/10 focus:border-indigo-500/50"}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {formError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center flex items-center justify-center gap-1">
                      <AlertTriangle size={11} /> {formError}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !password || !confirmPassword}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader size={14} className="animate-spin" /> Updating...</> : <><ShieldCheck size={14} /> Reset Password</>}
                  </button>
                </form>
              </MotionDiv>
            )}

            {/* Success */}
            {stage === "success" && (
              <MotionDiv key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <MotionDiv animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full bg-green-500/20" />
                  <MotionDiv initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="relative w-20 h-20 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle size={34} className="text-green-400" />
                  </MotionDiv>
                </div>

                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">Password Updated</span>
                <h1 className="text-2xl font-black text-white mt-5 mb-2">Password changed!</h1>
                <p className="text-white/50 text-sm mb-8">Your new password is active. Log in to continue.</p>

                <button onClick={() => navigate("/login")} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-black font-black text-sm transition-all flex items-center justify-center gap-2">
                  Back to Login <ArrowRight size={14} />
                </button>
              </MotionDiv>
            )}

            {/* Error */}
            {stage === "error" && (
              <MotionDiv key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/30 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={34} className="text-red-400" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Link Expired</h1>
                <p className="text-white/40 text-sm mb-6">{initError || "This reset link is invalid or expired."}</p>

                <button onClick={() => navigate("/forgot-password")} className="w-full py-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 font-bold text-sm hover:bg-amber-600/30 transition-all mb-3">
                  Request a new reset link
                </button>
                <button onClick={() => navigate("/login")} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:text-white/80 transition-all">
                  Back to login
                </button>
              </MotionDiv>
            )}

          </AnimatePresence>
        </div>
      </MotionDiv>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-600 text-[9px] font-black uppercase tracking-[0.5em] z-20">
        © 2026 CIPHERPOOL ARENA. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
