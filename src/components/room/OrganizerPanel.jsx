import React, { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, UserMinus, ChevronDown, ChevronUp,
  Users, Clock, Zap, Shield, Play, Square, AlertTriangle,
  RefreshCw, Lock, Unlock, Loader2, SkipForward,
} from "lucide-react";

const C = {
  bg:     "#090d16",
  card:   "#0d1320",
  border: "rgba(255,255,255,0.07)",
  accent: "#6366f1",
  green:  "#10b981",
  red:    "#ef4444",
  amber:  "#f59e0b",
  cyan:   "#06b6d4",
  text:   "#f1f5f9",
  text2:  "rgba(255,255,255,0.5)",
  text3:  "rgba(255,255,255,0.22)",
};

// ── Reusable accordion section ───────────────────────────────────────
function Section({ icon, title, badge, badgeColor = C.accent, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "9px 14px",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon}
          <span style={{ fontSize: 10, fontWeight: 800, color: C.text, letterSpacing: 0.5 }}>{title}</span>
          {badge > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 10,
              background: badgeColor + "22", color: badgeColor, letterSpacing: 0.3,
            }}>{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={11} color={C.text3} /> : <ChevronDown size={11} color={C.text3} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Big action button ────────────────────────────────────────────────
function ActionBtn({ label, sublabel, color, icon, onClick, disabled, glow }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (disabled || loading) return;
    setLoading(true);
    await onClick?.();
    setLoading(false);
  };
  return (
    <button
      onClick={handle}
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "11px 14px",
        borderRadius: 9, border: `1px solid ${color}30`,
        background: disabled ? "rgba(255,255,255,0.03)" : color + "12",
        color: disabled ? C.text3 : color,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.15s",
        boxShadow: glow && !disabled ? `0 0 20px ${color}20` : "none",
        marginBottom: 5,
      }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.background = color + "22"; }}
      onMouseLeave={e => { if (!disabled && !loading) e.currentTarget.style.background = color + "12"; }}
    >
      <div style={{ flexShrink: 0 }}>
        {loading ? <Loader2 size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : icon}
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>{sublabel}</div>}
      </div>
    </button>
  );
}

// ── Pending request row ──────────────────────────────────────────────
const PendingRow = memo(function PendingRow({ req, onApprove, onReject }) {
  const name  = req.profiles?.full_name || req.profiles?.username || "Player";
  const ffid  = req.profiles?.free_fire_id || "—";
  const init  = name[0]?.toUpperCase() || "?";
  const [busy, setBusy] = useState(false);

  const handle = async (fn) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderBottom: `1px solid ${C.border}`,
      opacity: busy ? 0.5 : 1, transition: "opacity 0.15s",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden",
      }}>
        {req.profiles?.avatar_url
          ? <img src={req.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          : init}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontSize: 9, color: C.text3, fontFamily: "monospace" }}>{ffid}</div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={() => handle(() => onApprove(req.user_id))} disabled={busy}
          style={iconBtn(C.green)} title="Accept">
          <CheckCircle size={12} />
        </button>
        <button onClick={() => handle(() => onReject(req.user_id))} disabled={busy}
          style={iconBtn(C.red)} title="Reject">
          <XCircle size={12} />
        </button>
      </div>
    </div>
  );
});

