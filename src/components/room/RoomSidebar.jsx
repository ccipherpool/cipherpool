import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Eye, EyeOff, Users, Zap, Trophy } from "lucide-react";
import { supabase } from "../../lib/supabase";
import OrganizerPanel from "./OrganizerPanel";
import RoomChat from "./RoomChat";

const C = {
  bg:      "#06080f",
  surface: "#0d1117",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#6366f1",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  text:    "#f4f4f5",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.25)",
};

// ── Stat chip ──────────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: "10px 12px", borderRadius: 10,
      background: color + "10",
      border: `1px solid ${color}20`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, letterSpacing: 0.5, marginTop: 3, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ── Copy field ────────────────────────────────────────────────────
function CopyField({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(!secret);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "7px 10px",
        border: `1px solid rgba(255,255,255,0.08)`,
      }}>
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: "monospace", letterSpacing: 2,
        }}>
          {show ? value : "•".repeat(value.length)}
        </span>
        {secret && (
          <button onClick={() => setShow(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, display: "flex" }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button onClick={copy} style={{
          background: copied ? C.green + "20" : "rgba(99,102,241,0.12)",
          border: `1px solid ${copied ? C.green + "30" : "rgba(99,102,241,0.2)"}`,
          borderRadius: 6, padding: "4px 8px", cursor: "pointer",
          color: copied ? C.green : C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

// ── Editable room code form (organizer only) ───────────────────────
function RoomCodeEditor({ tournament }) {
  const [code, setCode] = useState(tournament?.room_code || "");
  const [pass, setPass] = useState(tournament?.room_password || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tournament?.room_code)     setCode(tournament.room_code);
    if (tournament?.room_password) setPass(tournament.room_password);
  }, [tournament?.room_code, tournament?.room_password]);

  const save = async () => {
    setSaving(true);
    await supabase.from("tournaments")
      .update({ room_code: code.trim(), room_password: pass.trim() || null })
      .eq("id", tournament.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
    color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "monospace",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>Room ID</div>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 123456789" style={inp} />
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>Password</div>
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Optional" style={inp} />
      </div>
      <button onClick={save} disabled={saving || !code.trim()} style={{
        padding: "8px", borderRadius: 8, border: "none", cursor: saving || !code.trim() ? "not-allowed" : "pointer",
        background: saved ? C.green + "20" : "rgba(99,102,241,0.2)",
        color: saved ? C.green : C.accent,
        fontSize: 11, fontWeight: 700, transition: "all 0.15s",
      }}>
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save Room Code"}
      </button>
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    draft:             { label: "Draft",            color: "#64748b" },
    published:         { label: "Published",        color: "#6366f1" },
    registration_open: { label: "Registration Open",color: "#10b981" },
    locked:            { label: "Locked",           color: "#f59e0b" },
    live:              { label: "Live",             color: "#ef4444" },
    results_pending:   { label: "Results",          color: "#06b6d4" },
    completed:         { label: "Completed",        color: "#10b981" },
    cancelled:         { label: "Cancelled",        color: "#6b7280" },
  };
  const s = map[status] || { label: status, color: "#6b7280" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 12,
      background: s.color + "20", color: s.color,
      border: `1px solid ${s.color}30`,
      letterSpacing: 0.8, textTransform: "uppercase",
    }}>
      {status === "live" && <span style={{ marginRight: 4 }}>●</span>}
      {s.label}
    </span>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────
export default function RoomSidebar({
  tournament, members = [],
  readyCount, role,
  currentUserReady, onToggleReady,
  countdown,
  pendingRequests, onApprove, onReject,
  onKick, onMovePlayer, onForceReady,
  onStatusChange, onStartMatch,
  messages, onSendMessage, currentUser,
}) {
  const [toggling, setToggling] = useState(false);

  const totalCount = members.length;
  const maxPlayers = tournament?.max_players || 0;
  const allReady   = totalCount > 0 && readyCount >= totalCount;
  const fillPct    = maxPlayers > 0 ? Math.min(100, (totalCount / maxPlayers) * 100) : 0;
  const readyPct   = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;

  const isOrg      = role === "organizer";
  const tStatus    = tournament?.room_status || tournament?.status || "draft";
  const isLive     = tStatus === "live";
  const hasRoomCode = tournament?.room_code;

  const handleReady = async () => {
    if (toggling) return;
    setToggling(true);
    try { await onToggleReady?.(); } catch (_) {}
    setToggling(false);
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: C.bg,
      borderLeft: `1px solid ${C.border}`,
    }}>

      {/* ── Tournament info ─────────────────────────────────────── */}
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: "#0a0e1a",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
            {tournament?.name || "Tournament Room"}
          </span>
          <StatusPill status={tournament?.status} />
        </div>

        {/* Mode / map */}
        {(tournament?.mode || tournament?.cs_format || tournament?.game_type) && (
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 10, fontFamily: "monospace" }}>
            {[
              tournament.game_type === "cs" ? "Clash Squad" : "Battle Royale",
              tournament.mode || tournament.cs_format,
              tournament.map_name,
            ].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <StatChip label="Players" value={`${totalCount}/${maxPlayers || "?"}`} color={C.accent} />
          <StatChip label="Ready" value={readyCount} color={allReady ? C.green : totalCount > 0 ? C.amber : C.text3} />
          {tournament?.prize_pool && (
            <StatChip label="Prize" value={`${tournament.prize_pool}CP`} color="#fbbf24" />
          )}
        </div>

        {/* Fill progress */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: C.text3, fontWeight: 700, letterSpacing: 0.5 }}>REGISTRATION</span>
            <span style={{ fontSize: 9, color: C.text3, fontFamily: "monospace" }}>{Math.round(fillPct)}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: `linear-gradient(90deg, ${C.accent}, #818cf8)`, borderRadius: 2 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Ready progress */}
        {totalCount > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: C.text3, fontWeight: 700, letterSpacing: 0.5 }}>READY</span>
              <span style={{ fontSize: 9, color: allReady ? C.green : C.text3, fontFamily: "monospace" }}>{readyCount}/{totalCount}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: allReady ? `linear-gradient(90deg, ${C.green}, #34d399)` : `linear-gradient(90deg, #f59e0b, #fbbf24)`, borderRadius: 2 }}
                animate={{ width: `${readyPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Room code widget */}
        {(hasRoomCode || isOrg) && (
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            background: "rgba(0,212,255,0.03)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#06b6d4", letterSpacing: 0.8, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⚡</span> ROOM CREDENTIALS
            </div>
            {isOrg ? (
              <RoomCodeEditor tournament={tournament} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tournament?.room_code && (
                  <CopyField label="Room ID" value={tournament.room_code} secret={false} />
                )}
                {tournament?.room_password && (
                  <CopyField label="Password" value={tournament.room_password} secret />
                )}
                {!tournament?.room_code && !tournament?.room_password && (
                  <p style={{ fontSize: 11, color: C.text3, textAlign: "center" }}>
                    Room credentials will appear here once set.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Participant: ready button */}
        {role === "participant" && !isLive && (
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button
              onClick={handleReady}
              disabled={toggling}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                cursor: toggling ? "wait" : "pointer",
                background: currentUserReady
                  ? `linear-gradient(135deg, ${C.green}, #059669)`
                  : `linear-gradient(135deg, ${C.accent}, #4f46e5)`,
                color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
                opacity: toggling ? 0.7 : 1,
                boxShadow: currentUserReady ? `0 4px 16px ${C.green}40` : `0 4px 16px ${C.accent}40`,
                transition: "all 0.2s",
              }}
            >
              {toggling ? "…" : currentUserReady ? "✓ READY — Click to Unready" : "⚡ MARK READY"}
            </button>
          </div>
        )}

        {/* Organizer: control panel */}
        {isOrg && (
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <OrganizerPanel
              pendingRequests={pendingRequests || []}
              onApprove={onApprove}
              onReject={onReject}
              members={members}
              onKick={onKick}
              onForceReady={onForceReady}
              tournament={tournament}
              onStatusChange={onStatusChange}
              onStartMatch={onStartMatch}
            />
          </div>
        )}

        {/* Countdown display */}
        {countdown !== null && countdown > 0 && isLive && (
          <div style={{
            margin: "12px 16px",
            padding: "12px",
            borderRadius: 10,
            background: "#ef444410",
            border: "1px solid #ef444430",
            textAlign: "center",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>MATCH ENDS IN</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444", fontFamily: "monospace", letterSpacing: 2 }}>
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </div>
          </div>
        )}

        {/* All-ready banner */}
        {allReady && !isLive && (
          <div style={{
            margin: "12px 16px",
            padding: "10px 12px",
            borderRadius: 10,
            background: C.green + "12",
            border: `1px solid ${C.green}25`,
            textAlign: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              ✓ All players ready
              {isOrg ? " — Start match when ready!" : ""}
            </span>
          </div>
        )}

        {/* Chat — fills remaining space */}
        <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column" }}>
          <RoomChat
            messages={messages || []}
            onSendMessage={onSendMessage}
            currentUser={currentUser}
            role={role}
            roomLocked={false}
            onSelectPlayer={() => {}}
            accentColor={tournament?.background_color}
          />
        </div>
      </div>
    </div>
  );
}
