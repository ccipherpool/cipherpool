import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import {
  Settings, Flag, Layers, Clock, Save, RefreshCw,
  CheckCircle2, AlertTriangle, X, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Globe, Eye, EyeOff,
} from "lucide-react";

// ── Design tokens (clean, readable admin style) ──────────────────────────────
const D = {
  bg:      "#0d1220",
  card:    "#111927",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  text:    "rgba(255,255,255,0.90)",
  text2:   "rgba(255,255,255,0.55)",
  text3:   "rgba(255,255,255,0.30)",
  indigo:  "#6366f1",
  green:   "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
  cyan:    "#06b6d4",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toast(setState, msg, type = "success") {
  const id = Date.now();
  setState({ id, msg, type });
  setTimeout(() => setState(null), 3500);
}

function Toast({ toast: t, onDismiss }) {
  if (!t) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={t.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: t.type === "success" ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
          border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {t.type === "success"
          ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          : <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
        }
        <span className="text-sm font-medium text-white">{t.msg}</span>
        <button onClick={onDismiss} className="ml-1 text-white/30 hover:text-white/80 transition-colors">
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeader({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-3 mt-2"
      style={{ color: D.text3 }}>
      {children}
    </p>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border ${className}`}
      style={{ background: D.card, borderColor: D.border }}>
      {children}
    </div>
  );
}

function SaveBtn({ loading, dirty, onClick }) {
  if (!dirty) return null;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: `${D.indigo}20`,
        border: `1px solid ${D.indigo}35`,
        color: D.indigo,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading
        ? <RefreshCw size={11} className="animate-spin" />
        : <Save size={11} />
      }
      {loading ? "Saving…" : "Save"}
    </motion.button>
  );
}

// ── 1. SITE SETTINGS PANEL ───────────────────────────────────────────────────

const CATEGORY_ORDER = ["general", "economy", "gameplay", "social", "ui", "security", "maintenance"];

function SiteSettingsPanel({ onToast }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dirty, setDirty]       = useState({});  // key → new raw string value
  const [saving, setSaving]     = useState({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .order("category")
      .order("key");
    if (!error) setSettings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (key) => {
    const rawVal = dirty[key];
    if (rawVal === undefined) return;

    setSaving(s => ({ ...s, [key]: true }));
    try {
      // Parse to proper JSON value
      let jsonValue;
      try { jsonValue = JSON.parse(rawVal); }
      catch { jsonValue = rawVal; }

      // Try RPC first
      const { error: rpcErr } = await supabase.rpc("update_site_setting", {
        p_key: key, p_value: jsonValue,
      });

      if (rpcErr) {
        // Fallback: direct update (needs UPDATE grant + RLS)
        const { error: directErr } = await supabase
          .from("site_settings")
          .update({ value: jsonValue, updated_at: new Date().toISOString() })
          .eq("key", key);
        if (directErr) throw directErr;
      }

      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: jsonValue } : s));
      setDirty(d => { const n = { ...d }; delete n[key]; return n; });
      onToast(`"${key}" saved`, "success");
    } catch (e) {
      onToast(e.message || "Save failed", "error");
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = settings.filter(s => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});
  // catch any categories not in the ordered list
  settings.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = settings.filter(x => x.category === s.category);
  });

  if (loading) return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <SectionHeader>{cat}</SectionHeader>
          <Card>
            {items.map((s, idx) => {
              const isBoolean = typeof s.value === "boolean";
              const currentRaw = dirty[s.key] ?? (isBoolean ? String(s.value) : JSON.stringify(s.value));
              const isDirty = dirty[s.key] !== undefined;

              return (
                <div
                  key={s.key}
                  className="flex items-center gap-4 px-5 py-4 transition-colors"
                  style={{
                    borderBottom: idx < items.length - 1 ? `1px solid ${D.border}` : undefined,
                    background: isDirty ? "rgba(99,102,241,0.04)" : undefined,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: D.text }}>{s.label}</span>
                      <code className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "rgba(255,255,255,0.06)", color: D.text3 }}>
                        {s.key}
                      </code>
                      {!s.is_public && (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: D.text3 }}>
                          <EyeOff size={9} /> private
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs mt-0.5" style={{ color: D.text3 }}>{s.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isBoolean ? (
                      <button
                        onClick={() => {
                          const newVal = !(dirty[s.key] !== undefined ? dirty[s.key] === "true" : s.value);
                          setDirty(d => ({ ...d, [s.key]: String(newVal) }));
                          // auto-save boolean toggles
                          (async () => {
                            setSaving(sv => ({ ...sv, [s.key]: true }));
                            try {
                              const { error: rpcErr } = await supabase.rpc("update_site_setting", {
                                p_key: s.key, p_value: newVal,
                              });
                              if (rpcErr) {
                                const { error: dErr } = await supabase.from("site_settings")
                                  .update({ value: newVal }).eq("key", s.key);
                                if (dErr) throw dErr;
                              }
                              setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: newVal } : x));
                              setDirty(d => { const n = { ...d }; delete n[s.key]; return n; });
                              onToast(`${s.label}: ${newVal ? "enabled" : "disabled"}`, "success");
                            } catch (e) {
                              onToast(e.message || "Toggle failed", "error");
                              setDirty(d => { const n = { ...d }; delete n[s.key]; return n; });
                            } finally {
                              setSaving(sv => ({ ...sv, [s.key]: false }));
                            }
                          })();
                        }}
                        disabled={saving[s.key]}
                        className="transition-all"
                      >
                        {saving[s.key]
                          ? <RefreshCw size={22} className="animate-spin" style={{ color: D.text3 }} />
                          : (dirty[s.key] !== undefined ? dirty[s.key] === "true" : s.value)
                            ? <ToggleRight size={28} style={{ color: D.green }} />
                            : <ToggleLeft  size={28} style={{ color: D.text3 }} />
                        }
                      </button>
                    ) : (
                      <>
                        <input
                          value={currentRaw}
                          onChange={e => setDirty(d => ({ ...d, [s.key]: e.target.value }))}
                          className="w-44 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${isDirty ? D.indigo + "60" : D.border}`,
                            color: D.text,
                          }}
                        />
                        <SaveBtn
                          loading={saving[s.key]}
                          dirty={isDirty}
                          onClick={() => save(s.key)}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ))}

      {settings.length === 0 && (
        <div className="py-20 text-center">
          <Settings size={28} className="mx-auto mb-3" style={{ color: D.text3 }} />
          <p className="text-sm font-medium" style={{ color: D.text2 }}>No settings found</p>
          <p className="text-xs mt-1" style={{ color: D.text3 }}>Run migration 44 to seed defaults</p>
        </div>
      )}
    </div>
  );
}

