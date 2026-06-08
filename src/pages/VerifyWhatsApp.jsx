import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// ── Design tokens (match existing app) ───────────────────────
const C = {
  bg:      "#020617",
  surface: "rgba(8,8,18,0.92)",
  border:  "rgba(255,255,255,0.09)",
  border2: "rgba(255,255,255,0.14)",
  accent:  "#6366f1",
  accentL: "#818cf8",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.25)",
};

// Twilio sandbox join info — update to production WABA when ready
const SANDBOX_NUMBER  = "+14155238886";
const SANDBOX_JOIN    = "join threw-mathematics";

// ── OTP Input component ───────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  const refs   = Array.from({ length: 6 }, () => useRef(null));

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        next[i - 1] = "";
        onChange(next.join(""));
        refs[i - 1].current?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft"  && i > 0) { refs[i-1].current?.focus(); return; }
    if (e.key === "ArrowRight" && i < 5) { refs[i+1].current?.focus(); return; }
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const ch   = raw[raw.length - 1];
    const next = [...digits];
    next[i]    = ch;
    // Auto-fill remaining if pasted
    for (let j = 0; j < raw.length && i + j < 6; j++) next[i + j] = raw[j];
    onChange(next.join("").slice(0, 6));
    const focusIdx = Math.min(i + raw.length, 5);
    refs[focusIdx].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(raw.padEnd(6, "").slice(0, 6));
    refs[Math.min(raw.length, 5)].current?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{
            width: 48, height: 58, textAlign: "center",
            fontSize: 22, fontWeight: 800, color: C.text,
            background: d ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
            border: `2px solid ${d ? C.accent : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, outline: "none",
            transition: "all 0.15s", caretColor: C.accent,
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Countdown hook ────────────────────────────────────────────
function useCountdown(seconds) {
  const [left, setLeft] = useState(0);
  const timer = useRef(null);

  const start = useCallback((s) => {
    setLeft(s);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft(p => {
        if (p <= 1) { clearInterval(timer.current); return 0; }
        return p - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timer.current), []);
  return { left, start };
}

// ── Progress bar ──────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Join Sandbox", "Enter Phone", "Verify Code"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const n     = i + 1;
        const done  = current > n;
        const active = current === n;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: done ? C.green : active ? C.accent : "rgba(255,255,255,0.06)",
                border: `2px solid ${done ? C.green : active ? C.accent : "rgba(255,255,255,0.1)"}`,
                color: done || active ? "#fff" : C.text3,
                transition: "all 0.3s",
                boxShadow: active ? `0 0 16px ${C.accent}50` : "none",
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: done || active ? C.accentL : C.text3, whiteSpace: "nowrap", letterSpacing: 0.3 }}>
                {s}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 2, borderRadius: 1, margin: "0 4px 14px",
                background: done ? C.green : "rgba(255,255,255,0.07)", transition: "background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function VerifyWhatsApp() {
  const navigate = useNavigate();
  const { user, profile, refreshCurrentUser } = useAuth();

  const [step,     setStep]     = useState(1);  // 1=sandbox, 2=phone, 3=otp, 4=success
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [sending,  setSending]  = useState(false);
  const [verifying,setVerifying]= useState(false);
  const [error,    setError]    = useState(null);
  const { left: resendLeft, start: startResend } = useCountdown(0);

  // Redirect if already verified
  useEffect(() => {
    if (profile?.whatsapp_verified) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleSendCode = async () => {
    setError(null);
    const normalized = phone.trim().replace(/\s/g, "");
    if (!/^\+\d{8,15}$/.test(normalized)) {
      setError("Enter your phone number in international format, e.g. +212600000000");
      return;
    }
    setSending(true);
    try {
      const token = await getToken();
      const res   = await fetch("/api/whatsapp/send-code", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setStep(3);
      startResend(60);
    } catch (e) {
      setError(e.message);
    }
    setSending(false);
  };

  const handleVerify = async () => {
    if (otp.length < 6) { setError("Enter the full 6-digit code"); return; }
    setError(null);
    setVerifying(true);
    try {
      const token = await getToken();
      const normalized = phone.trim().replace(/\s/g, "");
      const res = await fetch("/api/whatsapp/verify-code", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ phone: normalized, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      // Refresh profile so ProtectedRoute unblocks
      await refreshCurrentUser?.();
      setStep(4);
      // Short delay then navigate
      setTimeout(() => navigate("/dashboard", { replace: true }), 2200);
    } catch (e) {
      setError(e.message);
      setOtp("");
    }
    setVerifying(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
        pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 10 }}
      >
        {/* Card */}
        <div style={{
          borderRadius: 20, overflow: "hidden",
          background: C.surface, backdropFilter: "blur(24px)",
          border: `1px solid ${C.border}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>

          {/* Header */}
          <div style={{ padding: "24px 28px 20px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
              background: "linear-gradient(135deg, rgba(37,211,102,0.2), rgba(37,211,102,0.05))",
              border: "1px solid rgba(37,211,102,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              boxShadow: "0 8px 32px rgba(37,211,102,0.15)",
            }}>
              💬
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 5px", letterSpacing: -0.3 }}>
              Verify WhatsApp
            </h1>
            <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
              Required to access CipherPool
            </p>
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            <Steps current={step <= 2 ? (step) : step === 3 ? 3 : 3} />

            <AnimatePresence mode="wait">

              {/* ── Step 1: Join sandbox ── */}
              {step === 1 && (
                <motion.div key="s1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Step 1 — Join WhatsApp Sandbox
                    </div>

                    <div style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
                      <p style={{ fontSize: 12, color: C.text2, margin: "0 0 12px", lineHeight: 1.6 }}>
                        To receive messages from CipherPool, send this message on WhatsApp:
                      </p>
                      <div style={{
                        background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 16px",
                        fontFamily: "monospace", fontSize: 15, fontWeight: 700,
                        color: "#4ade80", letterSpacing: 0.5, marginBottom: 12, wordBreak: "break-all",
                      }}>
                        {SANDBOX_JOIN}
                      </div>
                      <p style={{ fontSize: 12, color: C.text2, margin: "0 0 8px" }}>
                        Send to this number on WhatsApp:
                      </p>
                      <div style={{
                        background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "12px 16px",
                        fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: C.text,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span>{SANDBOX_NUMBER}</span>
                        <a
                          href={`https://wa.me/${SANDBOX_NUMBER.replace("+", "")}?text=${encodeURIComponent(SANDBOX_JOIN)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", textDecoration: "none",
                            padding: "4px 10px", background: "rgba(74,222,128,0.1)", borderRadius: 6,
                            border: "1px solid rgba(74,222,128,0.25)" }}
                        >
                          Open WhatsApp ↗
                        </a>
                      </div>
                    </div>

                    <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <p style={{ fontSize: 11, color: "rgba(251,191,36,0.8)", margin: 0, lineHeight: 1.6 }}>
                        You must send the join message <strong>before</strong> requesting your verification code. Otherwise WhatsApp cannot deliver it.
                      </p>
                    </div>
                  </div>

                  <button onClick={() => { setStep(2); setError(null); }} style={{
                    width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, rgba(37,211,102,0.8), rgba(16,185,129,0.7))",
                    color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    ✅ I Sent The Join Message
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Enter phone ── */}
              {step === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Step 2 — Your WhatsApp Number
                    </div>
                    <p style={{ fontSize: 12, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
                      Enter the phone number you used to send the join message. We'll send your 6-digit code there.
                    </p>

                    <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                      Phone Number
                    </label>
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>
                        📱
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(null); }}
                        placeholder="+212600000000"
                        onKeyDown={e => e.key === "Enter" && handleSendCode()}
                        style={{
                          width: "100%", padding: "12px 14px 12px 46px",
                          background: "rgba(255,255,255,0.04)",
                          border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : C.border2}`,
                          borderRadius: 12, color: C.text, fontSize: 15, fontWeight: 600,
                          outline: "none", fontFamily: "inherit", boxSizing: "border-box", letterSpacing: 1,
                        }}
                        onFocus={e => e.target.style.borderColor = C.accent + "80"}
                        onBlur={e  => e.target.style.borderColor = error ? "rgba(239,68,68,0.4)" : C.border2}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: C.text3, marginTop: 5, marginBottom: 0 }}>
                      International format required — e.g. +212 for Morocco, +213 for Algeria
                    </p>
                  </div>

                  {error && <ErrorBox message={error} onClose={() => setError(null)} />}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setStep(1); setError(null); }} style={{
                      flex: 1, padding: "12px 0", borderRadius: 12,
                      border: `1px solid ${C.border2}`, background: "transparent",
                      color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                      ← Back
                    </button>
                    <button onClick={handleSendCode} disabled={sending} style={{
                      flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
                      background: sending ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", fontSize: 14, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
                      boxShadow: sending ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      {sending ? <><Spinner /> Sending…</> : "💬 Send Code"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Enter OTP ── */}
              {step === 3 && (
                <motion.div key="s3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Step 3 — Enter Verification Code
                    </div>
                    <p style={{ fontSize: 12, color: C.text2, marginBottom: 20, lineHeight: 1.6 }}>
                      A 6-digit code was sent to <strong style={{ color: C.text }}>{phone}</strong> on WhatsApp. It expires in 10 minutes.
                    </p>

                    <OTPInput value={otp} onChange={setOtp} disabled={verifying} />
                  </div>

                  {error && <ErrorBox message={error} onClose={() => setError(null)} />}

                  <button onClick={handleVerify} disabled={verifying || otp.length < 6} style={{
                    width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                    background: verifying || otp.length < 6
                      ? "rgba(99,102,241,0.2)"
                      : "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: otp.length < 6 ? C.text3 : "#fff",
                    fontSize: 14, fontWeight: 800,
                    cursor: verifying || otp.length < 6 ? "not-allowed" : "pointer",
                    boxShadow: otp.length === 6 ? "0 4px 24px rgba(99,102,241,0.4)" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginBottom: 14, transition: "all 0.2s",
                  }}>
                    {verifying ? <><Spinner /> Verifying…</> : "✅ Verify & Continue"}
                  </button>

                  {/* Resend */}
                  <div style={{ textAlign: "center" }}>
                    {resendLeft > 0 ? (
                      <p style={{ fontSize: 12, color: C.text3 }}>
                        Resend available in <strong style={{ color: C.text2 }}>{resendLeft}s</strong>
                      </p>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                        <button onClick={() => { setStep(2); setOtp(""); setError(null); }} style={{
                          background: "none", border: "none", fontSize: 12, color: C.accentL,
                          cursor: "pointer", textDecoration: "underline",
                        }}>
                          Resend code
                        </button>
                        <span style={{ fontSize: 12, color: C.text3 }}>·</span>
                        <button onClick={() => { setStep(1); setOtp(""); setError(null); }} style={{
                          background: "none", border: "none", fontSize: 12, color: C.text3,
                          cursor: "pointer", textDecoration: "underline",
                        }}>
                          Change number
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Success ── */}
              {step === 4 && (
                <motion.div key="s4"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", padding: "8px 0" }}>
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ fontSize: 56, marginBottom: 16 }}
                  >
                    🎉
                  </motion.div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
                    WhatsApp Verified!
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 20px" }}>
                    Welcome to CipherPool Arena. Redirecting…
                  </p>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                      style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 2 }}
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 10, color: C.text3, marginTop: 18, letterSpacing: 0.5, textTransform: "uppercase" }}>
          © 2026 CipherPool Arena · WhatsApp verification powered by Twilio
        </p>
      </motion.div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.2)",
      borderTopColor: "#fff",
      animation: "wa-spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function ErrorBox({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "10px 12px", borderRadius: 10, marginBottom: 14,
        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0 }}>❌</span>
      <p style={{ flex: 1, fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{message}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
    </motion.div>
  );
}
