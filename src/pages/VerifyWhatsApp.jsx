import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const SANDBOX_NUMBER   = import.meta.env.VITE_TWILIO_SANDBOX_NUMBER   || "14155238886";
const SANDBOX_JOINCODE = import.meta.env.VITE_TWILIO_SANDBOX_JOINCODE || "join threw-mathematics";
const RESEND_COOLDOWN  = 60;

const C = {
  bg:      "#020617",
  surface: "rgba(8,10,20,0.97)",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
  green:   "#25d366",
  greenD:  "#128c7e",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.25)",
};

// ── Horizontal progress bar (5 logical steps) ──────────────────
// Step 1: Join WA  →  Step 2: Twilio confirms  →  Step 3: Code sent
// → Step 4: Enter OTP  →  Step 5: Done
// UI pages: page=1 = steps 1-3, page=2 = steps 3-4, page=3 = step 5
function ProgressBar({ page }) {
  const steps = [
    { n: 1, label: "Rejoindre WA"  },
    { n: 2, label: "WA confirmé"   },
    { n: 3, label: "Code envoyé"   },
    { n: 4, label: "Saisir OTP"    },
    { n: 5, label: "Terminé"       },
  ];

  // map page → logical step (which steps are "done")
  const done = page === 1 ? 0 : page === 2 ? 3 : 5;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {steps.map((s, i) => {
          const isDone   = done >= s.n;
          const isCurrent = done === s.n - 1;
          return (
            <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  background: isDone ? C.green : isCurrent ? "rgba(37,211,102,0.2)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${isDone ? C.green : isCurrent ? C.green + "60" : "rgba(255,255,255,0.1)"}`,
                  color: isDone ? "#fff" : isCurrent ? C.green : C.text3,
                  transition: "all 0.35s",
                  boxShadow: isCurrent ? `0 0 12px ${C.green}35` : "none",
                  flexShrink: 0,
                }}>
                  {isDone ? "✓" : s.n}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, whiteSpace: "nowrap", color: isDone ? C.green : isCurrent ? C.text2 : C.text3, transition: "color 0.3s" }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: "0 3px 14px",
                  background: isDone ? C.green : "rgba(255,255,255,0.07)",
                  borderRadius: 1, transition: "background 0.4s",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Error box ───────────────────────────────────────────────────
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
      <span style={{ fontSize: 14, flexShrink: 0 }}>❌</span>
      <p style={{ flex: 1, fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{error}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function VerifyWhatsApp() {
  const navigate = useNavigate();
  const { user, profile, refreshCurrentUser } = useAuth();

  // page: 1 = join sandbox + phone, 2 = OTP entry (WA confirmed ✅), 3 = success
  const [page,       setPage]       = useState(1);
  const [phone,      setPhone]      = useState("");
  const [code,       setCode]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [error,      setError]      = useState(null);
  const [notJoined,  setNotJoined]  = useState(false);  // Twilio "NOT_IN_SANDBOX" flag
  const [waOpened,   setWaOpened]   = useState(false);  // user has clicked the WA link
  const [countdown,  setCountdown]  = useState(0);
  const codeInputRef = useRef(null);
  const timerRef     = useRef(null);

  useEffect(() => { if (user === null) navigate("/login", { replace: true }); }, [user, navigate]);
  useEffect(() => { if (profile?.whatsapp_verified) navigate("/dashboard", { replace: true }); }, [profile, navigate]);
  useEffect(() => { if (profile?.whatsapp_number && !phone) setPhone(profile.whatsapp_number); }, [profile]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; });
    }, 1000);
  };

  // ── Verify sandbox join + send OTP ──────────────────────────
  // This is the actual Twilio verification. If Twilio accepts the send,
  // it proves the number has joined the sandbox. If Twilio returns a
  // "not opted in" error, we show the sandbox instructions again.
  const handleSendCode = async () => {
    setError(null);
    setNotJoined(false);
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

      if (data?.error === "NOT_IN_SANDBOX") {
        // Twilio rejected: number hasn't joined the sandbox
        setNotJoined(true);
        return;
      }
      if (data?.error) throw new Error(data.message || data.error);

      // ✅ Twilio accepted — sandbox join confirmed + OTP sent
      setPhone(normalized);
      setCode("");
      setNotJoined(false);
      setPage(2);
      startCountdown();
      setTimeout(() => codeInputRef.current?.focus(), 280);
    } catch (e) {
      setError(e.message || "Impossible d'envoyer le code.");
    } finally {
      setSending(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────
  const handleVerify = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) { setError("Le code doit contenir exactement 6 chiffres."); return; }
    setVerifying(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "verify", phone, code: trimmed },
      });
      if (fnErr) throw new Error(fnErr.message || "Échec de la vérification");
      if (data?.error) throw new Error(data.message || data.error);
      await refreshCurrentUser?.();
      setPage(3);
      setTimeout(() => navigate("/dashboard", { replace: true }), 2600);
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
      if (data?.error === "NOT_IN_SANDBOX") { setNotJoined(true); setPage(1); return; }
      if (data?.error) throw new Error(data.message || data.error);
      setCode("");
      startCountdown();
    } catch (e) {
      setError(e.message || "Impossible d'envoyer le code.");
    } finally {
      setSending(false);
    }
  };

  const waHref = `https://wa.me/${SANDBOX_NUMBER}?text=${encodeURIComponent(SANDBOX_JOINCODE)}`;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 700, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(37,211,102,0.05) 0%, transparent 70%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 10 }}
      >
        <div style={{
          borderRadius: 22, overflow: "hidden",
          background: C.surface, backdropFilter: "blur(24px)",
          border: `1px solid ${C.border}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
        }}>

          {/* ── Header ── */}
          <div style={{ padding: "24px 28px 20px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
            <motion.div
              animate={page === 3 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                width: 60, height: 60, borderRadius: 20, margin: "0 auto 14px",
                background: page === 3
                  ? "linear-gradient(135deg, rgba(37,211,102,0.3), rgba(18,140,126,0.2))"
                  : "linear-gradient(135deg, rgba(37,211,102,0.18), rgba(18,140,126,0.08))",
                border: `1px solid rgba(37,211,102,${page === 3 ? "0.5" : "0.25"})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30,
                boxShadow: `0 8px 32px rgba(37,211,102,${page === 3 ? "0.25" : "0.1"})`,
                transition: "all 0.4s",
              }}
            >
              {page === 3 ? "🎉" : "💬"}
            </motion.div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 5px", letterSpacing: -0.3 }}>
              {page === 3 ? "WhatsApp vérifié !" : "Vérifier WhatsApp"}
            </h1>
            <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>
              {page === 3
                ? "Votre numéro est confirmé 🎊"
                : "Requis pour recevoir les notifications du tournoi"}
            </p>
          </div>

          <div style={{ padding: "24px 28px 28px" }}>
            {page < 3 && <ProgressBar page={page} />}

            <AnimatePresence mode="wait">

              {/* ════════════════════════════════════════════════════
                  PAGE 1 — Join WhatsApp Sandbox + enter phone
                  ════════════════════════════════════════════════════ */}
              {page === 1 && (
                <motion.div key="p1"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}
                >

                  {/* ── Not-in-sandbox alert (shown after Twilio rejection) ── */}
                  <AnimatePresence>
                    {notJoined && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        style={{
                          padding: "14px 16px", borderRadius: 12, marginBottom: 18,
                          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>⚠️</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>
                            Numéro non connecté
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "0 0 12px", lineHeight: 1.6 }}>
                          Twilio n'a pas pu envoyer le code — ce numéro n'a pas encore rejoint la sandbox CipherPool. Revenez à l'étape 1.
                        </p>
                        <a
                          href={waHref}
                          target="_blank" rel="noreferrer"
                          onClick={() => setWaOpened(true)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "7px 14px", borderRadius: 8,
                            background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.35)",
                            color: C.green, fontSize: 12, fontWeight: 700, textDecoration: "none",
                          }}
                        >
                          💬 Rejoindre via WhatsApp
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Step-by-step instructions ── */}
                  <div style={{
                    padding: "16px", borderRadius: 14, marginBottom: 20,
                    background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.12)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>
                      Comment rejoindre la sandbox
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { n: 1, text: <>Cliquez sur <strong style={{ color: C.text }}>💬 Rejoindre via WhatsApp</strong> ci-dessous</> },
                        { n: 2, text: <>WhatsApp s'ouvre automatiquement sur votre appareil</> },
                        { n: 3, text: <><strong style={{ color: C.text }}>Envoyez</strong> le message pré-rempli <code style={{ fontSize: 12, background: "rgba(255,255,255,0.07)", padding: "1px 6px", borderRadius: 4, color: "#a5f3fc" }}>{SANDBOX_JOINCODE}</code></> },
                        { n: 4, text: <>Revenez ici, entrez votre numéro et cliquez <strong style={{ color: C.text }}>Vérifier</strong></> },
                      ].map(({ n, text }) => (
                        <div key={n} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800,
                            background: waOpened && n <= 3 ? "rgba(37,211,102,0.2)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${waOpened && n <= 3 ? "rgba(37,211,102,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: waOpened && n <= 3 ? C.green : C.text3,
                            transition: "all 0.3s",
                            marginTop: 1,
                          }}>
                            {waOpened && n <= 3 ? "✓" : n}
                          </div>
                          <p style={{ fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.55, flex: 1 }}>
                            {text}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* WhatsApp button */}
                    <a
                      href={waHref}
                      target="_blank" rel="noreferrer"
                      onClick={() => setWaOpened(true)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        marginTop: 16,
                        padding: "11px 16px", borderRadius: 11,
                        background: waOpened
                          ? "rgba(37,211,102,0.15)"
                          : "linear-gradient(135deg, rgba(18,140,126,0.85), rgba(37,211,102,0.85))",
                        border: `1px solid ${waOpened ? "rgba(37,211,102,0.4)" : "rgba(37,211,102,0.3)"}`,
                        color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none",
                        boxShadow: waOpened ? "none" : "0 4px 20px rgba(37,211,102,0.22)",
                        transition: "all 0.25s",
                      }}
                    >
                      💬 Rejoindre via WhatsApp
                      {waOpened && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.green, marginLeft: 2 }}>✓</span>
                      )}
                    </a>

                    {waOpened && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: "center", fontSize: 11, color: C.green, margin: "10px 0 0", fontWeight: 600 }}
                      >
                        ✅ WhatsApp ouvert — envoyez le message puis revenez ici
                      </motion.p>
                    )}
                  </div>

                  {/* ── Separator ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                    <span style={{ fontSize: 11, color: C.text3, fontWeight: 600, whiteSpace: "nowrap" }}>
                      Après avoir envoyé le message
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                  </div>

                  {/* ── Phone input ── */}
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    Votre numéro WhatsApp
                  </label>

                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📱</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(null); setNotJoined(false); }}
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

                  {/* ── Verify & send button ── */}
                  <button
                    onClick={handleSendCode}
                    disabled={sending || !phone.trim()}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: sending || !phone.trim()
                        ? "rgba(255,255,255,0.04)"
                        : "linear-gradient(135deg, #128c7e, #25d366)",
                      color: sending || !phone.trim() ? "rgba(255,255,255,0.25)" : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: sending ? "wait" : !phone.trim() ? "not-allowed" : "pointer",
                      boxShadow: !sending && phone.trim() ? "0 4px 24px rgba(37,211,102,0.28)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {sending ? (
                      <>
                        <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} />
                        Vérification en cours…
                      </>
                    ) : (
                      <>✅ Vérifier &amp; Envoyer le code</>
                    )}
                  </button>

                  {/* Small note below button */}
                  <p style={{ textAlign: "center", fontSize: 11, color: C.text3, marginTop: 10, lineHeight: 1.5 }}>
                    Twilio vérifie automatiquement que votre numéro a rejoint la sandbox avant d'envoyer le code.
                  </p>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════
                  PAGE 2 — ✅ WA confirmed + OTP entry
                  ════════════════════════════════════════════════════ */}
              {page === 2 && (
                <motion.div key="p2"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}
                >
                  {/* ── WhatsApp confirmed banner ── */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      padding: "14px 18px", borderRadius: 14, marginBottom: 22,
                      background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.3)",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, delay: 0.15 }}
                      style={{ fontSize: 28, flexShrink: 0 }}
                    >
                      ✅
                    </motion.div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.green, marginBottom: 3 }}>
                        WhatsApp connecté !
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                        Twilio a confirmé que <strong style={{ color: C.text, fontFamily: "monospace", fontSize: 12 }}>{phone}</strong> a rejoint la sandbox.<br />
                        Un code à 6 chiffres vous a été envoyé via WhatsApp.
                      </div>
                    </div>
                  </motion.div>

                  {/* ── OTP input ── */}
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
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
                      width: "100%", padding: "18px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: `2px solid ${error ? "rgba(239,68,68,0.4)" : code.length === 6 ? "rgba(37,211,102,0.45)" : C.border2}`,
                      borderRadius: 14, color: C.text, fontSize: 32, fontWeight: 800,
                      outline: "none", fontFamily: "monospace", boxSizing: "border-box",
                      letterSpacing: 12, textAlign: "center", marginBottom: 6,
                      transition: "border-color 0.2s",
                      boxShadow: code.length === 6 ? "0 0 0 3px rgba(37,211,102,0.1)" : "none",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(37,211,102,0.5)"; }}
                    onBlur={e  => {
                      if (code.length === 6) e.target.style.borderColor = "rgba(37,211,102,0.45)";
                      else e.target.style.borderColor = error ? "rgba(239,68,68,0.4)" : C.border2;
                    }}
                  />

                  <p style={{ fontSize: 11, color: C.text3, margin: "0 0 16px" }}>
                    Ce code expire dans 10 minutes · Maximum 5 tentatives
                  </p>

                  <ErrorBox error={error} onClose={() => setError(null)} />

                  {/* ── Confirm button ── */}
                  <button
                    onClick={handleVerify}
                    disabled={verifying || code.length !== 6}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: verifying || code.length !== 6
                        ? "rgba(37,211,102,0.1)"
                        : "linear-gradient(135deg, #128c7e, #25d366)",
                      color: verifying || code.length !== 6 ? "rgba(255,255,255,0.25)" : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: verifying ? "wait" : code.length !== 6 ? "not-allowed" : "pointer",
                      boxShadow: !verifying && code.length === 6 ? "0 4px 24px rgba(37,211,102,0.3)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginBottom: 16, transition: "all 0.2s",
                    }}
                  >
                    {verifying ? (
                      <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} /> Vérification…</>
                    ) : "✅ Confirmer le code"}
                  </button>

                  {/* ── Resend + change number ── */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      onClick={handleResend}
                      disabled={countdown > 0 || sending}
                      style={{
                        background: "none", border: "none", padding: 0,
                        fontSize: 12, fontWeight: 600,
                        color: countdown > 0 || sending ? C.text3 : C.green,
                        cursor: countdown > 0 || sending ? "default" : "pointer",
                        textDecoration: countdown > 0 || sending ? "none" : "underline",
                      }}
                    >
                      {sending ? "Envoi…" : countdown > 0 ? `Renvoyer dans ${countdown}s` : "Renvoyer le code"}
                    </button>
                    <button
                      onClick={() => {
                        setPage(1); setCode(""); setError(null);
                        setNotJoined(false); setWaOpened(false);
                        clearInterval(timerRef.current); setCountdown(0);
                      }}
                      style={{ background: "none", border: "none", fontSize: 12, color: C.text3, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ← Changer de numéro
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ════════════════════════════════════════════════════
                  PAGE 3 — Success
                  ════════════════════════════════════════════════════ */}
              {page === 3 && (
                <motion.div key="p3"
                  initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ textAlign: "center", padding: "8px 0" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                    style={{ fontSize: 60, marginBottom: 16 }}
                  >
                    🎉
                  </motion.div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: "0 0 10px" }}>
                    WhatsApp vérifié !
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 28px", lineHeight: 1.65 }}>
                    Votre numéro <strong style={{ color: C.text, fontFamily: "monospace" }}>{phone}</strong> est confirmé.<br />
                    Vous recevrez les notifications des tournois sur WhatsApp.
                  </p>

                  {/* Progress bar — animates to full */}
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "linear" }}
                      style={{ height: "100%", background: "linear-gradient(90deg,#128c7e,#25d366)", borderRadius: 2 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>Redirection vers le tableau de bord…</p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: C.text3, marginTop: 18, letterSpacing: 0.4, textTransform: "uppercase" }}>
          © 2026 CipherPool Arena · Vérification sécurisée via Twilio WhatsApp
        </p>
      </motion.div>

      <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