// ── Active participant row ───────────────────────────────────────────
const ParticipantRow = memo(function ParticipantRow({ member, onKick, onForceReady, isReadyCheck }) {
  const name = member.profiles?.full_name || member.profiles?.username || "Player";
  const [confirmKick, setConfirmKick] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 14px", borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: member.is_ready ? C.green : "rgba(255,255,255,0.12)",
        boxShadow: member.is_ready ? `0 0 5px ${C.green}` : "none",
      }} />
      <span style={{ flex: 1, fontSize: 10, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <span style={{ fontSize: 8, color: C.text3, fontFamily: "monospace", flexShrink: 0 }}>
        T{member.team_number}·S{member.seat_number}
      </span>

      {isReadyCheck && !member.is_ready && (
        <button onClick={() => onForceReady?.(member.user_id, true)}
          style={{ ...iconBtn(C.amber), width: 22, height: 22 }} title="Force ready">
          <Zap size={9} />
        </button>
      )}

      {confirmKick ? (
        <div style={{ display: "flex", gap: 3 }}>
          <button onClick={() => { onKick?.(member.user_id); setConfirmKick(false); }}
            style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontWeight: 800 }}>
            Kick
          </button>
          <button onClick={() => setConfirmKick(false)}
            style={{ fontSize: 8, padding: "2px 5px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer" }}>
            ✕
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmKick(true)} style={{ ...iconBtn(C.red), width: 22, height: 22 }} title="Kick">
          <UserMinus size={9} />
        </button>
      )}
    </div>
  );
});

function iconBtn(color) {
  return {
    width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
    background: color + "18", color,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.12s",
  };
}

