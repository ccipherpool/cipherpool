import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Trophy, Zap, Bell, Gift, AlertTriangle,
  ShieldCheck, Star, Megaphone, Info, RefreshCw,
} from "lucide-react";

const TYPE_META = {
  achievement:    { icon: Trophy,       color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  glow: "rgba(245,158,11,0.15)"  },
  coins_received: { icon: Zap,          color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  glow: "rgba(16,185,129,0.15)"  },
  tournament:     { icon: Trophy,       color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  glow: "rgba(139,92,246,0.15)"  },
  announcement:   { icon: Megaphone,    color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.3)",   glow: "rgba(6,182,212,0.15)"   },
  warning:        { icon: AlertTriangle,color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)",  glow: "rgba(249,115,22,0.15)"  },
  update:         { icon: RefreshCw,    color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)", glow: "rgba(129,140,248,0.15)" },
  system:         { icon: ShieldCheck,  color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)", glow: "rgba(129,140,248,0.15)" },
  gift:           { icon: Gift,         color: "#ec4899", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.3)",  glow: "rgba(236,72,153,0.15)"  },
  season:         { icon: Star,         color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  glow: "rgba(245,158,11,0.15)"  },
  broadcast:      { icon: Megaphone,    color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.3)",   glow: "rgba(6,182,212,0.15)"   },
  info:           { icon: Info,         color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  glow: "rgba(96,165,250,0.15)"  },
};
const defaultMeta = {
  icon: Bell, color: "#818cf8", bg: "rgba(129,140,248,0.12)",
  border: "rgba(129,140,248,0.3)", glow: "rgba(129,140,248,0.15)",
};

const PRIORITY_COLORS = {
  urgent: { accent: "#ef4444", pulse: true },
  high:   { accent: "#f97316", pulse: false },
  normal: { accent: null,      pulse: false },
  low:    { accent: null,      pulse: false },
};

const AUTO_DISMISS_MS = 5000;

function getMeta(type) { return TYPE_META[type] || defaultMeta; }

function SingleToast({ notification, onDismiss }) {
  const meta       = getMeta(notification.type);
  const Icon       = meta.icon;
  const priority   = PRIORITY_COLORS[notification.priority] || PRIORITY_COLORS.normal;
  const timerRef   = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [notification.id, onDismiss]);

  const handleClick = () => {
    if (notification.action_url) window.location.href = notification.action_url;
    onDismiss(notification.id);
  };

  return (
    <motion.div
      key={notification.id}
      layout
      initial={{ opacity: 0, x: 80, scale: 0.88 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onClick={handleClick}
      style={{
        position: "relative",
        width: 340,
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 100%)",
        border: `1px solid ${priority.accent || meta.border}`,
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        cursor: notification.action_url ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {/* Top scan line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${meta.color}80 50%, transparent 100%)`,
      }} />

      {/* Left priority accent */}
      <div style={{
        position: "absolute", left: 0, top: "15%", bottom: "15%", width: 3,
        background: `linear-gradient(180deg, transparent, ${priority.accent || meta.color}, transparent)`,
        borderRadius: "0 2px 2px 0",
      }} />

      {/* Ambient glow bg */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle at 80% 20%, ${meta.glow} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 1,
        boxShadow: `0 0 16px ${meta.glow}`,
      }}>
        {notification.icon ? (
          <span style={{ fontSize: 18 }}>{notification.icon}</span>
        ) : (
          <Icon size={17} color={meta.color} />
        )}
        {priority.pulse && (
          <div style={{
            position: "absolute", inset: -3, borderRadius: 14,
            border: `1px solid ${priority.accent}`,
            animation: "toast-pulse 1.5s ease-in-out infinite",
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 3 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.3, letterSpacing: -0.1 }}>
            {notification.title}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {notification.priority === "urgent" && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "rgba(239,68,68,0.15)", color: "#ef4444", letterSpacing: 0.5, textTransform: "uppercase" }}>
                URGENT
              </span>
            )}
            {notification.priority === "high" && (
              <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "rgba(249,115,22,0.15)", color: "#f97316", letterSpacing: 0.5, textTransform: "uppercase" }}>
                HIGH
              </span>
            )}
          </div>
        </div>
        <div style={{
          fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {notification.content}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, letterSpacing: 0.3 }}>
            {notification.category}
          </span>
          {notification.action_url && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>· tap to open →</span>
          )}
        </div>
      </div>

      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); onDismiss(notification.id); }}
        style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)", color: "#52525b",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", position: "relative", zIndex: 1,
          transition: "background 0.15s, color 0.15s",
        }}
        className="hover:!bg-white/10 hover:!text-white/60"
      >
        <X size={11} />
      </button>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2, borderRadius: "0 0 16px 16px",
          background: `linear-gradient(90deg, ${meta.color}80, ${meta.color})`,
          transformOrigin: "left",
        }}
      />

      <style>{`
        @keyframes toast-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.15); }
        }
      `}</style>
    </motion.div>
  );
}

export default function NotificationToast({ toastQueue = [], onDismiss }) {
  if (!toastQueue || toastQueue.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 72,
        right: 20,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="popLayout">
        {toastQueue.map(n => (
          <div key={n.id} style={{ pointerEvents: "auto" }}>
            <SingleToast notification={n} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
