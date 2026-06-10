import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const ADMIN_ROLES = ["admin", "super_admin", "founder", "fondateur", "staff"];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role ?? "");
}

// Find next available slot for organizer-side slot assignment
function findNextSlot(tournament, members) {
  if (!tournament) return { team: 1, seat: 1 };
  const { mode, game_type, cs_format, max_players } = tournament;
  let teamSize, numTeams;
  if (game_type === "cs") {
    numTeams = 2;
    teamSize = cs_format === "1v1" ? 1 : cs_format === "2v2" ? 2 : 4;
  } else {
    teamSize = mode === "squad" ? 4 : mode === "duo" ? 2 : 1;
    numTeams = Math.ceil((max_players || 16) / teamSize);
  }
  for (let t = 1; t <= numTeams; t++) {
    for (let s = 1; s <= teamSize; s++) {
      const occupied = members.some(m => {
        if (m.team_number !== t || m.seat_number !== s) return false;
        return !isAdminRole(m.profiles?.role);
      });
      if (!occupied) return { team: t, seat: s };
    }
  }
  return { team: 1, seat: members.length + 1 };
}

export function useRoomEngine(id, user, authLoading) {
  const [tournament, setTournament]     = useState(null);
  const [members, setMembers]           = useState([]);
  const [pendingRequests, setPending]   = useState([]);
  const [messages, setMessages]         = useState([]);
  const [role, setRole]                 = useState("spectator");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [readyCount, setReadyCount]     = useState(0);
  const [countdown, setCountdown]       = useState(null);
  const [swapRequest, setSwapRequest]   = useState(null);
  const [incomingSwap, setIncomingSwap] = useState(null);
  const retryRef                        = useRef(0);

  // Include role from profiles so we can compute realPlayerCount
  const MEMBER_SELECT = `
    id, user_id, team_number, seat_number, is_ready, created_at,
    profiles!room_members_user_id_fkey (
      full_name, username, free_fire_id, avatar_url, role
    )
  `;

  // Only real players (no admins, no banned/deleted) count
  const realPlayerMembers = members.filter(m => !isAdminRole(m.profiles?.role));
  const realPlayerCount   = realPlayerMembers.length;

  const refreshMembers = useCallback(async () => {
    const { data } = await supabase
      .from("room_members")
      .select(MEMBER_SELECT)
      .eq("tournament_id", id)
      .order("team_number", { ascending: true })
      .order("seat_number",  { ascending: true });
    const all = data || [];
    setMembers(all);
    setReadyCount(all.filter(m => m.is_ready).length);
  }, [id]);

  const refreshPending = useCallback(async () => {
    const { data } = await supabase
      .from("tournament_participants")
      .select(`
        id, user_id, status, created_at,
        profiles!tournament_participants_user_id_fkey (
          full_name, username, free_fire_id, avatar_url
        )
      `)
      .eq("tournament_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setPending(data || []);
  }, [id]);

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !id || !user) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: t, error: tErr } = await supabase
          .from("tournaments").select("*").eq("id", id).single();
        if (tErr) throw tErr;
        setTournament(t);

        if (t.status === "live" && t.end_time) {
          const rem = Math.max(0, Math.floor((new Date(t.end_time) - new Date()) / 1000));
          setCountdown(rem);
          if (rem > 0) {
            let secs = rem;
            const iv = setInterval(() => { secs--; setCountdown(secs); if (secs <= 0) clearInterval(iv); }, 1000);
          }
        }

        const { data: ms, error: msErr } = await supabase
          .from("room_members").select(MEMBER_SELECT).eq("tournament_id", id)
          .order("team_number", { ascending: true }).order("seat_number", { ascending: true });
        if (msErr) throw msErr;
        const all = ms || [];
        setMembers(all);
        setReadyCount(all.filter(m => m.is_ready).length);

        // Determine role
        if (t.created_by === user.id) {
          setRole("organizer");
        } else {
          const { data: p } = await supabase
            .from("profiles").select("role").eq("id", user.id).maybeSingle();
          if (isAdminRole(p?.role)) {
            setRole("organizer");
          } else if (all.some(m => m.user_id === user.id)) {
            setRole("participant");
          } else {
            setRole("spectator");
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (role === "organizer") refreshPending();
  }, [role, refreshPending]);

  // ── Messages ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !id || role === "spectator") return;
    supabase
      .from("room_messages")
      .select(`id, message, created_at, user_id,
        profiles!room_messages_user_id_fkey (full_name, username, avatar_url)
      `)
      .eq("tournament_id", id)
      .order("created_at", { ascending: true })
      .limit(60)
      .then(({ data }) => setMessages(data || []));
  }, [id, role, loading]);

  // ── Realtime subscriptions ────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`room-core-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `tournament_id=eq.${id}` },
        () => refreshMembers()
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments", filter: `id=eq.${id}` },
        async () => {
          const { data } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
          if (data) setTournament(data);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, refreshMembers]);

  useEffect(() => {
    if (!id || role !== "organizer") return;
    const ch = supabase
      .channel(`room-participants-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tournament_participants", filter: `tournament_id=eq.${id}` },
        () => refreshPending()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, role, refreshPending]);

  useEffect(() => {
    if (!id || role === "spectator") return;
    const ch = supabase
      .channel(`room-messages-${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `tournament_id=eq.${id}` },
        async (payload) => {
          const { data: p } = await supabase
            .from("profiles").select("full_name, username, avatar_url").eq("id", payload.new.user_id).single();
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, profiles: p }];
          });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, role]);

  // ── Swap broadcast ────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    const ch = supabase
      .channel(`swap-${id}`)
      .on("broadcast", { event: "swap_request" }, ({ payload }) => {
        const me = members.find(m => m.user_id === user.id);
        if (me && payload.toTeam === me.team_number && payload.toSeat === me.seat_number && payload.fromUserId !== user.id)
          setIncomingSwap(payload);
      })
      .on("broadcast", { event: "swap_cancelled" }, ({ payload }) => {
        setIncomingSwap(prev => prev?.fromUserId === payload.fromUserId ? null : prev);
      })
      .on("broadcast", { event: "swap_response" }, ({ payload }) => {
        if (payload.toUserId !== user.id) return;
        if (payload.accepted) doSwapExecution(payload.fromTeam, payload.fromSeat, payload.toTeam, payload.toSeat);
        else setSwapRequest(null);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id, user, members]);

  // ── Team structure ────────────────────────────────────────────────
  const generateTeamStructure = () => {
    if (!tournament) return [];
    const { mode, max_players, game_type, cs_format } = tournament;
    let teamSize, numTeams;
    if (game_type === "cs") {
      numTeams = 2;
      teamSize = cs_format === "1v1" ? 1 : cs_format === "2v2" ? 2 : 4;
    } else {
      teamSize = mode === "squad" ? 4 : mode === "duo" ? 2 : 1;
      numTeams = Math.ceil((max_players || 16) / teamSize);
    }
    // Only include non-admin players in the grid
    const playerMembers = members.filter(m => !isAdminRole(m.profiles?.role));
    return Array.from({ length: numTeams }, (_, ti) => ({
      teamNumber: ti + 1,
      seats: Array.from({ length: teamSize }, (_, si) => {
        const m = playerMembers.find(m => m.team_number === ti + 1 && m.seat_number === si + 1);
        return {
          seatNumber: si + 1,
          player: m ? {
            id:           m.user_id,
            full_name:    m.profiles?.full_name || m.profiles?.username || "Player",
            free_fire_id: m.profiles?.free_fire_id || "",
            avatar_url:   m.profiles?.avatar_url || null,
            isReady:      m.is_ready || false,
          } : null,
        };
      }),
    }));
  };

  // ── Actions ───────────────────────────────────────────────────────
  const approvePlayer = async (userId) => {
    if (role !== "organizer") return;
    const { data, error } = await supabase.rpc("approve_tournament_participant", {
      p_tournament_id: id,
      p_user_id:       userId,
    });
    if (error || !data?.success) {
      // Fallback: client-side with admin exclusion
      const { team, seat } = findNextSlot(tournament, members);
      await supabase.from("tournament_participants")
        .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
        .eq("tournament_id", id).eq("user_id", userId);
      await supabase.from("room_members").upsert(
        { tournament_id: id, user_id: userId, team_number: team, seat_number: seat, is_ready: false },
        { onConflict: "tournament_id,user_id", ignoreDuplicates: true }
      );
    } else if (data?.success) {
      // Trigger WhatsApp notification (non-blocking)
      supabase.functions.invoke("send-seat-notification", {
        body: {
          user_id:       userId,
          tournament_id: id,
          seat_number:   data.seat_number,
          team_number:   data.team_number,
          type:          "registration_approved",
        },
      }).catch(() => {});
    }
    await Promise.all([refreshMembers(), refreshPending()]);
  };

  const rejectPlayer = async (userId) => {
    if (role !== "organizer") return;
    const { data, error } = await supabase.rpc("reject_tournament_participant", {
      p_tournament_id: id,
      p_user_id:       userId,
    });
    if (error || !data?.success) {
      await supabase.from("tournament_participants")
        .update({ status: "rejected" })
        .eq("tournament_id", id).eq("user_id", userId);
    }
    refreshPending();
  };

  const movePlayer = async (userId, teamNumber, seatNumber) => {
    if (role !== "organizer") return;
    const occupied = members.find(m =>
      m.team_number === teamNumber && m.seat_number === seatNumber && m.user_id !== userId
    );
    if (occupied) { alert("That slot is already taken."); return; }
    const { error } = await supabase.from("room_members")
      .update({ team_number: teamNumber, seat_number: seatNumber })
      .eq("tournament_id", id).eq("user_id", userId);
    if (error) alert("Move failed: " + error.message);
    else refreshMembers();
  };

  const forceReady = async (userId, ready = true) => {
    if (role !== "organizer") return;
    const { error } = await supabase.from("room_members")
      .update({ is_ready: ready }).eq("tournament_id", id).eq("user_id", userId);
    if (!error) refreshMembers();
  };

  const updateTournamentStatus = async (newStatus) => {
    if (role !== "organizer") return;
    const { error } = await supabase.from("tournaments")
      .update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) alert("Status update failed: " + error.message);
    else setTournament(prev => ({ ...prev, status: newStatus }));
  };

  const changeSeat = async (teamNumber, seatNumber) => {
    if (role !== "participant") return;
    const existing = members.find(m => m.team_number === teamNumber && m.seat_number === seatNumber);
    if (existing) { requestSwap(teamNumber, seatNumber, existing); return; }
    const cur = members.find(m => m.user_id === user.id);
    if (!cur) return;
    setMembers(prev => prev.map(m => m.user_id === user.id ? { ...m, team_number: teamNumber, seat_number: seatNumber } : m));
    const { error } = await supabase.from("room_members")
      .update({ team_number: teamNumber, seat_number: seatNumber })
      .eq("tournament_id", id).eq("user_id", user.id);
    if (error) {
      setMembers(prev => prev.map(m => m.user_id === user.id ? cur : m));
      alert("Seat change failed: " + error.message);
    }
  };

  const toggleReady = async () => {
    if (role !== "participant") return;
    const cur = members.find(m => m.user_id === user.id);
    if (!cur) return;
    const next = !cur.is_ready;
    setMembers(prev => prev.map(m => m.user_id === user.id ? { ...m, is_ready: next } : m));
    setReadyCount(prev => next ? prev + 1 : prev - 1);
    const { error } = await supabase.from("room_members")
      .update({ is_ready: next }).eq("tournament_id", id).eq("user_id", user.id);
    if (error) {
      setMembers(prev => prev.map(m => m.user_id === user.id ? cur : m));
      setReadyCount(prev => cur.is_ready ? prev + 1 : prev - 1);
    }
  };

  const sendMessage = async (message) => {
    if (role === "spectator" || !message.trim()) return;
    const temp = {
      id: Date.now(), message: message.trim(),
      created_at: new Date().toISOString(),
      user_id: user.id,
      profiles: { full_name: user.user_metadata?.full_name || "You", avatar_url: null },
    };
    setMessages(prev => [...prev, temp]);
    const { error } = await supabase.from("room_messages")
      .insert([{ tournament_id: id, user_id: user.id, message: message.trim() }]);
    if (error) setMessages(prev => prev.filter(m => m.id !== temp.id));
  };

  const lockRoom = async () => {
    if (role !== "organizer") return;
    const { error } = await supabase.from("tournaments").update({ status: "locked" }).eq("id", id);
    if (!error) setTournament(prev => ({ ...prev, status: "locked" }));
  };

  const startMatch = async (durationMinutes = 20) => {
    if (role !== "organizer") return;
    const now      = new Date();
    const endTime  = new Date(now.getTime() + durationMinutes * 60000);
    const deadline = new Date(endTime.getTime() + 10 * 60000);
    await supabase.from("tournaments").update({
      status:          "live", room_status: "live",
      start_time:      now.toISOString(),
      match_duration:  durationMinutes,
      end_time:        endTime.toISOString(),
      result_deadline: deadline.toISOString(),
    }).eq("id", id);
    setTournament(prev => ({
      ...prev, status: "live", room_status: "live",
      start_time: now.toISOString(), end_time: endTime.toISOString(),
      result_deadline: deadline.toISOString(), match_duration: durationMinutes,
    }));
    let secs = durationMinutes * 60;
    setCountdown(secs);
    const iv = setInterval(() => { secs--; setCountdown(secs); if (secs <= 0) clearInterval(iv); }, 1000);
  };

  const kickPlayer = async (userId) => {
    if (role !== "organizer") return;
    await supabase.from("room_members").delete().eq("tournament_id", id).eq("user_id", userId);
  };

  const closeRegistration  = async () => updateTournamentStatus("registration_closed");

  const generateSlots = async () => {
    if (role !== "organizer" || !tournament) return;
    const { mode, game_type, cs_format, max_players } = tournament;
    let teamSize;
    if (game_type === "cs") {
      teamSize = cs_format === "1v1" ? 1 : cs_format === "2v2" ? 2 : 4;
    } else {
      teamSize = mode === "squad" ? 4 : mode === "duo" ? 2 : 1;
    }
    let slot = 1;
    const updates = [];
    for (const m of members.filter(mem => !isAdminRole(mem.profiles?.role))) {
      const teamNum = Math.ceil(slot / teamSize);
      const seatNum = ((slot - 1) % teamSize) + 1;
      updates.push(
        supabase.from("room_members")
          .update({ team_number: teamNum, seat_number: seatNum })
          .eq("tournament_id", id).eq("user_id", m.user_id)
      );
      slot++;
    }
    await Promise.all(updates);
    refreshMembers();
  };

  const lockParticipants = async () => {
    if (role !== "organizer") return;
    await supabase.from("tournament_participants")
      .update({ status: "locked" }).eq("tournament_id", id).eq("status", "pending");
    refreshPending();
  };

  const startReadyCheck = async () => {
    if (role !== "organizer") return;
    await supabase.from("room_members").update({ is_ready: false }).eq("tournament_id", id);
    await updateTournamentStatus("ready_check");
    refreshMembers();
  };

  const removeNotReady = async () => {
    if (role !== "organizer") return;
    const notReady = members.filter(m => !m.is_ready && !isAdminRole(m.profiles?.role));
    await Promise.all(
      notReady.map(m => supabase.from("room_members").delete().eq("tournament_id", id).eq("user_id", m.user_id))
    );
    refreshMembers();
  };

  // ── Swap helpers ──────────────────────────────────────────────────
  const requestSwap = async (toTeam, toSeat, toPlayer) => {
    if (role !== "participant") return;
    const me = members.find(m => m.user_id === user.id);
    if (!me) return;
    setSwapRequest({ toTeam, toSeat, toPlayer });
    await supabase.channel(`swap-${id}`).send({
      type: "broadcast", event: "swap_request",
      payload: { fromUserId: user.id, fromName: me.profiles?.full_name || "Player", fromTeam: me.team_number, fromSeat: me.seat_number, toTeam, toSeat },
    });
  };

  const cancelSwapRequest = async () => {
    await supabase.channel(`swap-${id}`).send({ type: "broadcast", event: "swap_cancelled", payload: { fromUserId: user.id } });
    setSwapRequest(null);
  };

  const respondToSwap = async (accepted) => {
    if (!incomingSwap) return;
    const me = members.find(m => m.user_id === user.id);
    if (!me) return;
    await supabase.channel(`swap-${id}`).send({
      type: "broadcast", event: "swap_response",
      payload: { accepted, toUserId: incomingSwap.fromUserId, fromTeam: me.team_number, fromSeat: me.seat_number, toTeam: incomingSwap.fromTeam, toSeat: incomingSwap.fromSeat },
    });
    if (accepted) doSwapExecution(me.team_number, me.seat_number, incomingSwap.fromTeam, incomingSwap.fromSeat);
    setIncomingSwap(null);
  };

  const doSwapExecution = async (teamA, seatA, teamB, seatB) => {
    const mA = members.find(m => m.team_number === teamA && m.seat_number === seatA);
    const mB = members.find(m => m.team_number === teamB && m.seat_number === seatB);
    if (!mA || !mB) return;
    await supabase.from("room_members").update({ seat_number: 99 }).eq("tournament_id", id).eq("user_id", mA.user_id);
    await supabase.from("room_members").update({ team_number: teamB, seat_number: seatB }).eq("tournament_id", id).eq("user_id", mA.user_id);
    await supabase.from("room_members").update({ team_number: teamA, seat_number: seatA }).eq("tournament_id", id).eq("user_id", mB.user_id);
    setSwapRequest(null);
  };

  const teams = generateTeamStructure();

  return {
    tournament, setTournament,
    members, teams,
    realPlayerCount,
    pendingRequests,
    messages,
    role,
    loading, error,
    readyCount, countdown,
    swapRequest, incomingSwap,
    approvePlayer, rejectPlayer, movePlayer, forceReady,
    updateTournamentStatus,
    changeSeat, toggleReady,
    sendMessage,
    lockRoom, startMatch, kickPlayer,
    closeRegistration, generateSlots, lockParticipants,
    startReadyCheck, removeNotReady,
    requestSwap, cancelSwapRequest, respondToSwap,
  };
}
