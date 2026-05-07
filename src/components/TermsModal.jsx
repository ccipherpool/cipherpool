import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TERMS_KEY = "cp_terms_v1_accepted";

const RULES = [
  { icon: "🎮", title: "Fair Play", desc: "Le triche, les exploits ou comportements déloyaux entraînent un ban immédiat." },
  { icon: "🤝", title: "Respect", desc: "Insultes, harcèlement ou discrimination sont strictement interdits." },
  { icon: "💰", title: "Paiements", desc: "Les pièces achetées sont non-remboursables sauf erreur technique prouvée." },
  { icon: "🏆", title: "Tournois", desc: "Rejoindre un tournoi implique d'y participer. Les absences répétées sont sanctionnées." },
  { icon: "🔒", title: "Compte", desc: "Un seul compte par personne. Le partage de compte est interdit." },
  { icon: "📱", title: "Free Fire ID", desc: "Votre ID Free Fire doit être réel et vous appartenir exclusivement." },
];

export default function TermsModal() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TERMS_KEY)) {
      setOpen(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(TERMS_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 32, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            style={{
              width: "100%", maxWidth: 520,
              background: "linear-gradient(135deg,rgba(8,8,20,0.99),rgba(14,14,36,0.99))",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 28,
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(99,102,241,0.06)",
            }}
          >
            {/* Rainbow accent */}
            <div style={{ height: 3, background: "linear-gradient(90deg,#f43f5e,#f97316,#fbbf24,#10b981,#06b6d4,#6366f1,#a78bfa)" }} />

            {/* Header */}
            <div style={{ padding: "28px 32px 20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
              <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Bienvenue sur CipherPool
              </h2>
              <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
                Avant de commencer, lisez et acceptez nos règles de la plateforme.
              </p>
            </div>

            {/* Rules */}
            <div
              onScroll={e => setScrolled(e.currentTarget.scrollTop > 10)}
              style={{ maxHeight: 300, overflowY: "auto", padding: "20px 28px" }}
            >
              {RULES.map((rule, i) => (
                <motion.div
                  key={rule.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start" }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {rule.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 4px" }}>{rule.title}</p>
                    <p style={{ fontFamily: "Space Grotesk,sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>{rule.desc}</p>
                  </div>
                </motion.div>
              ))}

              <div style={{ padding: "14px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8 }}>
                <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", letterSpacing: 0.5 }}>
                  En acceptant, vous confirmez avoir lu les règles de CipherPool et vous engagez à les respecter.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "20px 32px 28px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={accept}
                style={{
                  width: "100%", padding: "15px 0",
                  borderRadius: 16,
                  background: "linear-gradient(135deg,#4f46e5,#6366f1,#818cf8)",
                  border: "none",
                  color: "#fff",
                  fontFamily: "JetBrains Mono,monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2.5,
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(79,70,229,0.5)",
                }}
              >
                ✅ J'ACCEPTE LES RÈGLES
              </motion.button>
              <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: "rgba(255,255,255,0.15)", textAlign: "center", marginTop: 10, letterSpacing: 1 }}>
                Refus = vous ne pouvez pas accéder à la plateforme
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