// ── 2. FEATURE FLAGS PANEL ───────────────────────────────────────────────────

function FeatureFlagsPanel({ onToast }) {
  const [flags, setFlags]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("feature_flags").select("*").order("key");
      setFlags(data || []);
      setLoading(false);
    })();
  }, []);

  const toggle = async (flag, newVal) => {
    // Optimistic update
    setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, is_enabled: newVal } : f));
    setSaving(s => ({ ...s, [flag.key]: true }));
    try {
      // Try RPC
      const { error: rpcErr } = await supabase.rpc("toggle_feature_flag", {
        p_key: flag.key, p_enabled: newVal,
      });
      if (rpcErr) {
        // Fallback: direct update
        const { error: dErr } = await supabase
          .from("feature_flags")
          .update({ is_enabled: newVal, updated_at: new Date().toISOString() })
          .eq("key", flag.key);
        if (dErr) throw dErr;
      }
      onToast(`"${flag.name}" ${newVal ? "enabled" : "disabled"}`, "success");
    } catch (e) {
      // Rollback optimistic update
      setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, is_enabled: !newVal } : f));
      onToast(e.message || "Toggle failed", "error");
    } finally {
      setSaving(s => ({ ...s, [flag.key]: false }));
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  return (
    <Card>
      {flags.map((flag, i) => (
        <div
          key={flag.key}
          className="flex items-center gap-4 px-5 py-4 transition-colors"
          style={{
            borderBottom: i < flags.length - 1 ? `1px solid ${D.border}` : undefined,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: D.text }}>{flag.name}</span>
              <code className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: "rgba(255,255,255,0.06)", color: D.text3 }}>
                {flag.key}
              </code>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: flag.is_enabled ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
                  color: flag.is_enabled ? D.green : D.text3,
                }}
              >
                {flag.is_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {flag.description && (
              <p className="text-xs mt-0.5" style={{ color: D.text3 }}>{flag.description}</p>
            )}
          </div>
          <button
            onClick={() => toggle(flag, !flag.is_enabled)}
            disabled={saving[flag.key]}
            className="flex-shrink-0 transition-all"
          >
            {saving[flag.key]
              ? <RefreshCw size={22} className="animate-spin" style={{ color: D.text3 }} />
              : flag.is_enabled
                ? <ToggleRight size={30} style={{ color: D.green }} />
                : <ToggleLeft  size={30} style={{ color: D.text3 }} />
            }
          </button>
        </div>
      ))}
      {flags.length === 0 && (
        <div className="py-16 text-center">
          <Flag size={24} className="mx-auto mb-2" style={{ color: D.text3 }} />
          <p className="text-sm font-medium" style={{ color: D.text2 }}>No feature flags</p>
          <p className="text-xs mt-1" style={{ color: D.text3 }}>Run migration 44 to seed defaults</p>
        </div>
      )}
    </Card>
  );
}

