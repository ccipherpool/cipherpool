// src/services/profileService.js
import { supabase } from '../lib/supabase';
import { RPC, PROFILE, getFairPlayTier } from '../lib/schema';

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Attach computed tier so UI doesn't need to recompute
  return {
    ...data,
    fairPlayTier: getFairPlayTier(data[PROFILE.fairPlayScore]),
  };
}

export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return { ...data, fairPlayTier: getFairPlayTier(data[PROFILE.fairPlayScore]) };
}

export async function updateProfile(userId, fields) {
  // Strip columns users must not self-update
  const { role, fair_play_score, is_verified, banned_until, ...safe } = fields;

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLeaderboard({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, xp, level, fair_play_score, is_verified, country')
    .order('xp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data.map(p => ({ ...p, fairPlayTier: getFairPlayTier(p[PROFILE.fairPlayScore]) }));
}

// Admin actions — server-side permission checks inside RPCs
export async function setUserRole(targetUserId, newRole) {
  const { data, error } = await supabase.rpc(RPC.setUserRole, {
    target_user: targetUserId,
    new_role:    newRole,
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function banUser(targetUserId, bannedUntil, bannedBy) {
  const { error } = await supabase.rpc(RPC.banUser, {
    target_user:  targetUserId,
    banned_until: bannedUntil,
    banned_by:    bannedBy,
  });
  if (error) throw error;
}

export async function unbanUser(targetUserId) {
  const { error } = await supabase.rpc(RPC.unbanUser, { target_user: targetUserId });
  if (error) throw error;
}

export async function applyFairPlayEvent(userId, eventType, delta, reason = null, tournamentId = null) {
  const { data, error } = await supabase.rpc(RPC.applyFairPlayEvent, {
    p_user_id:       userId,
    p_event_type:    eventType,
    p_delta:         delta,
    p_reason:        reason,
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function getFairPlayHistory(userId) {
  const { data, error } = await supabase
    .from('fair_play_events')
    .select('id, event_type, delta, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
