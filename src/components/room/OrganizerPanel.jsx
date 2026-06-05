import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, UserMinus, ChevronDown, ChevronUp,
  Users, Clock, Zap, Shield, Play, Square,
} from "lucide-react";

const C = {
  surface:  "#0d1117",
  border:   "rgba(255,255,255,0.07)",
  accent:   "#6366f1",
  green:    "#10b981",
  red:      "#ef4444",
  amber:    "#f59e0b",
  text:     "#f4f4f5",
  text2:    "rgba(255,255,255,0.5)",
  text3:    "rgba(255,255,255,0.25)",
};

// ── Section wrapper ────────────────────────────────────────────────
function Section({ icon, title, badge, badgeColor, children, defaultOpen = true }) {
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
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 0.3 }}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 10,
              background: (badgeColor || C.accent) + "22",
              color: badgeColor || C.accent,
            }}>
              {badge}
            </span>
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
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pending request row ────────────────────────────────────────────
const PendingRow = memo(function PendingRow({ req, onApprove, onReject, busy }) {
  const name    = req.profiles?.full_name || req.profiles?.username || "Player";
  const ffid    = req.profiles?.free_fire_id || "—";
  const initial = name[0]?.toUpperCase() || "?";
  const [localBusy, setLocalBusy] = useState(false);

  const handle = async (fn) => {
    setLocalBusy(true);
    await fn();
    setLocalBusy(false);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px",
      borderBottom: `1px solid ${C.border}`,
      opacity: localBusy ? 0.5 : 1,
      transition: "opacity 0.15s",
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
      }}>
        {req.profiles?.avatar_url ? (
          <img src={req.profiles.avatar_url} alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : initial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: C.text3, fontFamily: "monospace" }}>{ffid}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <button
          onClick={() => handle(() => onApprove(req.user_id))}
          disabled={localBusy}
          title="Accept"
          style={{
            width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
            background: C.green + "20", color: C.green,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.green + "35"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.green + "20"; }}
        >
          <CheckCircle size={13} />
        </button>
        <button
          onClick={() => handle(() => onReject(req.user_id))}
          disabled={localBusy}
          title="Reject"
          style={{
            width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
            background: C.red + "20", color: C.red,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.red + "35"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.red + "20"; }}
        >
          <XCircle size={13} />
        </button>
      </div>
    </div>
  );
});

// ── Player management row ──────────────────────────────────────────
const PlayerRow = memo(function PlayerRow({ member, onKick, onForceReady }) {
  const name = member.profiles?.full_name || member.profiles?.username || "Player";
  const [confirm, setConfirm] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Ready dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: member.is_ready ? C.green : "rgba(255,255,255,0.15)",
        boxShadow: member.is_ready ? `0 0 5px ${C.green}` : "none",
        transition: "all 0.2s",
      }} />

      {/* Name */}
      <span style={{
        flex: 1, fontSize: 11, color: C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
      </span>

      {/* Slot */}
      <span style={{ fontSize: 9, color: C.text3, fontFamily: "monospace", flexShrink: 0 }}>
        T{member.team_number}·{member.seat_number}
      </span>

      {/* Force ready toggle */}
      <button
        onClick={() => onForceReady?.(member.user_id, !member.is_ready)}
        title={member.is_ready ? "Unready" : "Force ready"}
        style={{
          width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
          background: member.is_ready ? C.green + "20" : "rgba(255,255,255,0.06)",
          color: member.is_ready ? C.green : C.text3,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, flexShrink: 0,
        }}
      >
        {member.is_ready ? "✓" : "○"}
      </button>

      {/* Kick */}
      {confirm ? (
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <button onClick={() => { onKick?.(member.user_id); setConfirm(false); }}
            style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Kick
          </button>
          <button onClick={() => setConfirm(false)}
            style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, cursor: "pointer" }}>
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          title="Kick player"
          style={{
            width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
            background: C.red + "15", color: C.red,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <UserMinus size={10} />
        </button>
      )}
    </div>
  );
});

