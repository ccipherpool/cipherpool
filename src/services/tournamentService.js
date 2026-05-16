// src/services/tournamentService.js
// All mutations go through RPCs — never direct inserts on tournament_participants.
// Canonical table: tournament_participants (tournament_players is a view alias).
// Canonical prize column: prize_coins (not prize_pool).

import { supabase } from '../lib/supabase';
import { RPC, TOURNAMENT_STATUS } from '../lib/schema';

// ── Queries ──────────────────────────────────────────────────────

export async function getTournament(tournamentId) {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      creator:profiles!tournaments_created_by_fkey(id, username, full_name, role, avatar_url),
      participants:tournament_participants(
        id, user_id, status, team_name, team_slot, rank, kills, is_ready, joined_at,
        profile:profiles!tournament_participants_user_id_fkey(
          username, full_name, free_fire_id, avatar_url, fair_play_score
        )
      )
    `)
    .eq('id', tournamentId)
    .single();

  if (error) throw error;
  return data;
}

export async function listTournaments({ status, limit = 20, offset = 0 } = {}) {
  let q = supabase
    .from('tournaments')
    .select('id, name, status, mode, entry_fee, prize_coins, max_players, current_players, start_time, banner_url, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getMyTournaments(userId) {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select(`
      status, joined_at,
      tournament:tournaments(id, name, status, mode, entry_fee, prize_coins, start_time)
    `)
    .eq('user_id', userId)
    .in('status', ['approved', 'joined'])
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ── Mutations (all through RPC) ───────────────────────────────────

export async function joinTournament(tournamentId) {
  const { data, error } = await supabase.rpc(RPC.joinTournament, {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function leaveTournament(tournamentId) {
  const { data, error } = await supabase.rpc(RPC.leaveTournament, {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function advanceTournamentStatus(tournamentId, toStatus) {
  const { data, error } = await supabase.rpc(RPC.advanceTournamentStatus, {
    p_tournament_id: tournamentId,
    p_to_status:     toStatus,
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

// Admin: create tournament (founders/admins only — RLS enforced server-side)
export async function createTournament(fields, creatorId) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([{
      ...fields,
      created_by:      creatorId,
      status:          TOURNAMENT_STATUS.draft,
      current_players: 0,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Admin: update room credentials
export async function setRoomCredentials(tournamentId, { roomId, roomPassword }) {
  const { error } = await supabase
    .from('tournaments')
    .update({ room_id: roomId, room_password: roomPassword, updated_at: new Date().toISOString() })
    .eq('id', tournamentId);

  if (error) throw error;
}

// Admin: approve a pending participant
export async function approveParticipant(tournamentId, participantUserId, reviewerId) {
  const { data, error } = await supabase.rpc('approve_tournament_request', {
    p_tournament_id: tournamentId,
    p_user_id:       participantUserId,
    p_reviewer_id:   reviewerId,
  });
  if (error) throw error;
  return data;
}

// Toggle ready state
export async function toggleReady(tournamentId, userId) {
  const { data: current, error: fetchErr } = await supabase
    .from('tournament_participants')
    .select('is_ready')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from('tournament_participants')
    .update({ is_ready: !current.is_ready })
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId);

  if (error) throw error;
  return !current.is_ready;
}
