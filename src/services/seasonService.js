// src/services/seasonService.js
import { supabase } from '../lib/supabase';
import { RPC } from '../lib/schema';

export async function getActiveSeason() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listSeasons({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, number, name, status, start_date, end_date, description')
    .order('number', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getSeasonLeaderboard(seasonId, { limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('season_snapshots')
    .select(`
      final_rank, final_points, final_level, final_coins,
      profile:profiles!season_snapshots_user_id_fkey(
        id, username, avatar_url, is_verified, fair_play_score
      )
    `)
    .eq('season_id', seasonId)
    .order('final_rank', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

// SuperAdmin only — all guards enforced server-side in the RPC
export async function startNewSeason({
  name,
  number        = null,
  description   = null,
  resetCoins    = false,
  resetXp       = false,
  resetStats    = true,
  resetWins     = true,
  resetAvatars  = false,
  resetChat     = true,
  resetTournaments = true,
  resetClans    = false,
} = {}) {
  const { data, error } = await supabase.rpc(RPC.startNewSeason, {
    p_name:             name,
    p_number:           number,
    p_description:      description,
    p_reset_coins:      resetCoins,
    p_reset_xp:         resetXp,
    p_reset_stats:      resetStats,
    p_reset_wins:       resetWins,
    p_reset_avatars:    resetAvatars,
    p_reset_chat:       resetChat,
    p_reset_tournaments: resetTournaments,
    p_reset_clans:      resetClans,
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function getSeasonAuditLog(seasonId) {
  const { data, error } = await supabase
    .from('season_audit_log')
    .select(`
      id, action, details, created_at,
      actor:profiles!season_audit_log_actor_id_fkey(username, role)
    `)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
