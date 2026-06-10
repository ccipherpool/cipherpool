import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X, ExternalLink, Trash2, Trophy, Megaphone, AlertTriangle,
  RefreshCw, Info, Gift, Zap, ShieldCheck, Star, Bell,
  Calendar, ArrowRight,
} from "lucide-react";

const TYPE_META = {
  achievement:    { icon: Trophy,        color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  coins_received: { icon: Zap,           color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  tournament:     { icon: Trophy,        color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  announcement:   { icon: Megaphone,     color: "#06b6d4", bg: "rgba(6,182,212,0.1)"  },
  broadcast:      { icon: Megaphone,     color: "#06b6d4", bg: "rgba(6,182,212,0.1)"  },
  warning:        { icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  update:         { icon: RefreshCw,     color: "#818cf8", bg: "rgba(129,140,248,0.1)"},
  system:         { icon: ShieldCheck,   color: "#818cf8", bg: "rgba(129,140,248,0.1)"},
  gift:           { icon: Gift,          color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  season:         { icon: Star,          color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  info:           { icon: Info,          color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
};
const defaultMeta = { icon: Bell, color: "#818cf8", bg: "rgba(129,140,248,0.1)" };
function getMeta(t) { return TYPE_META[t] || defaultMeta; }

function formatFull(str) {
  if (!str) return "";
  return new Date(str).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Determine the action label and destination from notification data
function resolveAction(n) {
  const notifType = n.metadata?.notification_type;
  const url       = n.action_url;

  if (notifType === "seat_assigned" || notifType === "registration_approved") {
    return { label: "Open Match Center", url };
  }
  if (n.type === "tournament" || n.category === "tournament") {
    return { label: "View Tournament", url };
  }
  if (url) {
    return { label: "Open", url };
  }
  return null;
}

export default function NotificationDetailModal({ notification, onClose, onDelete, onMarkRead }) {
  const navigate = useNavigate();
  const n        = notification;
  if (!n) return null;

  const meta      = getMeta(n.type);
  const Icon      = meta.icon;
  const action    = resolveAction(n);
  const tournName = n.metadata?.tournament_name;

  // Mark as read when opened
  useEffect(() => {
    if (!n.read && onMarkRead) onMarkRead(n.id);
  }, [n.id]);

  const handleAction = () => {
    if (!action?.url) return;
    onClose();
    // Internal routes use navigate; external urls use location
    if (action.url.startsWith("http")) {
      window.open(action.url, "_blank");
    } else {
      navigate(action.url);
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete(n.id);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="notif-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}
      >
        {/* Desktop: centered card | Mobile: bottom sheet */}
        <motion.div
          key="notif-detail-card"
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480,
            background: "linear-gradient(160deg, #0a0a1e 0%, #07071a 100%)",
            border: `1px solid ${meta.color}28`,
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: `0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px ${meta.color}12`,
            position: "relative",
          }}
        >
          {/* Top color bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}60, transparent)` }} />

          {/* Header */}
          <div style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: meta.bg,
              border: `1px solid ${meta.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${meta.color}20`,
            }}>
              {n.icon
                ? <span style={{ fontSize: 22 }}>{n.icon}</span>
                : <Icon size={22} style={{ color: meta.color }} />
              }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: 16, fontWeight: 800, color: "#f4f4f5",
                margin: "0 0 4px", lineHeight: 1.25,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {n.title || "Notification"}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 6, background: meta.bg, color: meta.color,
                  textTransform: "capitalize", letterSpacing: 0.3,
                }}>
                  {n.category || n.type || "system"}
                </span>
                {(n.priority === "urgent" || n.priority === "high") && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 7px",
                    borderRadius: 6,
                    background: n.priority === "urgent" ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.12)",
                    color:      n.priority === "urgent" ? "#ef4444"              : "#f97316",
                    letterSpacing: 0.5, textTransform: "uppercase",
                  }}>
                    {n.priority.toUpperCase()}
                  </span>
                )}
                {!n.read && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 7px",
                    borderRadius: 6, background: "rgba(99,102,241,0.12)", color: "#818cf8",
                    letterSpacing: 0.5,
                  }}>
                    UNREAD
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 20px" }}>
            {/* Tournament name if present */}
            {tournName && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 10, marginBottom: 14,
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.15)",
              }}>
                <Trophy size={13} style={{ color: "#8b5cf6", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>{tournName}</span>
              </div>
            )}

            {/* Full message */}
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.7, margin: "0 0 18px",
              fontFamily: "'Satoshi', sans-serif",
              whiteSpace: "pre-wrap",
            }}>
              {n.content || "No details available."}
            </p>

            {/* Meta row: date + sender */}
            <div style={{
              display: "flex", gap: 10, flexWrap: "wrap",
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 18,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                  {formatFull(n.created_at)}
                </span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                {n.created_by ? "From staff" : "System"}
              </span>
            </div>

            {/* Action button */}
            {action && (
              <button
                onClick={handleAction}
                style={{
                  width: "100%", padding: "13px 20px",
                  borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}88)`,
                  color: "#fff", fontSize: 13, fontWeight: 800,
                  cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: `0 6px 20px ${meta.color}30`,
                  marginBottom: 8,
                }}
              >
                {action.label}
                <ArrowRight size={14} />
              </button>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  width: "100%", padding: "10px 20px",
                  borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.06)",
                  color: "rgba(239,68,68,0.6)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.15s",
                }}
              >
                <Trash2 size={12} />
                Delete notification
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