// ── Status control buttons ─────────────────────────────────────────
const STATUS_TRANSITIONS = {
  draft:             [{ label: "Open Registration", next: "registration_open", color: "#6366f1", icon: "🔓" }],
  published:         [{ label: "Open Registration", next: "registration_open", color: "#6366f1", icon: "🔓" }],
  registration_open: [
    { label: "Close Registration", next: "published",          color: "#f59e0b", icon: "🔒" },
    { label: "Start Tournament",   next: "live",               color: "#10b981", icon: "▶" },
  ],
  ready:             [{ label: "Start Tournament",   next: "live",               color: "#10b981", icon: "▶" }],
  live:              [{ label: "End Tournament",     next: "results_pending",    color: "#ef4444", icon: "🏁" }],
  results_pending:   [{ label: "Mark Completed",    next: "completed",          color: "#10b981", icon: "✓" }],
};

// ── Main export ────────────────────────────────────────────────────
export default function OrganizerPanel({
  pendingRequests, onApprove, onReject,
  members, onKick, onForceReady,
  tournament, onStatusChange, onStartMatch,
}) {
  const tStatus  = tournament?.status || "draft";
  const controls = STATUS_TRANSITIONS[tStatus] || [];

  return (
    <div style={{
      background: "#090d16",
      border: `1px solid rgba(99,102,241,0.18)`,
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        background: "rgba(99,102,241,0.1)",
        borderBottom: `1px solid rgba(99,102,241,0.18)`,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <Shield size={12} color={C.accent} />
        <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: 1, textTransform: "uppercase" }}>
          Organizer Panel
        </span>
      </div>

      {/* Pending requests */}
      <Section
        icon={<Clock size={12} color={pendingRequests.length > 0 ? C.amber : C.text3} />}
        title="Pending Requests"
        badge={pendingRequests.length}
        badgeColor={C.amber}
        defaultOpen={pendingRequests.length > 0}
      >
        {pendingRequests.length === 0 ? (
          <div style={{ padding: "14px", textAlign: "center", color: C.text3, fontSize: 11 }}>
            No pending requests
          </div>
        ) : (
          pendingRequests.map(req => (
            <PendingRow
              key={req.id}
              req={req}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))
        )}
      </Section>

      {/* Players management */}
      <Section
        icon={<Users size={12} color={C.text2} />}
        title={`Players (${members.length})`}
        defaultOpen={false}
      >
        {members.length === 0 ? (
          <div style={{ padding: "14px", textAlign: "center", color: C.text3, fontSize: 11 }}>
            No players in room
          </div>
        ) : (
          members.map(m => (
            <PlayerRow
              key={m.user_id}
              member={m}
              onKick={onKick}
              onForceReady={onForceReady}
            />
          ))
        )}
      </Section>

      {/* Tournament controls */}
      <Section
        icon={<Zap size={12} color={C.green} />}
        title="Controls"
        defaultOpen
      >
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
          {/* Dynamic status transitions */}
          {controls.map(ctrl => (
            <button
              key={ctrl.next}
              onClick={() => {
                if (ctrl.next === "live") {
                  onStartMatch?.();
                } else {
                  onStatusChange?.(ctrl.next);
                }
              }}
              style={{
                padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: ctrl.color + "18",
                color: ctrl.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                textAlign: "left", display: "flex", alignItems: "center", gap: 7,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = ctrl.color + "30"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ctrl.color + "18"; }}
            >
              <span>{ctrl.icon}</span>
              {ctrl.label}
            </button>
          ))}

          {/* Always show start match button for organizer when live */}
          {tStatus === "live" && (
            <button
              onClick={() => onStatusChange?.("completed")}
              style={{
                padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: C.red + "18", color: C.red,
                fontSize: 11, fontWeight: 700, textAlign: "left",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <Square size={11} /> End Match
            </button>
          )}

          {controls.length === 0 && tStatus !== "live" && (
            <p style={{ fontSize: 11, color: C.text3, textAlign: "center" }}>
              No actions available
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
