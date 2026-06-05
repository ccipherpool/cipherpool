import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import {
  Trash2, Shield, Clock, CheckCircle, XCircle,
  Ban, Search, RefreshCw, ChevronDown, ChevronRight,
  AlertTriangle, User, Calendar, Eye,
} from "lucide-react";

const C = {
  surface:  "rgba(18,18,30,0.95)",
  surface2: "rgba(25,25,40,0.95)",
  card:     "rgba(13,19,32,0.98)",
  border:   "rgba(255,255,255,0.07)",
  accent:   "#8B5CF6",
  green:    "#10B981",
  red:      "#EF4444",
  amber:    "#F59E0B",
  cyan:     "#06B6D4",
  text:     "#FFFFFF",
  text2:    "#A1A1AA",
  text3:    "#52525B",
};

// ── Helpers ──────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const m = {
    pending:  { color: C.amber, label: "Pending" },
    approved: { color: C.green, label: "Approved" },
    rejected: { color: C.red,   label: "Rejected" },
    banned:   { color: C.red,   label: "Perm. Banned" },
  }[status] || { color: C.text3, label: status };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 8,
      background: m.color + "18", color: m.color, letterSpacing: 0.5, textTransform: "uppercase",
      border: `1px solid ${m.color}30`,
    }}>
      {m.label}
    </span>
  );
}

