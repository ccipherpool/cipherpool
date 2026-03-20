// ═══════════════════════════════════════════════════════════════
// NOTIFICATION SYSTEM — CipherPool
// Remplace src/components/NotificationSystem.jsx
// ═══════════════════════════════════════════════════════════════
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

// ── CONSTANTES ─────────────────────────────────────────────────
const NOTIF_ICONS = {
  team_join_request:  "🙋",
  team_join_accepted: "🎉",
  team_join_rejected: "❌",
  team_chat_message:  "💬",
  tournament_approved:"✅",
  tournament_started: "🔴",
  match_result:       "🏆",
  admin_announcement: "📢",
  badge_earned:       "🏅",
  coins_received:     "💰",
  default:            "🔔",
};

const CATEGORY_COLORS = {
  team:       "#a855f7",
  tournament: "#f59e0b",
  chat:       "#06b6d4",
  admin:      "#ef4444",
  general:    "#818cf8",
};

const PRIORITY_STYLES = {
  urgent: { border: "rgba(239,68,68,0.4)",    bg: "rgba(239,68,68,0.06)" },
  high:   { border: "rgba(245,158,11,0.3)",   bg: "rgba(245,158,11,0.05)" },
  normal: { border: "rgba(255,255,255,0.07)", bg: "transparent" },
  low:    { border: "rgba(255,255,255,0.04)", bg: "transparent" },
};

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return "maintenant";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

// ── CONTEXT ────────────────────────────────────────────────────
const NotifCtx = createContext(null);

export function useNotify() {
  const ctx = useContext(NotifCtx);
  return ctx?.toast || (() => {});
}

export function useNotifications() {
  return useContext(NotifCtx);
}

// ── TOAST COMPONENT ────────────────────────────────────────────
function Toast({ notif, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();

  const catColor = CATEGORY_COLORS[notif.category] || CATEGORY_COLORS.general;
  const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
  const duration = notif.priority === "urgent" ? 6000 : 4000;

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(notif.id), 350);
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duration, notif.id, onRemove]);

  const handleClick = () => {
    if (notif.link) navigate(notif.link);
    setLeaving(true);
    setTimeout(() => onRemove(notif.id), 350);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 14px",
        background: `linear-gradient(135deg, rgba(10,10,20,0.97), rgba(15,15,30,0.97))`,
        border: `1px solid ${catColor}40`,
        borderLeft: `3px solid ${catColor}`,
        borderRadius: 12,
        backdropFilter: "blur(20px)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
        cursor: notif.link ? "pointer" : "default",
        maxWidth: 340, width: "100%",
        transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(120%) scale(0.9)",
        opacity: visible && !leaving ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        position: "relative", overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        height: 2, background: catColor, opacity: 0.5,
        animation: `notif-shrink ${duration}ms linear forwards`,
        width: "100%",
      }} />

      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1, marginTop: 1 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          color: catColor, marginBottom: 3,
          textTransform: "uppercase",
        }}>
          {notif.title}
        </p>
        {notif.body && (
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12, color: "rgba(255,255,255,0.65)",
            lineHeight: 1.4, wordBreak: "break-word",
          }}>
            {notif.body}
          </p>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setLeaving(true); setTimeout(() => onRemove(notif.id), 350); }}
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.2)",
          cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

