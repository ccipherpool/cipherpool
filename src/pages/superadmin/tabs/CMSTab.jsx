import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import {
  Settings, Globe, Palette, Flag, Layers, Database,
  Save, RefreshCw, CheckCircle2, AlertTriangle, Eye,
  EyeOff, ToggleLeft, ToggleRight, Edit3, Clock,
  FileText, Image, X, Plus,
} from "lucide-react";

const T = {
  s2: "#0d1220", s3: "#121929",
  border: "rgba(255,255,255,0.05)",
  b2: "rgba(255,255,255,0.08)",
  violet: "#8b5cf6", green: "#10b981", amber: "#f59e0b", red: "#ef4444", cyan: "#06b6d4",
  text: "rgba(255,255,255,0.85)", text2: "rgba(255,255,255,0.45)", text3: "rgba(255,255,255,0.25)",
};

// ── Shared input styles ───────────────────────────────────────────────────────
const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors";
const labelClass = "block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success", onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        background: type === "success" ? `${T.green}18` : `${T.red}18`,
        border: `1px solid ${type === "success" ? T.green : T.red}30`,
        backdropFilter: "blur(20px)",
      }}
    >
      {type === "success"
        ? <CheckCircle2 size={16} style={{ color: T.green }} />
        : <AlertTriangle size={16} style={{ color: T.red }} />
      }
      <span className="text-sm font-medium text-white">{msg}</span>
      <button onClick={onDismiss} className="ml-1 text-white/30 hover:text-white transition-colors">
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ── SITE SETTINGS TAB ────────────────────────────────────────────────────────
function SiteSettingsPanel({ onToast }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState({});
  const [edits, setEdits]       = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").order("category").order("key");
      setSettings(data || []);
      setLoading(false);
    })();
  }, []);

  const save = async (key, rawValue) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      let jsonValue;
      try { jsonValue = JSON.parse(rawValue); }
      catch { jsonValue = rawValue; } // treat as string if not valid JSON

      const { error } = await supabase.rpc("update_site_setting", {
        p_key: key,
        p_value: jsonValue,
      });
      if (error) throw error;
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: jsonValue } : s));
      setEdits(e => { const n = { ...e }; delete n[key]; return n; });
      onToast(`"${key}" updated`, "success");
    } catch (e) {
      onToast(e.message, "error");
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: T.s3 }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.text3 }}>
            {cat}
          </p>
          <div className="space-y-2">
            {grouped[cat].map(s => {
              const editVal = edits[s.key] ?? JSON.stringify(s.value);
              const isDirty = edits[s.key] !== undefined;
              const isBoolean = typeof s.value === "boolean";

              return (
                <div key={s.key} className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isDirty ? T.violet + "30" : T.border}` }}>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium" style={{ color: T.text }}>{s.label}</p>
                      {!s.is_public && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: T.text3 }}>
                          private
                        </span>
                      )}
                    </div>
                    {s.description && <p className="text-xs" style={{ color: T.text3 }}>{s.description}</p>}
                    <code className="text-[10px] font-mono" style={{ color: T.text3 }}>{s.key}</code>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isBoolean ? (
                      <button
                        onClick={() => {
                          const newVal = !s.value;
                          setSettings(prev => prev.map(x => x.key === s.key ? { ...x, value: newVal } : x));
                          save(s.key, JSON.stringify(newVal));
                        }}
                        className="transition-colors"
                      >
                        {s.value
                          ? <ToggleRight size={28} style={{ color: T.green }} />
                          : <ToggleLeft size={28} style={{ color: T.text3 }} />
                        }
                      </button>
                    ) : (
                      <>
                        <input
                          value={editVal}
                          onChange={e => setEdits(x => ({ ...x, [s.key]: e.target.value }))}
                          className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/40 transition-colors"
                          placeholder={String(s.value)}
                        />
                        {isDirty && (
                          <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => save(s.key, editVal)}
                            disabled={saving[s.key]}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: `${T.violet}18`, border: `1px solid ${T.violet}25`, color: T.violet }}
                          >
                            {saving[s.key] ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                            Save
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FEATURE FLAGS TAB ────────────────────────────────────────────────────────
function FeatureFlagsPanel({ onToast }) {
  const [flags, setFlags]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("feature_flags").select("*").order("key");
      setFlags(data || []);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key, newVal) => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const { error } = await supabase.rpc("toggle_feature_flag", { p_key: key, p_enabled: newVal });
      if (error) throw error;
      setFlags(prev => prev.map(f => f.key === key ? { ...f, is_enabled: newVal } : f));
      onToast(`Flag "${key}" ${newVal ? "enabled" : "disabled"}`, "success");
    } catch (e) {
      onToast(e.message, "error");
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: T.s3 }} />
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
      {flags.map((flag, i) => (
        <div
          key={flag.key}
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: T.border }}
        >
          <div className="flex-1 min-w-0 mr-6">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold" style={{ color: T.text }}>{flag.name}</p>
              <code className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: "rgba(255,255,255,0.05)", color: T.text3 }}>{flag.key}</code>
            </div>
            {flag.description && <p className="text-xs" style={{ color: T.text3 }}>{flag.description}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-semibold" style={{ color: flag.is_enabled ? T.green : T.text3 }}>
              {flag.is_enabled ? "On" : "Off"}
            </span>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => toggle(flag.key, !flag.is_enabled)}
              disabled={saving[flag.key]}
              className="transition-all"
            >
              {saving[flag.key]
                ? <RefreshCw size={22} className="animate-spin" style={{ color: T.text3 }} />
                : flag.is_enabled
                  ? <ToggleRight size={28} style={{ color: T.green }} />
                  : <ToggleLeft  size={28} style={{ color: T.text3 }} />
              }
            </motion.button>
          </div>
        </div>
      ))}
      {flags.length === 0 && (
        <div className="py-16 text-center">
          <Flag size={24} className="mx-auto mb-2" style={{ color: T.text3 }} />
          <p className="text-sm" style={{ color: T.text3 }}>No feature flags. Run migration 44.</p>
        </div>
      )}
    </div>
  );
}

// ── HOMEPAGE SECTIONS TAB ────────────────────────────────────────────────────
function HomepageSectionsPanel({ onToast }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("homepage_sections").select("*").order("sort_order");
      setSections(data || []);
      setLoading(false);
    })();
  }, []);

  const toggleSection = async (id, enabled) => {
    const { error } = await supabase.from("homepage_sections").update({ is_enabled: enabled }).eq("id", id);
    if (!error) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, is_enabled: enabled } : s));
      onToast(`Section ${enabled ? "shown" : "hidden"}`, "success");
    } else {
      onToast(error.message, "error");
    }
  };

  if (loading) return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: T.s3 }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: T.text3 }}>
        Control which sections appear on the homepage. Drag to reorder (coming soon).
      </p>
      <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
        {sections.map((sec, i) => (
          <div
            key={sec.id}
            className="flex items-center gap-4 px-5 py-4 border-b transition-colors"
            style={{ borderColor: T.border }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", color: T.text3 }}>
              {sec.sort_order}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: T.text }}>{sec.title || sec.key}</p>
              <p className="text-xs" style={{ color: T.text3 }}>{sec.section_type} · key: {sec.key}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => toggleSection(sec.id, !sec.is_enabled)}
            >
              {sec.is_enabled
                ? <ToggleRight size={28} style={{ color: T.green }} />
                : <ToggleLeft  size={28} style={{ color: T.text3 }} />
              }
            </motion.button>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="py-16 text-center">
            <Layers size={24} className="mx-auto mb-2" style={{ color: T.text3 }} />
            <p className="text-sm" style={{ color: T.text3 }}>No homepage sections. Run migration 44.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CMS LOGS ─────────────────────────────────────────────────────────────────
function CMSLogsPanel() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cms_logs")
        .select("*, actor:profiles(username)")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);

  const actionColor = {
    UPDATE: T.amber, INSERT: T.green, DELETE: T.red,
  };

  if (loading) return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: T.s3 }} />
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: T.s2, borderColor: T.border }}>
      <div className="px-5 py-3.5 border-b grid grid-cols-4 gap-4 text-[10px] font-semibold uppercase tracking-widest"
        style={{ borderColor: T.border, color: T.text3, background: T.s3 }}>
        <span>Actor</span>
        <span>Action</span>
        <span>Table · Key</span>
        <span>Time</span>
      </div>
      {logs.map((log, i) => (
        <div
          key={log.id}
          className="px-5 py-3.5 border-b grid grid-cols-4 gap-4 text-sm transition-colors"
          style={{ borderColor: T.border }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ color: T.text }}>{log.actor?.username ?? "system"}</span>
          <span className="font-mono text-xs font-semibold" style={{ color: actionColor[log.action] ?? T.text2 }}>
            {log.action}
          </span>
          <span style={{ color: T.text2 }}>
            {log.table_name} {log.record_id && <code className="text-[10px]" style={{ color: T.text3 }}>· {log.record_id.slice(0, 16)}</code>}
          </span>
          <span className="text-xs" style={{ color: T.text3 }}>
            {new Date(log.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="py-16 text-center">
          <FileText size={24} className="mx-auto mb-2" style={{ color: T.text3 }} />
          <p className="text-sm" style={{ color: T.text3 }}>No CMS changes logged yet</p>
        </div>
      )}
    </div>
  );
}

// ── MAIN CMS TAB ──────────────────────────────────────────────────────────────
const PANELS = [
  { id: "settings", label: "Site Settings",      icon: Settings },
  { id: "flags",    label: "Feature Flags",       icon: Flag     },
  { id: "sections", label: "Homepage Sections",   icon: Layers   },
  { id: "logs",     label: "Change Log",          icon: Clock    },
];

export default function CMSTab() {
  const [panel, setPanel]     = useState("settings");
  const [toast, setToast]     = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            CMS Control System
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Manage platform content, feature flags, and settings without touching code.
          </p>
        </div>
      </div>

      {/* Panel tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {PANELS.map(p => (
          <button
            key={p.id}
            onClick={() => setPanel(p.id)}
            className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 flex-shrink-0"
            style={{ color: panel === p.id ? "white" : "rgba(255,255,255,0.40)" }}
          >
            <p.icon size={13} style={{ color: panel === p.id ? "#8b5cf6" : "inherit" }} />
            {p.label}
            {panel === p.id && (
              <motion.div
                layoutId="cms-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={panel}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {panel === "settings" && <SiteSettingsPanel onToast={showToast} />}
          {panel === "flags"    && <FeatureFlagsPanel onToast={showToast} />}
          {panel === "sections" && <HomepageSectionsPanel onToast={showToast} />}
          {panel === "logs"     && <CMSLogsPanel />}
        </motion.div>
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
