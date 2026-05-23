import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, ChevronRight,
  Cpu, Database, Globe, Lock, Radio, RefreshCw, Server, Settings,
  Shield, ShieldAlert, Sparkles, Terminal, Trophy, TrendingUp, Users,
  Wallet, Wifi, XCircle, Zap, Eye, Flag, Clock, Power,
  ArrowUpRight, Layers, Bell, Play, Pause,
} from "lucide-react";

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:     "#020617",
  s1:     "#07091a",
  s2:     "#0d1220",
  s3:     "#121929",
  border: "rgba(255,255,255,0.05)",
  b2:     "rgba(255,255,255,0.08)",
  violet: "#8b5cf6",
  cyan:   "#06b6d4",
  green:  "#10b981",
  red:    "#ef4444",
  amber:  "#f59e0b",
  text:   "rgba(255,255,255,0.85)",
  text2:  "rgba(255,255,255,0.45)",
  text3:  "rgba(255,255,255,0.25)",
};

// ── System module configs ─────────────────────────────────────────────────────
const SYSTEMS = [
  { id: "auth",         name: "Auth",         icon: Lock,       color: T.violet },
  { id: "wallet",       name: "Wallet",       icon: Wallet,     color: T.amber  },
  { id: "tournaments",  name: "Tournaments",  icon: Trophy,     color: T.cyan   },
  { id: "chat",         name: "Chat",         icon: Radio,      color: T.green  },
  { id: "clans",        name: "Clans",        icon: Users,      color: T.violet },
  { id: "ai",           name: "AI Engine",    icon: Bot,        color: T.cyan   },
  { id: "security",     name: "Security",     icon: ShieldAlert, color: T.red   },
  { id: "analytics",    name: "Analytics",    icon: BarChart3,  color: T.amber  },
  { id: "store",        name: "Store",        icon: Sparkles,   color: T.green  },
  { id: "notifications",name: "Alerts",       icon: Bell,       color: T.violet },
  { id: "moderation",   name: "Moderation",   icon: Shield,     color: T.amber  },
  { id: "matchmaking",  name: "Matchmaking",  icon: Zap,        color: T.cyan   },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, color, trend, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border"
      style={{ background: T.s2, borderColor: T.border }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}14`, border: `1px solid ${color}22` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          {trend !== undefined && (
            <span
              className="text-[11px] font-semibold flex items-center gap-1"
              style={{ color: trend >= 0 ? T.green : T.red }}
            >
              <TrendingUp size={10} style={{ transform: trend < 0 ? "scaleY(-1)" : undefined }} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-20 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-3.5 w-16 rounded bg-white/5 animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="text-xs" style={{ color: T.text2 }}>{label}</p>
            {sub && <p className="text-[11px] mt-0.5" style={{ color: T.text3 }}>{sub}</p>}
          </>
        )}
      </div>
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
    </motion.div>
  );
}

function SystemCard({ sys, dbData, index }) {
  const data = dbData?.[sys.id];
  const status = data?.status ?? "online";
  const health = data?.health_score ?? 100;
  const enabled = data?.is_enabled ?? true;

  const statusColor = status === "online" ? T.green : status === "degraded" ? T.amber : T.red;
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className="group relative rounded-2xl border p-4 transition-all duration-200 cursor-default"
      style={{
        background: T.s2,
        borderColor: T.border,
      }}
      whileHover={{ borderColor: `${sys.color}30` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${sys.color}12`, border: `1px solid ${sys.color}20` }}
        >
          <sys.icon size={16} style={{ color: sys.color }} />
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${statusColor}12` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}` }} />
          <span className="text-[10px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      <p className="text-sm font-semibold mb-2" style={{ color: T.text }}>{sys.name}</p>

      {/* Health bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px]" style={{ color: T.text3 }}>Health</span>
          <span className="text-[10px] font-semibold" style={{ color: health > 80 ? T.green : health > 50 ? T.amber : T.red }}>
            {health}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${health}%`,
              background: health > 80 ? T.green : health > 50 ? T.amber : T.red,
              boxShadow: `0 0 6px ${health > 80 ? T.green : health > 50 ? T.amber : T.red}50`,
            }}
          />
        </div>
      </div>

      {/* Enabled toggle indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: T.text3 }}>
          {enabled ? "Active" : "Disabled"}
        </span>
        <div
          className="w-7 h-4 rounded-full flex items-center transition-all duration-200"
          style={{
            background: enabled ? `${T.green}30` : "rgba(255,255,255,0.05)",
            padding: "2px",
          }}
        >
          <div
            className="w-3 h-3 rounded-full transition-all duration-200"
            style={{
              background: enabled ? T.green : "rgba(255,255,255,0.2)",
              transform: enabled ? "translateX(12px)" : "translateX(0)",
              boxShadow: enabled ? `0 0 4px ${T.green}` : "none",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function AlertRow({ alert, index }) {
  const severityColor = {
    critical: T.red,
    error:    T.red,
    warn:     T.amber,
    info:     T.cyan,
  }[alert.severity] ?? T.text2;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-xl transition-colors"
      style={{ background: "rgba(255,255,255,0.02)" }}
      whileHover={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${severityColor}14`, border: `1px solid ${severityColor}22` }}
      >
        <AlertTriangle size={12} style={{ color: severityColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: T.text }}>{alert.title}</p>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: `${severityColor}14`, color: severityColor }}
          >
            {alert.severity}
          </span>
        </div>
        {alert.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: T.text3 }}>{alert.description}</p>
        )}
        <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: T.text3 }}>
          <Clock size={9} />
          {new Date(alert.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>
    </motion.div>
  );
}

function EventRow({ evt, index }) {
  const severityColor = {
    critical: T.red,
    error:    T.red,
    warn:     T.amber,
    info:     T.cyan,
    debug:    T.text3,
  }[evt.severity] ?? T.text2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 py-2 px-3 rounded-lg border-b"
      style={{ borderColor: T.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: severityColor }} />
      <span className="text-[10px] font-mono font-medium flex-shrink-0" style={{ color: T.text2, minWidth: 160 }}>
        {evt.event_type}
      </span>
      <span className="text-[10px] truncate flex-1" style={{ color: T.text3 }}>
        {evt.module_id ?? "—"}
      </span>
      <span className="text-[10px] flex-shrink-0 font-mono" style={{ color: T.text3 }}>
        {new Date(evt.created_at).toLocaleTimeString("en-GB")}
      </span>
    </motion.div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview]     = useState(null);
  const [modules, setModules]       = useState({});
  const [alerts, setAlerts]         = useState([]);
  const [events, setEvents]         = useState([]);
  const [flags, setFlags]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  // Guard: only super_admin can access
  useEffect(() => {
    if (profile && profile.role !== "super_admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        ovRes,
        modRes,
        alertRes,
        evtRes,
        flagRes,
      ] = await Promise.all([
        supabase.rpc("get_platform_overview"),
        supabase.from("system_modules").select("*").order("name"),
        supabase.from("system_alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20),
        supabase.from("system_events").select("*").order("created_at", { ascending: false }).limit(50),
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
      console.error("CommandCenter fetch error:", e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime alerts subscription
  useEffect(() => {
    const channel = supabase
      .channel("cc-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_alerts" }, (p) => {
        setAlerts(prev => [p.new, ...prev].slice(0, 20));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_events" }, (p) => {
        setEvents(prev => [p.new, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const METRICS = overview ? [
    { label: "Online Users",       value: overview.online_users,      icon: Wifi,      color: T.green,  sub: `${overview.total_users.toLocaleString()} total` },
    { label: "Active Tournaments", value: overview.active_tournaments, icon: Trophy,    color: T.cyan,   sub: "Running now" },
    { label: "Platform Economy",   value: `${(overview.total_coins / 1000).toFixed(1)}K`, icon: Wallet, color: T.amber, sub: "Total CP in circulation" },
    { label: "Open Reports",       value: overview.open_reports,       icon: Flag,      color: overview.open_reports > 0 ? T.red : T.green, sub: "Pending review" },
    { label: "System Alerts",      value: overview.open_alerts,        icon: AlertTriangle, color: overview.open_alerts > 0 ? T.red : T.green, sub: "Active incidents" },
    { label: "New Users Today",    value: overview.new_users_today,    icon: Users,     color: T.violet, sub: "Registrations" },
    { label: "Systems Online",     value: `${overview.systems_online}/${overview.systems_total}`, icon: Server, color: T.green, sub: `${overview.health_pct}% healthy` },
    { label: "Platform Health",    value: `${overview.health_pct}%`,   icon: Activity,  color: overview.health_pct >= 80 ? T.green : T.amber },
  ] : Array(8).fill(null).map((_, i) => ({ loading: true, label: "", value: "", icon: Activity, color: T.violet }));

  const openAlerts = alerts.filter(a => a.status === "open");
  const criticalAlerts = openAlerts.filter(a => a.severity === "critical");

  const SECTIONS = [
    { id: "overview",   label: "Overview",  icon: Globe },
    { id: "systems",    label: "Systems",   icon: Layers },
    { id: "alerts",     label: `Alerts ${openAlerts.length > 0 ? `(${openAlerts.length})` : ""}`, icon: Bell },
    { id: "events",     label: "Event Log", icon: Terminal },
    { id: "flags",      label: "Feature Flags", icon: Settings },
  ];

  return (
    <div className="min-h-screen" style={{ background: T.bg, fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif" }}>

      {/* ── Top command bar ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{ background: `${T.s1}f0`, backdropFilter: "blur(24px)", borderColor: T.border }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: title + live indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${T.violet}18`, border: `1px solid ${T.violet}30` }}>
                <Terminal size={13} style={{ color: T.violet }} />
              </div>
              <div>
                <span className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  CipherPool OS
                </span>
                <span className="text-xs ml-2" style={{ color: T.text3 }}>Command Center</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${T.green}14` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
              <span className="text-[10px] font-semibold" style={{ color: T.green }}>LIVE</span>
            </div>

            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg animate-pulse" style={{ background: `${T.red}14` }}>
                <AlertTriangle size={11} style={{ color: T.red }} />
                <span className="text-[10px] font-semibold" style={{ color: T.red }}>{criticalAlerts.length} Critical</span>
              </div>
            )}
          </div>

          {/* Right: refresh + timestamp */}
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="hidden md:block text-[11px]" style={{ color: T.text3 }}>
                Last refresh: {lastRefresh.toLocaleTimeString("en-GB")}
              </span>
            )}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: T.text2,
              }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>

            <Link to="/super-admin" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: `${T.violet}14`, border: `1px solid ${T.violet}25`, color: T.violet }}>
              <Zap size={12} />
              Root Panel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* ── Section tabs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0"
              style={{
                color: activeSection === sec.id ? "white" : T.text2,
                background: activeSection === sec.id ? `${T.violet}14` : "transparent",
              }}
            >
              <sec.icon size={13} style={{ color: activeSection === sec.id ? T.violet : "inherit" }} />
              {sec.label}
              {activeSection === sec.id && (
                <motion.div
                  layoutId="cc-tab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: `${T.violet}14`, border: `1px solid ${T.violet}25`, zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          {activeSection === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {METRICS.map((m, i) => (
                  <MetricCard
                    key={i}
                    loading={m.loading || loading}
                    label={m.label}
                    value={m.value}
                    sub={m.sub}
                    icon={m.icon}
                    color={m.color}
                  />
                ))}
              </div>

              {/* Two-col: alerts + events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Recent Alerts */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} style={{ color: T.red }} />
                      <span className="text-sm font-semibold text-white">Active Alerts</span>
                      {openAlerts.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${T.red}18`, color: T.red }}>
                          {openAlerts.length}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveSection("alerts")}
                      className="text-[11px] flex items-center gap-1 transition-colors"
                      style={{ color: T.text3 }}
                    >
                      View all <ArrowUpRight size={10} />
                    </button>
                  </div>
                  <div className="p-3 space-y-1 max-h-72 overflow-y-auto scrollbar-hide">
                    {openAlerts.length === 0 ? (
                      <div className="py-10 text-center">
                        <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: T.green }} />
                        <p className="text-sm" style={{ color: T.text3 }}>All clear — no active alerts</p>
                      </div>
                    ) : (
                      openAlerts.slice(0, 6).map((a, i) => <AlertRow key={a.id} alert={a} index={i} />)
                    )}
                  </div>
                </div>

                {/* Event log */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.border }}>
                    <div className="flex items-center gap-2">
                      <Terminal size={14} style={{ color: T.cyan }} />
                      <span className="text-sm font-semibold text-white">Live Event Stream</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
                      <span className="text-[10px]" style={{ color: T.green }}>live</span>
                    </div>
                  </div>
                  <div className="p-3 max-h-72 overflow-y-auto scrollbar-hide font-mono">
                    {events.length === 0 ? (
                      <div className="py-10 text-center">
                        <Radio size={20} className="mx-auto mb-2 animate-pulse" style={{ color: T.text3 }} />
                        <p className="text-sm" style={{ color: T.text3 }}>Waiting for events…</p>
                      </div>
                    ) : (
                      events.slice(0, 20).map((e, i) => <EventRow key={e.id} evt={e} index={i} />)
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl border p-5" style={{ background: T.s2, borderColor: T.border }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: T.text3 }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Root Panel",     icon: Zap,        to: "/super-admin",  color: T.violet },
                    { label: "Reports Queue",  icon: Flag,        to: "/super-admin",  color: T.red    },
                    { label: "User Manager",   icon: Users,       to: "/super-admin",  color: T.cyan   },
                    { label: "Economy Monitor",icon: Wallet,      to: "/super-admin",  color: T.amber  },
                  ].map(({ label, icon: Icon, to, color }) => (
                    <Link
                      key={label}
                      to={to}
                      className="group flex flex-col items-center gap-3 py-5 px-3 rounded-2xl transition-all text-center"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                        <Icon size={17} style={{ color }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: T.text2 }}>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SYSTEMS ──────────────────────────────────────────────── */}
          {activeSection === "systems" && (
            <motion.div
              key="systems"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    System Control Panel
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: T.text2 }}>
                    {Object.values(modules).filter(m => m.status === "online").length} of {Object.keys(modules).length} systems operational
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {SYSTEMS.map((sys, i) => (
                  <SystemCard key={sys.id} sys={sys} dbData={modules} index={i} />
                ))}
              </div>

              {/* Module detail table */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: T.border }}>
                  <span className="text-sm font-semibold text-white">All Platform Modules</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: T.border }}>
                        {["Module", "Status", "Health", "Category", "Version"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest"
                            style={{ color: T.text3 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(modules).map((mod, i) => {
                        const statusColor = mod.status === "online" ? T.green : mod.status === "degraded" ? T.amber : T.red;
                        return (
                          <tr key={mod.id} className="border-b transition-colors"
                            style={{ borderColor: T.border }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td className="px-4 py-3 font-medium text-white">{mod.name}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-xs"
                                style={{ color: statusColor }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                                {mod.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <div className="h-full rounded-full" style={{
                                    width: `${mod.health_score}%`,
                                    background: mod.health_score > 80 ? T.green : mod.health_score > 50 ? T.amber : T.red
                                  }} />
                                </div>
                                <span className="text-xs" style={{ color: T.text2 }}>{mod.health_score}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-md capitalize"
                                style={{ background: "rgba(255,255,255,0.04)", color: T.text2 }}>
                                {mod.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: T.text3 }}>{mod.version}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {Object.keys(modules).length === 0 && (
                    <div className="py-12 text-center">
                      <Server size={24} className="mx-auto mb-2" style={{ color: T.text3 }} />
                      <p className="text-sm" style={{ color: T.text3 }}>No modules found. Run migration 43.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ALERTS ───────────────────────────────────────────────── */}
          {activeSection === "alerts" && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Alert Center
                </h2>
                <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: `${T.red}14`, color: T.red, border: `1px solid ${T.red}20` }}>
                  {openAlerts.length} open
                </span>
              </div>

              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="py-20 text-center rounded-2xl border" style={{ background: T.s2, borderColor: T.border }}>
                    <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: T.green }} />
                    <p className="text-base font-semibold text-white mb-1">All Clear</p>
                    <p className="text-sm" style={{ color: T.text3 }}>No active alerts</p>
                  </div>
                ) : alerts.map((a, i) => (
                  <div key={a.id} className="rounded-2xl border" style={{ background: T.s2, borderColor: T.border }}>
                    <AlertRow alert={a} index={0} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── EVENT LOG ────────────────────────────────────────────── */}
          {activeSection === "events" && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  System Event Stream
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
                  <span className="text-xs" style={{ color: T.green }}>Real-time</span>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: T.border, background: T.s3 }}>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-widest" style={{ color: T.text3, minWidth: 160 }}>Event</span>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-widest" style={{ color: T.text3, flex: 1 }}>Module</span>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-widest" style={{ color: T.text3 }}>Time</span>
                </div>
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {events.map((e, i) => <EventRow key={e.id} evt={e} index={i} />)}
                  {events.length === 0 && (
                    <div className="py-16 text-center">
                      <Radio size={24} className="mx-auto mb-2 animate-pulse" style={{ color: T.text3 }} />
                      <p className="text-sm" style={{ color: T.text3 }}>No events yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FEATURE FLAGS ────────────────────────────────────────── */}
          {activeSection === "flags" && (
            <motion.div
              key="flags"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Feature Flags
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: T.text2 }}>
                    Runtime toggles — changes take effect immediately
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
                {flags.map((flag, i) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: T.border }}
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: T.text }}>{flag.name}</p>
                        <code className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: T.text3 }}>
                          {flag.key}
                        </code>
                      </div>
                      {flag.description && (
                        <p className="text-xs" style={{ color: T.text3 }}>{flag.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs" style={{ color: flag.is_enabled ? T.green : T.text3 }}>
                        {flag.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                      <div
                        className="w-10 h-5.5 rounded-full flex items-center transition-all duration-200 cursor-not-allowed"
                        style={{
                          background: flag.is_enabled ? `${T.green}30` : "rgba(255,255,255,0.06)",
                          padding: "2px",
                          height: "22px",
                        }}
                        title="Modify via Supabase dashboard or SQL"
                      >
                        <div
                          className="w-4 h-4 rounded-full transition-all duration-200"
                          style={{
                            background: flag.is_enabled ? T.green : "rgba(255,255,255,0.25)",
                            transform: flag.is_enabled ? "translateX(16px)" : "translateX(0)",
                            boxShadow: flag.is_enabled ? `0 0 6px ${T.green}` : "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {flags.length === 0 && (
                  <div className="py-16 text-center">
                    <Settings size={24} className="mx-auto mb-2" style={{ color: T.text3 }} />
                    <p className="text-sm" style={{ color: T.text3 }}>No feature flags. Run migration 43.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