// ── BELL DROPDOWN ──────────────────────────────────────────────
function NotificationItem({ notif, onRead }) {
  const navigate = useNavigate();
  const catColor = CATEGORY_COLORS[notif.category] || CATEGORY_COLORS.general;
  const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
  const pStyle = PRIORITY_STYLES[notif.priority] || PRIORITY_STYLES.normal;

  const handleClick = async () => {
    await onRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        background: notif.is_read ? "transparent" : pStyle.bg,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer", transition: "background 0.15s",
        position: "relative",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? "transparent" : pStyle.bg}
    >
      {/* Unread dot */}
      {!notif.is_read && (
        <div style={{
          position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
          width: 5, height: 5, borderRadius: "50%",
          background: catColor, boxShadow: `0 0 6px ${catColor}`,
        }} />
      )}

      {/* Avatar or icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: notif.actor_avatar ? "transparent" : `${catColor}20`,
        border: `1px solid ${catColor}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", fontSize: notif.actor_avatar ? 0 : 16,
      }}>
        {notif.actor_avatar
          ? <img src={notif.actor_avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13, fontWeight: notif.is_read ? 400 : 600,
          color: notif.is_read ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.9)",
          lineHeight: 1.3, marginBottom: 3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {notif.title}
        </p>
        {notif.body && (
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11, color: "rgba(255,255,255,0.35)",
            lineHeight: 1.4, overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {notif.body}
          </p>
        )}
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: catColor, marginTop: 4, opacity: 0.7,
        }}>
          {timeAgo(notif.created_at)}
        </p>
      </div>
    </motion.div>
  );
}

function NotificationBell({ userId, unreadCount, notifications, onOpen, onMarkAllRead, onRead, isOpen }) {
  const bellRef = useRef(null);

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      <button
        onClick={onOpen}
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: isOpen ? "rgba(139,61,255,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isOpen ? "rgba(139,61,255,0.4)" : "rgba(255,255,255,0.08)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 16, transition: "all 0.2s",
          position: "relative",
        }}
      >
        <motion.span
          animate={unreadCount > 0 ? { rotate: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3 }}
        >
          🔔
        </motion.span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 17, height: 17, borderRadius: 6,
              background: "#ef4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, fontWeight: 700, color: "#fff",
              padding: "0 3px",
              boxShadow: "0 0 8px rgba(239,68,68,0.5)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: 360, maxHeight: 480,
              background: "rgba(10,10,18,0.98)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              zIndex: 200,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: 2,
                  color: "rgba(255,255,255,0.8)",
                }}>
                  NOTIFICATIONS
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, color: "#ef4444",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    padding: "1px 6px", borderRadius: 4,
                  }}>
                    {unreadCount} non lues
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, color: "#7c3aed",
                    background: "none", border: "none",
                    cursor: "pointer", letterSpacing: 1,
                  }}
                >
                  ✓ TOUT LU
                </button>
              )}
            </div>

            {/* Liste */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: "40px 20px", textAlign: "center",
                  color: "rgba(255,255,255,0.2)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, letterSpacing: 2,
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔕</div>
                  AUCUNE NOTIFICATION
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationItem key={n.id} notif={n} onRead={onRead} />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                textAlign: "center", flexShrink: 0,
              }}>
                <a
                  href="/notifications"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, color: "rgba(255,255,255,0.3)",
                    textDecoration: "none", letterSpacing: 1,
                  }}
                >
                  VOIR TOUT →
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PROVIDER PRINCIPAL ─────────────────────────────────────────
export function NotificationProvider({ children, profile }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Fetch notifications ──────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("notifications_with_actor")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }, [profile?.id]);

  // ── Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifs-${profile.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.id}`,
      }, async (payload) => {
        const newNotif = payload.new;

        // Enrichir avec actor info
        let enriched = { ...newNotif, actor_name: null, actor_avatar: null };
        if (newNotif.actor_id) {
          const { data: actor } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newNotif.actor_id)
            .single();
          enriched = { ...enriched, actor_name: actor?.full_name, actor_avatar: actor?.avatar_url };
        }

        // Ajouter à la liste
        setNotifications(prev => [enriched, ...prev]);

        // Afficher toast (sauf si dropdown ouvert)
        if (!isOpen) {
          setToasts(prev => [...prev.slice(-3), {
            ...enriched,
            id: `toast-${enriched.id}-${Date.now()}`,
          }]);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id, fetchNotifications]);

  // ── Fermer dropdown en cliquant dehors ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fermer dropdown sur changement de route ──────────────────
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // ── Actions ──────────────────────────────────────────────────
  const handleOpen = async () => {
    setIsOpen(o => !o);
    if (!isOpen && profile?.id) {
      // Marquer tout comme seen quand on ouvre
      await supabase.rpc("mark_notifications_seen", { p_user_id: profile.id });
    }
  };

  const handleRead = async (notifId) => {
    await supabase.rpc("mark_notification_read", { p_notif_id: notifId });
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, is_read: true, is_seen: true } : n)
    );
  };

  const handleMarkAllRead = async () => {
    if (!profile?.id) return;
    await supabase.rpc("mark_all_notifications_read", { p_user_id: profile.id });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, is_seen: true })));
  };

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Toast function pour usage manuel ─────────────────────────
  const toast = useCallback((type, title, body, link) => {
    const id = `manual-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-3), {
      id, type, title, body, link,
      category: "general", priority: "normal",
      created_at: new Date().toISOString(),
    }]);
  }, []);

  return (
    <NotifCtx.Provider value={{
      notifications, unreadCount, isOpen,
      handleOpen, handleRead, handleMarkAllRead,
      toast, fetchNotifications, bellRef,
    }}>
      {children}

      {/* Keyframes */}
      <style>{`
        @keyframes notif-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {/* Toast container */}
      <div style={{
        position: "fixed",
        top: 76, right: 16,
        zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
        maxWidth: 340,
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast notif={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}

// ── BELL EXPORT (utilisé dans MainLayout) ─────────────────────
export function NotificationBellConnected() {
  const ctx = useNotifications();
  if (!ctx) return null;

  return (
    <div ref={ctx.bellRef}>
      <NotificationBell
        unreadCount={ctx.unreadCount}
        notifications={ctx.notifications}
        onOpen={ctx.handleOpen}
        onMarkAllRead={ctx.handleMarkAllRead}
        onRead={ctx.handleRead}
        isOpen={ctx.isOpen}
      />
    </div>
  );
}

export default NotificationProvider;