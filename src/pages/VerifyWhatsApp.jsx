import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:      "#020617",
  surface: "rgba(8,8,18,0.92)",
  border:  "rgba(255,255,255,0.09)",
  border2: "rgba(255,255,255,0.14)",
  accent:  "#6366f1",
  accentL: "#818cf8",
  green:   "#10b981",
  red:     "#ef4444",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.25)",
};

// ── Countdown hook ────────────────────────────────────────────
function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef(null);
  const start = useCallback((s) => {
    setLeft(s);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setLeft(p => { if (p <= 1) { clearInterval(timer.current); return 0; } return p - 1; });
    }, 1000);
  }, []);
  useEffect(() => () => clearInterval(timer.current), []);
  return { left, start };
}

// ── OTP input ─────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  const refs   = Array.from({ length: 6 }, () => useRef(null));

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const n = [...digits];
      if (n[i]) { n[i] = ""; onChange(n.join("")); }
      else if (i > 0) { n[i - 1] = ""; onChange(n.join("")); refs[i - 1].current?.focus(); }
      return;
    }
    if (e.key === "ArrowLeft"  && i > 0) refs[i-1].current?.focus();
    if (e.key === "ArrowRight" && i < 5) refs[i+1].current?.focus();
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const n = [...digits];
    for (let j = 0; j < raw.length && i + j < 6; j++) n[i + j] = raw[j];
    onChange(n.join("").slice(0, 6));
    refs[Math.min(i + raw.length, 5)].current?.focus();
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
          key={i} ref={refs[i]} type="text" inputMode="numeric"
          maxLength={1} value={d} disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{
            width: 48, height: 58, textAlign: "center",
            fontSize: 22, fontWeight: 800, color: C.text,
            background: d ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
            border: `2px solid ${d ? C.accent : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12, outline: "none", transition: "all 0.15s",
            caretColor: C.accent, opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Step indicator (2 steps) ──────────────────────────────────
function Steps({ current }) {
  const labels = ["Numéro WhatsApp", "Code de vérification"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done   = current > n;
        const active = current === n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: n < 2 ? 1 : "none" }}>
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
              <span style={{
                fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", letterSpacing: 0.3,
                color: done || active ? C.accentL : C.text3,
              }}>
                {label}
              </span>
            </div>
            {n < 2 && (
              <div style={{
                flex: 1, height: 2, borderRadius: 1, margin: "0 4px 14px",
                background: done ? C.green : "rgba(255,255,255,0.07)",
                transition: "background 0.4s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Error box ─────────────────────────────────────────────────
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

// ── Spinner ───────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
export default function VerifyWhatsApp() {
  const navigate = useNavigate();
  const { user, profile, refreshCurrentUser } = useAuth();

  // step: 1=enter phone, 2=enter otp, 3=success
  const [step,      setStep]      = useState(1);
  const [phone,     setPhone]     = useState("");
  const [otp,       setOtp]       = useState("");
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState(null);
  const { left: resendLeft, start: startResend } = useCountdown();

  // Guards
  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (profile?.whatsapp_verified) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  const callFn = async (body) => {
    const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-otp", { body });
    if (fnErr) throw new Error(fnErr.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // ── Send OTP ──────────────────────────────────────────────
  const handleSend = async () => {
    setError(null);
    const normalized = phone.trim().replace(/\s+/g, "");
    if (!/^\+\d{8,15}$/.test(normalized)) {
      setError("Format invalide — ex: +212600000000");
      return;
    }
    setSending(true);
    try {
      await callFn({ action: "send", phone: normalized });
      setStep(2);
      startResend(60);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.length < 6) { setError("Entrez les 6 chiffres du code"); return; }
    setError(null);
    setVerifying(true);
    try {
      const normalized = phone.trim().replace(/\s+/g, "");
      await callFn({ action: "verify", phone: normalized, code: otp });
      await refreshCurrentUser?.();
      setStep(3);
      setTimeout(() => navigate("/dashboard", { replace: true }), 2200);
    } catch (e) {
      setError(e.message);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 10 }}
      >
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
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, boxShadow: "0 8px 32px rgba(37,211,102,0.15)",
            }}>
              💬
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 5px", letterSpacing: -0.3 }}>
              Vérification WhatsApp
            </h1>
            <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
              Obligatoire pour accéder à CipherPool
            </p>
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            {step < 3 && <Steps current={step} />}

            <AnimatePresence mode="wait">

              {/* ── Step 1: Enter phone ── */}
              {step === 1 && (
                <motion.div key="s1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 18,
                    background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
                  }}>
                    <p style={{ fontSize: 11.5, color: C.text2, margin: 0, lineHeight: 1.6 }}>
                      Entrez votre numéro WhatsApp. Nous vous enverrons un code de vérification à 6 chiffres.
                    </p>
                  </div>

                  <label style={{
                    fontSize: 10, fontWeight: 700, color: C.text3,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    display: "block", marginBottom: 6,
                  }}>
                    Numéro WhatsApp
                  </label>

                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <div style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      fontSize: 16, pointerEvents: "none",
                    }}>
                      📱
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      placeholder="+212600000000"
                      style={{
                        width: "100%", padding: "12px 14px 12px 46px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : C.border2}`,
                        borderRadius: 12, color: C.text, fontSize: 15, fontWeight: 600,
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                        letterSpacing: 1, transition: "border-color 0.2s",
                      }}
                      onFocus={e => { e.target.style.borderColor = C.accent + "80"; }}
                      onBlur={e  => { e.target.style.borderColor = error ? "rgba(239,68,68,0.4)" : C.border2; }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: C.text3, margin: "0 0 16px" }}>
                    Format international — ex: +212 (Maroc), +213 (Algérie), +216 (Tunisie)
                  </p>

                  {error && <ErrorBox message={error} onClose={() => setError(null)} />}

                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: sending ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", fontSize: 14, fontWeight: 800,
                      cursor: sending ? "not-allowed" : "pointer",
                      boxShadow: sending ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {sending ? <><Spinner /> Envoi en cours…</> : "💬 Envoyer le code"}
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Enter OTP ── */}
              {step === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <p style={{ fontSize: 13, color: C.text2, marginBottom: 22, lineHeight: 1.6, textAlign: "center" }}>
                    Code envoyé sur WhatsApp à{" "}
                    <strong style={{ color: C.text }}>{phone}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: C.text3 }}>Valide 10 minutes.</span>
                  </p>

                  <div style={{ marginBottom: 20 }}>
                    <OTPInput value={otp} onChange={v => { setOtp(v); setError(null); }} disabled={verifying} />
                  </div>

                  {error && <ErrorBox message={error} onClose={() => setError(null)} />}

                  <button
                    onClick={handleVerify}
                    disabled={verifying || otp.length < 6}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: verifying || otp.length < 6
                        ? "rgba(99,102,241,0.2)"
                        : "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: otp.length < 6 ? C.text3 : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: verifying || otp.length < 6 ? "not-allowed" : "pointer",
                      boxShadow: otp.length === 6 ? "0 4px 24px rgba(99,102,241,0.4)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginBottom: 16, transition: "all 0.2s",
                    }}
                  >
                    {verifying ? <><Spinner /> Vérification…</> : "✅ Vérifier et continuer"}
                  </button>

                  {/* Resend / change number */}
                  <div style={{ textAlign: "center" }}>
                    {resendLeft > 0 ? (
                      <p style={{ fontSize: 12, color: C.text3 }}>
                        Renvoyer dans <strong style={{ color: C.text2 }}>{resendLeft}s</strong>
                      </p>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                        <button
                          onClick={() => { setOtp(""); setError(null); handleSend(); }}
                          style={{ background: "none", border: "none", fontSize: 12, color: C.accentL, cursor: "pointer", textDecoration: "underline" }}
                        >
                          Renvoyer le code
                        </button>
                        <span style={{ fontSize: 12, color: C.text3 }}>·</span>
                        <button
                          onClick={() => { setStep(1); setOtp(""); setError(null); }}
                          style={{ background: "none", border: "none", fontSize: 12, color: C.text3, cursor: "pointer", textDecoration: "underline" }}
                        >
                          Changer de numéro
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Success ── */}
              {step === 3 && (
                <motion.div key="s3"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", padding: "8px 0" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ fontSize: 56, marginBottom: 16 }}
                  >
                    🎉
                  </motion.div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
                    WhatsApp vérifié !
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 24px" }}>
                    Bienvenue dans CipherPool Arena. Redirection…
                  </p>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: "100%" }}
                      transition={{ duration: 2.1, ease: "linear" }}
                      style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #10b981)", borderRadius: 2 }}
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: C.text3, marginTop: 18, letterSpacing: 0.5, textTransform: "uppercase" }}>
          © 2026 CipherPool Arena · Vérification via WhatsApp
        </p>
      </motion.div>

      {/* CSS for spinner */}
      <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
