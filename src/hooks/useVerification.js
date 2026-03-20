import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

/**
 * useVerification(profileOverride?)
 * ----------------------------------
 * Retourne l'état de vérification du user connecté.
 *
 * isApproved    : compte approuvé par admin
 * isPending     : en attente de validation
 * isRejected    : demande refusée
 * isBanned      : banni
 * canInteract   : peut faire des actions (join, chat, upload…)
 * readOnly      : mode lecture seule
 * status        : valeur brute de verification_status
 * requireVerified(cb) : exécute cb() si approuvé, sinon toast d'avertissement
 */
export function useVerification(profileOverride = null) {
  const [profile, setProfile] = useState(profileOverride);
  const [loading, setLoading] = useState(!profileOverride);

  useEffect(() => {
    // Si on a un profile passé en paramètre, pas besoin de fetch
    if (profileOverride) {
      setProfile(profileOverride);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, verification_status, role")
        .eq("id", user.id)
        .single();

      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [profileOverride]);

  // ── Dériver l'état depuis profile ──────────────────────────────
  const state = useMemo(() => {
    const status     = profile?.verification_status || "pending";
    const role       = profile?.role || "user";
    const isApproved = status === "approved";
    const isRejected = status === "rejected";
    const isBanned   = role === "banned" || status === "banned";
    const isPending  = !isApproved && !isRejected && !isBanned;
    const canInteract = isApproved && !isBanned;

    return { status, role, isApproved, isRejected, isBanned, isPending, canInteract, readOnly: !canInteract };
  }, [profile]);

  // ── Toast affiché quand l'action est bloquée ───────────────────
  const showBlockedToast = useCallback((msg) => {
    const existing = document.getElementById("kyc-toast");
    if (existing) existing.remove();

    const messages = {
      pending:  { title:"Compte en attente",   body:"Ton compte doit être validé par un admin avant d'effectuer cette action.", color:"#f59e0b" },
      rejected: { title:"Compte refusé",       body:"Ta demande de vérification a été refusée. Contacte le support.",          color:"#ef4444" },
      banned:   { title:"Compte suspendu",     body:"Ton compte a été suspendu. Contacte le support.",                         color:"#ef4444" },
      default:  { title:"Action non autorisée",body:"Tu n'es pas autorisé à effectuer cette action.",                          color:"#ef4444" },
    };

    const m = messages[msg] || messages.default;

    const toast = document.createElement("div");
    toast.id = "kyc-toast";
    toast.innerHTML = `
      <div style="
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:#1a1a2e;border:1px solid ${m.color}55;border-radius:14px;
        padding:16px 22px;display:flex;align-items:flex-start;gap:12px;
        z-index:99999;box-shadow:0 8px 32px ${m.color}22;
        max-width:420px;width:90vw;animation:kycUp .3s ease;
      ">
        <span style="font-size:22px;flex-shrink:0">${msg === "banned" ? "🚫" : msg === "rejected" ? "❌" : "🔒"}</span>
        <div>
          <div style="color:${m.color};font-weight:700;font-size:13px;margin-bottom:4px">${m.title}</div>
          <div style="color:#9ca3af;font-size:12px;line-height:1.5">${m.body}</div>
        </div>
      </div>
      <style>@keyframes kycUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { const t = document.getElementById("kyc-toast"); if (t) t.remove(); }, 4500);
  }, []);

  // ── requireVerified : exécute callback ou affiche toast ─────────
  const requireVerified = useCallback((callback) => {
    if (state.isBanned)   { showBlockedToast("banned");   return false; }
    if (state.isRejected) { showBlockedToast("rejected"); return false; }
    if (!state.isApproved){ showBlockedToast("pending");  return false; }
    callback();
    return true;
  }, [state, showBlockedToast]);

  return { ...state, loading, requireVerified };
}