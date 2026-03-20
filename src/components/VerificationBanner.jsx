/**
 * VerificationBanner
 * ------------------
 * Affiche un bandeau en haut de page pour informer l'utilisateur
 * de l'état de son compte (pending / rejected / banned).
 * 
 * Usage:
 *   <VerificationBanner profile={profile} />
 * 
 * Ne s'affiche pas si le compte est approuvé.
 */
export default function VerificationBanner({ profile }) {
  const status = profile?.verification_status;
  const role   = profile?.role;

  // Pas de bannière pour les comptes approuvés ou non chargés
  if (!profile || status === "approved") return null;

  const isBanned   = role === "banned" || status === "banned";
  const isRejected = status === "rejected";

  const config = isBanned ? {
    bg:     "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    color:  "#fca5a5",
    icon:   "🚫",
    title:  "Compte suspendu",
    body:   "Ton compte a été suspendu. Pour toute question, contacte le support.",
  } : isRejected ? {
    bg:     "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    color:  "#fca5a5",
    icon:   "❌",
    title:  "Vérification refusée",
    body:   "Ta demande de vérification a été refusée. Contacte un admin pour plus d'informations.",
  } : {
    bg:     "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    color:  "#fcd34d",
    icon:   "⏳",
    title:  "Compte en attente de validation",
    body:   "Tu peux naviguer sur le site, mais les actions (rejoindre un tournoi, envoyer un message, créer une équipe…) sont désactivées jusqu'à validation par un admin.",
  };

  return (
    <div style={{
      background: config.bg,
      border:     `1px solid ${config.border}`,
      borderRadius: 12,
      padding:    "12px 18px",
      margin:     "0 0 20px 0",
      display:    "flex",
      alignItems: "flex-start",
      gap:        12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{config.icon}</span>
      <div>
        <p style={{ color: config.color, fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>
          {config.title}
        </p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          {config.body}
        </p>
      </div>
    </div>
  );
}