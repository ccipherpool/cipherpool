import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  Bell, X, CheckCheck, Trophy, Megaphone, AlertTriangle,
  RefreshCw, Info, Gift, Zap, ShieldCheck, Star,
  ArrowRight, Circle,
} from "lucide-react";
import { useNotifications } from "../features/notifications/useNotifications";
import NotificationToast from "../features/notifications/NotificationToast";

const TYPE_META = {
  achievement:    { icon: Trophy,       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"    },
  coins_received: { icon: Zap,          color: "#10b981", bg: "rgba(16,185,129,0.1)"    },
  tournament:     { icon: Trophy,       color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"    },
  announcement:   { icon: Megaphone,    color: "#06b6d4", bg: "rgba(6,182,212,0.1)"     },
  broadcast:      { icon: Megaphone,    color: "#06b6d4", bg: "rgba(6,182,212,0.1)"     },
  warning:        { icon: AlertTriangle,color: "#f97316", bg: "rgba(249,115,22,0.1)"    },
  update:         { icon: RefreshCw,    color: "#818cf8", bg: "rgba(129,140,248,0.1)"   },
  system:         { icon: ShieldCheck,  color: "#818cf8", bg: "rgba(129,140,248,0.1)"   },
  gift:           { icon: Gift,         color: "#ec4899", bg: "rgba(236,72,153,0.1)"    },
  season:         { icon: Star,         color: "#f59e0b", bg: "rgba(245,158,11,0.1)"    },
  info:           { icon: Info,         color: "#60a5fa", bg: "rgba(96,165,250,0.1)"    },
};
const defaultMeta = { icon: Info, color: "#818cf8", bg: "rgba(129,140,248,0.1)" };

const PRIORITY_DOT = {
  urgent: "#ef4444",
  high:   "#f97316",
  normal: null,
  low:    null,
};

function getMeta(type) { return TYPE_META[type] || defaultMeta; }

function timeAgo(str) {
  if (!str) return "";
  const d = Math.floor((Date.now() - new Date(str)) / 60000);
  if (d < 1)    return "just now";
  if (d < 60)   return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const ref = useRef(null);

  const {
    notifications, unreadCount, loading,
    toastQueue, dismissToast,
    markRead, markAllRead,
  } = useNotifications(userId);

  // Close on outside click
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === "unread")       return !n.read;
    if (filter === "tournament")   return n.category === "tournament";
    if (filter === "system")       return n.category === "system" || n.category === "admin";
    return true;
  });

  const hasGlow = unreadCount > 0;

  return (
    <>
      <NotificationToast toastQueue={toastQueue} onDismiss={dismissToast} />

      <div ref={ref} className="relative">
        {/* Bell Button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => setOpen(o => !o)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center outline-none"
          style={{
            background: open
              ? "rgba(99,102,241,0.12)"
              : hasGlow ? "rgba(99,102,241,0.07)" : "transparent",
            border: open
              ? "1px solid rgba(99,102,241,0.3)"
              : hasGlow ? "1px solid rgba(99,102,241,0.15)" : "1px solid transparent",
            boxShadow: hasGlow && !open ? "0 0 16px rgba(99,102,241,0.2)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <motion.div
            animate={hasGlow ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
            transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 4.5 }}
          >
            <Bell
              size={17}
              style={{
                color: hasGlow ? "#818cf8" : "rgba(0,0,0,0.45)",
                filter: hasGlow ? "drop-shadow(0 0 6px rgba(129,140,248,0.6))" : "none",
                transition: "all 0.2s",
              }}
            />
          </motion.div>

          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, y: 4 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
                style={{
                  background: "linear-gradient(135deg, #f43f5e, #f97316)",
                  boxShadow: "0 0 10px rgba(244,63,94,0.5)",
                  letterSpacing: -0.5,
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full mt-2 z-50 w-[360px]"
              style={{
                background: "linear-gradient(160deg, #080820 0%, #060618 100%)",
                border: "1px solid rgba(99,102,241,0.18)",
                borderRadius: 18,
                boxShadow: "0 28px 72px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
                overflow: "hidden",
              }}
            >
              {/* Top glow line */}
              <div style={{
                position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
                background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)",
              }} />

              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={13} style={{ color: "#818cf8" }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5", letterSpacing: -0.2 }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        fontSize: 10, fontWeight: 800, padding: "1px 7px",
                        borderRadius: 10, background: "rgba(99,102,241,0.15)",
                        color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      {unreadCount} new
                    </motion.span>
                  )}
                </div>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={markAllRead}
                      title="Mark all as read"
                      className="hover:bg-white/5"
                      style={{
                        width: 28, height: 28, borderRadius: 8, border: "none",
                        background: "transparent", color: "#818cf8",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", transition: "background 0.15s",
                      }}
                    >
                      <CheckCheck size={12} />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="hover:bg-white/5"
                    style={{
                      width: 28, height: 28, borderRadius: 8, border: "none",
                      background: "transparent", color: "rgba(255,255,255,0.25)",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", transition: "background 0.15s",
                    }}
                  >
                    <X size={12} />
                  </motion.button>
                </div>
              </div>

              {/* Filter chips */}
              <div
                className="flex gap-1.5 px-3 py-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                {[
                  { id: "all",        label: "All" },
                  { id: "unread",     label: "Unread" },
                  { id: "tournament", label: "Arena" },
                  { id: "system",     label: "System" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    style={{
                      fontSize: 10.5, fontWeight: f.id === filter ? 700 : 500,
                      padding: "3px 9px", borderRadius: 8, border: "none",
                      background: f.id === filter ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                      color: f.id === filter ? "#818cf8" : "rgba(255,255,255,0.35)",
                      cursor: "pointer", transition: "all 0.15s",
                      letterSpacing: 0.2,
                    }}
                    className="hover:!bg-white/[0.07]"
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch", paddingInline: 14 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.04)", flexShrink: 0, animation: "shimmer 1.5s ease infinite" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 10, borderRadius: 4, background: "rgba(255,255,255,0.04)", marginBottom: 7, width: `${60 + i * 12}%`, animation: "shimmer 1.5s ease infinite" }} />
                          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.03)", width: "80%", animation: "shimmer 1.5s ease infinite" }} />
                        </div>
                      </div>
                    ))}
                    <style>{`@keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "44px 0", gap: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: "rgba(99,102,241,0.07)",
                      border: "1px solid rgba(99,102,241,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Bell size={22} style={{ color: "rgba(99,102,241,0.4)" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0, fontWeight: 600 }}>
                        {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", textAlign: "center", margin: "4px 0 0", fontFamily: "monospace", letterSpacing: 1 }}>
                        INBOX CLEAR
                      </p>
                    </div>
                  </div>
                ) : (
                  filtered.slice(0, 20).map((n, i) => {
                    const meta = getMeta(n.type);
                    const Icon = meta.icon;
                    const priorityDot = PRIORITY_DOT[n.priority];
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.25) }}
                        onClick={() => {
                          if (!n.read) markRead(n.id);
                          if (n.action_url) { window.location.href = n.action_url; setOpen(false); }
                        }}
                        style={{
                          display: "flex", gap: 10, padding: "11px 14px",
                          cursor: n.action_url ? "pointer" : n.read ? "default" : "pointer",
                          background: n.read ? "transparent" : "rgba(99,102,241,0.035)",
                          borderBottom: "1px solid rgba(255,255,255,0.035)",
                          borderLeft: `2px solid ${n.read ? "transparent" : meta.color}`,
                          transition: "background 0.14s",
                          position: "relative",
                        }}
                        className="hover:!bg-white/[0.025]"
                      >
                        {/* Priority indicator */}
                        {priorityDot && (
                          <div style={{
                            position: "absolute", top: 11, right: 14,
                            width: 6, height: 6, borderRadius: "50%",
                            background: priorityDot,
                            boxShadow: `0 0 6px ${priorityDot}`,
                          }} />
                        )}

                        {/* Icon */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: meta.bg, display: "flex",
                          alignItems: "center", justifyContent: "center", marginTop: 1,
                          border: n.read ? "none" : `1px solid ${meta.color}25`,
                        }}>
                          {n.icon
                            ? <span style={{ fontSize: 16 }}>{n.icon}</span>
                            : <Icon size={13} style={{ color: meta.color }} />
                          }
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                            <p style={{
                              fontSize: 12.5, fontWeight: n.read ? 500 : 700,
                              color: n.read ? "#a1a1aa" : "#f4f4f5",
                              lineHeight: 1.3, margin: 0,
                            }}>
                              {n.title || "Notification"}
                            </p>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", flexShrink: 0, paddingTop: 1 }}>
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          <p style={{
                            fontSize: 11.5, color: "rgba(255,255,255,0.38)",
                            lineHeight: 1.5, margin: 0,
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical", overflow: "hidden",
                          }}>
                            {n.content}
                          </p>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                            <span style={{
                              fontSize: 9.5, color: meta.color, fontWeight: 600,
                              letterSpacing: 0.4, textTransform: "uppercase",
                            }}>
                              {n.category}
                            </span>
                            {!n.read && (
                              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, color: meta.color }}>
                                <Circle size={4} fill={meta.color} />
                                <span>Unread</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer — View All */}
              <NavLink
                to="/notifications"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "11px 16px", fontSize: 12, fontWeight: 700,
                  color: "#818cf8", textDecoration: "none",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(99,102,241,0.04)",
                  transition: "background 0.15s",
                  letterSpacing: 0.2,
                }}
                className="hover:!bg-indigo-500/10"
              >
                View All Notifications
                <ArrowRight size={12} />
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
