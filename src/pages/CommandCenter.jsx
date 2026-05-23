import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, BarChart3, Bell, CheckCircle2,
  Clock, Cpu, Database, Flag, Globe, Layers, Lock,
  Radio, RefreshCw, Server, Settings, Shield, ShieldAlert,
  Sparkles, Terminal, Trophy, TrendingUp, Users, Wallet,
  Wifi, XCircle, Zap, ArrowLeft, ToggleLeft, ToggleRight,
  Bot, Eye, Play, Pause, Power, X,
} from "lucide-react";

// ── Design tokens (clean enterprise, light on dark navy) ────────────────────
const C = {
  // surfaces
  bg:       "#0a0f1e",
  s1:       "#0f172a",   // sidebar / header
  s2:       "#111827",   // card
  s3:       "#1e2840",   // card hover / elevated
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.13)",
  // text
  text:     "rgba(255,255,255,0.92)",
  text2:    "rgba(255,255,255,0.55)",
  text3:    "rgba(255,255,255,0.30)",
  // accents
  indigo:   "#6366f1",
  cyan:     "#06b6d4",
  green:    "#10b981",
  red:      "#ef4444",
  amber:    "#f59e0b",
  violet:   "#8b5cf6",
  // status
  online:   "#10b981",
  degraded: "#f59e0b",
  offline:  "#ef4444",
};

