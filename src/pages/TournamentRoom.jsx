import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Menu, X, Users, CheckCircle, Grid, List, Copy, Check, Eye, EyeOff } from "lucide-react";
import { useRoomEngine } from "../hooks/useRoomEngine";
import CompactPlayerGrid from "../components/room/CompactPlayerGrid";
import RoomSidebar from "../components/room/RoomSidebar";
import RosterManager from "../components/room/RosterManager";
import PlayerProfilePanel from "../components/room/PlayerProfilePanel";
import { AnimatePresence, motion } from "framer-motion";
import SubmitResultPanel from "../components/room/SubmitResultPanel";
import MatchLeaderboard from "../components/room/MatchLeaderboard";
import { MatchStartOverlay } from "../components/room/MatchInstructions";
import StartMatchModal from "../components/room/Startmatchmodal";

const STATUS_META = {
  draft:               { label: "Draft",               color: "#64748b" },
  registration_open:   { label: "Open",                color: "#10b981" },
  registration_closed: { label: "Registration Closed", color: "#f59e0b" },
  ready_check:         { label: "Ready Check",         color: "#06b6d4" },
  lobby_created:       { label: "Lobby Ready",         color: "#6366f1" },
  in_progress:         { label: "In Progress",         color: "#ef4444" },
  live:                { label: "Live",                color: "#ef4444" },
  results:             { label: "Results",             color: "#f59e0b" },
  results_pending:     { label: "Results Pending",     color: "#f59e0b" },
  finished:            { label: "Finished",            color: "#10b981" },
  completed:           { label: "Completed",           color: "#10b981" },
};

