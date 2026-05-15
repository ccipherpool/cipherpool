import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Coins, ShieldCheck, Bell, Gift, Zap, AlertTriangle } from "lucide-react";

const TYPE_META = {
  achievement:   { icon: Trophy,      color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  coins_received:{ icon: Zap,         color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
  tournament:    { icon: Trophy,      color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)"  },
  system:        { icon: Bell,        color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" },
  warning:       { icon: AlertTriangle,color: "#f97316",bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.3)"  },
  gift:          { icon: Gift,        color: "#ec4899", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.3)"  },
  announcement:  { icon: ShieldCheck, color: "#06b6d4", bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.3)"  },
};
const defaultMeta = { icon: Bell, color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" };

function getMeta(type) { return TYPE_META[type] || defaultMeta; }

/**
 * Single toast notification — auto-dismisses after 4.5s.
 * Usage: render when `notification` is non-null, pass `onDismiss`.
 */
export default function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const meta = getMeta(notification.type);
  const Icon = meta.icon;

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 60, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed",
            top: 72,
            right: 20,
            zIndex: 99999,
            width: 320,
            background: "#0c0c18",
            border: `1px solid ${meta.border}`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${meta.border}`,
          }}
        >
          {/* Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={16} color={meta.color} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", marginBottom: 3, lineHeight: 1.3 }}>
              {notification.title}
            </div>
            <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.45 }}>
              {notification.content?.length > 80
                ? notification.content.slice(0, 80) + "…"
                : notification.content}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onDismiss}
            style={{
              flexShrink: 0, width: 20, height: 20, borderRadius: 5, border: "none",
              background: "rgba(255,255,255,0.06)", color: "#52525b", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={11} />
          </button>

          {/* Progress bar */}
          <motion.div
            initial={{ scaleX: 1, originX: "left" }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4.5, ease: "linear" }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 2, borderRadius: "0 0 14px 14px",
              background: meta.color,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
