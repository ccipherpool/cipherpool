import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// Twilio Sandbox config — set these in .env
const SANDBOX_NUMBER  = import.meta.env.VITE_TWILIO_SANDBOX_NUMBER  || "14155238886";
const SANDBOX_JOINCODE = import.meta.env.VITE_TWILIO_SANDBOX_JOINCODE || "join sandbox-join-code";

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
  const labels = ["Numéro", "Connexion", "Terminé"];
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

// ════════════════════════════════════════════════════════════════
export default function VerifyWhatsApp() {
  const navigate = useNavigate();
  const { user, profile, refreshCurrentUser } = useAuth();

  // step: 1=enter phone, 2=open whatsapp + confirm, 3=success
  const [step,     setStep]     = useState(1);
  const [phone,    setPhone]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [opened,   setOpened]   = useState(false);

  // Guards
  useEffect(() => {
    if (user === null) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (profile?.whatsapp_verified) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  // Pre-fill from profile if available
  useEffect(() => {
    if (profile?.whatsapp_number && !phone) setPhone(profile.whatsapp_number);
  }, [profile]);

  // ── Step 1: Save phone and advance ───────────────────────────
  const handlePhoneNext = async () => {
    setError(null);
    const normalized = phone.trim().replace(/\s+/g, "");
    if (!/^\+\d{8,15}$/.test(normalized)) {
      setError("Format invalide — ex: +212600000000");
      return;
    }
    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ whatsapp_number: normalized })
        .eq("id", user.id);
      if (upErr) throw new Error(upErr.message);
      setPhone(normalized);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Open WhatsApp with pre-filled join code ──────────
  const waLink = `https://wa.me/${SANDBOX_NUMBER}?text=${encodeURIComponent(SANDBOX_JOINCODE)}`;

  const handleOpenWhatsApp = () => {
    window.open(waLink, "_blank");
    setOpened(true);
  };

  // ── Step 2 confirm: mark verified and redirect ───────────────
  const handleConfirmConnected = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          whatsapp_verified:    true,
          whatsapp_verified_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (upErr) throw new Error(upErr.message);
      await refreshCurrentUser?.();
      setStep(3);
      setTimeout(() => navigate("/dashboard", { replace: true }), 2400);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
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
              Connecter WhatsApp
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

                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 18,
                    background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)",
                  }}>
                    <p style={{ fontSize: 11.5, color: C.text2, margin: 0, lineHeight: 1.6 }}>
                      Entrez votre numéro WhatsApp. Il sera utilisé pour vous notifier des tournois et des annonces importantes.
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
                    }}>📱</div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setError(null); }}
                      onKeyDown={e => e.key === "Enter" && handlePhoneNext()}
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

                  {error && (
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
                      <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                    </motion.div>
                  )}

                  <button
                    onClick={handlePhoneNext}
                    disabled={saving || !phone.trim()}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                      background: saving || !phone.trim()
                        ? "rgba(37,211,102,0.15)"
                        : "linear-gradient(135deg, #128c7e, #25d366)",
                      color: saving || !phone.trim() ? "rgba(255,255,255,0.3)" : "#fff",
                      fontSize: 14, fontWeight: 800,
                      cursor: saving ? "wait" : !phone.trim() ? "not-allowed" : "pointer",
                      boxShadow: !saving && phone.trim() ? "0 4px 20px rgba(37,211,102,0.25)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {saving ? (
                      <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} /> Enregistrement…</>
                    ) : "Continuer →"}
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Open WhatsApp ── */}
              {step === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

                  {/* Instructions */}
                  <div style={{
                    padding: "14px 16px", borderRadius: 12, marginBottom: 20,
                    background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
                      Comment connecter WhatsApp
                    </div>
                    {[
                      { n: 1, text: "Cliquez sur « Ouvrir WhatsApp » ci-dessous" },
                      { n: 2, text: "Le message de connexion est pré-rempli automatiquement" },
                      { n: 3, text: "Appuyez simplement sur Envoyer dans WhatsApp" },
                      { n: 4, text: "Revenez ici et cliquez « J'ai envoyé le message »" },
                    ].map(s => (
                      <div key={s.n} style={{ display: "flex", gap: 10, marginBottom: s.n < 4 ? 8 : 0, alignItems: "flex-start" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                          background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: C.green,
                        }}>
                          {s.n}
                        </div>
                        <p style={{ fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Message preview */}
                  <div style={{
                    padding: "10px 14px", borderRadius: 10, marginBottom: 20,
                    background: "#0a1a0f", border: "1px solid rgba(37,211,102,0.15)",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(37,211,102,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                      Message pré-rempli
                    </div>
                    <div style={{
                      display: "inline-block", background: "#1f2c34",
                      borderRadius: "0 10px 10px 10px", padding: "8px 12px",
                    }}>
                      <span style={{ fontSize: 14, color: "#e9edef", fontFamily: "monospace", letterSpacing: 0.5 }}>
                        {SANDBOX_JOINCODE}
                      </span>
                    </div>
                  </div>

                  {error && (
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
                      <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                    </motion.div>
                  )}

                  {/* Primary CTA */}
                  <button
                    onClick={handleOpenWhatsApp}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg, #128c7e, #25d366)",
                      color: "#fff", fontSize: 15, fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 24px rgba(37,211,102,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      marginBottom: 12, transition: "opacity 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>💬</span>
                    Ouvrir WhatsApp
                  </button>

                  {/* Confirm button — appears once they've opened WA */}
                  <AnimatePresence>
                    {opened && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={handleConfirmConnected}
                        disabled={saving}
                        style={{
                          width: "100%", padding: "13px 0", borderRadius: 12,
                          border: "1px solid rgba(37,211,102,0.3)",
                          background: saving ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.1)",
                          color: saving ? "rgba(255,255,255,0.3)" : C.green,
                          fontSize: 14, fontWeight: 800,
                          cursor: saving ? "wait" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          transition: "all 0.2s",
                        }}
                      >
                        {saving ? (
                          <><div style={{ width: 14, height: 14, border: "2px solid rgba(37,211,102,0.3)", borderTopColor: C.green, borderRadius: "50%", animation: "wa-spin 0.7s linear infinite" }} /> Vérification…</>
                        ) : "✅ J'ai envoyé le message"}
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <div style={{ textAlign: "center", marginTop: 14 }}>
                    <button
                      onClick={() => { setStep(1); setOpened(false); setError(null); }}
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
                    WhatsApp connecté !
                  </h2>
                  <p style={{ fontSize: 13, color: C.text2, margin: "0 0 24px", lineHeight: 1.6 }}>
                    Vous recevrez désormais les notifications des tournois sur WhatsApp. Redirection…
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
          © 2026 CipherPool Arena · Notifications via WhatsApp
        </p>
      </motion.div>

      <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