// ── Mobile info bar ───────────────────────────────────────────────────
function MobileInfoBar({ tournament, currentUserReady, onToggleReady, tStatus, role }) {
  const [showPass, setShowPass]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text || "").then(() => {
      setter(true);
      setTimeout(() => setter(false), 1500);
    });
  };

  const isPart        = role === "participant";
  const inReadyCheck  = tStatus === "ready_check";
  const mode          = [tournament?.mode, tournament?.game_type].filter(Boolean).join(" · ");

  return (
    <div className="cp-mobile-bar" style={{
      display: "none",
      flexDirection: "column",
      background: "rgba(9,16,31,0.98)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      flexShrink: 0,
    }}>
      {/* Horizontal scroll strip */}
      <div style={{ display: "flex", overflowX: "auto", gap: 8, padding: "10px 14px", scrollbarWidth: "none" }}>

        {/* Mode */}
        {mode && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, textTransform: "uppercase" }}>Mode</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc" }}>{mode}</span>
          </div>
        )}

        {/* Room Code */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", borderRadius: 10, background: tournament?.room_code ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${tournament?.room_code ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.08)"}` }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, textTransform: "uppercase" }}>Code</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: tournament?.room_code ? "#22d3ee" : "rgba(255,255,255,0.2)", fontFamily: "monospace", letterSpacing: 2 }}>
            {tournament?.room_code || "—"}
          </span>
          {tournament?.room_code && (
            <button onClick={() => copy(tournament.room_code, setCodeCopied)} style={{ background: "none", border: "none", cursor: "pointer", color: codeCopied ? "#10b981" : "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
              {codeCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
        </div>

        {/* Password */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", borderRadius: 10, background: tournament?.room_password ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${tournament?.room_password ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}` }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, textTransform: "uppercase" }}>Pass</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: tournament?.room_password ? "#fbbf24" : "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
            {tournament?.room_password ? (showPass ? tournament.room_password : "••••••••") : "—"}
          </span>
          {tournament?.room_password && (
            <>
              <button onClick={() => setShowPass(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
                {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button onClick={() => copy(tournament.room_password, setPassCopied)} style={{ background: "none", border: "none", cursor: "pointer", color: passCopied ? "#10b981" : "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
                {passCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </>
          )}
        </div>

        {/* Prize */}
        {tournament?.prize && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5, textTransform: "uppercase" }}>Prize</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>{tournament.prize}</span>
          </div>
        )}
      </div>

      {/* Ready Up button */}
      {isPart && inReadyCheck && (
        <div style={{ padding: "0 14px 12px" }}>
          <button
            onClick={onToggleReady}
            style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 900, letterSpacing: 0.6,
              background: currentUserReady
                ? "linear-gradient(135deg, #10b981, #06b6d4)"
                : "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              boxShadow: currentUserReady ? "0 4px 18px rgba(16,185,129,0.35)" : "0 4px 18px rgba(99,102,241,0.35)",
              transition: "all 0.2s",
            }}
          >
            {currentUserReady ? "✓ YOU'RE READY!" : "⚡ TAP TO READY UP"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TournamentRoom() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [user, setUser]                       = useState(null);
  const [authLoading, setAuthLoading]         = useState(true);
  const [accessChecked, setAccessChecked]     = useState(false);
  const [redirected, setRedirected]           = useState(false);
  const [selectedPlayer, setSelectedPlayer]   = useState(null);
  const [showSubmit, setShowSubmit]           = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [prevStatus, setPrevStatus]           = useState(null);
  const [showStartModal, setShowStartModal]   = useState(false);
  const [mobileSidebar, setMobileSidebar]     = useState(false);
  const [leftTab, setLeftTab]                 = useState("grid");
  const [activeMatch, setActiveMatch]         = useState(null); // { id, match_number, deadline }
  const [endingMatch, setEndingMatch]         = useState(false);

  const {
    tournament, setTournament,
    members, teams,
    pendingRequests,
    messages,
    role,
    loading: roomLoading, error,
    readyCount, countdown,
    swapRequest, incomingSwap,
    approvePlayer, rejectPlayer, movePlayer, forceReady,
    updateTournamentStatus,
    changeSeat, toggleReady,
    sendMessage,
    startMatch, kickPlayer,
    closeRegistration, generateSlots, lockParticipants,
    startReadyCheck, removeNotReady,
    requestSwap, cancelSwapRequest, respondToSwap,
  } = useRoomEngine(id, user, authLoading);

  // ── Auth + access ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { navigate("/login"); return; }
      setUser(session.user);

      const [{ data: td }, { data: rm }, { data: tp }, { data: pd }] = await Promise.all([
        supabase.from("tournaments").select("created_by").eq("id", id).single(),
        supabase.from("room_members").select("id").eq("tournament_id", id).eq("user_id", session.user.id).maybeSingle(),
        supabase.from("tournament_participants").select("id").eq("tournament_id", id).eq("user_id", session.user.id).eq("status", "approved").maybeSingle(),
        supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
      ]);

      const isOrg  = td?.created_by === session.user.id;
      const isPriv = ["admin","super_admin","founder"].includes(pd?.role);
      const isMem  = !!rm || !!tp;

      if (tp && !rm) {
        await supabase.from("room_members").upsert(
          { tournament_id: id, user_id: session.user.id },
          { onConflict: "tournament_id,user_id", ignoreDuplicates: true }
        );
      }

      if (!isOrg && !isMem && !isPriv && !redirected) {
        setRedirected(true);
        navigate(`/tournaments/${id}`);
        return;
      }

      if (mounted) { setAccessChecked(true); setAuthLoading(false); }
    };
    check();
    return () => { mounted = false; };
  }, [id, navigate, redirected]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) setUser(s.user);
      else if (e === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const st = tournament?.status;
    if ((st === "in_progress" || st === "live") && prevStatus !== st && prevStatus !== null)
      setShowInstructions(true);
    if (st) setPrevStatus(st);
  }, [tournament?.status]);

  const currentMember    = members.find(m => m.user_id === user?.id);
  const currentUserReady = currentMember?.is_ready || false;
  const tStatus          = tournament?.status || "draft";
  const statusMeta       = STATUS_META[tStatus] || STATUS_META.draft;
  const isLive           = tStatus === "in_progress" || tStatus === "live";
  const isResults        = ["results","results_pending","finished","completed"].includes(tStatus);
  const accentColor      = tournament?.background_color || "#6366f1";

  // ── Loading ──────────────────────────────────────────────────────
  if (authLoading || roomLoading || !accessChecked) {
    return (
      <div style={{ height: "100vh", background: "linear-gradient(135deg,#06080f 0%,#09080f 50%,#060a14 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4}50%{transform:scale(1.15);opacity:0.1}100%{transform:scale(1);opacity:0.4} }`}</style>
        <div style={{ position: "relative", width: 52, height: 52 }}>
          <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.15)", animation: "pulse-ring 2s ease infinite" }} />
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.1)", borderTopColor: "#6366f1", animation: "spin 0.9s linear infinite" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Loading Match Center</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>CONNECTING TO ROOM…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100vh", background: "linear-gradient(135deg,#06080f 0%,#09080f 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚠</div>
        <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
          Retry
        </button>
      </div>
    );
  }

  const sidebarProps = {
    tournament, members, readyCount, role,
    currentUserReady, onToggleReady: toggleReady,
    countdown, pendingRequests,
    onApprove: approvePlayer, onReject: rejectPlayer,
    onKick: kickPlayer, onMovePlayer: movePlayer,
    onForceReady: forceReady,
    onStatusChange: updateTournamentStatus,
    onStartMatch: () => setShowStartModal(true),
    onRemoveNotReady: removeNotReady,
    onCloseRegistration: closeRegistration,
    onGenerateSlots: generateSlots,
    onLockParticipants: lockParticipants,
    onStartReadyCheck: startReadyCheck,
    messages, onSendMessage: sendMessage, currentUser: user,
  };

  return (
    <div style={{
      height: "100vh", background: "#06080f", color: "#f1f5f9",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>

      {/* ── Header (48px) ─────────────────────────────────────── */}
      <div style={{
        height: 48, flexShrink: 0,
        background: "rgba(6,8,15,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 14, zIndex: 10,
        boxShadow: "0 1px 0 rgba(99,102,241,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusMeta.color, boxShadow: `0 0 6px ${statusMeta.color}` }} />
          <h1 style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", margin: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tournament?.name}
          </h1>
          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8, background: statusMeta.color + "18", color: statusMeta.color, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0 }}>
            {statusMeta.label}
          </span>
        </div>

        <div className="cp-header-center" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, flexShrink: 0 }}>
            <Users size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ color: "#6366f1", fontWeight: 700 }}>{members.length}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>/ {tournament?.max_players || "?"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, flexShrink: 0 }}>
            <CheckCircle size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ color: readyCount === members.length && members.length > 0 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{readyCount}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>ready</span>
          </div>
          {countdown !== null && countdown > 0 && isLive && (
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 900, letterSpacing: 2, color: countdown <= 60 ? "#ef4444" : "#f1f5f9", flexShrink: 0 }}>
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </span>
          )}
          {role === "organizer" && pendingRequests.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#f59e0b", fontWeight: 700, flexShrink: 0 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1s infinite" }}>
                {pendingRequests.length}
              </span>
              <span className="cp-pending-label">pending</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: role === "organizer" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)", color: role === "organizer" ? "#6366f1" : "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {role}
          </span>
          <button id="mob-menu" onClick={() => setMobileSidebar(true)}
            style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "none", alignItems: "center", justifyContent: "center" }}>
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* ── Mobile info bar ─────────────────────────────────────── */}
      <MobileInfoBar
        tournament={tournament}
        currentUserReady={currentUserReady}
        onToggleReady={toggleReady}
        tStatus={tStatus}
        role={role}
      />

      {/* ── Main body (75 / 25) ─────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: grid / roster */}
        <div style={{ flex: "0 0 75%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tab bar — organizer only */}
          {role === "organizer" ? (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { key: "grid",   label: "Player Grid", icon: <Grid size={10} /> },
                { key: "roster", label: "Roster Manager", icon: <List size={10} /> },
              ].map(t => (
                <button key={t.key} onClick={() => setLeftTab(t.key)} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: leftTab === t.key ? "rgba(99,102,241,0.15)" : "transparent",
                  color: leftTab === t.key ? "#6366f1" : "rgba(255,255,255,0.3)",
                  fontSize: 10, fontWeight: 700,
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
              {/* Right-aligned contextual hint */}
              <div style={{ marginLeft: "auto" }}>
                {tStatus === "registration_closed" && leftTab === "grid" && (
                  <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    ⚡ Use organizer panel to generate slots →
                  </span>
                )}
                {tStatus === "ready_check" && leftTab === "grid" && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: readyCount >= members.length && members.length > 0 ? "#10b981" : "#06b6d4", background: readyCount >= members.length && members.length > 0 ? "rgba(16,185,129,0.1)" : "rgba(6,182,212,0.1)" }}>
                    {readyCount >= members.length && members.length > 0 ? "✓ All ready" : `${readyCount}/${members.length} ready`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Non-organizer: simple header */
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>Players</span>
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                {members.length}/{tournament?.max_players || "?"}
              </span>
              {tStatus === "ready_check" && (
                <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: readyCount >= members.length && members.length > 0 ? "#10b981" : "#06b6d4", background: readyCount >= members.length && members.length > 0 ? "rgba(16,185,129,0.1)" : "rgba(6,182,212,0.1)" }}>
                  {readyCount >= members.length && members.length > 0 ? "✓ All ready" : `${readyCount}/${members.length} ready`}
                </span>
              )}
            </div>
          )}

          {/* Panel content */}
          {leftTab === "roster" && role === "organizer" ? (
            <div style={{ flex: 1, overflow: "hidden", padding: "12px 16px" }}>
              <RosterManager
                tournament={tournament}
                members={members}
                readyCount={readyCount}
                onKick={kickPlayer}
                onForceReady={forceReady}
                onProfile={setSelectedPlayer}
                onMessage={() => {}}
                onStartMatch={() => setShowStartModal(true)}
              />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              <CompactPlayerGrid
                teams={teams}
                tournament={tournament}
                role={role}
                currentUserId={user?.id}
                onSelectPlayer={setSelectedPlayer}
                onKickPlayer={kickPlayer}
                onMovePlayer={movePlayer}
                onChangeSeat={changeSeat}
              />

              {/* In-grid action buttons */}
              {isResults && role !== "organizer" && !showSubmit && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 18, textAlign: "center" }}>
                  <button onClick={() => setShowSubmit(true)}
                    style={{ padding: "12px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #06b6d4, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 800, boxShadow: "0 6px 20px rgba(6,182,212,0.3)" }}>
                    📊 SUBMIT RESULT
                  </button>
                </motion.div>
              )}

              {/* Live leaderboard shown when results are in */}
              {isResults && (
                <div style={{ marginTop: 20 }}>
                  <MatchLeaderboard tournamentId={id} currentUserId={user?.id} />
                </div>
              )}

              {role === "organizer" && isLive && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 18, textAlign: "center" }}>
                  <button
                    disabled={endingMatch}
                    onClick={async () => {
                      if (!window.confirm("End match? Players will have 15 minutes to submit their result screenshot.")) return;
                      setEndingMatch(true);
                      try {
                        const { data, error: rpcErr } = await supabase.rpc("end_match", {
                          p_tournament_id: id,
                          p_deadline_minutes: 15,
                        });
                        if (rpcErr) throw rpcErr;
                        if (data?.success) setActiveMatch({ id: data.match_id, match_number: data.match_number, deadline: data.deadline });
                      } catch (e) {
                        alert("Failed to end match: " + (e.message || String(e)));
                      } finally {
                        setEndingMatch(false);
                      }
                    }}
                    style={{ padding: "12px 24px", borderRadius: 10, border: "none", cursor: endingMatch ? "not-allowed" : "pointer", opacity: endingMatch ? 0.6 : 1, background: "linear-gradient(135deg, #ef4444, #7c3aed)", color: "#fff", fontSize: 13, fontWeight: 800, boxShadow: "0 6px 20px rgba(239,68,68,0.3)" }}>
                    {endingMatch ? "⏳ Ending…" : "🏁 END MATCH"}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: sidebar desktop */}
        <div id="desk-sidebar" style={{ flex: "0 0 25%", minWidth: 260, maxWidth: 340, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <RoomSidebar {...sidebarProps} />
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileSidebar && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileSidebar(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 90, backdropFilter: "blur(4px)" }}
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 300, zIndex: 100, display: "flex", flexDirection: "column" }}
              >
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0e1a", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>ROOM PANEL</span>
                  <button onClick={() => setMobileSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <RoomSidebar {...{ ...sidebarProps, onStartMatch: () => { setMobileSidebar(false); setShowStartModal(true); } }} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStartModal && (
          <StartMatchModal
            totalPlayers={members.length}
            onCancel={() => setShowStartModal(false)}
            onConfirm={dur => { setShowStartModal(false); startMatch(dur); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructions && role !== "organizer" && (
          <MatchStartOverlay tournament={tournament} onDismiss={() => setShowInstructions(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubmit && (
          <SubmitResultPanel
            tournamentId={id}
            userId={user?.id}
            matchId={activeMatch?.id}
            deadline={activeMatch?.deadline}
            matchNumber={activeMatch?.match_number}
            onClose={() => setShowSubmit(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfilePanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} accentColor={accentColor} />
        )}
      </AnimatePresence>

      {/* Incoming swap */}
      <AnimatePresence>
        {incomingSwap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              style={{ background: "#0a0e1a", borderRadius: 16, border: "1px solid rgba(251,191,36,0.3)", padding: 28, maxWidth: 320, width: "100%", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🔄</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 5 }}>SWAP REQUEST</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
                <strong style={{ color: "#fbbf24" }}>{incomingSwap.fromName}</strong> wants to swap seats.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => respondToSwap(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Decline</button>
                <button onClick={() => respondToSwap(true)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Accept</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {swapRequest && (
        <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#0a0e1a", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, animation: "spin 1.5s linear infinite" }}>🔄</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Waiting for <strong style={{ color: "#fff" }}>{swapRequest.toPlayer?.profiles?.full_name || "Player"}</strong>…</span>
          <button onClick={cancelSwapRequest} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontWeight: 700 }}>CANCEL</button>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .cp-mobile-bar { display: none !important; }
        @media (max-width: 900px) {
          #desk-sidebar { display: none !important; }
          #mob-menu { display: flex !important; }
          .cp-mobile-bar { display: flex !important; }
          .cp-solo-grid  { grid-template-columns: repeat(3, 1fr) !important; }
          .cp-team-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .cp-pending-label { display: none; }
        }
        @media (max-width: 520px) {
          .cp-solo-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .cp-header-center { gap: 10px !important; }
        }
        .cp-mobile-bar::-webkit-scrollbar,
        .cp-mobile-bar div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
