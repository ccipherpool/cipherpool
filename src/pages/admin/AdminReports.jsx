import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag, CheckCircle, Clock, XCircle, AlertTriangle, Shield,
  ChevronDown, ChevronRight, User, RefreshCw, Filter,
  Zap, Siren, Eye, UserX, AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_CFG = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "bg-amber-400/10  border-amber-400/20"  },
  resolved:  { label: "Resolved",  color: "#34d399", bg: "bg-emerald-400/10 border-emerald-400/20" },
  dismissed: { label: "Dismissed", color: "#71717a", bg: "bg-zinc-700/20   border-zinc-600/20"  },
};

const SEVERITY_CFG = {
  low:      { color: "#71717a", label: "Low"      },
  medium:   { color: "#f59e0b", label: "Medium"   },
  high:     { color: "#f97316", label: "High"     },
  critical: { color: "#ef4444", label: "Critical" },
};

const TYPE_ICONS = { cheat: "🎯", toxic: "💢", fraud: "💰", bug: "🐛", other: "📋" };

const TABS = [
  { key: null,       label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed",label: "Dismissed"},
];

function ActionMenu({ report, onAction, loading }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { key: "resolve",    label: "Mark Resolved",    icon: CheckCircle, color: "#34d399" },
    { key: "dismiss",    label: "Dismiss",           icon: XCircle,     color: "#71717a" },
    { key: "escalate",   label: "Escalate (Critical)",icon: Siren,     color: "#ef4444" },
    ...(report.reported_user_id ? [
      { key: "warn_user", label: "Warn User",        icon: AlertTriangle, color: "#f59e0b" },
    ] : []),
  ];

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#71717a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
        Actions <ChevronDown size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }}
              style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, background: "#0f0f1a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, overflow: "hidden", minWidth: 190, boxShadow: "0 20px 40px rgba(0,0,0,.8)" }}>
              {actions.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.key} onClick={() => { setOpen(false); onAction(a.key); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: a.color, fontSize: 13, fontWeight: 600, textAlign: "left" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <Icon size={13} /> {a.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportRow({ report, onUpdated }) {
  const [expanded, setExpanded]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [noteText, setNoteText]     = useState("");
  const [actions, setActions]       = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const sev  = SEVERITY_CFG[report.severity] || SEVERITY_CFG.medium;
  const stat = STATUS_CFG[report.status] || STATUS_CFG.pending;

  const loadActions = async () => {
    setLoadingActions(true);
    const { data } = await supabase
      .from("report_actions")
      .select("*, actor:actor_id(username)")
      .eq("report_id", report.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setActions(data || []);
    setLoadingActions(false);
  };

  const handleAction = async (action) => {
    setLoading(true);
    const { data } = await supabase.rpc("apply_report_action", {
      p_report_id: report.id,
      p_action: action,
      p_note: noteText || null,
    });
    setLoading(false);
    if (data?.success) {
      onUpdated(report.id, data.new_status);
      setNoteText("");
    }
  };

  return (
    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
      {/* Row header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[report.type] || "📋"}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>
              {report.title || report.description?.substring(0, 60) + "…" || "No title"}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, color: sev.color, background: sev.color + "15" }}>
              {sev.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#52525b", display: "flex", gap: 10 }}>
            <span>By: {report.reporter?.username || "anon"}</span>
            {report.reported?.username && <span>→ {report.reported.username}</span>}
            <span>{new Date(report.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 7, color: stat.color, background: stat.color + "15" }}>
            {stat.label}
          </span>
          {report.status === "pending" && (
            <ActionMenu report={report} onAction={handleAction} loading={loading} />
          )}
          <button onClick={() => { setExpanded(e => !e); if (!expanded) loadActions(); }}
            style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,.07)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "14px 16px" }}>
              <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6, marginBottom: 12 }}>
                {report.description}
              </div>

              {report.evidence_urls?.filter(Boolean).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>Evidence:</div>
                  {report.evidence_urls.filter(Boolean).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", fontSize: 12, color: "#60a5fa", marginBottom: 2 }}>{url}</a>
                  ))}
                </div>
              )}

              {/* Note input for resolved/dismiss */}
              {report.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Resolution note (optional)…"
                    style={{ flex: 1, background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "8px 12px", color: "#f4f4f5", fontSize: 12, outline: "none" }}
                  />
                </div>
              )}

              {/* Action history */}
              {actions.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, letterSpacing: .5, marginBottom: 6 }}>AUDIT</div>
                  {actions.map(a => (
                    <div key={a.id} style={{ fontSize: 11, color: "#52525b", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                      <strong style={{ color: "#71717a" }}>{a.actor?.username}</strong>
                      {" · "}{a.action}
                      {a.note && ` — "${a.note}"`}
                      {" · "}{new Date(a.created_at).toLocaleString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(null);
  const [filter, setFilter]   = useState({ severity: "" });
  const [counts, setCounts]   = useState({});

  const isStaff = profile?.role === "admin" || profile?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("reports")
      .select(`
        id, type, title, description, severity, status,
        created_at, evidence_urls, reported_user_id,
        reporter:reporter_id(username),
        reported:reported_user_id(username, id)
      `)
      .order("created_at", { ascending: false });

    if (tab)              q = q.eq("status", tab);
    if (filter.severity)  q = q.eq("severity", filter.severity);

    // Sort: critical first within pending
    q = q.order("severity", { ascending: false });

    const { data } = await q.limit(50);
    setReports(data || []);
    setLoading(false);
  }, [tab, filter.severity]);

  useEffect(() => {
    if (!isStaff) return;
    supabase.from("reports").select("status").then(({ data }) => {
      if (!data) return;
      const c = {};
      data.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
      setCounts(c);
    });
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    load();
  }, [isStaff, load]);

  const handleUpdated = (id, newStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus || r.status } : r));
    if (newStatus) {
      setCounts(c => {
        const old = reports.find(r => r.id === id)?.status;
        return { ...c, [old]: Math.max(0, (c[old] || 1) - 1), [newStatus]: (c[newStatus] || 0) + 1 };
      });
    }
  };

  if (!isStaff) return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="text-center">
        <Shield size={40} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Staff access required</p>
      </div>
    </div>
  );

  const criticalCount = reports.filter(r => r.severity === "critical" && r.status === "pending").length;

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25,#06060f)", borderBottom: "1px solid rgba(239,68,68,.12)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(239,68,68,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flag size={16} color="#f87171" />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Reports Triage</h1>
                <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>Review and action community reports</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {criticalCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>
                  <Siren size={12} /> {criticalCount} CRITICAL
                </div>
              )}
              <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#71717a", cursor: "pointer", fontSize: 12 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {TABS.map(t => {
              const count = t.key ? counts[t.key] : Object.values(counts).reduce((a,b) => a+b, 0);
              return (
                <button key={t.key || "all"} onClick={() => setTab(t.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${tab === t.key ? "rgba(239,68,68,.3)" : "transparent"}`,
                    background: tab === t.key ? "rgba(239,68,68,.1)" : "transparent",
                    color: tab === t.key ? "#f87171" : "#52525b", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  }}>
                  {t.label}
                  {count > 0 && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: tab === t.key ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.05)", color: tab === t.key ? "#f87171" : "#52525b", fontWeight: 800 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Severity filter */}
            <div style={{ marginLeft: "auto", position: "relative" }}>
              <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "#0f0f1a", color: "#71717a", fontSize: 12, cursor: "pointer", outline: "none" }}>
                <option value="">All severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}>
            <div style={{ width: 26, height: 26, border: "2px solid #ef444420", borderTop: "2px solid #ef4444", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#3f3f46" }}>
            <Flag size={36} color="#27272a" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14 }}>No reports found</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {reports.map(r => (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ReportRow report={r} onUpdated={handleUpdated} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