// ── System module configs ────────────────────────────────────────────────────
const SYSTEMS = [
  { id: "auth",          name: "Auth",          icon: Lock,       color: C.indigo },
  { id: "users",         name: "Users",         icon: Users,      color: C.cyan   },
  { id: "wallet",        name: "Wallet",        icon: Wallet,     color: C.amber  },
  { id: "tournaments",   name: "Tournaments",   icon: Trophy,     color: C.green  },
  { id: "matchmaking",   name: "Matchmaking",   icon: Zap,        color: C.cyan   },
  { id: "chat",          name: "Chat",          icon: Radio,      color: C.violet },
  { id: "clans",         name: "Clans",         icon: Shield,     color: C.indigo },
  { id: "store",         name: "Store",         icon: Sparkles,   color: C.amber  },
  { id: "notifications", name: "Alerts",        icon: Bell,       color: C.red    },
  { id: "security",      name: "Security",      icon: ShieldAlert,color: C.red    },
  { id: "analytics",     name: "Analytics",     icon: BarChart3,  color: C.cyan   },
  { id: "ai",            name: "AI Engine",     icon: Bot,        color: C.violet },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, color, loading }) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{ background: C.s2, borderColor: C.border }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}16`, border: `1px solid ${color}25` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
              {typeof value === "number" ? value.toLocaleString() : value ?? "—"}
            </p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: C.text2 }}>{label}</p>
          </div>
          {sub && <p className="text-[11px]" style={{ color: C.text3 }}>{sub}</p>}
        </>
      )}
    </div>
  );
}

function SystemCard({ sys, dbData }) {
  const data = dbData?.[sys.id];
  const status  = data?.status      ?? "online";
  const health  = data?.health_score ?? 100;
  const enabled = data?.is_enabled  ?? true;

  const statusColor =
    status === "online"      ? C.green  :
    status === "degraded"    ? C.amber  :
    status === "maintenance" ? C.amber  : C.red;

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200"
      style={{ background: C.s2, borderColor: C.border }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.background = C.s3; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;  e.currentTarget.style.background = C.s2;  }}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${sys.color}12`, border: `1px solid ${sys.color}22` }}>
          <sys.icon size={16} style={{ color: sys.color }} />
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: `${statusColor}12` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-[10px] font-semibold capitalize" style={{ color: statusColor }}>
            {status}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold" style={{ color: C.text }}>{sys.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: C.text3 }}>
          {enabled ? "Active" : "Disabled"}
        </p>
      </div>

      {/* Health bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: C.text3 }}>Health</span>
          <span className="text-[10px] font-semibold"
            style={{ color: health > 80 ? C.green : health > 50 ? C.amber : C.red }}>
            {health}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              background: health > 80 ? C.green : health > 50 ? C.amber : C.red,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }) {
  const color = {
    critical: C.red,
    error:    C.red,
    warn:     C.amber,
    info:     C.cyan,
  }[alert.severity] ?? C.text2;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border transition-colors"
      style={{ background: C.s2, borderColor: alert.severity === "critical" ? `${C.red}30` : C.border }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}14`, border: `1px solid ${color}25` }}>
        <AlertTriangle size={13} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug" style={{ color: C.text }}>{alert.title}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: `${color}14`, color }}>
            {alert.severity}
          </span>
        </div>
        {alert.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: C.text2 }}>{alert.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] flex items-center gap-1" style={{ color: C.text3 }}>
            <Clock size={9} />
            {new Date(alert.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
          </p>
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="text-[11px] px-2 py-1 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: C.text3 }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.text3; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FlagRow({ flag, onToggle, saving }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b transition-colors last:border-b-0"
      style={{ borderColor: C.border }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: C.text }}>{flag.name}</span>
          <code className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(255,255,255,0.06)", color: C.text3 }}>
            {flag.key}
          </code>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: flag.is_enabled ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
              color: flag.is_enabled ? C.green : C.text3,
            }}
          >
            {flag.is_enabled ? "ON" : "OFF"}
          </span>
        </div>
        {flag.description && (
          <p className="text-xs mt-0.5" style={{ color: C.text3 }}>{flag.description}</p>
        )}
      </div>
      <button
        onClick={() => onToggle(flag, !flag.is_enabled)}
        disabled={saving}
        className="flex-shrink-0 transition-all"
      >
        {saving
          ? <RefreshCw size={22} className="animate-spin" style={{ color: C.text3 }} />
          : flag.is_enabled
            ? <ToggleRight size={30} style={{ color: C.green }} />
            : <ToggleLeft  size={30} style={{ color: C.text3 }} />
        }
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview", label: "Overview",     icon: Globe    },
  { id: "systems",  label: "Systems",      icon: Layers   },
  { id: "alerts",   label: "Alerts",       icon: AlertTriangle },
  { id: "events",   label: "Event Log",    icon: Terminal },
  { id: "flags",    label: "Feature Flags",icon: Flag     },
];

export default function CommandCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview]   = useState(null);
  const [modules, setModules]     = useState({});
  const [alerts, setAlerts]       = useState([]);
  const [events, setEvents]       = useState([]);
  const [flags, setFlags]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshAt, setRefreshAt] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [flagSaving, setFlagSaving] = useState({});
  const [toastMsg, setToastMsg]   = useState(null);

  useEffect(() => {
    if (profile && profile.role !== "super_admin") navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type, id: Date.now() });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, modRes, alertRes, evtRes, flagRes] = await Promise.all([
        supabase.rpc("get_platform_overview"),
        supabase.from("system_modules").select("*").order("name"),
        supabase.from("system_alerts").select("*").eq("status", "open")
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("system_events").select("*")
          .order("created_at", { ascending: false }).limit(60),
        supabase.from("feature_flags").select("*").order("key"),
      ]);

      if (ovRes.data)    setOverview(ovRes.data);
      if (modRes.data)   {
        const map = {};
        modRes.data.forEach(m => { map[m.id] = m; });
        setModules(map);
      }
      if (alertRes.data) setAlerts(alertRes.data);
      if (evtRes.data)   setEvents(evtRes.data);
      if (flagRes.data)  setFlags(flagRes.data);
    } catch (e) {
      console.error("CommandCenter fetch:", e);
    } finally {
      setLoading(false);
      setRefreshAt(new Date());
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: new alerts + events
  useEffect(() => {
    const ch = supabase.channel("cc-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_alerts" }, p => {
        setAlerts(prev => [p.new, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_events" }, p => {
        setEvents(prev => [p.new, ...prev].slice(0, 60));
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const acknowledgeAlert = async (alertId) => {
    const { error } = await supabase
      .from("system_alerts")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", alertId);
    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      showToast("Alert acknowledged");
    }
  };

  const toggleFlag = async (flag, newVal) => {
    setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, is_enabled: newVal } : f));
    setFlagSaving(s => ({ ...s, [flag.key]: true }));
    try {
      const { error: rpcErr } = await supabase.rpc("toggle_feature_flag", {
        p_key: flag.key, p_enabled: newVal,
      });
      if (rpcErr) {
        const { error: dErr } = await supabase.from("feature_flags")
          .update({ is_enabled: newVal }).eq("key", flag.key);
        if (dErr) throw dErr;
      }
      showToast(`"${flag.name}" ${newVal ? "enabled" : "disabled"}`);
    } catch (e) {
      setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, is_enabled: !newVal } : f));
      showToast(e.message || "Toggle failed", "error");
    } finally {
      setFlagSaving(s => ({ ...s, [flag.key]: false }));
    }
  };

  const openAlerts = alerts.filter(a => a.status === "open");
  const critCount  = openAlerts.filter(a => a.severity === "critical").length;

  const METRICS = overview ? [
    { label: "Online Users",       value: overview.online_users,      sub: `${overview.total_users?.toLocaleString() ?? 0} total registered`, icon: Wifi,     color: C.green  },
    { label: "Active Tournaments", value: overview.active_tournaments, sub: "Live & open registration",                                        icon: Trophy,   color: C.cyan   },
    { label: "New Users Today",    value: overview.new_users_today,    sub: "Registrations since midnight",                                    icon: Users,    color: C.indigo },
    { label: "Economy (CP)",       value: overview.total_coins > 0 ? `${(overview.total_coins / 1000).toFixed(1)}K` : "0", sub: "Total coins in circulation", icon: Wallet, color: C.amber },
    { label: "Open Reports",       value: overview.open_reports,       sub: overview.open_reports > 0 ? "Needs review" : "All clear",         icon: AlertTriangle, color: overview.open_reports > 0 ? C.red : C.green },
    { label: "Open Alerts",        value: overview.open_alerts,        sub: overview.open_alerts > 0 ? "Active incidents" : "All clear",      icon: Bell,     color: overview.open_alerts > 0 ? C.red : C.green  },
    { label: "Systems Online",     value: `${overview.systems_online}/${overview.systems_total}`, sub: "Platform subsystems",                  icon: Server,   color: C.green  },
    { label: "Platform Health",    value: `${overview.health_pct ?? 100}%`, sub: overview.health_pct >= 90 ? "All systems go" : "Degraded",   icon: Activity, color: overview.health_pct >= 90 ? C.green : C.amber },
  ] : Array(8).fill(null);

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: `${C.s1}f8`, backdropFilter: "blur(20px)", borderColor: C.border }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/super-admin"
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: C.text2 }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = C.text2}
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">SuperAdmin</span>
            </Link>

            <div className="w-px h-5" style={{ background: C.border }} />

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: `${C.indigo}18`, border: `1px solid ${C.indigo}30` }}>
                <Terminal size={13} style={{ color: C.indigo }} />
              </div>
              <span className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Command Center
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: "rgba(16,185,129,0.10)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
              <span className="text-[10px] font-bold" style={{ color: C.green }}>LIVE</span>
            </div>

            {critCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg"
                style={{ background: "rgba(239,68,68,0.12)" }}>
                <AlertTriangle size={11} style={{ color: C.red }} />
                <span className="text-[10px] font-bold" style={{ color: C.red }}>{critCount} Critical</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {refreshAt && (
              <span className="hidden md:block text-[11px]" style={{ color: C.text3 }}>
                {refreshAt.toLocaleTimeString("en-GB")}
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${C.border}`,
                color: C.text2,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Section nav */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-0.5 overflow-x-auto scrollbar-hide border-t"
          style={{ borderColor: C.border }}>
          {SECTIONS.map(s => {
            const badgeCount =
              s.id === "alerts" ? openAlerts.length :
              s.id === "events" ? events.length : 0;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-all whitespace-nowrap"
                style={{ color: activeSection === s.id ? "white" : C.text3 }}
              >
                <s.icon size={13} style={{ color: activeSection === s.id ? C.indigo : "inherit" }} />
                {s.label}
                {badgeCount > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: s.id === "alerts" && openAlerts.length > 0 ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.10)",
                      color: s.id === "alerts" && openAlerts.length > 0 ? C.red : C.text2,
                    }}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
                {activeSection === s.id && (
                  <motion.div
                    layoutId="cc-section-bar"
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                    style={{ background: C.indigo }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── OVERVIEW ── */}
            {activeSection === "overview" && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Platform Overview
                  </h1>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Real-time snapshot of all key platform metrics.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {METRICS.map((m, i) =>
                    m ? (
                      <MetricCard key={i} {...m} loading={false} />
                    ) : (
                      <MetricCard key={i} label="" value="" icon={Activity} color={C.indigo} loading={true} />
                    )
                  )}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "SuperAdmin Panel", path: "/super-admin", color: C.indigo },
                    { label: "Manage Reports",   path: "/admin/reports", color: C.red    },
                    { label: "User Management",  path: "/super-admin",   color: C.cyan   },
                    { label: "Economy Tools",    path: "/super-admin",   color: C.amber  },
                  ].map((l, i) => (
                    <Link
                      key={i}
                      to={l.path}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium"
                      style={{ background: C.s2, borderColor: C.border, color: C.text2 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${l.color}40`; e.currentTarget.style.color = C.text; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
                    >
                      {l.label}
                      <span style={{ color: l.color }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── SYSTEMS ── */}
            {activeSection === "systems" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    System Modules
                  </h1>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Health status of all {SYSTEMS.length} platform subsystems.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {SYSTEMS.map(sys => (
                    <SystemCard key={sys.id} sys={sys} dbData={modules} />
                  ))}
                </div>
              </div>
            )}

            {/* ── ALERTS ── */}
            {activeSection === "alerts" && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      System Alerts
                    </h1>
                    <p className="text-sm" style={{ color: C.text2 }}>
                      {openAlerts.length > 0
                        ? `${openAlerts.length} open alert${openAlerts.length !== 1 ? "s" : ""} — ${critCount} critical`
                        : "All clear — no open alerts."
                      }
                    </p>
                  </div>
                  {openAlerts.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(16,185,129,0.10)", border: `1px solid rgba(16,185,129,0.20)` }}>
                      <CheckCircle2 size={14} style={{ color: C.green }} />
                      <span className="text-sm font-medium" style={{ color: C.green }}>All systems clear</span>
                    </div>
                  )}
                </div>

                {loading && (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {openAlerts.map(a => (
                    <AlertCard key={a.id} alert={a} onAcknowledge={acknowledgeAlert} />
                  ))}
                </div>

                {!loading && openAlerts.length === 0 && (
                  <div className="py-20 text-center rounded-2xl border"
                    style={{ background: C.s2, borderColor: C.border }}>
                    <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: C.green }} />
                    <p className="text-base font-semibold text-white">No open alerts</p>
                    <p className="text-sm mt-1" style={{ color: C.text2 }}>Platform is operating normally.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── EVENT LOG ── */}
            {activeSection === "events" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Event Log
                  </h1>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Live system event stream — last 60 events.
                  </p>
                </div>

                <div className="rounded-2xl border overflow-hidden" style={{ background: C.s2, borderColor: C.border }}>
                  <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest"
                    style={{ borderColor: C.border, color: C.text3, background: "rgba(255,255,255,0.02)" }}>
                    <span>Event</span>
                    <span>Module</span>
                    <span>Severity</span>
                    <span>Time</span>
                  </div>

                  {events.length === 0 && !loading && (
                    <div className="py-16 text-center">
                      <Terminal size={24} className="mx-auto mb-2" style={{ color: C.text3 }} />
                      <p className="text-sm" style={{ color: C.text2 }}>No events yet</p>
                    </div>
                  )}

                  {events.map((evt, i) => {
                    const color = {
                      critical: C.red, error: C.red, warn: C.amber, info: C.cyan, debug: C.text3,
                    }[evt.severity] ?? C.text2;
                    return (
                      <div
                        key={evt.id}
                        className="grid grid-cols-4 gap-3 px-5 py-3 text-sm border-b last:border-b-0 transition-colors"
                        style={{ borderColor: C.border }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span className="font-mono text-xs font-medium truncate" style={{ color: C.text }}>
                          {evt.event_type}
                        </span>
                        <span className="text-xs truncate" style={{ color: C.text2 }}>
                          {evt.module_id ?? "—"}
                        </span>
                        <span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${color}14`, color }}>
                            {evt.severity}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: C.text3 }}>
                          {new Date(evt.created_at).toLocaleTimeString("en-GB")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FEATURE FLAGS ── */}
            {activeSection === "flags" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Feature Flags
                  </h1>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Toggle platform features in real time. Changes apply immediately.
                  </p>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border overflow-hidden" style={{ background: C.s2, borderColor: C.border }}>
                    {flags.map(flag => (
                      <FlagRow
                        key={flag.key}
                        flag={flag}
                        onToggle={toggleFlag}
                        saving={flagSaving[flag.key]}
                      />
                    ))}
                    {flags.length === 0 && (
                      <div className="py-16 text-center">
                        <Flag size={24} className="mx-auto mb-2" style={{ color: C.text3 }} />
                        <p className="text-sm font-medium" style={{ color: C.text2 }}>No feature flags</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key={toastMsg.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
            style={{
              background: toastMsg.type === "success" ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
              border: `1px solid ${toastMsg.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              backdropFilter: "blur(20px)",
            }}
          >
            {toastMsg.type === "success"
              ? <CheckCircle2 size={15} className="text-emerald-400" />
              : <AlertTriangle size={15} className="text-red-400" />
            }
            <span className="text-sm font-medium text-white">{toastMsg.msg}</span>
            <button onClick={() => setToastMsg(null)} className="ml-1 text-white/30 hover:text-white/70 transition-colors">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
