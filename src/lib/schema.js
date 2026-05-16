// Single source of truth for database field names.
// Any column rename must happen here + in the SQL migration only.
// Import these constants instead of typing column names as strings.

// ── Profiles ────────────────────────────────────────────────────
export const PROFILE = {
  xp:            'xp',           // NOT 'experience'
  level:         'level',
  fairPlayScore: 'fair_play_score',
  isVerified:    'is_verified',
  role:          'role',
};

// ── Wallets / Economy ────────────────────────────────────────────
export const WALLET = {
  balance: 'balance',            // unit: coins
};

export const WALLET_TX_TYPE = {
  credit:         'credit',
  debit:          'debit',
  refund:         'refund',
  prize:          'prize',
  fee:            'fee',
  purchase:       'purchase',
  giftSent:       'gift_sent',
  giftReceived:   'gift_received',
  adminAdjust:    'admin_adjustment',
  adminGrant:     'admin_grant',
  seasonReset:    'season_reset',
  referral:       'referral',
  dailyReward:    'daily_reward',
  missionReward:  'mission_reward',
  reward:         'reward',
};

// ── Tournaments ──────────────────────────────────────────────────
export const TOURNAMENT = {
  prizeCoins:     'prize_coins',    // canonical (phase-a). Do NOT use prize_pool.
  entryFee:       'entry_fee',      // unit: coins
  currentPlayers: 'current_players',
  maxPlayers:     'max_players',
  status:         'status',
};

export const TOURNAMENT_STATUS = {
  draft:            'draft',
  published:        'published',        // visible but not yet accepting registrations
  registrationOpen: 'registration_open', // accepting players
  full:             'full',             // max_players reached
  ready:            'ready',            // room credentials set
  live:             'live',             // match running
  resultsPending:   'results_pending',  // waiting for score submissions
  completed:        'completed',
  archived:         'archived',
  cancelled:        'cancelled',
};

// Statuses where users can register
export const TOURNAMENT_OPEN_STATUSES = [
  TOURNAMENT_STATUS.registrationOpen,
];

// Statuses where a match is running
export const TOURNAMENT_LIVE_STATUSES = [
  TOURNAMENT_STATUS.live,
];

// ── Fair-Play Tiers ──────────────────────────────────────────────
// Score range: 0-200 (baseline 100). Mirrors public.fair_play_tier().
export const FAIR_PLAY_TIER = {
  trusted:    { label: 'Trusted',   min: 160, color: '#22c55e' },
  normal:     { label: 'Normal',    min: 120, color: '#3b82f6' },
  suspicious: { label: 'Suspicious',min:  70, color: '#f59e0b' },
  high_risk:  { label: 'High Risk', min:   0, color: '#ef4444' },
};

export function getFairPlayTier(score) {
  if (score >= 160) return FAIR_PLAY_TIER.trusted;
  if (score >= 120) return FAIR_PLAY_TIER.normal;
  if (score >= 70)  return FAIR_PLAY_TIER.suspicious;
  return FAIR_PLAY_TIER.high_risk;
}

// ── Season Pass ──────────────────────────────────────────────────
export const SEASON_PASS_TIER = {
  coinsReward: 'coins_reward',   // NOT reward_coins
  xpReward:    'xp_reward',      // NOT reward_xp
};

// ── RPC Names ────────────────────────────────────────────────────
// Call these via supabase.rpc(RPC.joinTournament, {...})
export const RPC = {
  joinTournament:            'join_tournament',
  leaveTournament:           'leave_tournament',
  advanceTournamentStatus:   'advance_tournament_status',
  startNewSeason:            'start_new_season',
  applyFairPlayEvent:        'apply_fair_play_event',
  recalculateFairPlayScore:  'recalculate_fair_play_score',
  setUserRole:               'set_user_role',
  banUser:                   'ban_user',
  unbanUser:                 'unban_user',
};

// ── Supabase Storage Buckets ─────────────────────────────────────
// All user-facing images MUST go to Supabase Storage.
// No external CDNs, no Discord links, no kimi.page.
export const STORAGE_BUCKET = {
  avatars:    'avatars',
  banners:    'tournament-banners',
  screenshots:'match-screenshots',
  assets:     'public-assets',
};
