import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION CONTEXT
   ═══════════════════════════════════════════════════════════ */
const NotifCtx = createContext(null);

export function useNotify() {
  const ctx = useContext(NotifCtx);
  if (!ctx) return () => {};
  return ctx.notify;
}

/* ═══════════════════════════════════════════════════════════
   TYPE META (icon + colors)
   ═══════════════════════════════════════════════════════════ */
const META = {
  success: { icon: "✅", bg: "rgba(16,185,129,0.07)",   border: "rgba(16,185,129,0.22)",  accent: "#10b981" },
  error:   { icon: "❌", bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.22)",   accent: "#ef4444" },
  warning: { icon: "⚠️", bg: "rgba(245,158,11,0.07)",   border: "rgba(245,158,11,0.22)",  accent: "#f59e0b" },
  info:    { icon: "💡", bg: "rgba(99,102,241,0.07)",   border: "rgba(99,102,241,0.22)",  accent: "#818cf8" },
  coin:    { icon: "💎", bg: "rgba(250,204,21,0.07)",   border: "rgba(250,204,21,0.22)",  accent: "#facc15" },
  trophy:  { icon: "🏆", bg: "rgba(251,146,60,0.07)",   border: "rgba(251,146,60,0.22)",  accent: "#fb923c" },
  live:    { icon: "🔴", bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.22)",   accent: "#ef4444" },
  kick:    { icon: "🚫", bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.22)",   accent: "#ef4444" },
  chat:    { icon: "💬", bg: "rgba(99,102,241,0.07)",   border: "rgba(99,102,241,0.22)",  accent: "#818cf8" },
  gift:    { icon: "🎁", bg: "rgba(16,185,129,0.07)",   border: "rgba(16,185,129,0.22)",  accent: "#10b981" },
  medal:   { icon: "🏅", bg: "rgba(251,146,60,0.07)",   border: "rgba(251,146,60,0.22)",  accent: "#fb923c" },
  news:    { icon: "📢", bg: "rgba(167,139,250,0.07)",  border: "rgba(167,139,250,0.22)", accent: "#a78bfa" },
  invite:  { icon: "📨", bg: "rgba(99,102,241,0.07)",   border: "rgba(99,102,241,0.22)",  accent: "#818cf8" },
};

/* ═══════════════════════════════════════════════════════════
   SINGLE TOAST
   ═══════════════════════════════════════════════════════════ */
