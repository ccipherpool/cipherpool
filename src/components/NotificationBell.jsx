import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, CheckCheck, Trophy, Megaphone, AlertTriangle,
  RefreshCw, Info, Gift, Zap, ShieldCheck, Star,
} from "lucide-react";
import { useNotifications } from "../features/notifications/useNotifications";
import NotificationToast from "../features/notifications/NotificationToast";

const TYPE_META = {
  achievement:    { icon: Trophy,      color: "#f59e0b", bg: "rgba(245,158,11,.1)"    },
  coins_received: { icon: Zap,         color: "#10b981", bg: "rgba(16,185,129,.1)"    },
  tournament:     { icon: Trophy,      color: "#8b5cf6", bg: "rgba(139,92,246,.1)"    },
  announcement:   { icon: Megaphone,   color: "#06b6d4", bg: "rgba(6,182,212,.1)"     },
  warning:        { icon: AlertTriangle,color: "#f97316", bg: "rgba(249,115,22,.1)"   },
  update:         { icon: RefreshCw,   color: "#818cf8", bg: "rgba(129,140,248,.1)"   },
  system:         { icon: ShieldCheck, color: "#818cf8", bg: "rgba(129,140,248,.1)"   },
  gift:           { icon: Gift,        color: "#ec4899", bg: "rgba(236,72,153,.1)"    },
  season:         { icon: Star,        color: "#f59e0b", bg: "rgba(245,158,11,.1)"    },
};
const defaultMeta = { icon: Info, color: "#818cf8", bg: "rgba(129,140,248,.1)" };
function getMeta(type) { return TYPE_META[type] || defaultMeta; }

function timeAgo(str) {
  if (!str) return "";
  const d = Math.floor((Date.now() - new Date(str)) / 60000);
  if (d < 1)    return "just now";
  if (d < 60)   return `${d}m`;
  if (d < 1440) return `${Math.floor(d / 60)}h`;
  return `${Math.floor(d / 1440)}d`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const {
    notifications, unreadCount, loading,
    newNotif, clearNewNotif,
    markRead, markAllRead,
  } = useNotifications(userId);

  // Close on outside click
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <>
      {/* Real-time Toast */}
      <NotificationToast notification={newNotif} onDismiss={clearNewNotif} />

      <div ref={ref} className="relative">
        {/* Bell button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen(o => !o)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: open ? "rgba(99,102,241,.12)" : "transparent",
            border: open ? "1px solid rgba(99,102,241,.25)" : "1px solid transparent",
          }}
        >
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 5 }}
          >
            <Bell size={17} style={{ color: unreadCount > 0 ? "#818cf8" : "rgba(255,255,255,.35)" }} />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
                style={{ background: "linear-gradient(135deg,#f43f5e,#f97316)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Dropdown panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.14, ease: [.22, 1, .36, 1] }}
              className="absolute right-0 top-full mt-2 z-50 w-80"
              style={{
                background: "#080820",
                border: "1px solid rgba(99,102,241,.2)",
                borderRadius: 16,
                boxShadow: "0 24px 64px rgba(0,0,0,.75), 0 0 0 1px rgba(99,102,241,.06)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <div className="flex items-center gap-2">
                  <Bell size={13} style={{ color: "#818cf8" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 10, background: "rgba(99,102,241,.15)", color: "#818cf8" }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} title="Mark all read"
                      style={{ width: 27, height: 27, borderRadius: 7, border: "none", background: "transparent", color: "#818cf8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      className="hover:bg-white/5">
                      <CheckCheck size={12} />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}
                    style={{ width: 27, height: 27, borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    className="hover:bg-white/5">
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #6366f130", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
                    <div style={{ fontSize: 32, opacity: 0.2 }}>🔔</div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.2)", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const meta = getMeta(n.type);
                    const Icon = meta.icon;
                    return (
                      <motion.div
                        key={`${n.source}_${n.id}`}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        onClick={() => !n.read && markRead(n.id, n.source)}
                        style={{
                          display: "flex", gap: 10, padding: "12px 16px", cursor: "pointer",
                          background: n.read ? "transparent" : "rgba(99,102,241,.04)",
                          borderBottom: "1px solid rgba(255,255,255,.04)",
                          borderLeft: `3px solid ${n.read ? "transparent" : meta.color}`,
                          transition: "background 0.12s",
                        }}
                        className="hover:bg-white/[0.03]"
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                          <Icon size={13} style={{ color: meta.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.3, margin: 0 }}>
                              {n.title || "Notification"}
                            </p>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,.2)", fontFamily: "monospace", flexShrink: 0 }}>
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", lineHeight: 1.5, margin: "3px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {n.content}
                          </p>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                            {n.is_global && (
                              <span style={{ fontSize: 10, color: "#52525b", fontFamily: "monospace" }}>📢 Global</span>
                            )}
                            {!n.read && (
                              <span style={{ fontSize: 10, color: meta.color, display: "flex", alignItems: "center", gap: 3 }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, display: "inline-block" }} />
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
                  <p style={{ fontSize: 10, textAlign: "center", color: "rgba(255,255,255,.15)", fontFamily: "monospace" }}>
                    Showing last 50 notifications
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
