import { useState, useCallback } from "react";
import { Copy, Check, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import OrganizerPanel from "./OrganizerPanel";
import RoomChat from "./RoomChat";

const C = {
  bg:      "#06080f",
  surface: "#0a0e1a",
  card:    "#0d1320",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#6366f1",
  green:   "#10b981",
  amber:   "#f59e0b",
  red:     "#ef4444",
  text:    "#f1f5f9",
  text2:   "rgba(255,255,255,0.5)",
  text3:   "rgba(255,255,255,0.22)",
};

// ── Copy field ───────────────────────────────────────────────────────
function CopyField({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow]     = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const display = secret && !show ? "••••••••" : (value || "—");
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: C.text3, letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{
        display: "flex", alignItems: "center",
        background: C.card, borderRadius: 7,
        border: `1px solid ${C.border}`, overflow: "hidden",
      }}>
        <span style={{
          flex: 1, fontSize: 11, color: value ? C.text : C.text3,
          padding: "6px 9px", fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {display}
        </span>
        {secret && (
          <button onClick={() => setShow(v => !v)}
            style={{ padding: "6px 7px", background: "transparent", border: "none", cursor: "pointer", color: C.text3 }}>
            {show ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        )}
        <button onClick={copy}
          style={{ padding: "6px 9px", background: "transparent", border: "none", cursor: "pointer", color: copied ? C.green : C.text3 }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
}

// ── Status pill ──────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft:                { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.4)" },
  registration_open:    { bg: "rgba(16,185,129,0.12)",  fg: "#10b981" },
  registration_closed:  { bg: "rgba(245,158,11,0.12)",  fg: "#f59e0b" },
  ready_check:          { bg: "rgba(6,182,212,0.12)",   fg: "#06b6d4" },
  lobby_created:        { bg: "rgba(99,102,241,0.12)",  fg: "#6366f1" },
  in_progress:          { bg: "rgba(239,68,68,0.12)",   fg: "#ef4444" },
  live:                 { bg: "rgba(239,68,68,0.12)",   fg: "#ef4444" },
  results:              { bg: "rgba(245,158,11,0.12)",  fg: "#f59e0b" },
  results_pending:      { bg: "rgba(245,158,11,0.12)",  fg: "#f59e0b" },
  finished:             { bg: "rgba(16,185,129,0.12)",  fg: "#10b981" },
  completed:            { bg: "rgba(16,185,129,0.12)",  fg: "#10b981" },
};

function StatusPill({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
      background: s.bg, color: s.fg, letterSpacing: 0.8, textTransform: "uppercase",
    }}>
      {(status || "draft").replace(/_/g, " ")}
    </span>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────
function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: 10, color: C.text2 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: color || C.text }}>{value}</span>
    </div>
  );
}

// ── Room credentials editor (organizer) ──────────────────────────────
function RoomCodeEditor({ tournament, onSave }) {
  const [code, setCode]     = useState(tournament?.room_code || "");
  const [pass, setPass]     = useState(tournament?.room_password || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("tournaments")
      .update({ room_code: code.trim() || null, room_password: pass.trim() || null })
      .eq("id", tournament.id);
    setSaving(false);
    setSaved(true);
    onSave?.();
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = {
    width: "100%", background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 7, color: C.text, fontSize: 11, padding: "6px 9px",
    outline: "none", fontFamily: "monospace",
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: C.text3, marginBottom: 3 }}>ROOM CODE</div>
        <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CIPHER123" style={inp} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: C.text3, marginBottom: 3 }}>ROOM PASSWORD</div>
        <input type="text" value={pass} onChange={e => setPass(e.target.value)} placeholder="Optional" style={inp} />
      </div>
      <button onClick={save} disabled={saving}
        style={{
          width: "100%", padding: "7px", borderRadius: 7, border: "none", cursor: "pointer",
          background: saved ? C.green + "20" : C.accent + "20",
          color: saved ? C.green : C.accent,
          fontSize: 10, fontWeight: 700, transition: "all 0.15s",
        }}>
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Credentials"}
      </button>
    </div>
  );
}

