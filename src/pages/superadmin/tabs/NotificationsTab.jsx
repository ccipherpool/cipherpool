import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import {
  Send, Bell, Users, Trophy, ShieldCheck, Star,
  Megaphone, AlertTriangle, Zap, Info, RefreshCw,
  Gift, CheckCircle, Eye, Clock, ArrowRight, X,
  BarChart3, Globe,
} from "lucide-react";

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:      "#020617",
  surface: "#0d1220",
  s2:      "#111928",
  s3:      "#1a2235",
  border:  "rgba(255,255,255,0.05)",
  b2:      "rgba(255,255,255,0.08)",
  accent:  "#8b5cf6",
  cyan:    "#06b6d4",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  indigo:  "#6366f1",
  pink:    "#ec4899",
  text:    "#f4f4f5",
  text2:   "#a1a1aa",
  text3:   "#52525b",
  font:    "Satoshi, Inter, system-ui, sans-serif",
};

/* ─── Configs ───────────────────────────────────────────────────── */
const TYPE_OPTIONS = [
  { id: "announcement", label: "Announcement", icon: Megaphone,     color: C.cyan   },
  { id: "warning",      label: "Warning",      icon: AlertTriangle,  color: C.amber  },
  { id: "update",       label: "Update",       icon: RefreshCw,      color: C.indigo },
  { id: "achievement",  label: "Achievement",  icon: Trophy,          color: C.amber  },
  { id: "gift",         label: "Gift",         icon: Gift,            color: C.pink   },
  { id: "system",       label: "System",       icon: ShieldCheck,     color: C.indigo },
  { id: "season",       label: "Season",       icon: Star,            color: C.amber  },
  { id: "broadcast",    label: "Broadcast",    icon: Globe,           color: C.cyan   },
];

const CATEGORY_OPTIONS = [
  { id: "admin",        label: "Admin",        color: C.accent },
  { id: "tournament",   label: "Tournament",   color: "#8b5cf6" },
  { id: "social",       label: "Social",       color: C.pink   },
  { id: "system",       label: "System",       color: C.indigo },
  { id: "marketing",    label: "Marketing",    color: C.amber  },
  { id: "announcement", label: "Announcement", color: C.cyan   },
];

const PRIORITY_OPTIONS = [
  { id: "low",    label: "Low",    color: C.text3 },
  { id: "normal", label: "Normal", color: C.indigo },
  { id: "high",   label: "High",   color: C.amber  },
  { id: "urgent", label: "Urgent", color: C.red    },
];

const TARGET_OPTIONS = [
  { id: "all_users",                label: "All Users",               icon: Globe,      desc: "Every registered user" },
  { id: "admins",                   label: "Admins & Founders",       icon: ShieldCheck,desc: "Staff with elevated roles" },
  { id: "founders",                 label: "Founders Only",           icon: Star,       desc: "Founders only" },
  { id: "specific_role",            label: "Specific Role",           icon: Users,      desc: "Choose a role group" },
  { id: "tournament_participants",  label: "Tournament Participants", icon: Trophy,     desc: "Players in a tournament" },
  { id: "specific_users",           label: "Custom Selection",        icon: Users,      desc: "Pick individual users" },
];

const ICON_PRESETS = ["📣", "🏆", "⚡", "🎁", "🔔", "🛡️", "🌟", "⚠️", "🔥", "💎", "🎯", "🚀"];

const EMPTY_FORM = {
  title: "", message: "", type: "announcement", category: "admin",
  priority: "normal", targetType: "all_users", targetRole: "",
  tournamentId: "", icon: "", actionUrl: "", imageUrl: "",
};