// ── Ready progress bar ───────────────────────────────────────────────
function ReadyBar({ readyCount, total }) {
  const pct = total > 0 ? (readyCount / total) * 100 : 0;
  const allReady = readyCount >= total && total > 0;
  return (
    <div style={{ padding: "10px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 9, color: allReady ? C.green : C.text2, fontWeight: 700, letterSpacing: 0.5 }}>
          {allReady ? "✓ ALL READY" : "READY CHECK"}
        </span>
        <span style={{ fontSize: 9, color: allReady ? C.green : C.amber, fontWeight: 800 }}>
          {readyCount}/{total}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          style={{ height: "100%", borderRadius: 4, background: allReady ? C.green : C.amber }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── State-aware action definitions ───────────────────────────────────
function getActions(status, members, readyCount, { onStatus, onStartMatch, onRemoveNotReady, onCloseRegistration, onGenerateSlots, onLockParticipants, onStartReadyCheck }) {
  const total     = members.length;
  const allReady  = total > 0 && readyCount >= total;

  switch (status) {
    case "registration_open":
      return [
        {
          label: "Close Registration",
          sublabel: `${total} player${total !== 1 ? "s" : ""} enrolled`,
          color: C.amber,
          icon: <Lock size={13} />,
          fn: onCloseRegistration ?? (() => onStatus("registration_closed")),
        },
      ];

    case "registration_closed":
      return [
        {
          label: "Generate Slots",
          sublabel: "Auto-assign team & seat numbers",
          color: C.accent,
          icon: <RefreshCw size={13} />,
          fn: onGenerateSlots,
        },
        {
          label: "Lock Participants",
          sublabel: "Finalise roster, no more changes",
          color: C.cyan,
          icon: <Lock size={13} />,
          fn: onLockParticipants,
        },
        {
          label: "Start Ready Check",
          sublabel: "Ask all players to confirm ready",
          color: C.green,
          icon: <Play size={13} />,
          fn: onStartReadyCheck ?? (() => onStatus("ready_check")),
          glow: true,
        },
      ];

    case "ready_check":
      return [
        !allReady && {
          label: "Remove Not Ready",
          sublabel: `${total - readyCount} player${total - readyCount !== 1 ? "s" : ""} not ready`,
          color: C.red,
          icon: <UserMinus size={13} />,
          fn: onRemoveNotReady,
        },
        {
          label: "Start Tournament",
          sublabel: allReady ? "All players ready!" : `Waiting for ${total - readyCount} players`,
          color: allReady ? C.green : "rgba(255,255,255,0.2)",
          icon: <Play size={13} />,
          fn: onStartMatch,
          glow: allReady,
          disabled: !allReady,
        },
      ].filter(Boolean);

    case "lobby_created":
      return [
        {
          label: "Start Tournament",
          sublabel: "Lobby is configured and ready",
          color: C.green,
          icon: <Play size={13} />,
          fn: onStartMatch,
          glow: true,
        },
      ];

    case "in_progress":
      return [
        {
          label: "End Match",
          sublabel: "Open result submission for players",
          color: C.red,
          icon: <Square size={13} />,
          fn: () => onStatus("results"),
        },
        {
          label: "Advance Round",
          sublabel: "Move to next bracket round",
          color: C.amber,
          icon: <SkipForward size={13} />,
          fn: () => onStatus("in_progress"),
        },
      ];

    case "results":
      return [
        {
          label: "Mark Finished",
          sublabel: "Finalise tournament & distribute rewards",
          color: C.green,
          icon: <CheckCircle size={13} />,
          fn: () => onStatus("finished"),
        },
      ];

    default:
      return [];
  }
}

// ── Main export ──────────────────────────────────────────────────────
export default function OrganizerPanel({
  tournament, members, readyCount,
  pendingRequests = [],
  onApprove, onReject, onKick, onForceReady,
  onStatusChange, onStartMatch,
  onRemoveNotReady, onCloseRegistration, onGenerateSlots, onLockParticipants, onStartReadyCheck,
}) {
  const tStatus = tournament?.status || "draft";
  const actions = getActions(tStatus, members, readyCount, {
    onStatus:            onStatusChange,
    onStartMatch:        () => onStartMatch?.(),
    onRemoveNotReady,
    onCloseRegistration,
    onGenerateSlots,
    onLockParticipants,
    onStartReadyCheck,
  });

  const isReadyCheck = tStatus === "ready_check";

  return (
    <div style={{
      background: C.bg,
      border: `1px solid rgba(99,102,241,0.2)`,
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "9px 14px",
        background: "rgba(99,102,241,0.08)",
        borderBottom: `1px solid rgba(99,102,241,0.15)`,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <Shield size={11} color={C.accent} />
        <span style={{ fontSize: 10, fontWeight: 900, color: C.accent, letterSpacing: 1, textTransform: "uppercase" }}>
          Organizer Panel
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 8, fontWeight: 700,
          padding: "2px 6px", borderRadius: 4,
          background: "rgba(255,255,255,0.05)", color: C.text3,
          letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          {tStatus.replace(/_/g, " ")}
        </span>
      </div>

      {/* State-aware action buttons */}
      {actions.length > 0 && (
        <div style={{ padding: "10px 14px 6px", borderBottom: `1px solid ${C.border}` }}>
          {actions.map((a, i) => (
            <ActionBtn
              key={i}
              label={a.label}
              sublabel={a.sublabel}
              color={a.color}
              icon={a.icon}
              onClick={a.fn}
              disabled={a.disabled}
              glow={a.glow}
            />
          ))}
        </div>
      )}

      {/* Ready bar (ready_check only) */}
      {isReadyCheck && (
        <ReadyBar readyCount={readyCount} total={members.length} />
      )}

      {/* Pending requests */}
      {["registration_open", "registration_closed"].includes(tStatus) && (
        <Section
          icon={<Clock size={11} color={pendingRequests.length > 0 ? C.amber : C.text3} />}
          title="Pending Requests"
          badge={pendingRequests.length}
          badgeColor={C.amber}
          defaultOpen={pendingRequests.length > 0}
        >
          {pendingRequests.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 10, color: C.text3, textAlign: "center" }}>
              No pending requests
            </div>
          ) : pendingRequests.map(req => (
            <PendingRow
              key={req.id}
              req={req}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </Section>
      )}

      {/* Participants management */}
      <Section
        icon={<Users size={11} color={C.text2} />}
        title={`Players (${members.length})`}
        defaultOpen={isReadyCheck}
      >
        {members.length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: 10, color: C.text3, textAlign: "center" }}>
            No players in room
          </div>
        ) : members.map(m => (
          <ParticipantRow
            key={m.user_id}
            member={m}
            onKick={onKick}
            onForceReady={onForceReady}
            isReadyCheck={isReadyCheck}
          />
        ))}
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
