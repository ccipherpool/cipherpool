import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   LOGIN  —  CIPHERPOOL v6  (amélioré)
   ✅ Rate limiting : 5 tentatives → blocage 30s
   ✅ Loading state + bouton désactivé
   ✅ Messages d'erreur précis
   ✅ Contraste & responsive améliorés
   ✅ Accessibilité (aria-live)
   ✅ Animation du countdown circulaire
   ═══════════════════════════════════════════════════════ */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000; // 30 secondes

// Palette modernisée
const C = {
  bg:        "#0a0a0f",
  card:      "#0f0f17",
  border:    "#252535",
  primary:   "#8b3dff",
  primaryGlow:"rgba(139,61,255,0.5)",
  cyan:      "#00e5ff",
  danger:    "#ff4757",
  warning:   "#ffb347",
  text:      "#f0f0f0",
  textMid:   "rgba(255,255,255,0.65)",
  textLow:   "rgba(255,255,255,0.4)",
};

// ── Composant Input réutilisable (amélioré) ─────────────
function Input({ label, type, value, onChange, placeholder, error, id }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputId = id || label.replace(/\s/g, "").toLowerCase();

  return (
    <div style={{ marginBottom: 20 }}>
      <label
        htmlFor={inputId}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          color: C.textLow,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: isPassword ? "12px 48px 12px 16px" : "12px 16px",
            borderRadius: 12,
            border: `1px solid ${error ? C.danger + "aa" : C.border}`,
            background: "rgba(255,255,255,0.05)",
            color: C.text,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            outline: "none",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? C.danger : C.primary + "aa";
            e.target.style.boxShadow = `0 0 0 3px ${C.primary}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? C.danger + "aa" : C.border;
            e.target.style.boxShadow = "none";
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.5)",
              border: "none",
              borderRadius: 20,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
              opacity: 0.7,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
          >
            {show ? "🙈" : "👁"}
          </button>
        )}
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: C.danger,
            marginTop: 5,
            letterSpacing: 0.3,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ── Composant principal Login ───────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalErr, setGlobal] = useState("");

  const attempts = useRef(0);
  const lockedUntil = useRef(0);
  const [lockSecs, setLockSecs] = useState(0);

  // Compte à rebours du blocage
  const startCountdown = () => {
    const tick = () => {
      const remaining = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      if (remaining > 0) {
        setLockSecs(remaining);
        setTimeout(tick, 1000);
      } else {
        setLockSecs(0);
        setGlobal("");
        attempts.current = 0;
      }
    };
    tick();
  };

  // Validation des champs
  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email invalide";
    if (!password) e.password = "Mot de passe requis";
    else if (password.length < 6) e.password = "Minimum 6 caractères";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobal("");

    if (Date.now() < lockedUntil.current) {
      const rem = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      setGlobal(`Trop de tentatives. Réessaie dans ${rem}s.`);
      return;
    }

    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        attempts.current += 1;
        const remaining = MAX_ATTEMPTS - attempts.current;

        if (attempts.current >= MAX_ATTEMPTS) {
          lockedUntil.current = Date.now() + LOCKOUT_MS;
          attempts.current = 0;
          setGlobal("Trop de tentatives. Compte bloqué 30 secondes.");
          startCountdown();
        } else {
          let msg;
          if (error.message.includes("Invalid login"))
            msg = `Email ou mot de passe incorrect. ${remaining} essai${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}.`;
          else if (error.message.includes("Email not confirmed"))
            msg = "Confirme ton email avant de te connecter.";
          else if (error.message.includes("rate limit"))
            msg = "Trop de requêtes. Attends quelques secondes.";
          else msg = error.message;
          setGlobal(msg);
        }
      } else {
        attempts.current = 0;
        navigate("/dashboard");
      }
    } catch (_) {
      setGlobal("Erreur réseau. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockSecs > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Orbes de fond */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-10%",
            width: 500,
            height: 500,
            background: `radial-gradient(${C.primary}20, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-10%",
            width: 400,
            height: 400,
            background: `radial-gradient(${C.cyan}15, transparent 70%)`,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 440,
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
        }}
      >
        {/* Logo + titre */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <motion.div
            whileHover={{ rotate: 5, scale: 1.08 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.primary}, #4f46e5)`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 32px ${C.primaryGlow}`,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 24,
                color: "#fff",
                letterSpacing: 1,
              }}
            >
              CP
            </span>
          </motion.div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: "clamp(28px, 8vw, 36px)",
              letterSpacing: 4,
              color: "#fff",
              margin: 0,
            }}
          >
            CIPHER<span style={{ color: C.primary, textShadow: `0 0 24px ${C.primaryGlow}` }}>POOL</span>
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: 3,
              color: C.textLow,
              marginTop: 8,
            }}
          >
            CONNEXION SÉCURISÉE
          </p>
        </div>

        {/* Carte principale */}
        <div
          style={{
            background: "rgba(15,15,23,0.94)",
            backdropFilter: "blur(24px)",
            border: `1px solid ${C.border}`,
            borderRadius: 28,
            padding: "clamp(20px, 5vw, 34px)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Bloc de blocage actif */}
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(255,71,87,0.12)",
                border: "1px solid rgba(255,71,87,0.4)",
                borderRadius: 16,
                padding: "12px 18px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 20 }}>🔒</span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: C.danger,
                    margin: 0,
                  }}
                >
                  Compte temporairement bloqué
                </p>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "rgba(255,71,87,0.8)",
                    margin: "4px 0 0",
                  }}
                >
                  Réessaie dans <strong>{lockSecs}s</strong>
                </p>
              </div>
              {/* Anneau de progression SVG */}
              <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                <svg width="36" height="36" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,71,87,0.2)" strokeWidth="2.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={C.danger}
                    strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - lockSecs / 30)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: C.danger,
                    fontWeight: 700,
                  }}
                >
                  {lockSecs}
                </span>
              </div>
            </motion.div>
          )}

          {/* Alerte tentatives restantes */}
          {attempts.current > 0 && attempts.current < MAX_ATTEMPTS && !isLocked && (
            <div
              style={{
                background: "rgba(255,179,71,0.1)",
                border: "1px solid rgba(255,179,71,0.3)",
                borderRadius: 12,
                padding: "8px 14px",
                marginBottom: 20,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: C.warning,
                letterSpacing: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              {MAX_ATTEMPTS - attempts.current} tentative{MAX_ATTEMPTS - attempts.current > 1 ? "s" : ""} restante
              {MAX_ATTEMPTS - attempts.current > 1 ? "s" : ""} avant blocage
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="EMAIL"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((er) => ({ ...er, email: "" }));
              }}
              placeholder="ton@email.com"
              error={errors.email}
              id="login-email"
            />

            <Input
              label="MOT DE PASSE"
              type="password"
              value={password}
              onChange={(e) => {
                setPass(e.target.value);
                setErrors((er) => ({ ...er, password: "" }));
              }}
              placeholder="••••••••"
              error={errors.password}
              id="login-password"
            />

            {/* Message global */}
            <AnimatePresence>
              {globalErr && !isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  aria-live="polite"
                  style={{
                    background: "rgba(255,71,87,0.1)",
                    border: "1px solid rgba(255,71,87,0.3)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    marginBottom: 20,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 12,
                    color: C.danger,
                  }}
                >
                  {globalErr}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || isLocked}
              whileHover={!loading && !isLocked ? { scale: 1.02, y: -1 } : {}}
              whileTap={!loading && !isLocked ? { scale: 0.98 } : {}}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 16,
                background: isLocked
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${C.primary}, #4f46e5)`,
                border: "none",
                color: isLocked ? "rgba(255,255,255,0.3)" : "#fff",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: 2,
                fontWeight: 700,
                cursor: loading || isLocked ? "not-allowed" : "pointer",
                boxShadow: isLocked ? "none" : `0 8px 28px ${C.primaryGlow}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 0.25s",
              }}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                    }}
                  />
                  CONNEXION...
                </>
              ) : isLocked ? (
                `🔒 BLOQUÉ (${lockSecs}s)`
              ) : (
                "⚡ SE CONNECTER"
              )}
            </motion.button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              color: C.textMid,
              marginTop: 24,
            }}
          >
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              style={{
                color: C.primary,
                textDecoration: "none",
                fontWeight: 700,
                borderBottom: `1px solid ${C.primary}60`,
              }}
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <p
          style={{
            textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: C.textLow,
            letterSpacing: 2,
            marginTop: 24,
          }}
        >
          🔒 CONNEXION SÉCURISÉE · MAX {MAX_ATTEMPTS} TENTATIVES
        </p>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * {
          box-sizing: border-box;
        }
        input::placeholder {
          color: rgba(255,255,255,0.45);
          font-size: 13px;
        }
        @media (max-width: 480px) {
          input::placeholder {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}