// ── Deleted account row ───────────────────────────────────────────────
function DeletedRow({ record, onPermanentBan, loading }) {
  const [expanded, setExpanded] = useState(false);
  const snap = record.profile_snapshot || {};

  return (
    <div style={{
      border: `1px solid ${record.is_permanently_banned ? C.red + "30" : C.border}`,
      borderRadius: 12, overflow: "hidden", marginBottom: 8,
      background: record.is_permanently_banned ? `${C.red}05` : C.card,
    }}>
      {/* Row header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer",
      }} onClick={() => setExpanded(v => !v)}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: `${C.red}15`, border: `1px solid ${C.red}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: C.red,
          overflow: "hidden",
        }}>
          {snap.avatar_url
            ? <img src={snap.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
            : (record.username?.[0] || record.email?.[0] || "?").toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
            {record.username || snap.username || snap.full_name || "Unknown User"}
            {record.is_permanently_banned && (
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: C.red, background: `${C.red}15`, padding: "1px 6px", borderRadius: 4, border: `1px solid ${C.red}30` }}>
                PERM BANNED
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.text3, fontFamily: "monospace" }}>{record.email}</div>
        </div>

        <div style={{ fontSize: 10, color: C.text3, textAlign: "right", flexShrink: 0 }}>
          <div style={{ marginBottom: 2 }}>{fmt(record.deleted_at)}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>
            by {record.deleted_by_profile?.username || record.deleted_by_profile?.full_name || "Admin"}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {expanded ? <ChevronDown size={13} color={C.text3} /> : <ChevronRight size={13} color={C.text3} />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "User ID",       value: record.user_id?.slice(0, 16) + "…" },
                  { label: "Free Fire ID",  value: snap.free_fire_id || "—" },
                  { label: "Role (at time)",value: snap.role || "—" },
                  { label: "Delete Reason", value: record.reason || "Not specified" },
                  { label: "Joined",        value: fmt(snap.created_at) },
                  { label: "Deleted",       value: fmt(record.deleted_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.text2, fontFamily: "monospace", wordBreak: "break-all" }}>{value}</div>
                  </div>
                ))}
              </div>

              {!record.is_permanently_banned && (
                <button
                  onClick={() => onPermanentBan(record.id)}
                  disabled={loading}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.red}30`,
                    background: `${C.red}10`, color: C.red, cursor: "pointer",
                    fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${C.red}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${C.red}10`; }}
                >
                  <Ban size={12} /> Permanently Ban This Email
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Reapproval request row ────────────────────────────────────────────
function ReapprovalRow({ req, onApprove, onReject, onBan, loading }) {
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  return (
    <div style={{
      border: `1px solid ${C.amber}25`, borderRadius: 12, padding: "14px 16px",
      marginBottom: 8, background: `${C.amber}05`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: `${C.amber}15`, border: `1px solid ${C.amber}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Clock size={14} color={C.amber} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{req.email}</div>
          <div style={{ fontSize: 10, color: C.text3 }}>Requested {fmt(req.requested_at)}</div>
        </div>

        <StatusBadge status={req.status} />

        {req.status === "pending" && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onApprove(req.id)}
              disabled={loading}
              style={{
                padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                background: `${C.green}15`, color: C.green, fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <CheckCircle size={11} /> Approve
            </button>
            <button
              onClick={() => setShowRejectInput(v => !v)}
              disabled={loading}
              style={{
                padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                background: `${C.red}15`, color: C.red, fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <XCircle size={11} /> Reject
            </button>
            <button
              onClick={() => onBan(req.deleted_account_id)}
              disabled={loading}
              style={{
                padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.red}30`, cursor: "pointer",
                background: "transparent", color: C.red, fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <Ban size={11} /> Perm. Ban
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showRejectInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Rejection reason (optional)…"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  borderRadius: 7, color: C.text, fontSize: 11, padding: "7px 10px", outline: "none",
                }}
              />
              <button
                onClick={() => { onReject(req.id, rejectNote); setShowRejectInput(false); }}
                disabled={loading}
                style={{
                  padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: C.red, color: "#fff", fontSize: 11, fontWeight: 700,
                }}
              >
                Confirm Reject
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────
export default function DeletedAccountsTab() {
  const [view, setView]               = useState("deleted"); // "deleted" | "reapprovals"
  const [deleted, setDeleted]         = useState([]);
  const [reapprovals, setReapprovals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setAction]    = useState(false);
  const [search, setSearch]           = useState("");
  const [message, setMessage]         = useState(null);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: r }] = await Promise.all([
      supabase
        .from("deleted_accounts")
        .select("*, deleted_by_profile:profiles!deleted_accounts_deleted_by_fkey(username, full_name, avatar_url)")
        .order("deleted_at", { ascending: false }),
      supabase
        .from("reapproval_requests")
        .select("*")
        .order("requested_at", { ascending: false }),
    ]);
    setDeleted(d || []);
    setReapprovals(r || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (requestId) => {
    setAction(true);
    const { data, error } = await supabase.rpc("approve_reapproval", { p_request_id: requestId });
    setAction(false);
    if (error || !data?.success) { showMsg("error", error?.message || data?.error || "Failed"); return; }
    showMsg("success", "Account approved — user can now log in normally");
    fetchData();
  };

  const handleReject = async (requestId, note) => {
    setAction(true);
    const { data, error } = await supabase.rpc("reject_reapproval", { p_request_id: requestId, p_note: note || null });
    setAction(false);
    if (error || !data?.success) { showMsg("error", error?.message || data?.error || "Failed"); return; }
    showMsg("success", "Request rejected — account blocked");
    fetchData();
  };

  const handlePermBan = async (deletedAccountId) => {
    if (!window.confirm("Permanently ban this email? They can never register again.")) return;
    setAction(true);
    const { data, error } = await supabase.rpc("permanently_ban_deleted_account", { p_deleted_account_id: deletedAccountId });
    setAction(false);
    if (error || !data?.success) { showMsg("error", error?.message || data?.error || "Failed"); return; }
    showMsg("success", "Email permanently banned");
    fetchData();
  };

  const filteredDeleted = deleted.filter(r => {
    const q = search.toLowerCase();
    return !q || r.email?.toLowerCase().includes(q) || r.username?.toLowerCase().includes(q);
  });

  const pendingCount = reapprovals.filter(r => r.status === "pending").length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginBottom: 16, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 10,
              background: message.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: message.type === "success" ? "#34d399" : "#f87171",
            }}
          >
            {message.type === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 2 }}>Deleted Accounts</div>
          <div style={{ fontSize: 11, color: C.text3 }}>
            {deleted.length} archived · {pendingCount} pending reapproval
          </div>
        </div>
        <button
          onClick={fetchData}
          style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600 }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* View switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { key: "deleted",      label: "Deleted Accounts", icon: Trash2,  count: deleted.length  },
          { key: "reapprovals",  label: "Rejoin Requests",  icon: Clock,   count: pendingCount, urgent: pendingCount > 0 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
              background: view === t.key ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
              color: view === t.key ? C.accent : C.text2,
              fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
              transition: "all 0.12s",
            }}
          >
            <t.icon size={12} />
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 8,
                background: t.urgent ? `${C.red}20` : `${C.accent}20`,
                color: t.urgent ? C.red : C.accent,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search (deleted view only) */}
      {view === "deleted" && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or username…"
            style={{
              width: "100%", padding: "9px 12px 9px 32px", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
              borderRadius: 9, color: C.text, fontSize: 12, outline: "none", fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${C.accent}30`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        </div>
      ) : view === "deleted" ? (
        <>
          {filteredDeleted.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
              {search ? `No results for "${search}"` : "No deleted accounts yet"}
            </div>
          ) : (
            filteredDeleted.map(r => (
              <DeletedRow
                key={r.id}
                record={r}
                onPermanentBan={handlePermBan}
                loading={actionLoading}
              />
            ))
          )}
        </>
      ) : (
        <>
          {reapprovals.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
              No rejoin requests
            </div>
          ) : (
            reapprovals.map(r => (
              <ReapprovalRow
                key={r.id}
                req={r}
                onApprove={handleApprove}
                onReject={handleReject}
                onBan={handlePermBan}
                loading={actionLoading}
              />
            ))
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </motion.div>
  );
}
