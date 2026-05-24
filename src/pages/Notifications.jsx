import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell, Search, CheckCheck, Trophy, Megaphone, AlertTriangle,
  RefreshCw, Info, Gift, Zap, ShieldCheck, Star, Filter,
  Settings, X, ChevronDown, ArrowLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../features/notifications/useNotifications";

/* ─── Constants ────────────────────────────────────────────────── */
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
const defaultMeta = { icon: Bell, color: "#818cf8", bg: "rgba(129,140,248,0.1)" };
function getMeta(t) { return TYPE_META[t] || defaultMeta; }

const PRIORITY_CONFIG = {
  urgent: { label: "URGENT", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high:   { label: "HIGH",   color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  normal: { label: "NORMAL", color: "#818cf8", bg: "rgba(129,140,248,0.08)" },
  low:    { label: "LOW",    color: "#52525b", bg: "rgba(82,82,91,0.08)" },
};

function timeAgo(str) {
  if (!str) return "";
  const d = Math.floor((Date.now() - new Date(str)) / 60000);
  if (d < 1)    return "just now";
  if (d < 60)   return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(notifications) {
  const groups = {};
  for (const n of notifications) {
    const label = formatDate(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

/* ─── Preferences Modal ─────────────────────────────────────────── */
function PreferencesModal({ preferences, onSave, onClose }) {
  const [prefs, setPrefs] = useState({
    tournament_notifications: true,
    social_notifications: true,
    admin_notifications: true,
    marketing_notifications: true,
    system_notifications: true,
    sound_enabled: true,
    email_notifications: false,
    ...preferences,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const rows = [
    { key: "tournament_notifications", label: "Tournament", desc: "Match results, invites, season updates" },
    { key: "social_notifications",     label: "Social",     desc: "Friends, clans, mentions" },
    { key: "admin_notifications",      label: "Admin",      desc: "Important platform announcements" },
    { key: "marketing_notifications",  label: "Promotions", desc: "Events, offers, bonuses" },
    { key: "system_notifications",     label: "System",     desc: "Security, maintenance, updates" },
    { key: "sound_enabled",            label: "Sound",      desc: "Play sound for new notifications" },
    { key: "email_notifications",      label: "Email",      desc: "Receive critical alerts via email" },
  ];

  const handleSave = async () => {
    setSaving(true);
    await onSave(prefs);
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "linear-gradient(160deg, #0a0a1c 0%, #07071a 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings size={15} style={{ color: "#818cf8" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>Notification Preferences</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Control what you receive</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b" }} className="hover:!bg-white/10">
            <X size={13} />
          </button>
        </div>

        {/* Rows */}
        <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(row => (
            <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{row.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{row.desc}</div>
              </div>
              <button
                onClick={() => toggle(row.key)}
                style={{
                  width: 42, height: 24, borderRadius: 12, border: "none",
                  background: prefs[row.key] ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.08)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
                  background: prefs[row.key] ? "#fff" : "rgba(255,255,255,0.4)",
                  transition: "left 0.2s, background 0.2s",
                  left: prefs[row.key] ? 21 : 3,
                }} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "10px", borderRadius: 10, border: "none",
              background: saving ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff", cursor: saving ? "wait" : "pointer", fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
            }}
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const {
    notifications, unreadCount, loading,
    markRead, markAllRead, refresh,
    preferences, updatePreferences,
  } = useNotifications(user?.id);

  const [search, setSearch]                 = useState("");
  const [tab, setTab]                       = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showPrefs, setShowPrefs]           = useState(false);
  const [showFilter, setShowFilter]         = useState(false);

  const filtered = notifications.filter(n => {
    if (tab === "unread" && n.read) return false;
    if (tab === "tournament" && n.category !== "tournament") return false;
    if (tab === "system" && !["system","admin"].includes(n.category)) return false;
    if (tab === "social" && n.category !== "social") return false;
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = groupByDate(filtered);

  const TABS = [
    { id: "all",        label: "All",        count: notifications.length },
    { id: "unread",     label: "Unread",     count: unreadCount },
    { id: "tournament", label: "Arena",      count: notifications.filter(n => n.category === "tournament").length },
    { id: "social",     label: "Social",     count: notifications.filter(n => n.category === "social").length },
    { id: "system",     label: "System",     count: notifications.filter(n => ["system","admin"].includes(n.category)).length },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #08091c 0%, #050514 60%, #080820 100%)" }}
    >
      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "5%", left: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:px-6">

        {/* ── Page Header ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-white/5 transition-colors"
              style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f4f4f5", letterSpacing: -0.5, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 20, background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(249,115,22,0.15))", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}>
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "4px 0 0", fontFamily: "'Satoshi', sans-serif" }}>
                Stay updated with your latest activity
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Controls Bar ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notifications…"
              style={{
                width: "100%", padding: "9px 12px 9px 36px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, color: "#f4f4f5", fontSize: 13,
                outline: "none", fontFamily: "'Satoshi', sans-serif",
                transition: "border-color 0.15s",
              }}
              className="focus:!border-indigo-500/40 placeholder:text-white/20"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex" }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Priority filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilter(f => !f)}
                style={{
                  padding: "9px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                  background: showFilter ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)",
                  color: showFilter ? "#818cf8" : "rgba(255,255,255,0.45)",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                }}
              >
                <Filter size={13} />
                {priorityFilter !== "all" ? priorityFilter : "Priority"}
                <ChevronDown size={11} style={{ transform: showFilter ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.14 }}
                    style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                      background: "#0a0a1c", border: "1px solid rgba(99,102,241,0.18)",
                      borderRadius: 12, overflow: "hidden", minWidth: 130,
                      boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                    }}
                  >
                    {[
                      { id: "all",    label: "All Priorities" },
                      { id: "urgent", label: "Urgent" },
                      { id: "high",   label: "High" },
                      { id: "normal", label: "Normal" },
                      { id: "low",    label: "Low" },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setPriorityFilter(p.id); setShowFilter(false); }}
                        style={{
                          width: "100%", padding: "9px 14px", border: "none",
                          background: priorityFilter === p.id ? "rgba(99,102,241,0.12)" : "transparent",
                          color: priorityFilter === p.id ? "#818cf8" : "rgba(255,255,255,0.5)",
                          fontSize: 12, fontWeight: priorityFilter === p.id ? 700 : 400,
                          cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                        }}
                        className="hover:!bg-white/[0.04]"
                      >
                        {p.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  padding: "9px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                  border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer",
                  background: "rgba(16,185,129,0.06)",
                  color: "#10b981", display: "flex", alignItems: "center", gap: 6,
                }}
                className="hover:!bg-emerald-500/10"
              >
                <CheckCheck size={13} />
                Mark read
              </button>
            )}

            {/* Preferences */}
            <button
              onClick={() => setShowPrefs(true)}
              title="Notification preferences"
              style={{
                width: 38, height: 38, borderRadius: 12, fontSize: 12,
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              className="hover:!bg-white/[0.07] hover:!text-white/60"
            >
              <Settings size={14} />
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              title="Refresh"
              style={{
                width: 38, height: 38, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              className="hover:!bg-white/[0.07] hover:!text-white/60"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </motion.div>

        {/* ── Tab Bar ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-6 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflowX: "auto",
          }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "7px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: tab === t.id ? "rgba(99,102,241,0.18)" : "transparent",
                color: tab === t.id ? "#818cf8" : "rgba(255,255,255,0.35)",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, minWidth: 16, height: 16,
                  borderRadius: 6, background: tab === t.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)",
                  color: tab === t.id ? "#818cf8" : "rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Notification List ─────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  padding: "16px 20px", marginBottom: 8,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16, display: "flex", gap: 14,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.04)", flexShrink: 0, animation: "notif-shimmer 1.5s ease infinite" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.04)", marginBottom: 10, width: `${50 + i * 8}%`, animation: "notif-shimmer 1.5s ease infinite" }} />
                    <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,0.03)", width: "80%", animation: "notif-shimmer 1.5s ease infinite" }} />
                  </div>
                </div>
              ))}
              <style>{`@keyframes notif-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16 }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 40px rgba(99,102,241,0.08)",
              }}>
                <Bell size={32} style={{ color: "rgba(99,102,241,0.35)" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.35)", margin: "0 0 6px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {search ? "No results found" : tab === "unread" ? "All caught up!" : "No notifications yet"}
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", margin: 0, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>
                  {search ? "Try a different search" : "INBOX CLEAR · SYSTEM IDLE"}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel} className="mb-6">
                  {/* Date separator */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.05)" }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", letterSpacing: 1.5, textTransform: "uppercase" }}>
                      {dateLabel}
                    </span>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.05)" }} />
                  </div>

                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((n, i) => {
                      const meta     = getMeta(n.type);
                      const Icon     = meta.icon;
                      const priority = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.normal;
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => {
                            if (!n.read) markRead(n.id);
                            if (n.action_url) window.location.href = n.action_url;
                          }}
                          style={{
                            padding: "14px 18px",
                            background: n.read
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(99,102,241,0.04)",
                            border: n.read
                              ? "1px solid rgba(255,255,255,0.05)"
                              : `1px solid rgba(99,102,241,0.12)`,
                            borderRadius: 16,
                            display: "flex", gap: 14, alignItems: "flex-start",
                            cursor: n.action_url ? "pointer" : n.read ? "default" : "pointer",
                            position: "relative", overflow: "hidden",
                            transition: "all 0.15s",
                          }}
                          className="hover:!bg-white/[0.035]"
                        >
                          {/* Unread left accent */}
                          {!n.read && (
                            <div style={{
                              position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3,
                              background: `linear-gradient(180deg, transparent, ${meta.color}, transparent)`,
                              borderRadius: "0 2px 2px 0",
                            }} />
                          )}

                          {/* Icon */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                            background: meta.bg,
                            border: n.read ? "none" : `1px solid ${meta.color}30`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {n.icon
                              ? <span style={{ fontSize: 20 }}>{n.icon}</span>
                              : <Icon size={18} style={{ color: meta.color }} />
                            }
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: 14, fontWeight: n.read ? 500 : 700,
                                  color: n.read ? "#a1a1aa" : "#f4f4f5",
                                  letterSpacing: -0.2, lineHeight: 1.3,
                                }}>
                                  {n.title}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                {(n.priority === "urgent" || n.priority === "high") && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 800, padding: "2px 6px",
                                    borderRadius: 5, background: priority.bg, color: priority.color,
                                    letterSpacing: 0.5, textTransform: "uppercase",
                                  }}>
                                    {priority.label}
                                  </span>
                                )}
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                                  {timeAgo(n.created_at)}
                                </span>
                              </div>
                            </div>

                            <p style={{
                              fontSize: 13, color: "rgba(255,255,255,0.42)",
                              lineHeight: 1.55, margin: "0 0 8px",
                            }}>
                              {n.content}
                            </p>

                            {/* Tags */}
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "2px 8px",
                                borderRadius: 6, background: meta.bg,
                                color: meta.color, letterSpacing: 0.3,
                                textTransform: "capitalize",
                              }}>
                                {n.category}
                              </span>
                              {n.action_url && (
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                                  · click to open
                                </span>
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
                    })}
                  </div>
                </div>
              ))}

              {/* Count footer */}
              <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>
                  {filtered.length} notification{filtered.length !== 1 ? "s" : ""} shown
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPrefs && (
          <PreferencesModal
            preferences={preferences}
            onSave={updatePreferences}
            onClose={() => setShowPrefs(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
