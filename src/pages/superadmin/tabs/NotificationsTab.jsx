import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import {
  Send, Bell, Users, Trophy, ShieldCheck, Star,
  Megaphone, AlertTriangle, Zap, RefreshCw,
  Gift, CheckCircle, Eye, Clock, ArrowRight, X,
  BarChart3, Globe, Search, UserCheck, ChevronDown,
  Info, Crown, Mail, MailCheck, MailX, Wifi,
  Swords, Shield, FlaskConical, Hash,
} from "lucide-react";

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:      "#020617",
  surface: "#0d1220",
  s2:      "#111928",
  s3:      "#1a2235",
  border:  "rgba(255,255,255,0.05)",
  b2:      "rgba(255,255,255,0.09)",
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
  { id: "admin",        label: "Admin",        color: C.accent  },
  { id: "tournament",   label: "Tournament",   color: "#8b5cf6" },
  { id: "social",       label: "Social",       color: C.pink    },
  { id: "system",       label: "System",       color: C.indigo  },
  { id: "marketing",    label: "Marketing",    color: C.amber   },
  { id: "announcement", label: "Announcement", color: C.cyan    },
];

const PRIORITY_OPTIONS = [
  { id: "low",    label: "Low",    color: C.text3  },
  { id: "normal", label: "Normal", color: C.indigo },
  { id: "high",   label: "High",   color: C.amber  },
  { id: "urgent", label: "Urgent", color: C.red    },
];

const TARGET_OPTIONS = [
  { id: "all_users",               label: "All Users",            icon: Globe,       desc: "Every registered user",                          color: C.cyan,   group: "broad"    },
  { id: "online_users",            label: "Online Now",           icon: Wifi,        desc: "Users active in the last 15 minutes",            color: C.green,  group: "broad"    },
  { id: "admins",                  label: "Admins & Staff",       icon: ShieldCheck, desc: "Admins, super admins, founders",                 color: C.indigo, group: "broad"    },
  { id: "founders",                label: "Founders Only",        icon: Crown,       desc: "Users with the founder role",                    color: C.amber,  group: "broad"    },
  { id: "specific_role",           label: "Specific Role",        icon: Users,       desc: "Target a single role group",                     color: C.accent, group: "targeted" },
  { id: "tournament_participants", label: "Tournament Players",   icon: Trophy,      desc: "Everyone in a specific tournament",              color: "#8b5cf6", group: "targeted" },
  { id: "clan_members",            label: "Clan Members",         icon: Shield,      desc: "All members of a specific clan",                 color: C.pink,   group: "targeted" },
  { id: "team_members",            label: "Team Members",         icon: Swords,      desc: "All members of a specific team",                 color: C.amber,  group: "targeted" },
  { id: "specific_users",          label: "Hand-Pick Users",      icon: UserCheck,   desc: "Search and select exactly who gets this",        color: C.green,  group: "precise"  },
];

const ICON_PRESETS = ["📣", "🏆", "⚡", "🎁", "🔔", "🛡️", "🌟", "⚠️", "🔥", "💎", "🎯", "🚀", "👑", "💰", "⚔️", "🏅"];

const ROLE_OPTIONS = [
  { v: "user",        l: "User (regular players)" },
  { v: "admin",       l: "Admin" },
  { v: "founder",     l: "Founder" },
  { v: "super_admin", l: "Super Admin" },
  { v: "designer",    l: "Designer" },
];

const EMPTY_FORM = {
  title: "", message: "", type: "announcement", category: "admin",
  priority: "normal", targetType: "all_users", targetRole: "",
  tournamentId: "", clanId: "", teamId: "", icon: "", actionUrl: "", imageUrl: "",
  sendInApp: true, sendEmail: false, emailSubject: "",
};

