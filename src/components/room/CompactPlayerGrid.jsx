import React, { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, MoveHorizontal } from "lucide-react";

const TEAM_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#06b6d4","#8b5cf6","#ec4899","#f97316",
  "#84cc16","#a78bfa","#34d399","#fbbf24",
];

// ── Avatar ─────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || "?")[0].toUpperCase();
  if (src && !failed) {
    return (
      <img
        src={src} alt={name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.4), fontWeight: 700, color: "#fff",
    }}>
      {initial}
    </div>
  );
}

// ── Empty Slot ─────────────────────────────────────────────────────
const EmptySlot = memo(function EmptySlot({ seat, team, role, onChangeSeat, teamColor }) {
  const canClick = role === "participant";
  return (
    <div
      onClick={() => canClick && onChangeSeat?.(team, seat)}
      style={{
        height: 80, borderRadius: 10,
        border: "1px dashed rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: canClick ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.01)",
        cursor: canClick ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
        gap: 6,
      }}
      onMouseEnter={e => { if (canClick) { e.currentTarget.style.borderColor = teamColor + "40"; e.currentTarget.style.background = teamColor + "08"; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = canClick ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.01)"; }}
    >
      {canClick ? (
        <>
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1px dashed ${teamColor}60`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: teamColor + "80" }}>+</span>
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Join slot {seat}</span>
        </>
      ) : (
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", fontFamily: "monospace", letterSpacing: 0.5 }}>
          SLOT {seat}
        </span>
      )}
    </div>
  );
});

// ── Player Card ────────────────────────────────────────────────────
const PlayerCard = memo(function PlayerCard({
  player, seatNumber, teamNumber, teamColor,
  isCurrentUser, role, onSelect, onKick, onMove,
  availableSlots,
}) {
  const [showMove, setShowMove] = useState(false);

  const handleClick = useCallback(() => {
    if (!showMove) onSelect?.(player);
  }, [showMove, onSelect, player]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        height: 80, borderRadius: 10, position: "relative",
        background: isCurrentUser
          ? `linear-gradient(135deg, ${teamColor}18, rgba(255,255,255,0.03))`
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${isCurrentUser ? teamColor + "35" : "rgba(255,255,255,0.07)"}`,
        padding: "0 12px",
        display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", overflow: "hidden",
        boxShadow: isCurrentUser ? `0 0 12px ${teamColor}12` : "none",
      }}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Ready border-left indicator */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: player.isReady ? "#10b981" : "rgba(255,255,255,0.06)",
        borderRadius: "10px 0 0 10px",
        transition: "background 0.3s",
        boxShadow: player.isReady ? "2px 0 8px #10b98140" : "none",
      }} />

      {/* Avatar + ready dot */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={player.avatar_url} name={player.full_name} size={36} />
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 11, height: 11, borderRadius: "50%",
          background: player.isReady ? "#10b981" : "#1f2937",
          border: "2px solid #06080f",
          boxShadow: player.isReady ? "0 0 6px #10b981" : "none",
          transition: "all 0.2s",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: "#f4f4f5",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: 110,
          }}>
            {player.full_name || "Player"}
          </span>
          {isCurrentUser && (
            <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: teamColor + "25", color: teamColor, letterSpacing: 0.5, flexShrink: 0 }}>
              YOU
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {player.free_fire_id || "—"}
        </div>
        <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
            color: player.isReady ? "#10b981" : "rgba(255,255,255,0.2)",
          }}>
            {player.isReady ? "● READY" : "○ NOT READY"}
          </span>
        </div>
      </div>

      {/* Seat badge */}
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: teamColor + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: teamColor + "cc",
      }}>
        {seatNumber}
      </div>

      {/* Organizer controls overlay */}
      {role === "organizer" && (
        <AnimatePresence>
          <motion.div
            style={{
              position: "absolute", top: 4, right: 4,
              display: "flex", gap: 4,
            }}
          >
            {onMove && availableSlots?.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowMove(v => !v); }}
                style={{
                  width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                  background: "rgba(99,102,241,0.2)", color: "#6366f1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Move player"
              >
                <MoveHorizontal size={11} />
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); if (window.confirm(`Kick ${player.full_name}?`)) onKick?.(player.id); }}
              style={{
                width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer",
                background: "rgba(239,68,68,0.2)", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title="Kick player"
            >
              <UserMinus size={11} />
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Move dropdown */}
      <AnimatePresence>
        {showMove && role === "organizer" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", top: "100%", right: 0, zIndex: 50,
              background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: 4, minWidth: 140,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", padding: "4px 8px", fontWeight: 700, letterSpacing: 0.5 }}>MOVE TO</p>
            <div style={{ maxHeight: 120, overflowY: "auto" }}>
              {(availableSlots || []).map(slot => (
                <button
                  key={`${slot.team}-${slot.seat}`}
                  onClick={() => { onMove?.(player.id, slot.team, slot.seat); setShowMove(false); }}
                  style={{
                    width: "100%", padding: "5px 8px", border: "none", cursor: "pointer",
                    background: "transparent", color: "rgba(255,255,255,0.7)",
                    fontSize: 11, textAlign: "left", borderRadius: 5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  Team {slot.team} · Slot {slot.seat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ── Team Container ─────────────────────────────────────────────────
function TeamContainer({ team, tournament, role, currentUserId, onSelect, onKick, onMove, onChangeSeat, availableSlots }) {
  const color = TEAM_COLORS[(team.teamNumber - 1) % TEAM_COLORS.length];
  const filled = team.seats.filter(s => s.player).length;
  const total  = team.seats.length;
  const ready  = team.seats.filter(s => s.player?.isReady).length;
  const fillPct = total > 0 ? (filled / total) * 100 : 0;

  const slotsForTeam = (availableSlots || []).filter(s => !(s.team === team.teamNumber));

  return (
    <div style={{
      borderRadius: 14,
      background: "rgba(255,255,255,0.02)",
      border: `1px solid rgba(255,255,255,0.06)`,
      overflow: "hidden",
    }}>
      {/* Team header */}
      <div style={{
        padding: "8px 14px",
        background: color + "10",
        borderBottom: `1px solid ${color}18`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: color, boxShadow: `0 0 8px ${color}`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 800, color,
            letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace",
          }}>
            Team {team.teamNumber}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Ready mini progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ width: `${fillPct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              {filled}/{total}
            </span>
          </div>
          {ready > 0 && (
            <span style={{ fontSize: 9, color: "#10b981", fontFamily: "monospace" }}>
              {ready} ✓
            </span>
          )}
        </div>
      </div>

      {/* Seats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(total, 4)}, 1fr)`,
        gap: 8, padding: 10,
      }}>
        {team.seats.map(seat => (
          seat.player ? (
            <PlayerCard
              key={seat.seatNumber}
              player={seat.player}
              seatNumber={seat.seatNumber}
              teamNumber={team.teamNumber}
              teamColor={color}
              isCurrentUser={seat.player.id === currentUserId}
              role={role}
              onSelect={onSelect}
              onKick={onKick}
              onMove={onMove}
              availableSlots={slotsForTeam}
            />
          ) : (
            <EmptySlot
              key={seat.seatNumber}
              seat={seat.seatNumber}
              team={team.teamNumber}
              role={role}
              teamColor={color}
              onChangeSeat={onChangeSeat}
            />
          )
        ))}
      </div>
    </div>
  );
}

// ── Solo Grid (flat, no team grouping) ────────────────────────────
function SoloGrid({ teams, currentUserId, role, onSelect, onKick, onMove, onChangeSeat }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 8,
    }}>
      {teams.map(team => {
        const seat = team.seats[0];
        const color = TEAM_COLORS[(team.teamNumber - 1) % TEAM_COLORS.length];
        return seat.player ? (
          <PlayerCard
            key={team.teamNumber}
            player={seat.player}
            seatNumber={team.teamNumber}
            teamNumber={team.teamNumber}
            teamColor={color}
            isCurrentUser={seat.player.id === currentUserId}
            role={role}
            onSelect={onSelect}
            onKick={onKick}
            onMove={onMove}
            availableSlots={[]}
          />
        ) : (
          <EmptySlot
            key={team.teamNumber}
            seat={team.teamNumber}
            team={team.teamNumber}
            role={role}
            teamColor={color}
            onChangeSeat={onChangeSeat}
          />
        );
      })}
    </div>
  );
}

// ── CS Layout (2 large teams side by side) ────────────────────────
function CSLayout({ teams, tournament, role, currentUserId, onSelect, onKick, onMove, onChangeSeat }) {
  const [t1, t2] = teams;
  if (!t1) return null;
  const c1 = TEAM_COLORS[0];
  const c2 = TEAM_COLORS[3];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "start" }}>
      {/* Team A */}
      <div>
        <TeamContainer team={t1} tournament={tournament} role={role} currentUserId={currentUserId}
          onSelect={onSelect} onKick={onKick} onMove={onMove} onChangeSeat={onChangeSeat} availableSlots={[]} />
      </div>

      {/* VS divider */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.15)", fontFamily: "monospace", letterSpacing: 1 }}>VS</span>
          <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.07)" }} />
        </div>
      </div>

      {/* Team B */}
      <div>
        {t2 ? (
          <TeamContainer team={t2} tournament={tournament} role={role} currentUserId={currentUserId}
            onSelect={onSelect} onKick={onKick} onMove={onMove} onChangeSeat={onChangeSeat} availableSlots={[]} />
        ) : (
          <div style={{ height: 80, borderRadius: 14, border: "1px dashed rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Team B empty</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────
export default function CompactPlayerGrid({
  teams, tournament, role, currentUserId,
  onSelectPlayer, onKickPlayer, onMovePlayer, onChangeSeat,
}) {
  if (!teams || teams.length === 0) {
    return (
      <div style={{
        minHeight: 280, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 14,
      }}>
        <span style={{ fontSize: 40, opacity: 0.25 }}>🎮</span>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>No players assigned yet</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Players appear here once approved</p>
      </div>
    );
  }

  // Build list of all empty slots for "move" dropdowns
  const availableSlots = teams.flatMap(t =>
    t.seats.filter(s => !s.player).map(s => ({ team: t.teamNumber, seat: s.seatNumber }))
  );

  const isSolo = teams[0]?.seats.length === 1;
  const isCS   = tournament?.game_type === "cs";

  if (isCS && teams.length === 2) {
    return (
      <CSLayout
        teams={teams} tournament={tournament} role={role} currentUserId={currentUserId}
        onSelect={onSelectPlayer} onKick={onKickPlayer} onMove={onMovePlayer} onChangeSeat={onChangeSeat}
      />
    );
  }

  if (isSolo) {
    return (
      <SoloGrid
        teams={teams} currentUserId={currentUserId} role={role}
        onSelect={onSelectPlayer} onKick={onKickPlayer} onMove={onMovePlayer} onChangeSeat={onChangeSeat}
      />
    );
  }

  // Squad / duo: team containers in responsive grid
  const minWidth = teams[0]?.seats.length >= 4 ? 400 : 250;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap: 12,
    }}>
      {teams.map(team => (
        <TeamContainer
          key={team.teamNumber}
          team={team}
          tournament={tournament}
          role={role}
          currentUserId={currentUserId}
          onSelect={onSelectPlayer}
          onKick={onKickPlayer}
          onMove={onMovePlayer}
          onChangeSeat={onChangeSeat}
          availableSlots={availableSlots}
        />
      ))}
    </div>
  );
}
