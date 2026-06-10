import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Menu, X, Users, CheckCircle, Grid, List, Copy, Check, Eye, EyeOff, Shield } from "lucide-react";
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
  registration_closed: { label: "Reg. Closed",         color: "#f59e0b" },
  ready_check:         { label: "Ready Check",         color: "#06b6d4" },
  lobby_created:       { label: "Lobby Ready",         color: "#6366f1" },
  in_progress:         { label: "In Progress",         color: "#ef4444" },
  live:                { label: "Live",                color: "#ef4444" },
  results:             { label: "Results",             color: "#f59e0b" },
  results_pending:     { label: "Results Pending",     color: "#f59e0b" },
  finished:            { label: "Finished",            color: "#10b981" },
  completed:           { label: "Completed",           color: "#10b981" },
};

// ── Mobile credential strip ───────────────────────────────────────────
function MobileCredentials({ tournament }) {
  const [showPass, setShowPass]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [passCopied, setPassCopied] = useState(false);

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text || "").then(() => {
      setter(true);
      setTimeout(() => setter(false), 1500);
    });
  };

  if (!tournament?.room_code && !tournament?.room_password) return null;

  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 14px",
      overflowX: "auto", scrollbarWidth: "none",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      {tournament?.room_code && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase" }}>Code</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#22d3ee", fontFamily: "monospace", letterSpacing: 2 }}>
            {tournament.room_code}
          </span>
          <button onClick={() => copy(tournament.room_code, setCodeCopied)}
            style={{ background: "none", border: "none", cursor: "pointer", color: codeCopied ? "#10b981" : "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
            {codeCopied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      )}
      {tournament?.room_password && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase" }}>Pass</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>
            {showPass ? tournament.room_password : "••••••"}
          </span>
          <button onClick={() => setShowPass(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
            {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button onClick={() => copy(tournament.room_password, setPassCopied)}
            style={{ background: "none", border: "none", cursor: "pointer", color: passCopied ? "#10b981" : "rgba(255,255,255,0.35)", display: "flex", padding: 2 }}>
            {passCopied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      )}
      {tournament?.prize && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.8 }}>Prize</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>{tournament.prize}</span>
        </div>
      )}
    </div>
  );
}

// ── Mobile ready bar ──────────────────────────────────────────────────
function MobileReadyBar({ role, tStatus, currentUserReady, onToggleReady, members, readyCount }) {
  if (role !== "participant" || tStatus !== "ready_check") return null;
  const total    = members.length;
  const allReady = total > 0 && readyCount >= total;
  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(6,8,15,0.98)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: allReady ? "#10b981" : "#06b6d4", letterSpacing: 0.5 }}>
          {allReady ? "✓ ALL READY" : "READY CHECK"}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: allReady ? "#10b981" : "#f59e0b" }}>
          {readyCount}/{total}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", borderRadius: 3, width: `${total > 0 ? (readyCount / total) * 100 : 0}%`, background: allReady ? "#10b981" : "#f59e0b", transition: "width 0.4s" }} />
      </div>
      <button
        onClick={onToggleReady}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
          fontSize: 14, fontWeight: 900, letterSpacing: 0.6,
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
  );
}