/* ─── Enhanced User Picker ──────────────────────────────────────── */
function UserPicker({ selectedUsers, onSelect, onRemove }) {
  const [query, setQuery]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef               = useRef(null);

  const search = useCallback(async (q, role) => {
    const trimmed = q.trim();
    if (!trimmed && !role) { setResults([]); return; }
    setSearching(true);
    try {
      let qb = supabase
        .from("profiles")
        .select("id, username, email, role, avatar_url, level, full_name")
        .neq("role", "banned")
        .limit(20);

      if (trimmed) {
        // Try UUID match first, then text search
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRe.test(trimmed)) {
          qb = qb.eq("id", trimmed);
        } else {
          qb = qb.or(`username.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
        }
      }
      if (role) qb = qb.eq("role", role);

      const { data } = await qb;
      setResults((data || []).filter(u => !selectedUsers.find(s => s.id === u.id)));
    } finally {
      setSearching(false);
    }
  }, [selectedUsers]);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, roleFilter), 280);
  };

  const handleRoleFilter = (role) => {
    const newRole = roleFilter === role ? "" : role;
    setRoleFilter(newRole);
    search(query, newRole);
  };

  const pick = (user) => {
    if (selectedUsers.find(s => s.id === user.id)) return;
    onSelect(user);
    setQuery("");
    setResults([]);
  };

  const roleColor = (r) => {
    if (r === "super_admin") return C.red;
    if (r === "founder")     return C.amber;
    if (r === "admin")       return C.accent;
    if (r === "designer")    return C.pink;
    return C.text3;
  };

  return (
    <div>
      {/* Role filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: C.text3, alignSelf: "center", marginRight: 2 }}>Filter:</span>
        {ROLE_OPTIONS.map(r => (
          <button
            key={r.v}
            onClick={() => handleRoleFilter(r.v)}
            style={{
              padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 600,
              border: `1px solid ${roleFilter === r.v ? roleColor(r.v) + "50" : C.border}`,
              background: roleFilter === r.v ? roleColor(r.v) + "14" : "transparent",
              color: roleFilter === r.v ? roleColor(r.v) : C.text3,
              cursor: "pointer",
            }}
          >
            {r.v}
          </button>
        ))}
      </div>

      {/* Selected chips */}
      {selectedUsers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {selectedUsers.map(u => (
            <motion.div
              key={u.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px 4px 6px", borderRadius: 20,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#6366f1,#06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "#fff", overflow: "hidden",
              }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (u.username?.[0] || "?").toUpperCase()
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                {u.username || u.email?.split("@")[0]}
              </span>
              <span style={{ fontSize: 9, color: C.text3, fontFamily: "monospace" }}>
                {u.id.slice(0, 6)}…
              </span>
              <button
                onClick={() => onRemove(u.id)}
                style={{ background: "none", border: "none", color: "rgba(16,185,129,0.6)", cursor: "pointer", display: "flex", padding: 0, lineHeight: 1 }}
              >
                <X size={11} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }} />
        {searching && (
          <div style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: `2px solid ${C.accent}30`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "nt-spin 0.7s linear infinite" }} />
        )}
        <input
          value={query}
          onChange={handleInput}
          placeholder="Username, email, full name, or user ID…"
          style={{
            width: "100%", padding: "9px 12px 9px 34px",
            background: C.s2, border: `1px solid ${C.b2}`,
            borderRadius: 10, color: C.text, fontSize: 13,
            outline: "none", fontFamily: C.font, boxSizing: "border-box",
          }}
          className="focus:!border-indigo-500/50"
        />
      </div>
      <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>Tip: paste a user UUID to find exact user · max 20 results</div>

      {/* Results dropdown */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              marginTop: 4, background: "#0a0a1c",
              border: `1px solid ${C.b2}`, borderRadius: 12,
              overflow: "hidden", boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
            }}
          >
            {results.map((u, i) => (
              <button
                key={u.id}
                onClick={() => pick(u)}
                style={{
                  width: "100%", padding: "9px 14px", border: "none",
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  textAlign: "left", transition: "background 0.12s",
                  borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : "none",
                }}
                className="hover:!bg-white/[0.04]"
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#6366f1,#06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "#fff", overflow: "hidden",
                }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (u.username?.[0] || "?").toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                      {u.username || "—"}
                    </span>
                    {u.full_name && u.full_name !== u.username && (
                      <span style={{ fontSize: 11, color: C.text3 }}>({u.full_name})</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{u.email}</div>
                  <div style={{ fontSize: 9, color: C.text3, fontFamily: "monospace", marginTop: 1 }}>{u.id}</div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: `${roleColor(u.role)}12`, color: roleColor(u.role), letterSpacing: 0.4, textTransform: "uppercase" }}>
                    {u.role}
                  </span>
                  <span style={{ fontSize: 10, color: C.text3 }}>Lv.{u.level || 1}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedUsers.length > 0 && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle size={12} color={C.green} />
          <span style={{ fontSize: 11.5, color: C.green, fontWeight: 600 }}>
            {selectedUsers.length} user{selectedUsers.length > 1 ? "s" : ""} selected — notification goes to exactly these people
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Notification Preview ───────────────────────────────────────── */
function NotifPreview({ form }) {
  const typeMeta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];
  const Icon     = typeMeta.icon;
  const pConf    = PRIORITY_OPTIONS.find(p => p.id === form.priority);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a1a, #0d0d22)",
      border: `1px solid ${typeMeta.color}50`,
      borderRadius: 16, padding: "14px 16px",
      display: "flex", gap: 12, alignItems: "flex-start",
      position: "relative", overflow: "hidden",
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${typeMeta.color}20`,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${typeMeta.color}60, transparent)` }} />
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
            <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: `${pConf.color}18`, color: pConf.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {form.priority}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {form.message || "Your message will appear here…"}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9.5, color: typeMeta.color, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{form.category}</span>
          {form.actionUrl && <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)" }}>· tap to open</span>}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: "0 0 16px 16px", background: `linear-gradient(90deg, ${typeMeta.color}50, ${typeMeta.color})` }} />
    </div>
  );
}

/* ─── Email Preview Card ─────────────────────────────────────────── */
function EmailPreview({ form }) {
  const typeMeta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      {/* Email client chrome */}
      <div style={{ background: "#fff", padding: "8px 12px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["#ff5f57","#ffbd2e","#28ca41"].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, padding: "3px 8px", fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>
          {form.emailSubject || form.title || "Email subject…"}
        </div>
      </div>
      {/* Email body preview */}
      <div style={{ padding: "16px", background: "#f8fafc" }}>
        <div style={{ background: "#0d1220", borderRadius: 10, overflow: "hidden", fontSize: 0 }}>
          {/* Top accent bar */}
          <div style={{ height: 2, background: `linear-gradient(90deg,${typeMeta.color},#6366f1)` }} />
          <div style={{ padding: "16px" }}>
            {/* Logo */}
            <div style={{ fontSize: 14, fontWeight: 900, color: "#06b6d4", marginBottom: 10, letterSpacing: "-0.3px" }}>⚡ CIPHERPOOL</div>
            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {form.icon && <span style={{ fontSize: 20 }}>{form.icon}</span>}
              <div style={{ fontSize: 15, fontWeight: 900, color: "#f4f4f5", lineHeight: 1.2 }}>{form.title || "Notification Title"}</div>
            </div>
            {/* Message */}
            <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {form.message || "Your email message will appear here…"}
            </div>
            {/* CTA */}
            {form.actionUrl && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "inline-block", padding: "8px 18px", background: `linear-gradient(135deg,${typeMeta.color},#6366f1)`, color: "#fff", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                  Open in CipherPool →
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>Manage preferences · cipherpool.gg</div>
      </div>
    </div>
  );
}

/* ─── Broadcast History Row ─────────────────────────────────────── */
function BroadcastRow({ b }) {
  const typeMeta = TYPE_OPTIONS.find(t => t.id === b.type) || TYPE_OPTIONS[0];
  const Icon     = typeMeta.icon;
  return (
    <div style={{ display: "flex", gap: 10, padding: "11px 14px", alignItems: "flex-start", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${typeMeta.color}12`, border: `1px solid ${typeMeta.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} color={typeMeta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>{b.title}</span>
          <span style={{ fontSize: 10, color: C.text3, fontFamily: "monospace", flexShrink: 0 }}>
            {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 5, background: `${typeMeta.color}12`, color: typeMeta.color, letterSpacing: 0.3, textTransform: "uppercase" }}>
            {(b.target_type || "").replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 3 }}>
            <CheckCircle size={9} /> {b.sent_count?.toLocaleString() || 0} in-app
          </span>
          {b.send_email && (
            <span style={{ fontSize: 10, color: b.email_status === "sent" ? C.green : b.email_status === "failed" ? C.red : C.amber, display: "flex", alignItems: "center", gap: 3 }}>
              <Mail size={9} />
              {b.email_status === "sent"    ? `${b.email_sent_count} emailed` :
               b.email_status === "sending" ? "Sending…" :
               b.email_status === "failed"  ? "Email failed" :
               b.email_status === "partial" ? `${b.email_sent_count} sent, ${b.email_failed_count} failed` :
               "Email queued"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Delivery Report ────────────────────────────────────────────── */
function DeliveryReport({ report, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        marginBottom: 16, padding: "16px 18px", borderRadius: 14,
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.2)",
        position: "relative",
      }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.text3, cursor: "pointer" }}>
        <X size={12} />
      </button>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.green, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <CheckCircle size={12} /> Broadcast Sent — Delivery Report
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* In-app */}
        <div style={{ background: C.s2, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Bell size={11} color={C.cyan} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, letterSpacing: 0.8, textTransform: "uppercase" }}>In-App</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{report.inApp?.sent ?? 0}</div>
          <div style={{ fontSize: 10, color: C.green }}>notifications delivered</div>
        </div>
        {/* Email */}
        <div style={{ background: C.s2, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Mail size={11} color={report.email ? C.amber : C.text3} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text2, letterSpacing: 0.8, textTransform: "uppercase" }}>Email</span>
          </div>
          {report.email ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{report.email.queued ?? 0}</div>
              <div style={{ fontSize: 10, color: C.amber }}>emails queued — Edge Function sending</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text3 }}>—</div>
              <div style={{ fontSize: 10, color: C.text3 }}>email delivery not enabled</div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function NotificationsTab() {
  const [form, setForm]               = useState(EMPTY_FORM);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending]         = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [msg, setMsg]                 = useState(null);
  const [history, setHistory]         = useState([]);
  const [loadingH, setLoadingH]       = useState(true);
  const [stats, setStats]             = useState({ total: 0, today: 0, thisWeek: 0 });
  const [tournaments, setTournaments] = useState([]);
  const [clans, setClans]             = useState([]);
  const [teams, setTeams]             = useState([]);
  const [showPreview, setShowPreview] = useState(true);
  const [estimatedCount, setEstimatedCount] = useState(null);
  const [deliveryReport, setDeliveryReport] = useState(null);
  const [activeView, setActiveView]   = useState("broadcast"); // "broadcast" | "templates" | "logs"
  const [templates, setTemplates]     = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [emailLogs, setEmailLogs]     = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { fetchHistory(); fetchDropdownData(); fetchTemplates(); }, []);
  useEffect(() => { estimateAudience(); }, [form.targetType, form.targetRole, form.tournamentId, form.clanId, form.teamId, selectedUsers]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("slug");
    setTemplates(data || []);
  };

  const fetchEmailLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase.from("email_logs").select("*").order("sent_at", { ascending: false }).limit(100);
    setEmailLogs(data || []);
    setLogsLoading(false);
  };

  const saveTemplate = async (tpl) => {
    const { error } = await supabase.from("email_templates")
      .update({ subject: tpl.subject, title: tpl.title, content: tpl.content, cta_label: tpl.cta_label, cta_url: tpl.cta_url, updated_at: new Date().toISOString() })
      .eq("id", tpl.id);
    if (!error) { setEditingTemplate(null); fetchTemplates(); showMsg(true, "Template saved."); }
    else showMsg(false, error.message);
  };

  const showMsg = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 6000); };
  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchHistory = async () => {
    setLoadingH(true);
    try {
      const { data } = await supabase
        .from("notification_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
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
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setLoadingH(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [t, c, tm] = await Promise.all([
        supabase.from("tournaments").select("id,name,status").order("created_at", { ascending: false }).limit(100),
        supabase.from("clans").select("id,name,tag").order("name").limit(50).catch(() => ({ data: [] })),
        supabase.from("teams").select("id,name").order("name").limit(50).catch(() => ({ data: [] })),
      ]);
      setTournaments(t.data || []);
      setClans(c.data || []);
      setTeams(tm.data || []);
    } catch {}
  };

  const estimateAudience = async () => {
    try {
      let count = null;
      if (form.targetType === "all_users") {
        const { count: c } = await supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "banned");
        count = c;
      } else if (form.targetType === "online_users") {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { count: c } = await supabase.from("user_presence").select("*", { count: "exact", head: true }).in("status", ["online","idle"]).gte("last_seen", cutoff).catch(() => ({ count: null }));
        count = c;
      } else if (form.targetType === "admins") {
        const { count: c } = await supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["admin","super_admin","founder"]);
        count = c;
      } else if (form.targetType === "founders") {
        const { count: c } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "founder");
        count = c;
      } else if (form.targetType === "specific_role" && form.targetRole) {
        const { count: c } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", form.targetRole);
        count = c;
      } else if (form.targetType === "specific_users") {
        count = selectedUsers.length;
      } else if (form.targetType === "tournament_participants" && form.tournamentId) {
        const { count: c } = await supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("tournament_id", form.tournamentId);
        count = c;
      } else if (form.targetType === "clan_members" && form.clanId) {
        const { count: c } = await supabase.from("clan_members").select("*", { count: "exact", head: true }).eq("clan_id", form.clanId).catch(() => ({ count: null }));
        count = c;
      } else if (form.targetType === "team_members" && form.teamId) {
        const { count: c } = await supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", form.teamId).catch(() => ({ count: null }));
        count = c;
      }
      setEstimatedCount(count);
    } catch { setEstimatedCount(null); }
  };

  // Extracts the actual JSON error message from a FunctionsHttpError
  const extractFnError = async (error) => {
    if (!error) return "Unknown error";
    // FunctionsHttpError carries the raw Response as .context
    if (error.context && typeof error.context.json === "function") {
      try {
        const body = await error.context.json();
        return body.error || body.hint || body.message || error.message;
      } catch {}
    }
    return error.message || String(error);
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleTestEmail = async () => {
    setTestingSend(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in — please refresh the page and try again.");

      const { data, error } = await supabase.functions.invoke("send-email-broadcast", {
        body:    { test_email: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) {
        const detail = await extractFnError(error);
        throw new Error(detail);
      }
      if (data?.success) {
        showMsg(true, `✓ Test email sent to ${data.profile_email ?? data.email} — check your inbox.`);
      } else {
        const errMsg = data?.error || data?.hint || "Test email failed — check RESEND_API_KEY secret.";
        const roleInfo = data?.profile_role ? ` (your role: ${data.profile_role})` : "";
        throw new Error(errMsg + roleInfo);
      }
    } catch (err) {
      showMsg(false, `Test email: ${err.message}`);
    } finally {
      setTestingSend(false);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) { showMsg(false, "Title and message are required."); return; }
    if (!form.sendInApp && !form.sendEmail) { showMsg(false, "Enable at least one delivery channel (in-app or email)."); return; }
    if (form.targetType === "specific_users" && selectedUsers.length === 0) { showMsg(false, "Select at least one user."); return; }
    if (form.targetType === "specific_role" && !form.targetRole) { showMsg(false, "Select a role."); return; }
    if (form.targetType === "tournament_participants" && !form.tournamentId) { showMsg(false, "Select a tournament."); return; }
    if (form.targetType === "clan_members" && !form.clanId) { showMsg(false, "Select a clan."); return; }
    if (form.targetType === "team_members" && !form.teamId) { showMsg(false, "Select a team."); return; }
    if (form.sendEmail && !form.emailSubject.trim() && !form.title.trim()) { showMsg(false, "Email subject is required."); return; }

    setSending(true);
    setDeliveryReport(null);
    try {
      const targetFilters = {};
      if (form.targetType === "specific_role")           targetFilters.role           = form.targetRole;
      if (form.targetType === "tournament_participants") targetFilters.tournament_id  = form.tournamentId;
      if (form.targetType === "clan_members")            targetFilters.clan_id        = form.clanId;
      if (form.targetType === "team_members")            targetFilters.team_id        = form.teamId;
      if (form.targetType === "specific_users")          targetFilters.user_ids       = selectedUsers.map(u => u.id);

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
        p_send_in_app:    form.sendInApp,
        p_send_email:     form.sendEmail,
        p_email_subject:  form.emailSubject.trim() || form.title.trim(),
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Send failed");

      const broadcastId = data.broadcast_id;
      const inAppSent   = data.sent_count ?? 0;

      // Trigger email Edge Function if enabled
      let emailQueued = null;
      if (form.sendEmail && broadcastId) {
        const token = await getToken();
        const { data: efData, error: efErr } = await supabase.functions.invoke("send-email-broadcast", {
          body:    { broadcast_id: broadcastId },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (efErr) {
          const detail = await extractFnError(efErr);
          showMsg(false, `In-app sent OK, but email failed: ${detail}`);
        } else {
          emailQueued = data?.target_count ?? estimatedCount ?? 0;
        }
      }

      setDeliveryReport({
        inApp: { sent: inAppSent },
        email: form.sendEmail ? { queued: emailQueued ?? 0 } : null,
      });

      setForm(EMPTY_FORM);
      setSelectedUsers([]);
      setEstimatedCount(null);
      await fetchHistory();
    } catch (err) {
      showMsg(false, err.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const canSend = form.title.trim() && form.message.trim() &&
    (form.sendInApp || form.sendEmail) &&
    !(form.targetType === "specific_users" && selectedUsers.length === 0) &&
    !(form.targetType === "specific_role" && !form.targetRole) &&
    !(form.targetType === "tournament_participants" && !form.tournamentId) &&
    !(form.targetType === "clan_members" && !form.clanId) &&
    !(form.targetType === "team_members" && !form.teamId);

  const isLargeAudience = form.sendEmail && estimatedCount !== null && estimatedCount > 500;

  /* ── UI helpers ── */
  const Chip = ({ selected, onClick, color, children }) => (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
        border: `1px solid ${selected ? color + "45" : C.border}`,
        background: selected ? color + "14" : "transparent",
        color: selected ? color : C.text3,
        cursor: "pointer", transition: "all 0.14s",
      }}
      className="hover:!border-white/10"
    >
      {children}
    </button>
  );

  const Field = ({ label, tip, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {label}
        </label>
        {tip && <span style={{ fontSize: 10, color: C.text3, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— {tip}</span>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange, label, desc, color = C.cyan }) => (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: checked ? `${color}08` : "transparent", border: `1px solid ${checked ? color + "25" : C.border}`, cursor: "pointer", transition: "all 0.14s" }}
      onClick={() => onChange(!checked)}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: "relative",
        background: checked ? `linear-gradient(135deg,${color},#6366f1)` : C.s3,
        transition: "background 0.2s", flexShrink: 0,
        boxShadow: checked ? `0 0 10px ${color}40` : "none",
      }}>
        <div style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: checked ? C.text : C.text2 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.text3 }}>{desc}</div>}
      </div>
    </div>
  );

  /* ── Group targets by category ── */
  const targetGroups = [
    { label: "Broad",    items: TARGET_OPTIONS.filter(t => t.group === "broad")    },
    { label: "Targeted", items: TARGET_OPTIONS.filter(t => t.group === "targeted") },
    { label: "Precise",  items: TARGET_OPTIONS.filter(t => t.group === "precise")  },
  ];

  return (
    <motion.div
      key="notifications-tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ fontFamily: C.font }}
    >
      <style>{`@keyframes nt-spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── View tabs ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: "4px", background: C.s2, borderRadius: 10, width: "fit-content" }}>
        {[
          { id: "broadcast", label: "Broadcast", icon: <Bell size={12} /> },
          { id: "templates", label: "Email Templates", icon: <Mail size={12} /> },
          { id: "logs",      label: "Email Logs",      icon: <MailCheck size={12} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); if (tab.id === "logs") fetchEmailLogs(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeView === tab.id ? C.surface : "transparent",
              color: activeView === tab.id ? C.text : C.text3,
              fontSize: 11, fontWeight: activeView === tab.id ? 700 : 500,
              transition: "all 0.15s",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeView === "broadcast" && <>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={16} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Notification Broadcast Center</div>
            <div style={{ fontSize: 11, color: C.text3 }}>Full control — in-app + email delivery · any audience</div>
          </div>
        </div>
        <button onClick={fetchHistory} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} className="hover:!bg-white/5">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total Broadcasts", value: stats.total,    icon: BarChart3, color: C.accent },
          { label: "Sent Today",       value: stats.today,    icon: Clock,     color: C.cyan   },
          { label: "This Week",        value: stats.thisWeek, icon: Bell,      color: C.green  },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: `${s.color}30` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={13} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: C.text3, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Delivery Report ─────────────────────────────── */}
      <AnimatePresence>
        {deliveryReport && (
          <DeliveryReport report={deliveryReport} onClose={() => setDeliveryReport(null)} />
        )}
      </AnimatePresence>

      {/* ── Status Message ──────────────────────────────── */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>

        {/* LEFT: Compose Form */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={12} color={C.accent} />
            Compose
          </div>

          {/* Title */}
          <Field label="Title" tip="required">
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder='e.g. "Season 5 Finals Results 🏆"'
              maxLength={80}
              style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", fontFamily: C.font, boxSizing: "border-box" }}
              className="focus:!border-indigo-500/50"
            />
          </Field>

          {/* Message */}
          <Field label="Message" tip="required">
            <textarea
              value={form.message}
              onChange={e => set("message", e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Write your notification message… (Enter = new line)"
              maxLength={400}
              rows={5}
              style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", resize: "vertical", minHeight: 100, fontFamily: C.font, lineHeight: 1.6, boxSizing: "border-box" }}
              className="focus:!border-indigo-500/50"
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: C.text3 }}>Press Enter for a new line · Shift+Enter also works</span>
              <span style={{ fontSize: 10, color: C.text3 }}>{form.message.length}/400</span>
            </div>
          </Field>

          {/* Type */}
          <Field label="Type">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => set("type", t.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    border: `1px solid ${form.type === t.id ? t.color + "50" : C.border}`,
                    background: form.type === t.id ? t.color + "14" : "transparent",
                    color: form.type === t.id ? t.color : C.text3,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.14s",
                  }}
                  className="hover:!border-white/10"
                >
                  <t.icon size={11} />
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Category + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Category</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {CATEGORY_OPTIONS.map(c => (
                  <Chip key={c.id} selected={form.category === c.id} onClick={() => set("category", c.id)} color={c.color}>{c.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Priority</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {PRIORITY_OPTIONS.map(p => (
                  <Chip key={p.id} selected={form.priority === p.id} onClick={() => set("priority", p.id)} color={p.color}>{p.label}</Chip>
                ))}
              </div>
            </div>
          </div>

          {/* ── DELIVERY CHANNELS ── */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Delivery Channels
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Toggle
                checked={form.sendInApp}
                onChange={v => set("sendInApp", v)}
                label="Send In-App Notification"
                desc="Shows in bell dropdown + toast popup · realtime"
                color={C.cyan}
              />
              <Toggle
                checked={form.sendEmail}
                onChange={v => set("sendEmail", v)}
                label="Send Email"
                desc="Delivered via Resend · respects user preferences"
                color={C.amber}
              />
            </div>

            {/* Email settings */}
            <AnimatePresence>
              {form.sendEmail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ paddingTop: 12 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.amber, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Email Subject
                    </label>
                    <input
                      value={form.emailSubject}
                      onChange={e => set("emailSubject", e.target.value)}
                      placeholder={form.title || "Email subject line…"}
                      maxLength={100}
                      style={{ width: "100%", padding: "9px 13px", background: C.s2, border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 9, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: C.font }}
                      className="focus:!border-amber-500/50"
                    />
                    <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Mail size={12} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 11, color: C.amber }}>
                        Email will be sent via Resend Edge Function. Set <code style={{ background: "rgba(245,158,11,0.12)", padding: "0 4px", borderRadius: 3 }}>RESEND_API_KEY</code> in Supabase Dashboard → Edge Functions → Secrets.
                      </span>
                    </div>

                    {/* Test email button */}
                    <button
                      onClick={handleTestEmail}
                      disabled={testingSend}
                      style={{
                        marginTop: 8, width: "100%", padding: "8px", borderRadius: 9,
                        border: `1px solid rgba(245,158,11,0.3)`,
                        background: "rgba(245,158,11,0.06)",
                        color: C.amber, fontSize: 12, fontWeight: 700,
                        cursor: testingSend ? "wait" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all 0.14s",
                      }}
                      className="hover:!bg-amber-500/10"
                    >
                      {testingSend ? (
                        <><div style={{ width: 12, height: 12, border: `2px solid ${C.amber}30`, borderTop: `2px solid ${C.amber}`, borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />Sending test…</>
                      ) : (
                        <><FlaskConical size={12} />Send Test Email to My Account</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Large audience warning */}
            <AnimatePresence>
              {isLargeAudience && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 9, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <AlertTriangle size={12} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: "#f87171" }}>
                      <strong>Large audience:</strong> ~{estimatedCount?.toLocaleString()} emails will be sent.
                      This may take several minutes and will use Resend API credits. Confirm before sending.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── TARGET AUDIENCE ── */}
          <Field label="Target Audience" tip="who receives this">
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 12 }}>
              {targetGroups.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 9.5, color: C.text3, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, paddingLeft: 2 }}>{group.label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {group.items.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { set("targetType", t.id); setSelectedUsers([]); }}
                        style={{
                          padding: "9px 12px", borderRadius: 10, textAlign: "left",
                          border: `1px solid ${form.targetType === t.id ? t.color + "45" : C.border}`,
                          background: form.targetType === t.id ? t.color + "0c" : "transparent",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.14s",
                        }}
                        className="hover:!bg-white/[0.025]"
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: form.targetType === t.id ? t.color + "18" : C.s3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.14s" }}>
                          <t.icon size={12} color={form.targetType === t.id ? t.color : C.text3} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: form.targetType === t.id ? C.text : C.text2 }}>{t.label}</div>
                          <div style={{ fontSize: 10.5, color: C.text3 }}>{t.desc}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {form.targetType === t.id && estimatedCount !== null && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: t.color, background: t.color + "12", border: `1px solid ${t.color}25`, padding: "1px 8px", borderRadius: 20 }}>
                              ~{estimatedCount.toLocaleString()}
                            </span>
                          )}
                          {form.targetType === t.id && <ArrowRight size={11} color={t.color} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sub-selectors */}
            <AnimatePresence>
              {form.targetType === "specific_role" && (
                <motion.div key="role" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Choose Role</label>
                    <select value={form.targetRole} onChange={e => set("targetRole", e.target.value)} style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: form.targetRole ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="">Select a role…</option>
                      {ROLE_OPTIONS.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}

              {form.targetType === "tournament_participants" && (
                <motion.div key="tournament" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: "#8b5cf6", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                      Choose Tournament
                    </label>
                    <select
                      value={form.tournamentId}
                      onChange={e => set("tournamentId", e.target.value)}
                      style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid rgba(139,92,246,0.35)`, borderRadius: 10, color: form.tournamentId ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}
                    >
                      <option value="">— Select a tournament —</option>
                      {tournaments.length === 0 && <option disabled>No tournaments found</option>}
                      {tournaments.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}  [{(t.status || "unknown").replace(/_/g, " ")}]
                        </option>
                      ))}
                    </select>
                    {form.tournamentId && estimatedCount !== null && (
                      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle size={12} color="#8b5cf6" />
                        <span style={{ fontSize: 11.5, color: "#a78bfa", fontWeight: 600 }}>
                          ✓ This notification will be sent to all <strong>{estimatedCount}</strong> registered players of this tournament.
                        </span>
                      </div>
                    )}
                    {form.tournamentId && estimatedCount === 0 && (
                      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                        <AlertTriangle size={12} color={C.amber} />
                        <span style={{ fontSize: 11.5, color: C.amber, fontWeight: 600 }}>
                          No participants found for this tournament yet.
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {form.targetType === "clan_members" && (
                <motion.div key="clan" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Choose Clan</label>
                    <select value={form.clanId} onChange={e => set("clanId", e.target.value)} style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: form.clanId ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="">Select a clan…</option>
                      {clans.map(c => <option key={c.id} value={c.id}>[{c.tag}] {c.name}</option>)}
                    </select>
                    {clans.length === 0 && <div style={{ fontSize: 10.5, color: C.text3, marginTop: 4 }}>No clans found</div>}
                  </div>
                </motion.div>
              )}

              {form.targetType === "team_members" && (
                <motion.div key="team" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Choose Team</label>
                    <select value={form.teamId} onChange={e => set("teamId", e.target.value)} style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: form.teamId ? C.text : C.text3, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="">Select a team…</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {teams.length === 0 && <div style={{ fontSize: 10.5, color: C.text3, marginTop: 4 }}>No teams found</div>}
                  </div>
                </motion.div>
              )}

              {form.targetType === "specific_users" && (
                <motion.div key="users" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ paddingTop: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, color: C.green, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                      Search &amp; Pick Users
                    </label>
                    <UserPicker
                      selectedUsers={selectedUsers}
                      onSelect={u => setSelectedUsers(p => p.find(x => x.id === u.id) ? p : [...p, u])}
                      onRemove={id => setSelectedUsers(p => p.filter(u => u.id !== id))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Field>

          {/* Icon + Action URL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Icon (Emoji)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {ICON_PRESETS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => set("icon", form.icon === ic ? "" : ic)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: `1px solid ${form.icon === ic ? C.accent + "50" : C.border}`,
                      background: form.icon === ic ? C.accent + "14" : C.s2,
                      fontSize: 16, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                value={form.icon}
                onChange={e => set("icon", e.target.value)}
                placeholder="Or type emoji directly…"
                style={{ width: "100%", padding: "8px 12px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 9, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Action URL</label>
              <input
                value={form.actionUrl}
                onChange={e => set("actionUrl", e.target.value)}
                placeholder="/tournaments or full URL"
                style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 12.5, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                className="focus:!border-indigo-500/50"
              />
              <label style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Image URL</label>
              <input
                value={form.imageUrl}
                onChange={e => set("imageUrl", e.target.value)}
                placeholder="https://…/banner.png"
                style={{ width: "100%", padding: "10px 13px", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 10, color: C.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                className="focus:!border-indigo-500/50"
              />
            </div>
          </div>

          {/* Send Button */}
          <motion.button
            whileTap={canSend && !sending ? { scale: 0.98 } : {}}
            onClick={handleSend}
            disabled={sending || !canSend}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: !canSend || sending
                ? "rgba(139,92,246,0.25)"
                : form.sendEmail
                  ? "linear-gradient(135deg, #d97706 0%, #7c3aed 50%, #06b6d4 100%)"
                  : "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #06b6d4 100%)",
              color: !canSend || sending ? "rgba(255,255,255,0.3)" : "#fff",
              fontSize: 13, fontWeight: 800,
              cursor: sending ? "wait" : canSend ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: canSend && !sending ? "0 4px 24px rgba(99,102,241,0.35)" : "none",
              transition: "all 0.2s", letterSpacing: "0.05em", textTransform: "uppercase",
            }}
          >
            {sending ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />
                Sending…
              </>
            ) : (
              <>
                {form.sendEmail ? <Mail size={14} /> : <Send size={14} />}
                {form.sendInApp && form.sendEmail ? "Send In-App + Email" : form.sendEmail ? "Send Email" : "Send Broadcast"}
                {estimatedCount !== null && (
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>
                    · {estimatedCount.toLocaleString()} recipient{estimatedCount !== 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </motion.button>
        </div>

        {/* RIGHT: Preview + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Preview */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div
              style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setShowPreview(p => !p)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 800, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <Eye size={12} color={C.cyan} />
                Live Preview
              </div>
              <ChevronDown size={13} color={C.text3} style={{ transform: showPreview ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            <AnimatePresence initial={false}>
              {showPreview && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* In-app preview */}
                    <div>
                      <div style={{ fontSize: 9.5, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}>
                        <Bell size={9} /> In-App Toast
                      </div>
                      <NotifPreview form={form} />
                    </div>
                    {/* Email preview */}
                    {form.sendEmail && (
                      <div>
                        <div style={{ fontSize: 9.5, color: C.amber, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail size={9} /> Email Preview
                        </div>
                        <EmailPreview form={form} />
                      </div>
                    )}
                    {/* Bell dropdown preview */}
                    <div>
                      <div style={{ fontSize: 9.5, color: C.text3, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}>
                        <Bell size={9} /> Bell Dropdown
                      </div>
                      {(() => {
                        const t = TYPE_OPTIONS.find(x => x.id === form.type) || TYPE_OPTIONS[0];
                        return (
                          <div style={{ background: "#06061a", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 11, overflow: "hidden" }}>
                            <div style={{ display: "flex", gap: 10, padding: "10px 12px", borderLeft: `2px solid ${t.color}` }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {form.icon ? <span style={{ fontSize: 14 }}>{form.icon}</span> : <t.icon size={12} color={t.color} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", marginBottom: 2 }}>{form.title || "Notification Title"}</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {form.message || "Message…"}
                                </div>
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
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 800, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <Clock size={12} color={C.amber} />
              Sent History
            </div>
            <div style={{ maxHeight: 440, overflowY: "auto" }}>
              {loadingH ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                  <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}30`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />
                </div>
              ) : history.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 16px" }}>
                  <Bell size={26} style={{ color: "rgba(255,255,255,0.08)" }} />
                  <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>No broadcasts sent yet</p>
                </div>
              ) : (
                history.map(b => <BroadcastRow key={b.id} b={b} />)
              )}
            </div>
          </div>
        </div>
      </div>
      </>}

      {/* ── Email Templates view ─────────────────────────── */}
      {activeView === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={16} color={C.cyan} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Email Templates</div>
              <div style={{ fontSize: 11, color: C.text3 }}>Edit automated email content — changes apply to future sends</div>
            </div>
          </div>

          {templates.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: C.text3, fontSize: 12, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
              No templates found — run sql/63_welcome_email.sql first.
            </div>
          ) : templates.map(tpl => (
            <div key={tpl.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: editingTemplate?.id === tpl.id ? `1px solid ${C.b2}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mail size={12} color={C.indigo} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{tpl.name}</div>
                    <div style={{ fontSize: 10, color: C.text3, fontFamily: "monospace" }}>{tpl.slug}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: tpl.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: tpl.is_active ? C.green : C.red, fontWeight: 700 }}>
                    {tpl.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <button
                    onClick={() => setEditingTemplate(editingTemplate?.id === tpl.id ? null : { ...tpl })}
                    style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    {editingTemplate?.id === tpl.id ? "Cancel" : "Edit"}
                  </button>
                </div>
              </div>

              {editingTemplate?.id === tpl.id && (
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "subject",   label: "Email Subject" },
                    { key: "title",     label: "Email Title (H1)" },
                    { key: "cta_label", label: "CTA Button Label" },
                    { key: "cta_url",   label: "CTA Button URL" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, color: C.text3, display: "block", marginBottom: 4 }}>{label}</label>
                      <input
                        value={editingTemplate[key] || ""}
                        onChange={e => setEditingTemplate(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: "100%", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none", fontFamily: "Inter, sans-serif" }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: C.text3, display: "block", marginBottom: 4 }}>Main Content</label>
                    <textarea
                      value={editingTemplate.content || ""}
                      onChange={e => setEditingTemplate(p => ({ ...p, content: e.target.value }))}
                      rows={4}
                      style={{ width: "100%", background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 7, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => saveTemplate(editingTemplate)}
                      style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.indigo}, ${C.accent})`, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Email Logs view ──────────────────────────────── */}
      {activeView === "logs" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MailCheck size={16} color={C.green} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Email Delivery Logs</div>
                <div style={{ fontSize: 11, color: C.text3 }}>Last 100 email delivery attempts</div>
              </div>
            </div>
            <button onClick={fetchEmailLogs} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RefreshCw size={13} />
            </button>
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            {logsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 20, height: 20, border: `2px solid ${C.accent}30`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "nt-spin 0.8s linear infinite" }} />
              </div>
            ) : emailLogs.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.text3, fontSize: 12 }}>No email logs yet.</div>
            ) : emailLogs.map(log => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: log.status === "sent" ? C.green : log.status === "failed" ? C.red : C.amber }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.email}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{log.template} · {new Date(log.sent_at).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, fontWeight: 700, flexShrink: 0,
                  background: log.status === "sent" ? "rgba(16,185,129,0.12)" : log.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                  color: log.status === "sent" ? C.green : log.status === "failed" ? C.red : C.amber,
                }}>
                  {log.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