function ToastItem({ notif, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const m = META[notif.type] || META.info;
  const dur = notif.duration || 5000;
  const hasActions = notif.actions?.length > 0;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(notif.id), 300);
  }, [notif.id, onRemove]);

  useEffect(() => {
    if (hasActions) return;
    const t = setTimeout(dismiss, dur);
    return () => clearTimeout(t);
  }, [dismiss, dur, hasActions]);

  return (
    <motion.div
      layout
      initial={{ x: 130, opacity: 0, scale: 0.86 }}
      animate={exiting ? { x: 130, opacity: 0, scale: 0.86 } : { x: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${m.bg}, rgba(9,9,20,0.97))`,
        border: `1px solid ${m.border}`,
        borderRadius: 16,
        backdropFilter: "blur(24px)",
        boxShadow: `0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)`,
        maxWidth: 368,
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, ${m.accent}, ${m.accent}55)`,
        borderRadius: "16px 0 0 16px",
      }} />

      {/* Main content row */}
      <div style={{ padding: "14px 42px 14px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Icon badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: `${m.accent}16`, border: `1px solid ${m.accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
        }}>
          {m.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {notif.title && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
              color: m.accent, marginBottom: notif.message ? 4 : 0,
              textTransform: "uppercase",
            }}>
              {notif.title}
            </div>
          )}
          {notif.message && (
            <div style={{
              fontSize: 12.5, color: "rgba(255,255,255,0.6)",
              lineHeight: 1.45, wordBreak: "break-word",
            }}>
              {notif.message}
            </div>
          )}

          {/* Action buttons */}
          {hasActions && (
            <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
              {notif.actions.map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { action.onClick(); dismiss(); }}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 7,
                    border: `1px solid ${(action.color || m.accent)}35`,
                    background: `${(action.color || m.accent)}12`,
                    color: action.color || m.accent,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9.5, fontWeight: 700, letterSpacing: "0.8px",
                    cursor: "pointer", outline: "none",
                    textTransform: "uppercase",
                    transition: "all 0.15s",
                  }}
                >
                  {action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        style={{
          position: "absolute", top: 10, right: 10,
          width: 22, height: 22, borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.25)", cursor: "pointer",
          fontSize: 10, transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        ✕
      </button>

      {/* Progress bar (auto-dismiss only) */}
      {!hasActions && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)" }}>
          <div style={{
            height: "100%",
            background: `linear-gradient(90deg, ${m.accent}60, ${m.accent})`,
            borderRadius: "0 0 16px 16px",
            animation: `cp-shrink ${dur}ms linear forwards`,
          }} />
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const userRef = useRef(null);

  const notify = useCallback((type = "info", title = "", message = "", duration = 5000, actions = null) => {
    const id = Date.now() + Math.random();
    setNotifs(prev => [...prev.slice(-4), { id, type, title, message, duration, actions }]);
  }, []);

  const remove = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    let walletSub, tournamentSub, matchSub, roomSub, newsSub, achieveSub, supportSub, inviteSub;

    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      const uid = data.user.id;
      userRef.current = uid;

      // 💎 Wallet changes
      walletSub = supabase.channel("notif-wallet")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` }, (payload) => {
          const diff = (payload.new.balance || 0) - (payload.old.balance || 0);
          if (diff > 0) notify("coin", `+${diff} pièces reçues`, "Votre solde a été crédité 💰");
          else if (diff < 0) notify("info", `${Math.abs(diff)} pièces dépensées`, "Débit de votre portefeuille");
        }).subscribe();

      // 🏆 Match results validated
      matchSub = supabase.channel("notif-results")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_results", filter: `user_id=eq.${uid}` }, (payload) => {
          if (payload.new.status === "verified")
            notify("trophy", "Résultat validé", "L'admin a approuvé votre soumission ✅");
          else if (payload.new.status === "rejected")
            notify("error", "Résultat rejeté", "L'admin a refusé votre soumission");
        }).subscribe();

      // 🏆 New tournaments
      tournamentSub = supabase.channel("notif-tournaments")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "tournaments" }, (payload) => {
          notify("trophy", "Nouveau tournoi", payload.new.title || "Un tournoi vient d'être créé 🏆");
        }).subscribe();

      // 🔴 Room status changes
      roomSub = supabase.channel("notif-rooms")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tournaments" }, (payload) => {
          if (payload.new.room_status === "live" && payload.old.room_status !== "live")
            notify("live", "Match en cours", `${payload.new.title || "Le match"} a commencé ! 🔴`, 6000);
          if (payload.new.room_status === "results_open" && payload.old.room_status === "live")
            notify("info", "Soumettez votre résultat", "Le match est terminé — entrez vos kills 📊");
        }).subscribe();

      // 📢 Admin news / announcements
      newsSub = supabase.channel("notif-news")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "news" }, (payload) => {
          notify("news", payload.new.title || "Nouvelle annonce", payload.new.excerpt || "Consultez les actualités 📢");
        }).subscribe();

      // 🏅 Achievements
      achieveSub = supabase.channel("notif-achievements")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${uid}` }, (payload) => {
          notify("medal", "Achievement débloqué", payload.new.achievement_name || "Félicitations ! 🏅", 6000);
        }).subscribe();

      // 💬 Support reply
      supportSub = supabase.channel("notif-support")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${uid}` }, (payload) => {
          if (payload.new.sender_role === "admin")
            notify("chat", "Support a répondu", payload.new.message?.slice(0, 80) || "");
        }).subscribe();

      // 📨 Team invitations — with Accept / Refuse action buttons
      inviteSub = supabase.channel("notif-invites")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_invites", filter: `invited_user=eq.${uid}` }, async (payload) => {
          const inviteId = payload.new.id;
          const { data: teamData } = await supabase
            .from("teams").select("name,tag").eq("id", payload.new.team_id).single();
          const teamLabel = teamData ? `[${teamData.tag}] ${teamData.name}` : "Une équipe";

          notify(
            "invite",
            "Invitation d'équipe",
            `${teamLabel} vous invite à rejoindre leur équipe`,
            12000,
            [
              {
                label: "✓ Accepter",
                color: "#10b981",
                onClick: async () => {
                  await supabase.rpc("accept_team_invite", { p_invite_id: inviteId });
                  notify("success", "Invitation acceptée", "Bienvenue dans l'équipe ! 🎉");
                },
              },
              {
                label: "✕ Refuser",
                color: "#ef4444",
                onClick: async () => {
                  await supabase.from("team_invites").update({ status: "rejected" }).eq("id", inviteId);
                },
              },
            ]
          );
        }).subscribe();
    });

    return () => {
      walletSub?.unsubscribe();
      matchSub?.unsubscribe();
      tournamentSub?.unsubscribe();
      roomSub?.unsubscribe();
      newsSub?.unsubscribe();
      achieveSub?.unsubscribe();
      supportSub?.unsubscribe();
      inviteSub?.unsubscribe();
    };
  }, [notify]);

  return (
    <NotifCtx.Provider value={{ notify }}>
      {children}

      <style>{`
        @keyframes cp-shrink { from { width: 100%; } to { width: 0%; } }
      `}</style>

      {/* Toast container */}
      <div style={{
        position: "fixed",
        top: 76, right: 16,
        zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 9,
        pointerEvents: "none", alignItems: "flex-end",
      }}>
        <AnimatePresence>
          {notifs.map(n => (
            <div key={n.id} style={{ pointerEvents: "auto" }}>
              <ToastItem notif={n} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </NotifCtx.Provider>
  );
}
