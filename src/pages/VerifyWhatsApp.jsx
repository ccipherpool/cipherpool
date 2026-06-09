import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const SANDBOX_NUMBER   = import.meta.env.VITE_TWILIO_SANDBOX_NUMBER   || "14155238886";
const SANDBOX_JOINCODE = import.meta.env.VITE_TWILIO_SANDBOX_JOINCODE || "join cipherpool";
const RESEND_COOLDOWN  = 60;

const C = {
  bg:      "#020617",
  surface: "rgba(8,8,18,0.95)",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
  green:   "#25d366",
  greenD:  "#128c7e",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.25)",
};

// ── Step dots ─────────────────────────────────────────────────
function Steps({ current }) {
  const labels = ["Numéro", "Code OTP", "Terminé"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done   = current > n;
        const active = current === n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: n < labels.length ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800,
                background: done ? C.green : active ? C.greenD : "rgba(255,255,255,0.06)",
                border: `2px solid ${done ? C.green : active ? C.green + "80" : "rgba(255,255,255,0.1)"}`,
                color: done || active ? "#fff" : C.text3,
                transition: "all 0.3s",
                boxShadow: active ? `0 0 14px ${C.green}40` : "none",
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", letterSpacing: 0.3, color: done || active ? C.green : C.text3 }}>
                {label}
              </span>
            </div>
            {n < labels.length && (
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

function ErrorBox({ error, onClose }) {
  if (!error) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        padding: "10px 12px", borderRadius: 10, marginBottom: 14,
        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <span style={{ fontSize: 14 }}>❌</span>
      <p style={{ flex: 1, fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{error}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function VerifyWhatsApp() {
  const navigate = useNavigate();
  const { user, profile, refreshCurrentUser } = useAuth();

  // step: 1=enter phone+send OTP, 2=enter OTP code, 3=success
  const [step,      setStep]      = useState(1);
  const [phone,     setPhone]     = useState("");
  const [code,      setCode]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState(null);
  const [countdown, setCountdown] = useState(0);
  const codeInputRef              = useRef(null);
  const timerRef                  = useRef(null);

  // Auth guards
  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (profile?.whatsapp_verified) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  // Pre-fill phone from profile if available
  useEffect(() => {
    if (profile?.whatsapp_number && !phone) setPhone(profile.whatsapp_number);
  }, [profile]);

  // Countdown timer for resend button
  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Step 1: Send OTP via edge function ───────────────────────
  const handleSendCode = async () => {
    setError(null);
    const normalized = phone.trim().replace(/\s+/g, "");
    if (!/^\+\d{8,15}$/.test(normalized)) {
      setError("Format invalide — ex: +212600000000");
      return;
    }
    setSending(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "send", phone: normalized },
      });
      if (fnErr) throw new Error(fnErr.message || "Échec de l'envoi");
      if (data?.error) throw new Error(data.error);
      setPhone(normalized);
      setCode("");
      setStep(2);
      startCountdown();
      setTimeout(() => codeInputRef.current?.focus(), 200);
    } catch (e) {
      setError(e.message || "Impossible d'envoyer le code. Assurez-vous d'avoir rejoint la sandbox WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: Verify OTP code ───────────────────────────────────
  const handleVerify = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Le code doit contenir exactement 6 chiffres.");
      return;
    }
    setVerifying(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "verify", phone, code: trimmed },
      });
      if (fnErr) throw new Error(fnErr.message || "Échec de la vérification");
      if (data?.error) throw new Error(data.error);
      await refreshCurrentUser?.();
      setStep(3);
      setTimeout(() => navigate("/dashboard", { replace: true }), 2400);
    } catch (e) {
      setError(e.message || "Code incorrect ou expiré.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || sending) return;
    setError(null);
    setSending(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "send", phone },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setCode("");
      startCountdown();
    } catch (e) {
      setError(e.message || "Impossible d'envoyer le code.");
    } finally {
      setSending(false);
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
        background: "radial-gradient(ellipse, rgba(37,211,102,0.06) 0%, transparent 70%)",
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
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
        }}>

          {/* Header */}
          <div style={{ padding: "24px 28px 20px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18, margin: "0 auto 14px",
              background: "linear-gradient(135deg, rgba(37,211,102,0.2), rgba(18,140,126,0.1))",
              border: "1px solid rgba(37,211,102,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: "0 8px 32px rgba(37,211,102,0.12)",
            }}>
              💬
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 5px", letterSpacing: -0.3 }}>
              Vérifier WhatsApp
            </h1>
            <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
              Requis pour recevoir les notifications du tournoi
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

                  {/* Sandbox join notice */}
                  <div style={{
                    padding: "12px 14px", borderRadius: 10, marginBottom: 18,
                    background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
                      Étape préalable — rejoindre la sandbox
                    </div>
                    <p style={{ fontSize: 12, color: C.text2, margin: "0 0 10px", lineHeight: 1.6 }}>
                      Envoyez <strong style={{ color: C.text, fontFamily: "monospace" }}>{SANDBOX_JOINCODE}</strong> à notre numéro WhatsApp pour activer les messages.
                    </p>
                    <a
                      href={`https://wa.me/${SANDBOX_NUMBER}?text=${encodeURIComponent(SANDBOX_JOINCODE)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "7px 12px", borderRadius: 8,
                        background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.25)",
                        color: C.green, fontSize: 12, fontWeight: 700, textDecoration: "none",
                      }}
                    >
                      💬 Rejoindre via WhatsApp
                    </a>
                  </div>

                  <label style={{
                    fontSize: 10, fontWeight: 700, color: C.text3,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    display: "block", marginBottom: 6,
                  }}>
                    Votre numéro WhatsApp
                  </label>

                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <div style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      fontSize: 16, pointerEvents: "none",
                    }}>📱</div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === "Enter" && handleSendCode()}
                      placeholder="+212600000000"
                      style={{
                        width: "100%", padding: "12px 14px 12px 46px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : C.border2}`,
                        borderRadius: 12, color: C.text, fontSize: 15, fontWeight: 600,
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                        letterSpacing: 1, transition: "border-color 0.2s",
                      }}
                      onFocus={e => { e.target.style.borderColor = "rgba(37,211,102,0.5)"; }}
                      onBlur={e  => { e.target.style.borderColor = error ? "rgba(239,68,68,0.4)" : C.border2; }}
                    />
                  </div>

                  <p style={{ fontSize: 11, color: C.text3, margin: "0 0 16px" }}>
                    Format international — ex: +212 (Maroc), +213 (Algérie), +216 (Tunisie)
                  </p>

                  <ErrorBox error={error} onClose={() => setError(null)} />

                  <button
                    onClick={handleSendCode}
                    disabled={sending || !phone.trim()}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: sending || !phone.trim()
                        ? "rgba(37,211,102,0.15)"
                        : "linear-gradient(135deg, #128c7e, #25d366)",
                      color: sending || !phone.trim() ? "rgba(255,255,255,0.3)" : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: sending ? "wait" : !phone.trim() ? "not-allowed" : "pointer",
                      boxShadow: !sending && phone.trim() ? "0 4px 20px rgba(37,211,102,0.25)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {sending ? (
                      <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} /> Envoi du code…</>
                    ) : "📨 Envoyer le code de vérification"}
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Enter OTP code ── */}
              {step === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  <div style={{
                    padding: "12px 14px", borderRadius: 10, marginBottom: 20,
                    background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)",
                  }}>
                    <p style={{ fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.6 }}>
                      Un code à 6 chiffres a été envoyé via WhatsApp au{" "}
                      <strong style={{ color: C.text, fontFamily: "monospace" }}>{phone}</strong>.
                      Entrez-le ci-dessous pour confirmer votre numéro.
                    </p>
                  </div>

                  <label style={{
                    fontSize: 10, fontWeight: 700, color: C.text3,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    display: "block", marginBottom: 6,
                  }}>
                    Code de vérification (6 chiffres)
                  </label>

                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && code.length === 6 && handleVerify()}
                    placeholder="000000"
                    style={{
                      width: "100%", padding: "16px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${error ? "rgba(239,68,68,0.4)" : C.border2}`,
                      borderRadius: 12, color: C.text, fontSize: 28, fontWeight: 800,
                      outline: "none", fontFamily: "monospace", boxSizing: "border-box",
                      letterSpacing: 10, textAlign: "center", marginBottom: 6,
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(37,211,102,0.5)"; }}
                    onBlur={e  => { e.target.style.borderColor = error ? "rgba(239,68,68,0.4)" : C.border2; }}
                  />

                  <p style={{ fontSize: 11, color: C.text3, margin: "0 0 16px" }}>
                    Ce code expire dans 10 minutes. Maximum 5 tentatives.
                  </p>

                  <ErrorBox error={error} onClose={() => setError(null)} />

                  <button
                    onClick={handleVerify}
                    disabled={verifying || code.length !== 6}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: verifying || code.length !== 6
                        ? "rgba(37,211,102,0.15)"
                        : "linear-gradient(135deg, #128c7e, #25d366)",
                      color: verifying || code.length !== 6 ? "rgba(255,255,255,0.3)" : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: verifying ? "wait" : code.length !== 6 ? "not-allowed" : "pointer",
                      boxShadow: !verifying && code.length === 6 ? "0 4px 20px rgba(37,211,102,0.25)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginBottom: 14, transition: "all 0.2s",
                    }}
                  >
                    {verifying ? (
                      <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} /> Vérification…</>
                    ) : "✅ Confirmer le code"}
                  </button>

                  {/* Resend + change number */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      onClick={handleResend}
                      disabled={countdown > 0 || sending}
                      style={{
                        background: "none", border: "none", padding: 0,
                        fontSize: 12, fontWeight: 600,
                        color: countdown > 0 || sending ? C.text3 : C.green,
                        cursor: countdown > 0 || sending ? "default" : "pointer",
                        textDecoration: countdown > 0 ? "none" : "underline",
                      }}
                    >
                      {sending ? "Envoi…" : countdown > 0 ? `Renvoyer dans ${countdown}s` : "Renvoyer le code"}
                    </button>
                    <button
                      onClick={() => { setStep(1); setCode(""); setError(null); clearInterval(timerRef.current); setCountdown(0); }}
                      style={{ background: "none", border: "none", fontSize: 12, color: C.text3, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ← Changer de numéro
                    </button>
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
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ fontSize: 56, marginBottom: 16 }}
                  >
                    🎉
                  </motion.div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
                    WhatsApp vérifié !
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 24px", lineHeight: 1.6 }}>
                    Votre numéro a été confirmé. Vous recevrez désormais les notifications des tournois sur WhatsApp.
                  </p>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: "100%" }}
                      transition={{ duration: 2.3, ease: "linear" }}
                      style={{ height: "100%", background: "linear-gradient(90deg, #128c7e, #25d366)", borderRadius: 2 }}
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: C.text3, marginTop: 18, letterSpacing: 0.5, textTransform: "uppercase" }}>
          © 2026 CipherPool Arena · Vérification sécurisée via OTP WhatsApp
        </p>
      </motion.div>

      <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
