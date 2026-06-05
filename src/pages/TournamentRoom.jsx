import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Menu, X } from "lucide-react";
import { useRoomEngine } from "../hooks/useRoomEngine";
import CompactPlayerGrid from "../components/room/CompactPlayerGrid";
import RoomSidebar from "../components/room/RoomSidebar";
import PlayerProfilePanel from "../components/room/PlayerProfilePanel";
import { AnimatePresence, motion } from "framer-motion";
import SubmitResultPanel from "../components/room/SubmitResultPanel";
import { MatchStartOverlay, SubmitReminder } from "../components/room/MatchInstructions";
import RoomStatusBar from "../components/room/RoomStatusBar";
import StartMatchModal from "../components/room/Startmatchmodal";

export default function TournamentRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser]                     = useState(null);
  const [authLoading, setAuthLoading]       = useState(true);
  const [accessChecked, setAccessChecked]   = useState(false);
  const [redirected, setRedirected]         = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showSubmit, setShowSubmit]         = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [prevStatus, setPrevStatus]         = useState(null);
  const [retryNonce, setRetryNonce]         = useState(0);
  const [showStartModal, setShowStartModal] = useState(false);
  const [mobileSidebar, setMobileSidebar]   = useState(false);

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
    lockRoom, startMatch, kickPlayer,
    requestSwap, cancelSwapRequest, respondToSwap,
  } = useRoomEngine(id, user, authLoading);

  // ── Auth + access check ──────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setAuthLoading(true);
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (!mounted) return;
      if (sessErr || !session) { navigate("/login"); return; }
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

      // Auto-add approved participant to room_members
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
  }, [id, navigate, redirected, retryNonce]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) setUser(session.user);
      else if (event === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Match start instruction overlay
  useEffect(() => {
    const st = tournament?.room_status || tournament?.status;
    if (st === "live" && prevStatus !== "live" && prevStatus !== null) setShowInstructions(true);
    if (st) setPrevStatus(st);
  }, [tournament?.room_status, tournament?.status]);

  const currentMember   = members.find(m => m.user_id === user?.id);
  const currentUserReady = currentMember?.is_ready || false;

  const tStatus   = tournament?.room_status || tournament?.status || "";
  const isLive    = tStatus === "live";
  const isResults = ["results_open","results_pending","finished"].includes(tStatus) || tournament?.status === "finished";

  // ── Loading state ────────────────────────────────────────────────
  if (authLoading || roomLoading || !accessChecked) {
    return (
      <div style={{
        minHeight: "100vh", background: "#06080f",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.15)",
          borderTopColor: "#6366f1",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "monospace" }}>
          Loading tournament room…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "#06080f",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
      }}>
        <p style={{ color: "#ef4444", fontSize: 14 }}>⚠ {error}</p>
        <button
          onClick={() => { setAccessChecked(false); setAuthLoading(true); setRetryNonce(n => n + 1); }}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const accentColor = tournament?.background_color || "#6366f1";

  return (
    <div style={{
      height: "100vh", background: "#06080f", color: "#f4f4f5",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        background: `linear-gradient(135deg, ${accentColor}18, #06080f)`,
        borderBottom: `1px solid ${accentColor}25`,
        display: "flex", alignItems: "center",
        padding: "0 20px", gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tournament?.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 1 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {members.length}/{tournament?.max_players} players
            </span>
            <span style={{ fontSize: 11, color: "#10b981" }}>
              {readyCount} ready
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "1px 7px", borderRadius: 10,
              background: accentColor + "25", color: accentColor,
              letterSpacing: 0.8, textTransform: "uppercase",
            }}>
              {role}
            </span>
          </div>
        </div>

        {/* Live countdown in header */}
        {countdown !== null && countdown > 0 && isLive && (
          <div style={{
            fontFamily: "monospace", fontSize: 18, fontWeight: 900,
            color: "#ef4444", letterSpacing: 2,
            animation: countdown <= 60 ? "pulse 1s infinite" : "none",
          }}>
            {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
          </div>
        )}

        {/* Pending badge for organizer */}
        {role === "organizer" && pendingRequests.length > 0 && (
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 800, color: "#000", flexShrink: 0,
            animation: "bounce 1s infinite",
          }}>
            {pendingRequests.length}
          </div>
        )}

        <button
          onClick={() => setMobileSidebar(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", cursor: "pointer", color: "rgba(255,255,255,0.5)",
          }}
          className="lg:hidden"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* ── Status bar ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <RoomStatusBar
          tournament={tournament}
          role={role}
          onTournamentUpdate={t => setTournament(t)}
        />
      </div>

      {/* ── Main layout ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: compact player grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Grid header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
                Player Grid
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)",
              }}>
                {members.length} / {tournament?.max_players}
              </span>
            </div>
            {readyCount > 0 && (
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>
                {readyCount} ready ✓
              </span>
            )}
          </div>

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
        </div>

        {/* Right: sidebar — fixed on desktop, drawer on mobile */}
        <>
          {/* Desktop sidebar */}
          <div style={{
            width: 300, flexShrink: 0,
            display: "flex", flexDirection: "column",
          }} className="hidden lg:flex">
            <RoomSidebar
              tournament={tournament}
              members={members}
              readyCount={readyCount}
              role={role}
              currentUserReady={currentUserReady}
              onToggleReady={toggleReady}
              countdown={countdown}
              pendingRequests={pendingRequests}
              onApprove={approvePlayer}
              onReject={rejectPlayer}
              onKick={kickPlayer}
              onMovePlayer={movePlayer}
              onForceReady={forceReady}
              onStatusChange={updateTournamentStatus}
              onStartMatch={() => setShowStartModal(true)}
              messages={messages}
              onSendMessage={sendMessage}
              currentUser={user}
            />
          </div>

          {/* Mobile sidebar drawer */}
          <AnimatePresence>
            {mobileSidebar && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileSidebar(false)}
                  style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
                    zIndex: 90, backdropFilter: "blur(4px)",
                  }}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  style={{
                    position: "fixed", right: 0, top: 0, bottom: 0,
                    width: 300, zIndex: 100, display: "flex", flexDirection: "column",
                  }}
                >
                  <div style={{
                    padding: "12px 16px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", background: "#0a0e1a",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>ROOM INFO</span>
                    <button onClick={() => setMobileSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <RoomSidebar
                      tournament={tournament}
                      members={members}
                      readyCount={readyCount}
                      role={role}
                      currentUserReady={currentUserReady}
                      onToggleReady={toggleReady}
                      countdown={countdown}
                      pendingRequests={pendingRequests}
                      onApprove={approvePlayer}
                      onReject={rejectPlayer}
                      onKick={kickPlayer}
                      onMovePlayer={movePlayer}
                      onForceReady={forceReady}
                      onStatusChange={updateTournamentStatus}
                      onStartMatch={() => { setMobileSidebar(false); setShowStartModal(true); }}
                      messages={messages}
                      onSendMessage={sendMessage}
                      currentUser={user}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      </div>

      {/* ── Organizer: End match FAB (when live) ────────────────── */}
      {role === "organizer" && isLive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={async () => {
              if (!window.confirm("End match and open result submission?")) return;
              const { error } = await supabase.from("tournaments")
                .update({ status: "results_pending", room_status: "results_open", match_end_time: new Date().toISOString() })
                .eq("id", id);
              if (error) alert("Error: " + error.message);
            }}
            style={{
              padding: "13px 22px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #ef4444, #7c3aed)",
              color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: 1,
              boxShadow: "0 8px 24px rgba(239,68,68,0.4)",
            }}
          >
            🏁 END MATCH
          </motion.button>
        </motion.div>
      )}

      {/* ── Player: submit result FAB ───────────────────────────── */}
      {role !== "organizer" && isResults && !showSubmit && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowSubmit(true)}
            style={{
              padding: "13px 22px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #06b6d4, #6366f1)",
              color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: 1,
              boxShadow: "0 8px 24px rgba(6,182,212,0.4)",
            }}
          >
            📊 SUBMIT RESULT
          </motion.button>
        </motion.div>
      )}

      {/* ── Modals & overlays ────────────────────────────────────── */}
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
          <MatchStartOverlay
            tournament={tournament}
            onDismiss={() => setShowInstructions(false)}
          />
        )}
      </AnimatePresence>

      {isResults && role !== "organizer" && !showSubmit && (
        <SubmitReminder onSubmit={() => setShowSubmit(true)} />
      )}

      <AnimatePresence>
        {showSubmit && (
          <SubmitResultPanel
            tournamentId={id}
            userId={user?.id}
            onClose={() => setShowSubmit(false)}
          />
        )}
      </AnimatePresence>

      {/* Player profile panel */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfilePanel
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            accentColor={accentColor}
          />
        )}
      </AnimatePresence>

      {/* ── Swap modals ─────────────────────────────────────────── */}
      <AnimatePresence>
        {incomingSwap && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }}
              style={{
                background: "#0a0e1a", borderRadius: 20,
                border: "1px solid rgba(251,191,36,0.3)",
                padding: 32, maxWidth: 360, width: "100%", textAlign: "center",
                boxShadow: "0 0 60px rgba(251,191,36,0.15)",
              }}
            >
              <p style={{ fontSize: 36, marginBottom: 10 }}>🔄</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: 1, marginBottom: 6 }}>SWAP REQUEST</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                <strong style={{ color: "#fbbf24" }}>{incomingSwap.fromName}</strong> wants to swap seats with you.
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 20, fontFamily: "monospace" }}>
                Their seat: Team {incomingSwap.fromTeam} · Slot {incomingSwap.fromSeat}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => respondToSwap(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>
                  ✕ Decline
                </button>
                <button onClick={() => respondToSwap(true)}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#000", fontWeight: 700, cursor: "pointer" }}>
                  ✓ Accept
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {swapRequest && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, background: "#0a0e1a",
          border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12,
          padding: "12px 18px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(99,102,241,0.2)",
        }}>
          <span style={{ fontSize: 18, animation: "spin 1.5s linear infinite" }}>🔄</span>
          <div>
            <p style={{ fontSize: 10, color: "#6366f1", fontWeight: 700, marginBottom: 2 }}>WAITING FOR RESPONSE…</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              Swap requested with <strong style={{ color: "#fff" }}>{swapRequest.toPlayer?.profiles?.full_name || "Player"}</strong>
            </p>
          </div>
          <button onClick={cancelSwapRequest}
            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            CANCEL
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .hidden { display: none !important; }
        @media(min-width:1024px) { .hidden { display: flex !important; } .lg\\:flex { display: flex !important; } .lg\\:hidden { display: none !important; } }
      `}</style>
    </div>
  );
}
