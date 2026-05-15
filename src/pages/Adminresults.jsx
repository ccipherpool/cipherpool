import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import {
  Trophy, Crosshair, CheckCircle, XCircle, AlertTriangle, Clock, Shield,
  Eye, BarChart3, RefreshCw, Users, Zap, ChevronRight, Award, Star,
} from "lucide-react";

const S_COLOR = {
  pending:       "#f59e0b",
  auto_verified: "#10b981",
  verified:      "#10b981",
  rejected:      "#ef4444",
  disputed:      "#f97316",
};
const S_LABEL = {
  pending:       "⏳ Pending",
  auto_verified: "✅ Auto-Verified",
  verified:      "✅ Verified",
  rejected:      "❌ Rejected",
  disputed:      "⚠️ Disputed",
};

function timeAgo(str) {
  if (!str) return "—";
  const d = Math.floor((Date.now() - new Date(str)) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#52525b", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

export default function AdminResults() {
  const [tab, setTab]             = useState("pending");
  const [results, setResults]     = useState([]);
  const [tourneyView, setTourneyView] = useState([]); // grouped by tournament
  const [disputed, setDisputed]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [selectedTourney, setSelectedTourney] = useState(null);
  const [tourneySubmissions, setTourneySubmissions] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg]             = useState({ type: "", text: "" });
  const [disputeSelections, setDisputeSelections] = useState(new Set());
  const [forceResolving, setForceResolving] = useState(false);

  useEffect(() => { loadAll(); }, [tab]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchResults(), fetchDisputedTournaments()]);
    setLoading(false);
  };

  const fetchResults = async () => {
    try {
      const q = supabase
        .from("match_results")
        .select(`
          id, tournament_id, user_id, placement, kills, points, estimated_coins,
          coins_awarded, screenshot_url, status, is_mvp, auto_verified, submitted_at, verified_at,
          profiles!match_results_user_id_fkey(username, full_name, avatar_url, fair_play_score),
          tournaments!match_results_tournament_id_fkey(id, name, game_type, mode, prize_pool)
        `)
        .order("submitted_at", { ascending: false });

      if (tab === "pending")  q.in("status", ["pending"]);
      if (tab === "verified") q.in("status", ["verified", "auto_verified"]);
      if (tab === "rejected") q.eq("status", "rejected");
      if (tab === "disputed") q.eq("status", "disputed");

      const { data, error } = await q;
      if (error) throw error;
      setResults(data || []);

      // Build tournament-grouped view
      if (tab === "all" || tab === "pending") {
        const grouped = {};
        (data || []).forEach(r => {
          const tid = r.tournament_id;
          if (!grouped[tid]) {
            grouped[tid] = { tournament: r.tournaments, submissions: [], totalPlayers: 0, allSubmitted: false };
          }
          grouped[tid].submissions.push(r);
        });
        setTourneyView(Object.values(grouped));
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("fetchResults:", err);
    }
  };

  const fetchDisputedTournaments = async () => {
    try {
      const { data } = await supabase.rpc("get_disputed_tournaments");
      setDisputed(data || []);
    } catch {}
  };

  const openTournamentView = async (tournamentId) => {
    setSelectedTourney(tournamentId);
    setDisputeSelections(new Set());
    try {
      const { data } = await supabase.rpc("get_tournament_submissions", { p_tournament_id: tournamentId });
      setTourneySubmissions(data || []);
    } catch (err) {
      showMsg("error", "Failed to load submissions");
    }
  };

  // ── APPROVE / REJECT (single result, server-authoritative) ──
  const verifyResult = async (resultId, action) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc("admin_verify_result", {
        p_result_id: resultId,
        p_action:    action,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      showMsg("success", action === "approve"
        ? `✅ Approved — ${data.coins} CP awarded to player`
        : "❌ Result rejected");
      setSelected(null);
      await loadAll();
    } catch (err) {
      showMsg("error", err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  // ── FORCE RESOLVE DISPUTE ──
  const forceResolveDispute = async (tournamentId) => {
    if (disputeSelections.size === 0) {
      showMsg("error", "Select at least one result to approve");
      return;
    }
    setForceResolving(true);
    try {
      const { data, error } = await supabase.rpc("force_resolve_dispute", {
        p_tournament_id: tournamentId,
        p_result_ids:    Array.from(disputeSelections),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      showMsg("success", "✅ Dispute resolved — rewards distributed");
      setSelectedTourney(null);
      setTourneySubmissions([]);
      setDisputeSelections(new Set());
      await loadAll();
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setForceResolving(false);
    }
  };

  const pendingCount   = results.filter(r => r.status === "pending").length;
  const disputedCount  = disputed.length;
  const getName = r => r.profiles?.username || r.profiles?.full_name || "Player";

  // ── TAB COUNTS ──
  const TABS = [
    { key: "pending",  label: "Pending",        badge: pendingCount,  urgent: true  },
    { key: "disputed", label: "Disputed",        badge: disputedCount, urgent: true  },
    { key: "verified", label: "Verified",        badge: null,          urgent: false },
    { key: "rejected", label: "Rejected",        badge: null,          urgent: false },
    { key: "all",      label: "All Results",     badge: null,          urgent: false },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#08080d", padding: 24, color: "#f4f4f5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        .ar-row { transition: background 0.1s; }
        .ar-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f4f4f5", margin: 0 }}>Match Results</h1>
          <p style={{ color: "#52525b", marginTop: 4, fontSize: 13 }}>
            Server-verified results — all rewards distributed automatically
          </p>
        </div>
        <button onClick={loadAll} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {msg.text && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginBottom: 16, padding: "12px 16px", borderRadius: 10,
              background: msg.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: msg.type === "success" ? "#34d399" : "#f87171",
              fontSize: 13, fontWeight: 600,
            }}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12,
            background: tab === t.key ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
            color: tab === t.key ? "#818cf8" : "#52525b",
            outline: tab === t.key ? "1px solid rgba(99,102,241,0.3)" : "none",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{
                background: t.urgent ? "#ef4444" : "#6366f1",
                color: "#fff", borderRadius: 10, padding: "0 6px",
                fontSize: 10, fontWeight: 800,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ DISPUTED TOURNAMENTS SECTION ═══ */}
      {tab === "disputed" && (
        <div>
          {disputed.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
              <CheckCircle size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>No disputed matches</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {disputed.map(d => (
                <div key={d.tournament_id}
                  className="ar-row"
                  style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <AlertTriangle size={14} color="#f97316" />
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#f4f4f5" }}>{d.tournament_name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#52525b" }}>
                        {d.submissions} submissions · {d.dispute_reason || "Conflicting ranks"} · {timeAgo(d.created_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => openTournamentView(d.tournament_id)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.1)", color: "#f97316", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Resolve Dispute →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ RESULTS LIST ═══ */}
      {tab !== "disputed" && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
            <div style={{ width: 32, height: 32, border: "2px solid #6366f130", borderTop: "2px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p>Loading…</p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#3f3f46" }}>
            <BarChart3 size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <p>No results found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {results.map(r => {
              const statusColor = S_COLOR[r.status] || "#6b7280";
              return (
                <div key={r.id} className="ar-row"
                  onClick={() => setSelected(r)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid rgba(255,255,255,0.06)`,
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, overflow: "hidden", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {r.profiles?.avatar_url
                      ? <img src={r.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 16, fontWeight: 800, color: "#6366f1" }}>{(getName(r) || "?")[0].toUpperCase()}</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 6 }}>
                      {getName(r)}
                      {r.is_mvp && <span style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>MVP</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>
                      {r.tournaments?.name} · {timeAgo(r.submitted_at)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 16 }}>
                    <MiniStat label="RANK" value={`#${r.placement}`} color="#f59e0b" />
                    <MiniStat label="KILLS" value={r.kills} color="#06b6d4" />
                    <MiniStat label="PTS" value={r.points} color="#8b5cf6" />
                    <MiniStat label="CP" value={`+${r.coins_awarded || r.estimated_coins || r.points * 10}`} color="#10b981" />
                  </div>

                  {/* Status */}
                  <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor}18`, color: statusColor, whiteSpace: "nowrap" }}>
                    {S_LABEL[r.status] || r.status}
                  </div>

                  {/* Screenshot thumb */}
                  {r.screenshot_url && (
                    <img src={r.screenshot_url} alt="" style={{ width: 58, height: 42, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ═══ TOURNAMENT SUBMISSIONS MODAL (dispute resolution) ═══ */}
      <AnimatePresence>
        {selectedTourney && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 20 }}
            onClick={() => setSelectedTourney(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: "#0f0f1a", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 18, padding: 28, width: 740, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Dispute Resolution</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5", marginTop: 2 }}>Select Valid Results</div>
                </div>
                <button onClick={() => setSelectedTourney(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              </div>

              <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#fb923c" }}>
                ⚠️ Check screenshots carefully. Select results you want to APPROVE. Others will be rejected. Rewards distributed automatically.
              </div>

              {tourneySubmissions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#52525b" }}>Loading submissions…</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                  {tourneySubmissions.map(s => {
                    const selected = disputeSelections.has(s.result_id);
                    return (
                      <div key={s.result_id}
                        onClick={() => setDisputeSelections(prev => {
                          const next = new Set(prev);
                          if (next.has(s.result_id)) next.delete(s.result_id); else next.add(s.result_id);
                          return next;
                        })}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                          borderRadius: 12, cursor: "pointer",
                          background: selected ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
                          border: selected ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${selected ? "#10b981" : "rgba(255,255,255,0.1)"}`, background: selected ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                          {selected && <CheckCircle size={13} color="#fff" />}
                        </div>

                        <div style={{ width: 38, height: 38, borderRadius: 8, overflow: "hidden", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {s.avatar_url
                            ? <img src={s.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{(s.username || "?")[0].toUpperCase()}</span>
                          }
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#f4f4f5" }}>{s.username || "Player"}</div>
                          <div style={{ fontSize: 11, color: "#52525b" }}>FP: {s.fair_play_score ?? 100} · submitted {timeAgo(s.submitted_at)}</div>
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                          <MiniStat label="RANK" value={`#${s.placement}`} color="#f59e0b" />
                          <MiniStat label="KILLS" value={s.kills} color="#06b6d4" />
                          <MiniStat label="PTS" value={s.points} color="#8b5cf6" />
                        </div>

                        {s.screenshot_url && (
                          <a href={s.screenshot_url} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ flexShrink: 0 }}>
                            <img src={s.screenshot_url} alt="" style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setSelectedTourney(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  onClick={() => forceResolveDispute(selectedTourney)}
                  disabled={forceResolving || disputeSelections.size === 0}
                  style={{
                    flex: 2, padding: "12px 0", borderRadius: 10, border: "none",
                    background: disputeSelections.size > 0 ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.04)",
                    color: disputeSelections.size > 0 ? "#fff" : "#52525b",
                    fontWeight: 800, fontSize: 14, cursor: disputeSelections.size > 0 ? "pointer" : "not-allowed",
                    boxShadow: disputeSelections.size > 0 ? "0 4px 20px rgba(16,185,129,0.3)" : "none",
                  }}
                >
                  {forceResolving ? "Resolving…" : `✅ Approve ${disputeSelections.size} Result${disputeSelections.size !== 1 ? "s" : ""} & Distribute Rewards`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SINGLE RESULT DETAIL MODAL ═══ */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: 16 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: "#0f0f1a", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 18, padding: 28, width: 580, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#f4f4f5" }}>{getName(selected)}</div>
                  <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>
                    {selected.tournaments?.name} · {timeAgo(selected.submitted_at)}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#52525b", cursor: "pointer" }}>✕</button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { l: "RANK", v: `#${selected.placement}`, c: "#f59e0b" },
                  { l: "KILLS", v: selected.kills, c: "#06b6d4" },
                  { l: "POINTS", v: selected.points, c: "#8b5cf6" },
                  { l: "COINS", v: `+${selected.coins_awarded || selected.estimated_coins || selected.points * 10}`, c: "#10b981" },
                ].map(s => (
                  <div key={s.l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#52525b", letterSpacing: 1, marginBottom: 4 }}>{s.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${S_COLOR[selected.status] || "#6b7280"}18`, color: S_COLOR[selected.status] || "#6b7280" }}>
                  {S_LABEL[selected.status] || selected.status}
                </div>
                {selected.auto_verified && <span style={{ fontSize: 11, color: "#52525b" }}>Auto-verified by system</span>}
                {selected.is_mvp && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>🔥 MVP</span>}
              </div>

              {/* Screenshot */}
              {selected.screenshot_url ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#52525b", marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>📸 SCREENSHOT</div>
                  <a href={selected.screenshot_url} target="_blank" rel="noreferrer">
                    <img src={selected.screenshot_url} alt="" style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", cursor: "zoom-in" }} />
                  </a>
                  <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 4, textAlign: "center" }}>Click to enlarge</div>
                </div>
              ) : (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: 14, marginBottom: 20, color: "#fca5a5", fontSize: 13, textAlign: "center" }}>
                  ⚠️ No screenshot provided
                </div>
              )}

              {/* Actions for pending/disputed */}
              {["pending", "disputed"].includes(selected.status) && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => verifyResult(selected.id, "reject")} disabled={verifying}
                    style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ❌ Reject
                  </button>
                  <button onClick={() => verifyResult(selected.id, "approve")} disabled={verifying}
                    style={{ flex: 2, padding: "13px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,0.3)" }}>
                    {verifying ? "Processing…" : `✅ Approve (+${selected.estimated_coins || selected.points * 10} CP)`}
                  </button>
                </div>
              )}

              {!["pending", "disputed"].includes(selected.status) && (
                <div style={{ textAlign: "center", padding: "12px 0", color: S_COLOR[selected.status], fontWeight: 700, fontSize: 14 }}>
                  {S_LABEL[selected.status]}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
