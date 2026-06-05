import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import {
  Search, Download, RefreshCw, X, Users, CheckCircle,
  Clock, Shield, UserMinus, MessageSquare, ArrowRight,
  AlertTriangle, Zap, Eye,
} from "lucide-react";

const C = {
  bg:      "#06080f",
  surface: "#0a0e1a",
  card:    "#0d1320",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#6366f1",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  cyan:    "#06b6d4",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.2)",
};

const STATUS_FILTERS = ["all", "ready", "not_ready", "pending", "removed"];

const STATUS_META = {
  approved:   { label: "READY",     color: C.green  },
  pending:    { label: "PENDING",   color: C.amber  },
  rejected:   { label: "REMOVED",  color: C.red    },
  locked:     { label: "LOCKED",   color: C.cyan   },
};

// ── Player row ───────────────────────────────────────────────────────
const PlayerRow = memo(function PlayerRow({
  participant, index, members,
  onKick, onForceReady, onMessage, onProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const member = members.find(m => m.user_id === participant.user_id);

  const name = participant.profiles?.full_name || participant.profiles?.username || "Player";
  const ffid = participant.profiles?.free_fire_id || "—";
  const init = name[0]?.toUpperCase() || "?";

  const isReady   = member?.is_ready || false;
  const teamNum   = member?.team_number;
  const seatNum   = member?.seat_number;
  const slotLabel = teamNum ? `T${teamNum}·S${seatNum}` : "—";

  const statusKey = participant.status || "pending";
  const sm        = STATUS_META[statusKey] || { label: statusKey.toUpperCase(), color: C.text3 };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 14px",
      borderBottom: `1px solid ${C.border}`,
      position: "relative",
      background: menuOpen ? "rgba(255,255,255,0.02)" : "transparent",
      transition: "background 0.1s",
    }}>
      {/* # */}
      <span style={{ width: 22, fontSize: 10, color: C.text3, textAlign: "right", flexShrink: 0, fontFamily: "monospace" }}>
        {index + 1}
      </span>

      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
      }}>
        {participant.profiles?.avatar_url
          ? <img src={participant.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          : init}
      </div>

      {/* Name + FFID */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ fontSize: 9, color: C.text3, fontFamily: "monospace" }}>{ffid}</div>
      </div>

      {/* Slot */}
      <span style={{
        fontSize: 9, fontWeight: 700, flexShrink: 0,
        color: teamNum ? C.accent : C.text3, fontFamily: "monospace",
      }}>
        {slotLabel}
      </span>

      {/* Team */}
      <span style={{ fontSize: 9, color: C.text2, flexShrink: 0, minWidth: 36, textAlign: "center" }}>
        {teamNum ? `Team ${teamNum}` : "—"}
      </span>

      {/* Status */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
        minWidth: 72,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isReady ? C.green : statusKey === "approved" ? C.amber : C.text3,
          boxShadow: isReady ? `0 0 5px ${C.green}` : "none",
        }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: isReady ? C.green : sm.color }}>
          {isReady ? "READY" : sm.label}
        </span>
      </div>

      {/* Actions menu */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            width: 24, height: 24, borderRadius: 6, border: `1px solid ${C.border}`,
            background: "transparent", color: C.text3, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
          }}
        >
          ⋯
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "absolute", right: 0, top: 28, zIndex: 100,
                background: "#0d1320", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "4px", minWidth: 160,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {[
                { label: "View Profile", icon: <Eye size={11} />, fn: () => { onProfile?.(participant); setMenuOpen(false); } },
                { label: "Message",      icon: <MessageSquare size={11} />, fn: () => { onMessage?.(participant); setMenuOpen(false); } },
                { label: "Force Ready",  icon: <Zap size={11} />,   color: C.amber, fn: () => { onForceReady?.(participant.user_id, true); setMenuOpen(false); } },
                { label: "Force Unready",icon: <Zap size={11} />,   color: C.text2, fn: () => { onForceReady?.(participant.user_id, false); setMenuOpen(false); } },
                { label: "Kick",         icon: <UserMinus size={11} />, color: C.red, fn: () => { onKick?.(participant.user_id); setMenuOpen(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.fn}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: "transparent", color: item.color || C.text2,
                    fontSize: 11, fontWeight: 600, textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// ── Column header ────────────────────────────────────────────────────
function ColHeader({ children, width }) {
  return (
    <div style={{ width, flexShrink: 0, fontSize: 8, fontWeight: 800, color: C.text3, letterSpacing: 0.8, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export default function RosterManager({
  tournament, members, onKick, onForceReady,
  onProfile, onMessage, onStartMatch,
  readyCount,
}) {
  const [participants, setParticipants]   = useState([]);
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [snapshotting, setSnapshotting]   = useState(false);
  const [snapshotDone, setSnapshotDone]   = useState(false);

  const fetchParticipants = useCallback(async () => {
    if (!tournament?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_participants")
      .select(`
        id, user_id, status, created_at,
        profiles!tournament_participants_user_id_fkey (
          full_name, username, free_fire_id, avatar_url
        )
      `)
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: true });
    setParticipants(data || []);
    setLoading(false);
  }, [tournament?.id]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  // Realtime updates
  useEffect(() => {
    if (!tournament?.id) return;
    const ch = supabase
      .channel(`roster-${tournament.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tournament_participants", filter: `tournament_id=eq.${tournament.id}` },
        () => fetchParticipants()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [tournament?.id, fetchParticipants]);

  // ── Derived data ───────────────────────────────────────────────
  const total       = participants.length;
  const approved    = participants.filter(p => p.status === "approved" || p.status === "locked").length;
  const readyInRoster = members.filter(m => m.is_ready).length;
  const waitingCount  = members.filter(m => !m.is_ready).length;
  const allReady      = members.length > 0 && readyCount >= members.length;

  const filtered = participants.filter(p => {
    const name = p.profiles?.full_name || p.profiles?.username || "";
    const ffid = p.profiles?.free_fire_id || "";
    const member = members.find(m => m.user_id === p.user_id);

    if (search.trim()) {
      const q = search.toLowerCase();
      if (!name.toLowerCase().includes(q) && !ffid.toLowerCase().includes(q) && !p.user_id.includes(q)) return false;
    }

    switch (filter) {
      case "ready":     return member?.is_ready === true;
      case "not_ready": return p.status === "approved" && !member?.is_ready;
      case "pending":   return p.status === "pending";
      case "removed":   return p.status === "rejected";
      default:          return true;
    }
  });

  // ── Export CSV ────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ["#", "Username", "UserID", "FFID", "Slot", "Team", "Status"],
      ...participants.map((p, i) => {
        const member = members.find(m => m.user_id === p.user_id);
        const name   = p.profiles?.full_name || p.profiles?.username || "Player";
        const ffid   = p.profiles?.free_fire_id || "";
        const slot   = member ? `T${member.team_number}·S${member.seat_number}` : "—";
        const team   = member ? `Team ${member.team_number}` : "—";
        const status = member?.is_ready ? "READY" : (p.status || "pending").toUpperCase();
        return [i + 1, name, p.user_id, ffid, slot, team, status];
      }),
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${tournament?.name || "tournament"}_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Take snapshot ─────────────────────────────────────────────
  const takeSnapshot = async () => {
    setSnapshotting(true);
    const { data, error } = await supabase.rpc("take_roster_snapshot", {
      p_tournament_id: tournament.id,
      p_snapshot_type: "start",
    });
    setSnapshotting(false);
    if (!error && data?.success) {
      setSnapshotDone(true);
      setTimeout(() => setSnapshotDone(false), 3000);
    }
  };

  // Start tournament = snapshot first, then start
  const handleStart = async () => {
    await takeSnapshot();
    onStartMatch?.();
  };

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      height: "100%",
    }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(99,102,241,0.04)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={13} color={C.accent} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.3 }}>
              Tournament Roster
            </span>
            <span style={{ fontSize: 9, color: C.text3 }}>{tournament?.name}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={fetchParticipants} style={topBtn(C.text3)}>
              <RefreshCw size={11} />
            </button>
            <button onClick={exportCSV} style={topBtn(C.cyan)}>
              <Download size={11} />
              <span style={{ fontSize: 9, fontWeight: 700 }}>Export</span>
            </button>
          </div>
        </div>

        {/* Live counters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[
            { label: "Joined",    value: total,          color: C.accent },
            { label: "Ready",     value: readyInRoster,  color: C.green  },
            { label: "Waiting",   value: waitingCount,   color: C.amber  },
            { label: "Removed",   value: participants.filter(p => p.status === "rejected").length, color: C.red },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: C.card, borderRadius: 8, padding: "8px 10px",
              border: `1px solid ${color}18`, textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 8, color: C.text3, fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Ready check validation */}
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 9,
          background: allReady ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.06)",
          border: `1px solid ${allReady ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: allReady ? C.green : C.amber,
              boxShadow: allReady ? `0 0 8px ${C.green}` : "none",
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: allReady ? C.green : C.amber }}>
              {allReady
                ? `✓ ${members.length}/${members.length} Ready — Start Tournament`
                : `⏳ ${readyCount}/${members.length} Ready — Waiting for ${members.length - readyCount} player${members.length - readyCount !== 1 ? "s" : ""}`}
            </span>
          </div>
          <motion.button
            whileHover={allReady ? { scale: 1.02 } : {}}
            whileTap={allReady ? { scale: 0.97 } : {}}
            onClick={allReady ? handleStart : undefined}
            disabled={!allReady || snapshotting}
            style={{
              padding: "6px 14px", borderRadius: 7, border: "none", cursor: allReady ? "pointer" : "not-allowed",
              background: allReady ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(255,255,255,0.04)",
              color: allReady ? "#000" : C.text3,
              fontSize: 10, fontWeight: 900, letterSpacing: 0.5,
              boxShadow: allReady ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
            }}
          >
            {snapshotting ? "📸 Saving…" : snapshotDone ? "✓ Snapshot saved" : "🚀 START TOURNAMENT"}
          </motion.button>
        </div>
      </div>

      {/* ── Search + Filter ──────────────────────────────────── */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search player, FFID, or user ID…"
            style={{
              width: "100%", background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 11, padding: "7px 10px 7px 28px",
              outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}>
              <X size={10} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700,
                background: filter === f ? C.accent : "rgba(255,255,255,0.04)",
                color: filter === f ? "#fff" : C.text3,
                textTransform: "capitalize",
                transition: "all 0.12s",
              }}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table header ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 14px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.015)",
        flexShrink: 0,
      }}>
        <ColHeader width={22}>#</ColHeader>
        <div style={{ width: 32, flexShrink: 0 }} />
        <div style={{ flex: 1 }} />
        <ColHeader width={56}>Slot</ColHeader>
        <ColHeader width={56}>Team</ColHeader>
        <ColHeader width={72}>Status</ColHeader>
        <div style={{ width: 24, flexShrink: 0 }} />
      </div>

      {/* ── Player list ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${C.accent}30`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.text3, fontSize: 12 }}>
            {search ? `No results for "${search}"` : `No ${filter === "all" ? "" : filter.replace("_", " ")} players`}
          </div>
        ) : (
          filtered.map((p, i) => (
            <PlayerRow
              key={p.id}
              participant={p}
              index={i}
              members={members}
              onKick={onKick}
              onForceReady={onForceReady}
              onMessage={onMessage}
              onProfile={onProfile}
            />
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={{
        padding: "8px 14px", borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        background: "rgba(255,255,255,0.01)",
      }}>
        <span style={{ fontSize: 9, color: C.text3 }}>
          Showing {filtered.length} of {total} participants
        </span>
        <span style={{ fontSize: 9, color: C.text3, fontFamily: "monospace" }}>
          {tournament?.id?.slice(0, 8)}…
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function topBtn(color) {
  return {
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 10px", borderRadius: 7,
    border: `1px solid ${C.border}`, background: "transparent",
    color, cursor: "pointer", fontSize: 11, fontWeight: 600,
  };
}