export default function TournamentRoom() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [user, setUser]                       = useState(null);
  const [authLoading, setAuthLoading]         = useState(true);
  const [accessChecked, setAccessChecked]     = useState(false);
  const [accessError, setAccessError]         = useState(null);
  const [redirected, setRedirected]           = useState(false);
  const [selectedPlayer, setSelectedPlayer]   = useState(null);
  const [showSubmit, setShowSubmit]           = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [prevStatus, setPrevStatus]           = useState(null);
  const [showStartModal, setShowStartModal]   = useState(false);
  const [mobileSidebar, setMobileSidebar]     = useState(false);
  const [leftTab, setLeftTab]                 = useState("grid");
  const [activeMatch, setActiveMatch]         = useState(null);
  const [endingMatch, setEndingMatch]         = useState(false);

  const {
    tournament, setTournament,
    members, teams,
    realPlayerCount,
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

  // ── Auth + access ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { navigate("/login"); return; }
      setUser(session.user);

      // Check organizer / admin first (they always get in, no seat needed)
      const [{ data: td }, { data: pd }] = await Promise.all([
        supabase.from("tournaments").select("created_by").eq("id", id).single(),
        supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
      ]);

      const isOrg  = td?.created_by === session.user.id;
      const isPriv = ["admin", "super_admin", "founder", "fondateur"].includes(pd?.role);

      if (isOrg || isPriv) {
        if (mounted) { setAccessChecked(true); setAuthLoading(false); }
        return;
      }

      // Regular player: call enter_tournament_room RPC
      // This validates WhatsApp, account status, approval, and auto-assigns a seat.
      const { data: enterResult, error: enterErr } = await supabase.rpc(
        "enter_tournament_room",
        { p_tournament_id: id }
      );

      if (enterErr || !enterResult?.success) {
        const errCode = enterResult?.error;
        if (!mounted) return;

        if (errCode === "whatsapp_not_verified") {
          setAccessError("whatsapp_required");
          setAuthLoading(false);
          return;
        }
        if (errCode === "account_suspended") {
          setAccessError("suspended");
          setAuthLoading(false);
          return;
        }
        if (errCode === "not_approved") {
          // Not approved → send to tournament page
          setRedirected(true);
          navigate(`/tournaments/${id}`);
          return;
        }
        // Unknown error — check if already in room as fallback
        const { data: existingSeat } = await supabase
          .from("room_members").select("id")
          .eq("tournament_id", id).eq("user_id", session.user.id).maybeSingle();
        if (!existingSeat) {
          setRedirected(true);
          navigate(`/tournaments/${id}`);
          return;
        }
      }

      // If newly seated, trigger WhatsApp notification (non-blocking)
      if (enterResult?.newly_seated) {
        supabase.functions.invoke("send-seat-notification", {
          body: {
            user_id:       session.user.id,
            tournament_id: id,
            seat_number:   enterResult.seat_number,
            team_number:   enterResult.team_number,
            type:          "seat_assigned",
          },
        }).catch(() => {});
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
  const isResults        = ["results", "results_pending", "finished", "completed"].includes(tStatus);
  const accentColor      = tournament?.background_color || "#6366f1";

  // ── Loading ───────────────────────────────────────────────────────
  if (authLoading || roomLoading || !accessChecked) {
    // WhatsApp verification required error
    if (accessError === "whatsapp_required") {
      return (
        <div style={{ height: "100vh", background: "linear-gradient(135deg,#06080f 0%,#060a14 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📱</div>
            <h2 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>WhatsApp Verification Required</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>
              You must verify your WhatsApp number before entering a tournament room.
            </p>
            <button
              onClick={() => navigate("/profile?tab=security")}
              style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Verify WhatsApp →
            </button>
            <button
              onClick={() => navigate(-1)}
              style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ height: "100vh", background: "linear-gradient(135deg,#06080f 0%,#09080f 50%,#060a14 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse-ring{0%{transform:scale(1);opacity:0.4}50%{transform:scale(1.15);opacity:0.1}100%{transform:scale(1);opacity:0.4}}`}</style>
        <div style={{ position: "relative", width: 52, height: 52 }}>
          <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px solid rgba(99,102,241,0.15)", animation: "pulse-ring 2s ease infinite" }} />
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.1)", borderTopColor: "#6366f1", animation: "spin 0.9s linear infinite" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Loading Match Center</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>CONNECTING…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "100vh", background: "linear-gradient(135deg,#06080f 0%,#09080f 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚠</div>
        <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
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

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        background: "rgba(6,8,15,0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        padding: "0 14px", gap: 12, zIndex: 10,
        boxShadow: "0 1px 0 rgba(99,102,241,0.08)",
      }}>
        {/* Status dot + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto", minWidth: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusMeta.color, boxShadow: `0 0 7px ${statusMeta.color}`, flexShrink: 0 }} />
          <h1 style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9", margin: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tournament?.name}
          </h1>
          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 6, background: statusMeta.color + "18", color: statusMeta.color, letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0 }}>
            {statusMeta.label}
          </span>
        </div>

        {/* Center stats */}
        <div className="cp-header-center" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, overflow: "hidden" }}>
          {/* Real player count (excludes admins) */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, flexShrink: 0 }}>
            <Users size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ color: "#6366f1", fontWeight: 700 }}>{realPlayerCount}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>/ {tournament?.max_players || "?"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, flexShrink: 0 }}>
            <CheckCircle size={11} color="rgba(255,255,255,0.3)" />
            <span style={{ color: readyCount === realPlayerCount && realPlayerCount > 0 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>{readyCount}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>ready</span>
          </div>
          {countdown !== null && countdown > 0 && isLive && (
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 900, letterSpacing: 2, color: countdown <= 60 ? "#ef4444" : "#f1f5f9", flexShrink: 0 }}>
              {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
            </span>
          )}
          {role === "organizer" && pendingRequests.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#f59e0b", fontWeight: 700, flexShrink: 0 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {pendingRequests.length}
              </span>
              <span className="cp-pending-label">pending</span>
            </div>
          )}
        </div>

        {/* Right: role badge + mobile menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 6, background: role === "organizer" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)", color: role === "organizer" ? "#6366f1" : "rgba(255,255,255,0.3)", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {role}
          </span>
          <button id="mob-menu" onClick={() => setMobileSidebar(true)}
            style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "none", alignItems: "center", justifyContent: "center" }}>
            <Menu size={16} />
          </button>
        </div>
      </div>

      {/* ── Mobile credentials strip ─────────────────────────────── */}
      <div className="cp-mobile-creds">
        <MobileCredentials tournament={tournament} />
      </div>

      {/* ── Main body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: grid / roster */}
        <div style={{ flex: "0 0 75%", display: "flex", flexDirection: "column", overflow: "hidden" }} className="cp-left-panel">

          {/* Tab bar — organizer only */}
          {role === "organizer" ? (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { key: "grid",   label: "Player Grid",    icon: <Grid size={10} /> },
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
              <div style={{ marginLeft: "auto" }}>
                {tStatus === "registration_closed" && leftTab === "grid" && (
                  <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    ⚡ Generate slots from organizer panel →
                  </span>
                )}
                {tStatus === "ready_check" && leftTab === "grid" && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: readyCount >= realPlayerCount && realPlayerCount > 0 ? "#10b981" : "#06b6d4", background: readyCount >= realPlayerCount && realPlayerCount > 0 ? "rgba(16,185,129,0.1)" : "rgba(6,182,212,0.1)" }}>
                    {readyCount >= realPlayerCount && realPlayerCount > 0 ? "✓ All ready" : `${readyCount}/${realPlayerCount} ready`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>Players</span>
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}>
                {realPlayerCount}/{tournament?.max_players || "?"}
              </span>
              {tStatus === "ready_check" && (
                <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: readyCount >= realPlayerCount && realPlayerCount > 0 ? "#10b981" : "#06b6d4", background: readyCount >= realPlayerCount && realPlayerCount > 0 ? "rgba(16,185,129,0.1)" : "rgba(6,182,212,0.1)" }}>
                  {readyCount >= realPlayerCount && realPlayerCount > 0 ? "✓ All ready" : `${readyCount}/${realPlayerCount} ready`}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          {leftTab === "roster" && role === "organizer" ? (
            <div style={{ flex: 1, overflow: "hidden", padding: "12px 14px" }}>
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
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
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

              {isResults && role !== "organizer" && !showSubmit && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 18, textAlign: "center" }}>
                  <button onClick={() => setShowSubmit(true)}
                    style={{ padding: "13px 28px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #06b6d4, #6366f1)", color: "#fff", fontSize: 13, fontWeight: 800, boxShadow: "0 6px 20px rgba(6,182,212,0.3)" }}>
                    📊 SUBMIT RESULT
                  </button>
                </motion.div>
              )}

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
                      if (!window.confirm("End match? Players will have 15 minutes to submit results.")) return;
                      setEndingMatch(true);
                      try {
                        const { data, error: rpcErr } = await supabase.rpc("end_match", {
                          p_tournament_id: id, p_deadline_minutes: 15,
                        });
                        if (rpcErr) throw rpcErr;
                        if (data?.success) setActiveMatch({ id: data.match_id, match_number: data.match_number, deadline: data.deadline });
                      } catch (e) {
                        alert("Failed to end match: " + (e.message || String(e)));
                      } finally { setEndingMatch(false); }
                    }}
                    style={{ padding: "13px 24px", borderRadius: 10, border: "none", cursor: endingMatch ? "not-allowed" : "pointer", opacity: endingMatch ? 0.6 : 1, background: "linear-gradient(135deg, #ef4444, #7c3aed)", color: "#fff", fontSize: 13, fontWeight: 800, boxShadow: "0 6px 20px rgba(239,68,68,0.3)" }}>
                    {endingMatch ? "⏳ Ending…" : "🏁 END MATCH"}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: desktop sidebar */}
        <div id="desk-sidebar" style={{ flex: "0 0 25%", minWidth: 260, maxWidth: 340, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <RoomSidebar {...sidebarProps} />
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileSidebar && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileSidebar(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 90, backdropFilter: "blur(4px)" }}
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(320px, 92vw)", zIndex: 100, display: "flex", flexDirection: "column" }}
              >
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080c18", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, textTransform: "uppercase" }}>Room Panel</span>
                  <button onClick={() => setMobileSidebar(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={15} />
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

      {/* ── Mobile ready bar (fixed bottom) ─────────────────────── */}
      <div className="cp-mobile-ready">
        <MobileReadyBar
          role={role} tStatus={tStatus}
          currentUserReady={currentUserReady}
          onToggleReady={toggleReady}
          members={members} readyCount={readyCount}
        />
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStartModal && (
          <StartMatchModal
            totalPlayers={realPlayerCount}
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
            tournamentId={id} userId={user?.id}
            matchId={activeMatch?.id} deadline={activeMatch?.deadline}
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

      {/* Incoming swap request */}
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
                <button onClick={() => respondToSwap(false)} style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Decline</button>
                <button onClick={() => respondToSwap(true)}  style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>Accept</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {swapRequest && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#0a0e1a", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "9px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, animation: "spin 1.5s linear infinite" }}>🔄</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Waiting for <strong style={{ color: "#fff" }}>{swapRequest.toPlayer?.profiles?.full_name || "Player"}</strong>…</span>
          <button onClick={cancelSwapRequest} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontWeight: 700 }}>CANCEL</button>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .cp-mobile-creds  { display: none !important; }
        .cp-mobile-ready  { display: none !important; }
        @media (max-width: 900px) {
          #desk-sidebar          { display: none !important; }
          #mob-menu              { display: flex !important; }
          .cp-mobile-creds       { display: block !important; }
          .cp-mobile-ready       { display: block !important; }
          .cp-left-panel         { flex: 0 0 100% !important; }
          .cp-solo-grid          { grid-template-columns: repeat(3,1fr) !important; }
          .cp-team-grid          { grid-template-columns: repeat(2,1fr) !important; }
          .cp-pending-label      { display: none; }
          .cp-header-center      { gap: 10px !important; }
        }
        @media (max-width: 520px) {
          .cp-solo-grid  { grid-template-columns: repeat(2,1fr) !important; }
          .cp-header-center { gap: 8px !important; }
        }
        .cp-mobile-creds div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
