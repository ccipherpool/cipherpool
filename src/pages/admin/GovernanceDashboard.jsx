import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, Flag, AlertTriangle, CheckCircle, Clock, XCircle,
  TrendingUp, Users, Activity, ChevronRight, Lock, RefreshCw,
  BarChart3, Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_COLORS = {
  approved:     "#34d399",
  rejected:     "#f87171",
  on_hold:      "#fb923c",
  pending:      "#f59e0b",
  under_review: "#60a5fa",
};

function StatCard({ icon: Icon, label, value, sub, color = "#a78bfa", trend }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} color={color} />
        </div>
        {trend !== undefined && (
          <div style={{ fontSize: 11, color: trend >= 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
            {trend >= 0 ? "+" : ""}{trend} this week
          </div>
        )}
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: "#f4f4f5", lineHeight: 1 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#71717a", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>{sub}</div>}
    </motion.div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: "#a1a1aa", fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 800, color }}>{value} <span style={{ color: "#52525b", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.05)", borderRadius: 6, overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .8, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 6, background: color }} />
      </div>
    </div>
  );
}

function RecentDecisionRow({ d }) {
  const color = STATUS_COLORS[d.status] || "#71717a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(139,92,246,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#a78bfa", flexShrink: 0 }}>
        {(d.applicant || "?")[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>{d.applicant}</div>
        <div style={{ fontSize: 11, color: "#52525b" }}>
          by {d.decided_by || "admin"} · {d.final_decision_at ? new Date(d.final_decision_at).toLocaleDateString() : ""}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, color, background: color + "15" }}>
        {d.status}
      </div>
    </div>
  );
}

function RecentReportRow({ r }) {
  const SMAP = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#71717a" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {r.type === "cheat" ? "🎯" : r.type === "toxic" ? "💢" : r.type === "fraud" ? "💰" : r.type === "bug" ? "🐛" : "📋"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {r.title || r.type}
        </div>
        <div style={{ fontSize: 10, color: "#52525b" }}>by {r.reporter} · {new Date(r.created_at).toLocaleDateString()}</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, color: SMAP[r.severity] || "#71717a", background: (SMAP[r.severity] || "#71717a") + "15" }}>
        {r.severity}
      </span>
    </div>
  );
}

export default function GovernanceDashboard() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const isStaff = profile?.role === "admin" || profile?.role === "super_admin";

  const load = async () => {
    setLoading(true);
    const { data: d } = await supabase.rpc("get_governance_dashboard");
    setData(d || null);
    setLoading(false);
  };

  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  if (!isStaff) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Lock size={36} color="#3f3f46" style={{ margin: "0 auto 10px" }} />
        <p style={{ color: "#52525b" }}>Staff access required</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 26, height: 26, border: "2px solid #8b5cf620", borderTop: "2px solid #8b5cf6", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const apps = data?.applications || {};
  const rpts = data?.reports || {};
  const wrns = data?.warnings || {};
  const vts  = data?.votes || {};

  const appsTotal = apps.total || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#f4f4f5" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,#0f0f25,#06060f)", borderBottom: "1px solid rgba(139,92,246,.12)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(139,92,246,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={16} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Governance Dashboard</h1>
              <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>Platform health and moderation overview</p>
            </div>
          </div>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#71717a", cursor: "pointer", fontSize: 12 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
        {/* Quick alert for critical items */}
        {((rpts.critical_open || 0) + (rpts.high_open || 0)) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", marginBottom: 20 }}>
            <AlertTriangle size={15} color="#f87171" />
            <span style={{ fontSize: 13, color: "#f87171", fontWeight: 700 }}>
              {rpts.critical_open || 0} critical + {rpts.high_open || 0} high severity reports need attention
            </span>
            <button onClick={() => navigate("/admin/reports")}
              style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,.3)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
              Review →
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          <StatCard icon={Shield} label="Applications" value={appsTotal}
            sub={`${apps.pending || 0} pending`} color="#a78bfa" trend={apps.this_week} />
          <StatCard icon={Flag} label="Reports" value={rpts.total || 0}
            sub={`${rpts.pending || 0} open`} color="#f87171" trend={rpts.this_week} />
          <StatCard icon={AlertTriangle} label="Active Warnings" value={wrns.total_active || 0}
            sub={`${wrns.critical || 0} critical`} color="#f59e0b" trend={wrns.this_week} />
          <StatCard icon={Star} label="Votes Cast" value={vts.total || 0}
            sub={`${vts.approve || 0} approve / ${vts.reject || 0} reject`} color="#60a5fa" trend={vts.this_week} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Application funnel */}
          <div style={{ background: "rgba(139,92,246,.05)", border: "1px solid rgba(139,92,246,.15)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#71717a", letterSpacing: 1 }}>APPLICATION FUNNEL</div>
              <button onClick={() => navigate("/admin-applications")}
                style={{ fontSize: 11, color: "#8b5cf6", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                View all <ChevronRight size={11} />
              </button>
            </div>
            <FunnelBar label="Pending"      value={apps.pending || 0}      total={appsTotal} color="#f59e0b" />
            <FunnelBar label="Under Review" value={apps.under_review || 0} total={appsTotal} color="#60a5fa" />
            <FunnelBar label="Approved"     value={apps.approved || 0}     total={appsTotal} color="#34d399" />
            <FunnelBar label="Rejected"     value={apps.rejected || 0}     total={appsTotal} color="#f87171" />
            <FunnelBar label="On Hold"      value={apps.on_hold || 0}      total={appsTotal} color="#fb923c" />
          </div>

          {/* Report breakdown */}
          <div style={{ background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.12)", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#71717a", letterSpacing: 1 }}>REPORTS BREAKDOWN</div>
              <button onClick={() => navigate("/admin/reports")}
                style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                Triage <ChevronRight size={11} />
              </button>
            </div>
            <div style={{ marginBottom: 14 }}>
              {rpts.by_type && Object.entries(rpts.by_type).map(([type, cnt]) => (
                <FunnelBar key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}
                  value={cnt} total={rpts.total || 1} color="#f87171" />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Pending",   val: rpts.pending   || 0, color: "#f59e0b" },
                { label: "Resolved",  val: rpts.resolved  || 0, color: "#34d399" },
                { label: "Dismissed", val: rpts.dismissed || 0, color: "#71717a" },
              ].map(x => (
                <div key={x.label} style={{ textAlign: "center", padding: "10px 6px", background: x.color + "0d", borderRadius: 8, border: `1px solid ${x.color}20` }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: x.color }}>{x.val}</div>
                  <div style={{ fontSize: 10, color: "#52525b" }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent decisions + recent reports */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 14 }}>RECENT DECISIONS</div>
            {(data?.recent_decisions || []).length === 0 ? (
              <p style={{ fontSize: 12, color: "#3f3f46" }}>No decisions yet.</p>
            ) : (
              (data?.recent_decisions || []).map(d => <RecentDecisionRow key={d.id} d={d} />)
            )}
          </div>

          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#71717a", letterSpacing: 1, marginBottom: 14 }}>RECENT REPORTS</div>
            {(data?.recent_reports || []).length === 0 ? (
              <p style={{ fontSize: 12, color: "#3f3f46" }}>No reports yet.</p>
            ) : (
              (data?.recent_reports || []).map(r => <RecentReportRow key={r.id} r={r} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
