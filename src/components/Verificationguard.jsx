import { useVerification } from "../hooks/useVerification";

/**
 * VerificationGuard
 * Wraps any interactive element and blocks it if user is not verified.
 *
 * Usage:
 *   <VerificationGuard>
 *     <button onClick={handleJoin}>Rejoindre</button>
 *   </VerificationGuard>
 *
 * Or with onClick interception:
 *   <VerificationGuard onClick={handleJoin}>
 *     <button>Rejoindre</button>
 *   </VerificationGuard>
 */
export default function VerificationGuard({ children, className = "" }) {
  const { isVerified, checking } = useVerification();

  if (checking) return null;
  if (isVerified) return children;

  return (
    <div className={`relative group ${className}`}>
      {/* Render children but intercept all clicks */}
      <div
        className="pointer-events-none opacity-50 select-none"
        aria-disabled="true"
      >
        {children}
      </div>
      {/* Invisible overlay to capture clicks */}
      <div
        className="absolute inset-0 cursor-not-allowed"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showVerificationToast();
        }}
      />
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-red-900/90 border border-red-500 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
          🔒 Compte non vérifié — contactez un admin
        </div>
      </div>
    </div>
  );
}

function showVerificationToast() {
  const existing = document.getElementById("kyc-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "kyc-toast";
  toast.innerHTML = `
    <div style="
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#1a1a2e;border:1px solid #ef4444;border-radius:12px;
      padding:14px 22px;display:flex;align-items:center;gap:12px;
      z-index:99999;box-shadow:0 8px 32px rgba(239,68,68,0.3);
      animation:kycSlideUp 0.3s ease;max-width:420px;width:90vw;
    ">
      <span style="font-size:20px">🔒</span>
      <div>
        <div style="color:#ef4444;font-weight:700;font-size:13px;margin-bottom:2px">
          Vérification requise
        </div>
        <div style="color:#9ca3af;font-size:12px">
          Votre compte doit être vérifié par un admin avant d'effectuer cette action.
        </div>
      </div>
    </div>
    <style>@keyframes kycSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}