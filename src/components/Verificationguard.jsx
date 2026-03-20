import { useVerification } from "../hooks/useVerification";

/**
 * VerificationGuard
 * -----------------
 * Wraps n'importe quel bouton/action et le bloque si le compte
 * n'est pas encore approuvé.
 *
 * Usage:
 *   <VerificationGuard profile={profile}>
 *     <button onClick={handleJoin}>Rejoindre</button>
 *   </VerificationGuard>
 *
 *   Ou avec un fallback personnalisé:
 *   <VerificationGuard profile={profile} fallback={<span>Compte en attente</span>}>
 *     <button onClick={handleJoin}>Rejoindre</button>
 *   </VerificationGuard>
 */
export default function VerificationGuard({ profile, children, className = "", fallback = null }) {
  const { canInteract, isPending, isRejected, isBanned, requireVerified } = useVerification(profile);

  if (canInteract) return children;

  // Si fallback fourni → l'afficher
  if (fallback) return fallback;

  // Sinon → rendre les enfants désactivés avec overlay + tooltip
  const msg = isBanned
    ? "Compte suspendu"
    : isRejected
    ? "Vérification refusée — contactez le support"
    : "Compte en attente de validation admin";

  const color = isBanned || isRejected ? "#ef4444" : "#f59e0b";

  return (
    <div className={`relative group ${className}`} style={{ display: "inline-block" }}>
      {/* Enfants désactivés visuellement */}
      <div style={{ opacity: 0.45, pointerEvents: "none", userSelect: "none" }} aria-disabled="true">
        {children}
      </div>

      {/* Overlay transparent qui capture les clics */}
      <div
        style={{ position: "absolute", inset: 0, cursor: "not-allowed", zIndex: 10 }}
        onClick={e => { e.preventDefault(); e.stopPropagation(); requireVerified(() => {}); }}
      />

      {/* Tooltip au hover */}
      <div style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#0f0f1a",
        border: `1px solid ${color}55`,
        borderRadius: 8,
        padding: "7px 12px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 20,
        opacity: 0,
        transition: "opacity .15s",
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: 11,
        color: color,
        fontWeight: 600,
      }}
        className="group-hover:opacity-100"
      >
        🔒 {msg}
      </div>
    </div>
  );
}