import React, { useState, memo } from "react";
import { UserMinus, ArrowRight } from "lucide-react";

const TEAM_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#06b6d4","#8b5cf6","#ec4899","#f97316",
  "#84cc16","#a78bfa","#34d399","#fbbf24",
];

const C = {
  card:   "#0d1320",
  border: "rgba(255,255,255,0.06)",
  text:   "#f1f5f9",
  text2:  "rgba(255,255,255,0.45)",
  text3:  "rgba(255,255,255,0.2)",
  empty:  "rgba(255,255,255,0.03)",
};

// ── Avatar ──────────────────────────────────────────────────────────
function Avatar({ src, name, size = 34 }) {
  const [err, setErr] = useState(false);
  const init = (name || "?")[0].toUpperCase();
  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: "#fff",
    }}>{init}</div>
  );
}

// ── Empty Slot ──────────────────────────────────────────────────────
const EmptySlot = memo(function EmptySlot({ team, seat, role, onChangeSeat, teamColor }) {
  const canJoin = role === "participant";
  return (
    <div
      onClick={() => canJoin && onChangeSeat?.(team, seat)}
      title={canJoin ? "Click to take this slot" : undefined}
      style={{
        minHeight: 68, borderRadius: 10,
        border: `1px dashed ${teamColor || "rgba(255,255,255,0.08)"}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: canJoin ? C.empty : "transparent",
        cursor: canJoin ? "pointer" : "default",
        transition: "all 0.15s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { if (canJoin) e.currentTarget.style.borderColor = (teamColor || "#6366f1") + "55"; }}
      onMouseLeave={e => { if (canJoin) e.currentTarget.style.borderColor = (teamColor || "rgba(255,255,255,0.08)") + "22"; }}
    >
      <span style={{ fontSize: 10, color: C.text3, letterSpacing: 0.5 }}>
        {canJoin ? "+ Join" : `S${seat}`}
      </span>
    </div>
  );
});

// ── Player Card (70px) ───────────────────────────────────────────────
const PlayerCard = memo(function PlayerCard({
  player, team, seat, role, currentUserId,
  onSelectPlayer, onKickPlayer, onMovePlayer,
  teamColor,
}) {
  const [hovered, setHovered] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const isMe = player.id === currentUserId;
  const color = teamColor || TEAM_COLORS[(team - 1) % TEAM_COLORS.length];

  const name = player.full_name || player.username || "Player";
  const ffid = player.free_fire_id || "";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMoveMenu(false); }}
      onClick={() => onSelectPlayer?.(player)}
      style={{
        minHeight: 68, borderRadius: 10,
        background: C.card,
        border: `1px solid ${hovered ? color + "35" : C.border}`,
        borderLeft: `3px solid ${player.isReady ? "#10b981" : color}`,
        display: "flex", alignItems: "center",
        padding: "8px 10px 8px 9px",
        gap: 8, cursor: "pointer",
        transition: "all 0.12s",
        position: "relative", overflow: "hidden",
        boxShadow: isMe ? `0 0 14px ${color}22` : "none",
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar src={player.avatar_url} name={name} size={34} />
        {/* Ready dot overlay */}
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 9, height: 9, borderRadius: "50%",
          background: player.isReady ? "#10b981" : "rgba(255,255,255,0.2)",
          border: "1.5px solid #06080f",
          boxShadow: player.isReady ? "0 0 5px #10b981" : "none",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: "16px",
        }}>
          {name}
          {isMe && <span style={{ fontSize: 8, color: color, fontWeight: 800, marginLeft: 4 }}>YOU</span>}
        </div>
        <div style={{
          fontSize: 10, color: C.text2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: "14px",
        }}>
          {ffid || "No FFID"}
        </div>
      </div>

      {/* Team + Seat badge */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{
          fontSize: 9, fontWeight: 800, color: color,
          background: color + "18", border: `1px solid ${color}25`,
          padding: "1px 5px", borderRadius: 4, lineHeight: "14px",
        }}>
          T{team}·S{seat}
        </div>
        <div style={{
          fontSize: 9, color: player.isReady ? "#10b981" : C.text3,
          marginTop: 2, lineHeight: "12px",
          fontWeight: player.isReady ? 700 : 400,
        }}>
          {player.isReady ? "READY" : "—"}
        </div>
      </div>

      {/* Organizer hover overlay */}
      {role === "organizer" && hovered && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(6,8,15,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          borderRadius: 7,
        }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onSelectPlayer?.(player)}
            title="View profile"
            style={ovBtn("rgba(99,102,241,0.15)", "#6366f1")}
          >
            <span style={{ fontSize: 11 }}>👤</span>
          </button>
          <button
            onClick={() => { setShowMoveMenu(!showMoveMenu); }}
            title="Move player"
            style={ovBtn("rgba(245,158,11,0.15)", "#f59e0b")}
          >
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => onKickPlayer?.(player.id)}
            title="Kick player"
            style={ovBtn("rgba(239,68,68,0.15)", "#ef4444")}
          >
            <UserMinus size={12} />
          </button>
        </div>
      )}
    </div>
  );
});

function ovBtn(bg, color) {
  return {
    width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer",
    background: bg, color, display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.1s",
  };
}

// ── Team Section Header ──────────────────────────────────────────────
function TeamHeader({ teamNumber, players, capacity, color }) {
  const filled   = players.filter(Boolean).length;
  const allReady = filled > 0 && players.every(p => !p || p.isReady);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 6, padding: "0 2px",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: allReady ? "#10b981" : color,
        boxShadow: allReady ? "0 0 6px #10b981" : "none",
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: color, letterSpacing: 0.5 }}>
        TEAM {teamNumber}
      </span>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
        {filled}/{capacity}
      </span>
      <div style={{ flex: 1, height: 1, background: color + "20" }} />
      {allReady && <span style={{ fontSize: 8, color: "#10b981", fontWeight: 800 }}>✓ READY</span>}
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────
export default function CompactPlayerGrid({
  teams, tournament, role, currentUserId,
  onSelectPlayer, onKickPlayer, onMovePlayer, onChangeSeat,
}) {
  if (!tournament) return null;

  const { mode, game_type, max_players } = tournament;
  const isSolo = mode === "solo" || game_type === "battle_royale";
  const isCS   = game_type === "cs";

  // All seats flattened for the flat grid
  const allSeats = teams.flatMap(t => t.seats.map(s => ({
    ...s,
    teamNumber: t.teamNumber,
    teamColor:  TEAM_COLORS[(t.teamNumber - 1) % TEAM_COLORS.length],
  })));

  const teamSize = teams[0]?.seats.length || 1;

  // Grid column count for slot grids
  const COLS = isSolo ? 5 : Math.min(teamSize, 5);

  const gridStyle = (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 5,
  });

  // Render a single seat
  const renderSeat = ({ seatNumber, player, teamNumber, teamColor }) => {
    const color = teamColor || TEAM_COLORS[(teamNumber - 1) % TEAM_COLORS.length];
    if (!player) {
      return (
        <EmptySlot
          key={`empty-${teamNumber}-${seatNumber}`}
          team={teamNumber}
          seat={seatNumber}
          role={role}
          onChangeSeat={onChangeSeat}
          teamColor={color}
        />
      );
    }
    return (
      <PlayerCard
        key={player.id}
        player={player}
        team={teamNumber}
        seat={seatNumber}
        role={role}
        currentUserId={currentUserId}
        onSelectPlayer={onSelectPlayer}
        onKickPlayer={onKickPlayer}
        onMovePlayer={onMovePlayer}
        teamColor={color}
      />
    );
  };

  // CS: two-team side-by-side
  if (isCS && teams.length === 2) {
    const [teamA, teamB] = teams;
    const colorA = TEAM_COLORS[0];
    const colorB = TEAM_COLORS[3];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 10, alignItems: "start" }}>
        <div>
          <TeamHeader teamNumber={teamA.teamNumber} players={teamA.seats.map(s => s.player)} capacity={teamA.seats.length} color={colorA} />
          <div style={gridStyle(Math.min(teamA.seats.length, 3))}>
            {teamA.seats.map(s => renderSeat({ ...s, teamNumber: teamA.teamNumber, teamColor: colorA }))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 28 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.15)" }}>VS</span>
        </div>
        <div>
          <TeamHeader teamNumber={teamB.teamNumber} players={teamB.seats.map(s => s.player)} capacity={teamB.seats.length} color={colorB} />
          <div style={gridStyle(Math.min(teamB.seats.length, 3))}>
            {teamB.seats.map(s => renderSeat({ ...s, teamNumber: teamB.teamNumber, teamColor: colorB }))}
          </div>
        </div>
      </div>
    );
  }

  // Solo: flat 5-column grid, no team headers
  if (isSolo) {
    return (
      <div className="cp-solo-grid" style={gridStyle(5)}>
        {allSeats.map(s => renderSeat(s))}
      </div>
    );
  }

  // Team mode: per-team sections
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {teams.map(team => {
        const color = TEAM_COLORS[(team.teamNumber - 1) % TEAM_COLORS.length];
        return (
          <div key={team.teamNumber}>
            <TeamHeader
              teamNumber={team.teamNumber}
              players={team.seats.map(s => s.player)}
              capacity={team.seats.length}
              color={color}
            />
            <div className="cp-team-grid" style={gridStyle(COLS)}>
              {team.seats.map(s => renderSeat({ ...s, teamNumber: team.teamNumber, teamColor: color }))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