// ── Collapsible section wrapper ──────────────────────────────────────
function Collapse({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: C.text3, letterSpacing: 0.8, textTransform: "uppercase" }}>{title}</span>
        {open ? <ChevronUp size={10} color={C.text3} /> : <ChevronDown size={10} color={C.text3} />}
      </button>
      {open && <div style={{ padding: "2px 12px 12px" }}>{children}</div>}
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────
export default function RoomSidebar({
  tournament, members = [], readyCount, role,
  currentUserReady, onToggleReady, countdown,
  pendingRequests = [], onApprove, onReject,
  onKick, onMovePlayer, onForceReady, onStatusChange, onStartMatch,
  onRemoveNotReady, onCloseRegistration, onGenerateSlots, onLockParticipants, onStartReadyCheck,
  messages, onSendMessage, currentUser,
}) {
  const tStatus = tournament?.status || "draft";
  const isOrg   = role === "organizer";
  const isPart  = role === "participant";

  const allReady = members.length > 0 && readyCount >= members.length;

  const readyPct = members.length > 0 ? (readyCount / members.length) * 100 : 0;

  return (
    <div style={{
      height: "100%", background: C.bg,
      borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Scrollable top section */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Tournament info */}
        <Collapse title="Tournament Info" defaultOpen>
          <StatRow label="Status"   value={<StatusPill status={tStatus} />} />
          <StatRow label="Mode"     value={`${tournament?.mode || "—"} · ${tournament?.game_type || "—"}`} />
          <StatRow label="Players"  value={`${members.length} / ${tournament?.max_players || "?"}`} color={C.accent} />
          <StatRow label="Ready"    value={`${readyCount} / ${members.length}`}  color={allReady ? C.green : C.amber} />
          {tournament?.prize && (
            <StatRow label="Prize"  value={tournament.prize} color={C.amber} />
          )}

          {/* Fill progress */}
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${(members.length / (tournament?.max_players || 1)) * 100}%`, background: C.accent, transition: "width 0.4s" }} />
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${readyPct}%`, background: allReady ? C.green : C.amber, transition: "width 0.4s" }} />
            </div>
          </div>
        </Collapse>

        {/* Room credentials */}
        <Collapse title="Room Credentials">
          {isOrg ? (
            <RoomCodeEditor tournament={tournament} />
          ) : (
            <>
              <CopyField label="ROOM CODE"     value={tournament?.room_code}     />
              <CopyField label="ROOM PASSWORD" value={tournament?.room_password} secret />
            </>
          )}
        </Collapse>

        {/* Participant ready button */}
        {isPart && tStatus === "ready_check" && (
          <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={onToggleReady}
              style={{
                width: "100%", padding: "11px", borderRadius: 9, border: "none", cursor: "pointer",
                background: currentUserReady
                  ? "linear-gradient(135deg, #10b981, #06b6d4)"
                  : "rgba(99,102,241,0.15)",
                color: currentUserReady ? "#000" : C.accent,
                fontSize: 12, fontWeight: 900, letterSpacing: 0.5,
                boxShadow: currentUserReady ? "0 0 20px rgba(16,185,129,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              {currentUserReady ? "✓ READY" : "CLICK TO READY UP"}
            </button>
          </div>
        )}

        {/* Organizer control panel */}
        {isOrg && (
          <div style={{ padding: 10, borderBottom: `1px solid ${C.border}` }}>
            <OrganizerPanel
              tournament={tournament}
              members={members}
              readyCount={readyCount}
              pendingRequests={pendingRequests}
              onApprove={onApprove}
              onReject={onReject}
              onKick={onKick}
              onForceReady={onForceReady}
              onStatusChange={onStatusChange}
              onStartMatch={onStartMatch}
              onRemoveNotReady={onRemoveNotReady}
              onCloseRegistration={onCloseRegistration}
              onGenerateSlots={onGenerateSlots}
              onLockParticipants={onLockParticipants}
              onStartReadyCheck={onStartReadyCheck}
            />
          </div>
        )}

        {/* All-ready banner */}
        {allReady && tStatus === "ready_check" && (
          <div style={{
            margin: "10px 12px", padding: "10px 14px", borderRadius: 9,
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>🎮</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.green }}>ALL PLAYERS READY!</div>
            {isOrg && <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>Start the tournament above</div>}
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.text3, marginBottom: 4, letterSpacing: 0.5 }}>MATCH TIMER</div>
            <div style={{
              fontSize: 28, fontWeight: 900, fontFamily: "monospace",
              color: countdown <= 60 ? C.red : C.text, letterSpacing: 2,
            }}>
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </div>
          </div>
        )}
      </div>

      {/* Chat — fixed 350px at bottom */}
      <div style={{ height: 350, flexShrink: 0, borderTop: `1px solid ${C.border}`, overflow: "hidden" }}>
        <RoomChat
          messages={messages}
          onSendMessage={onSendMessage}
          currentUser={currentUser}
          tournamentId={tournament?.id}
        />
      </div>
    </div>
  );
}