/* ─── Notification Preview ───────────────────────────────────────── */
function NotifPreview({ form }) {
  const typeMeta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];
  const Icon = typeMeta.icon;
  const priorityConf = PRIORITY_OPTIONS.find(p => p.id === form.priority);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a1a 0%, #0d0d22 100%)",
      border: `1px solid ${typeMeta.color}50`,
      borderRadius: 16, padding: "14px 16px",
      display: "flex", gap: 12, alignItems: "flex-start",
      position: "relative", overflow: "hidden",
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${typeMeta.color}20`,
    }}>
      {/* Scan line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${typeMeta.color}60, transparent)` }} />
      {/* Left bar */}
      <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: 3, background: `linear-gradient(180deg, transparent, ${typeMeta.color}, transparent)`, borderRadius: "0 2px 2px 0" }} />

      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${typeMeta.color}15`, border: `1px solid ${typeMeta.color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {form.icon ? <span style={{ fontSize: 18 }}>{form.icon}</span> : <Icon size={17} color={typeMeta.color} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>
            {form.title || "Notification Title"}
          </span>
          {(form.priority === "urgent" || form.priority === "high") && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: `${priorityConf.color}18`, color: priorityConf.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {form.priority}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {form.message || "Notification message will appear here…"}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9.5, color: typeMeta.color, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
            {form.category}
          </span>
          {form.actionUrl && <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)" }}>· click to open</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: "0 0 16px 16px", background: `linear-gradient(90deg, ${typeMeta.color}50, ${typeMeta.color})` }} />
    </div>
  );
}

/* ─── Broadcast History Row ─────────────────────────────────────── */
function BroadcastRow({ b }) {
  const typeMeta = TYPE_OPTIONS.find(t => t.id === b.type) || TYPE_OPTIONS[0];
  const Icon = typeMeta.icon;

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 16px", alignItems: "flex-start",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${typeMeta.color}12`, border: `1px solid ${typeMeta.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={typeMeta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, flex: 1, lineHeight: 1.3 }}>{b.title}</span>
          <span style={{ fontSize: 10, color: C.text3, fontFamily: "monospace", flexShrink: 0 }}>
            {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: C.text3, margin: "0 0 6px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {b.message}
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 7px", borderRadius: 5, background: `${typeMeta.color}12`, color: typeMeta.color, letterSpacing: 0.3, textTransform: "uppercase" }}>
            {b.target_type?.replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 3 }}>
            <CheckCircle size={10} />
            {b.sent_count?.toLocaleString() || 0} sent
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function NotificationsTab() {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [sending, setSending]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [history, setHistory]     = useState([]);
  const [loadingH, setLoadingH]   = useState(true);
  const [stats, setStats]         = useState({ total: 0, today: 0, thisWeek: 0 });
  const [tournaments, setTournaments] = useState([]);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => { fetchHistory(); fetchTournaments(); }, []);

  const showMsg = (ok, text) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchHistory = async () => {
    setLoadingH(true);
    try {
      const { data } = await supabase
        .from("notification_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = data || [];
      setHistory(rows);

      const now   = new Date();
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const week  = new Date(now); week.setDate(week.getDate() - 7);

      setStats({
        total:    rows.length,
        today:    rows.filter(r => new Date(r.created_at) >= today).length,
        thisWeek: rows.filter(r => new Date(r.created_at) >= week).length,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("fetchHistory:", err);
    } finally {
      setLoadingH(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, status")
        .in("status", ["open", "registration_open", "active", "ongoing"])
        .order("created_at", { ascending: false })
        .limit(20);
      setTournaments(data || []);
    } catch {}
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      showMsg(false, "Title and message are required.");
      return;
    }
    setSending(true);
    try {
      const targetFilters = {};
      if (form.targetType === "specific_role")           targetFilters.role          = form.targetRole;
      if (form.targetType === "tournament_participants") targetFilters.tournament_id = form.tournamentId;

      const { data, error } = await supabase.rpc("send_global_notification", {
        p_title:          form.title.trim(),
        p_message:        form.message.trim(),
        p_type:           form.type,
        p_category:       form.category,
        p_priority:       form.priority,
        p_target_type:    form.targetType,
        p_target_filters: targetFilters,
        p_icon:           form.icon || null,
        p_action_url:     form.actionUrl || null,
        p_image_url:      form.imageUrl || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");

      showMsg(true, `Notification sent to ${data.sent_count?.toLocaleString() || 0} user(s).`);
      setForm(EMPTY_FORM);
      await fetchHistory();
    } catch (err) {
      showMsg(false, err.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const Chip = ({ selected, onClick, color, children }) => (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
        border: `1px solid ${selected ? color + "40" : C.border}`,
        background: selected ? color + "14" : "transparent",
        color: selected ? color : C.text3,
        cursor: "pointer", transition: "all 0.14s",
      }}
    >
      {children}
    </button>
  );

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <motion.div
      key="notifications-tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontFamily: C.font }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Notification Center</div>
            <div style={{ fontSize: 11, color: C.text3 }}>Broadcast messages to platform users</div>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          className="hover:!bg-white/5"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total Broadcasts", value: stats.total,    icon: BarChart3, color: C.accent },
          { label: "Today",            value: stats.today,    icon: Clock,     color: C.cyan   },
          { label: "This Week",        value: stats.thisWeek, icon: Bell,      color: C.green  },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: `${s.color}30` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={13} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: C.text3, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Status Message ──────────────────────────────── */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            style={{
              marginBottom: 16, padding: "11px 16px", borderRadius: 10,
              display: "flex", alignItems: "center", gap: 10,
              background: msg.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${msg.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: msg.ok ? "#34d399" : "#f87171",
              fontSize: 13, fontWeight: 600,
            }}
          >
            {msg.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Grid ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>

        {/* LEFT: Compose Form */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={13} color={C.accent} />
            Compose Broadcast
          </div>

          {/* Title */}
          <Field label="Title *">
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Season 5 is Live!"
              maxLength={80}
              style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }}
              className="focus:!border-indigo-500/50"
            />
          </Field>

          {/* Message */}
          <Field label="Message *">
            <textarea
              value={form.message}
              onChange={e => set("message", e.target.value)}
              placeholder="Write your notification message…"
              maxLength={300}
              rows={4}
              style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", resize: "vertical", minHeight: 80, fontFamily: C.font, lineHeight: 1.55, boxSizing: "border-box" }}
              className="focus:!border-indigo-500/50"
            />
            <div style={{ fontSize: 10, color: C.text3, textAlign: "right", marginTop: 4 }}>{form.message.length}/300</div>
          </Field>

          {/* Type */}
          <Field label="Type">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => set("type", t.id)}
                  style={{
                    padding: "5px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    border: `1px solid ${form.type === t.id ? t.color + "50" : C.border}`,
                    background: form.type === t.id ? t.color + "14" : "transparent",
                    color: form.type === t.id ? t.color : C.text3,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.14s",
                  }}
                >
                  <t.icon size={11} />
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Category + Priority in two columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Category</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {CATEGORY_OPTIONS.map(c => (
                  <Chip key={c.id} selected={form.category === c.id} onClick={() => set("category", c.id)} color={c.color}>{c.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Priority</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {PRIORITY_OPTIONS.map(p => (
                  <Chip key={p.id} selected={form.priority === p.id} onClick={() => set("priority", p.id)} color={p.color}>{p.label}</Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <Field label="Target Audience">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TARGET_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => set("targetType", t.id)}
                  style={{
                    padding: "10px 14px", borderRadius: 10, textAlign: "left",
                    border: `1px solid ${form.targetType === t.id ? C.accent + "40" : C.border}`,
                    background: form.targetType === t.id ? C.accent + "0c" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    transition: "all 0.14s",
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: form.targetType === t.id ? C.accent + "18" : C.s3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <t.icon size={13} color={form.targetType === t.id ? C.accent : C.text3} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: form.targetType === t.id ? C.text : C.text2, lineHeight: 1.2 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: C.text3 }}>{t.desc}</div>
                  </div>
                  {form.targetType === t.id && <ArrowRight size={13} color={C.accent} />}
                </button>
              ))}
            </div>

            {/* Sub-selectors */}
            {form.targetType === "specific_role" && (
              <div style={{ marginTop: 10 }}>
                <select
                  value={form.targetRole}
                  onChange={e => set("targetRole", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: form.targetRole ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}
                >
                  <option value="">Select role…</option>
                  {["user","admin","founder","super_admin","designer"].map(r => (
                    <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            )}
            {form.targetType === "tournament_participants" && (
              <div style={{ marginTop: 10 }}>
                <select
                  value={form.tournamentId}
                  onChange={e => set("tournamentId", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: form.tournamentId ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}
                >
                  <option value="">Select tournament…</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </Field>

          {/* Icon picker + Action URL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Icon (Emoji)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {ICON_PRESETS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => set("icon", form.icon === ic ? "" : ic)}
                    style={{
                      width: 32, height: 32, borderRadius: 7,
                      border: `1px solid ${form.icon === ic ? C.accent + "50" : C.border}`,
                      background: form.icon === ic ? C.accent + "14" : C.s2,
                      fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                value={form.icon}
                onChange={e => set("icon", e.target.value)}
                placeholder="Or type emoji…"
                style={{ width: "100%", padding: "7px 10px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Action URL</label>
              <input
                value={form.actionUrl}
                onChange={e => set("actionUrl", e.target.value)}
                placeholder="/tournaments or https://…"
                style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                className="focus:!border-indigo-500/50"
              />
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={e => set("imageUrl", e.target.value)}
                  placeholder="https://…/banner.png"
                  style={{ width: "100%", padding: "9px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                  className="focus:!border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !form.title.trim() || !form.message.trim()}
            style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none",
              background: sending || !form.title.trim() || !form.message.trim()
                ? "rgba(139,92,246,0.3)"
                : "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #06b6d4 100%)",
              color: "#fff", fontSize: 13, fontWeight: 800, cursor: sending ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: sending || !form.title.trim() || !form.message.trim()
                ? "none"
                : "0 4px 20px rgba(139,92,246,0.4)",
              transition: "all 0.2s", letterSpacing: "0.04em", textTransform: "uppercase",
            }}
          >
            {sending ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />
                Sending…
              </>
            ) : (
              <>
                <Send size={14} />
                Send Broadcast
              </>
            )}
          </button>
          <style>{`@keyframes nt-spin { to { transform: rotate(360deg) } }`}</style>
        </div>

        {/* RIGHT: Preview + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Preview card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div
              style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setShowPreview(p => !p)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <Eye size={12} color={C.cyan} />
                Live Preview
              </div>
              <div style={{ transform: showPreview ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s", color: C.text3, lineHeight: 1 }}>▲</div>
            </div>
            <AnimatePresence initial={false}>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>Toast Preview</div>
                    <NotifPreview form={form} />
                    <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1, textTransform: "uppercase", marginTop: 12, marginBottom: 8, fontFamily: "monospace" }}>Bell Dropdown Preview</div>
                    <div style={{
                      background: "#06061a", border: "1px solid rgba(99,102,241,0.15)",
                      borderRadius: 12, overflow: "hidden",
                    }}>
                      {(() => {
                        const typeMeta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];
                        const Icon = typeMeta.icon;
                        return (
                          <div style={{ display: "flex", gap: 10, padding: "10px 12px", borderLeft: `2px solid ${typeMeta.color}` }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: typeMeta.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {form.icon ? <span style={{ fontSize: 14 }}>{form.icon}</span> : <Icon size={12} color={typeMeta.color} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", marginBottom: 2 }}>{form.title || "Title"}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {form.message || "Message…"}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Broadcast History */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, flex: 1, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <Clock size={12} color={C.amber} />
              Broadcast History
            </div>
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {loadingH ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                  <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}30`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />
                </div>
              ) : history.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 16px", textAlign: "center" }}>
                  <Bell size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>No broadcasts yet</p>
                </div>
              ) : (
                history.map(b => <BroadcastRow key={b.id} b={b} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
