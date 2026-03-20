import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * useVerification
 * ---------------
 * isVerified   : bool   — compte approuvé
 * checking     : bool   — en cours de vérification
 * requireVerified(cb)   — exécute cb() si approuvé, sinon toast
 */
export function useVerification() {
  const [isVerified, setIsVerified] = useState(false);
  const [checking,   setChecking]   = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { if (mounted) { setIsVerified(false); setChecking(false); } return; }

      supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!mounted) return;
          setIsVerified(data?.verification_status === "approved");
          setChecking(false);
        });
    });

    return () => { mounted = false; };
  }, []);

  const requireVerified = useCallback(
    (callback) => {
      if (isVerified) { callback(); return true; }

      // ── Toast KYC ──────────────────────────────────────────
      const existing = document.getElementById("kyc-toast");
      if (existing) existing.remove();

      const toast = document.createElement("div");
      toast.id = "kyc-toast";
      toast.innerHTML = `
        <div style="
          position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
          background:#1a1a2e;border:1px solid #ef4444;border-radius:12px;
          padding:14px 22px;display:flex;align-items:center;gap:12px;
          z-index:99999;box-shadow:0 8px 32px rgba(239,68,68,.3);
          max-width:420px;width:90vw;animation:kycUp .3s ease;
        ">
          <span style="font-size:20px">🔒</span>
          <div>
            <div style="color:#ef4444;font-weight:700;font-size:13px;margin-bottom:2px">Vérification requise</div>
            <div style="color:#9ca3af;font-size:12px">Votre compte doit être vérifié par un admin avant d'effectuer cette action.</div>
          </div>
        </div>
        <style>@keyframes kycUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
      `;
      document.body.appendChild(toast);
      setTimeout(() => { const t = document.getElementById("kyc-toast"); if (t) t.remove(); }, 4000);

      return false;
    },
    [isVerified]
  );

  return { isVerified, checking, requireVerified };
}