// ── 3. HOMEPAGE SECTIONS PANEL ───────────────────────────────────────────────

function HomepageSectionsPanel({ onToast }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("homepage_sections").select("*").order("sort_order");
      setSections(data || []);
      setLoading(false);
    })();
  }, []);

  const toggleSection = async (sec) => {
    const newVal = !sec.is_enabled;
    setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_enabled: newVal } : s));
    setSaving(s => ({ ...s, [sec.id]: true }));
    try {
      const { error } = await supabase
        .from("homepage_sections")
        .update({ is_enabled: newVal, updated_at: new Date().toISOString() })
        .eq("id", sec.id);
      if (error) throw error;
      onToast(`Section "${sec.title || sec.key}" ${newVal ? "shown" : "hidden"}`, "success");
    } catch (e) {
      setSections(prev => prev.map(s => s.id === sec.id ? { ...s, is_enabled: !newVal } : s));
      onToast(e.message || "Update failed", "error");
    } finally {
      setSaving(s => ({ ...s, [sec.id]: false }));
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  const sectionTypeColor = {
    hero: D.indigo, stats: D.cyan, features: D.green,
    tournaments: D.amber, cta: D.red, generic: D.text3,
  };

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: D.text3 }}>
        Show/hide homepage sections. Changes apply immediately to all visitors.
      </p>
      <Card>
        {sections.map((sec, i) => {
          const color = sectionTypeColor[sec.section_type] || D.text3;
          return (
            <div
              key={sec.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: i < sections.length - 1 ? `1px solid ${D.border}` : undefined }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${color}14`, color, border: `1px solid ${color}25` }}
              >
                {sec.sort_order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: D.text }}>{sec.title || sec.key}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: `${color}14`, color }}
                  >
                    {sec.section_type}
                  </span>
                </div>
                <code className="text-[10px]" style={{ color: D.text3 }}>key: {sec.key}</code>
              </div>
              <button
                onClick={() => toggleSection(sec)}
                disabled={saving[sec.id]}
                className="flex-shrink-0 transition-all"
              >
                {saving[sec.id]
                  ? <RefreshCw size={22} className="animate-spin" style={{ color: D.text3 }} />
                  : sec.is_enabled
                    ? <ToggleRight size={30} style={{ color: D.green }} />
                    : <ToggleLeft  size={30} style={{ color: D.text3 }} />
                }
              </button>
            </div>
          );
        })}
        {sections.length === 0 && (
          <div className="py-16 text-center">
            <Layers size={24} className="mx-auto mb-2" style={{ color: D.text3 }} />
            <p className="text-sm font-medium" style={{ color: D.text2 }}>No homepage sections</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── 4. CMS LOGS PANEL ───────────────────────────────────────────────────────

function CMSLogsPanel() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cms_logs")
        .select("*, actor:profiles(username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="space-y-1.5">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-11 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  const actionStyle = {
    UPDATE: { bg: "rgba(245,158,11,0.12)", color: D.amber },
    INSERT: { bg: "rgba(16,185,129,0.12)", color: D.green },
    DELETE: { bg: "rgba(239,68,68,0.12)",  color: D.red   },
  };

  return (
    <Card>
      {/* Header row */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-widest"
        style={{ borderColor: D.border, color: D.text3, background: "rgba(255,255,255,0.02)" }}>
        <span>Actor</span>
        <span>Action</span>
        <span>Target</span>
        <span>When</span>
      </div>

      {logs.map((log, i) => {
        const style = actionStyle[log.action] || { bg: "rgba(255,255,255,0.06)", color: D.text2 };
        return (
          <div
            key={log.id}
            className="grid grid-cols-4 gap-3 px-5 py-3 text-sm transition-colors"
            style={{ borderBottom: i < logs.length - 1 ? `1px solid ${D.border}` : undefined }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span className="font-medium truncate" style={{ color: D.text }}>
              {log.actor?.username ?? "system"}
            </span>
            <span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded"
                style={{ background: style.bg, color: style.color }}>
                {log.action}
              </span>
            </span>
            <span className="text-xs truncate" style={{ color: D.text2 }}>
              {log.table_name}
              {log.record_id && (
                <code className="ml-1 text-[10px]" style={{ color: D.text3 }}>
                  {log.record_id.slice(0, 12)}…
                </code>
              )}
            </span>
            <span className="text-xs" style={{ color: D.text3 }}>
              {new Date(log.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
        );
      })}

      {logs.length === 0 && (
        <div className="py-16 text-center">
          <Clock size={24} className="mx-auto mb-2" style={{ color: D.text3 }} />
          <p className="text-sm font-medium" style={{ color: D.text2 }}>No changes logged yet</p>
        </div>
      )}
    </Card>
  );
}

// ── MAIN CMS TAB ──────────────────────────────────────────────────────────────

const PANELS = [
  { id: "settings", label: "Site Settings",    icon: Settings },
  { id: "flags",    label: "Feature Flags",    icon: Flag     },
  { id: "sections", label: "Homepage",         icon: Globe    },
  { id: "logs",     label: "Change Log",       icon: Clock    },
];

export default function CMSTab() {
  const [panel, setPanel] = useState("settings");
  const [toastState, setToastState] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    toast(setToastState, msg, type);
  }, []);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          CMS Control System
        </h2>
        <p className="text-sm mt-0.5" style={{ color: D.text2 }}>
          Manage platform settings, feature flags, and homepage content.
        </p>
      </div>

      {/* Panel tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide border-b"
        style={{ borderColor: D.border }}>
        {PANELS.map(p => (
          <button
            key={p.id}
            onClick={() => setPanel(p.id)}
            className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0"
            style={{ color: panel === p.id ? "white" : D.text3 }}
          >
            <p.icon size={13} style={{ color: panel === p.id ? D.indigo : "inherit" }} />
            {p.label}
            {panel === p.id && (
              <motion.div
                layoutId="cms-active-bar"
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                style={{ background: D.indigo }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={panel}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {panel === "settings" && <SiteSettingsPanel onToast={showToast} />}
          {panel === "flags"    && <FeatureFlagsPanel onToast={showToast} />}
          {panel === "sections" && <HomepageSectionsPanel onToast={showToast} />}
          {panel === "logs"     && <CMSLogsPanel />}
        </motion.div>
      </AnimatePresence>

      <Toast toast={toastState} onDismiss={() => setToastState(null)} />
    </div>
  );
}
