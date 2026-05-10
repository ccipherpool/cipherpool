-- ═══════════════════════════════════════════════════════════════════
-- CipherPool · Seasons System Schema v1.0
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. SEASONS TABLE
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number       INTEGER UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'scheduled')),
  
  -- Reset Config Toggles
  reset_coins       BOOLEAN DEFAULT false,
  reset_xp          BOOLEAN DEFAULT false,
  reset_stats       BOOLEAN DEFAULT true,
  reset_tournaments BOOLEAN DEFAULT true,
  reset_chat        BOOLEAN DEFAULT true,
  reset_avatars     BOOLEAN DEFAULT false,
  reset_clans       BOOLEAN DEFAULT false,
  
  start_date   TIMESTAMPTZ DEFAULT now(),
  end_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────
-- 2. SEASON SNAPSHOTS
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS season_snapshots (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id   UUID REFERENCES seasons(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  final_rank  INTEGER,
  final_points INTEGER,
  final_level INTEGER,
  final_coins INTEGER,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────
-- 3. SCHEMA UPDATES (Season Tracking)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- ──────────────────────────────────────────────────────────────────
-- 4. SECURITY & RLS
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons_read_all" ON seasons FOR SELECT USING (true);
CREATE POLICY "seasons_write_admin" ON seasons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "snapshots_read_self" ON season_snapshots FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────
-- 5. RPC & AUTOMATION
-- ──────────────────────────────────────────────────────────────────

-- Function to start a new season (Atomic)
CREATE OR REPLACE FUNCTION start_new_season(
  p_name TEXT,
  p_number INTEGER,
  p_reset_coins BOOLEAN,
  p_reset_xp BOOLEAN,
  p_reset_stats BOOLEAN,
  p_reset_tournaments BOOLEAN,
  p_reset_chat BOOLEAN,
  p_reset_avatars BOOLEAN,
  p_reset_clans BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_old_season_id UUID;
  v_new_season_id UUID;
BEGIN
  -- 1. Close current active season
  UPDATE seasons SET status = 'completed', end_date = now() WHERE status = 'active' RETURNING id INTO v_old_season_id;
  
  -- 2. Create new season
  INSERT INTO seasons (name, number, reset_coins, reset_xp, reset_stats, reset_tournaments, reset_chat, reset_avatars, reset_clans)
  VALUES (p_name, p_number, p_reset_coins, p_reset_xp, p_reset_stats, p_reset_tournaments, p_reset_chat, p_reset_avatars, p_reset_clans)
  RETURNING id INTO v_new_season_id;
  
  -- 3. Take snapshots if stats reset
  IF p_reset_stats THEN
    INSERT INTO season_snapshots (season_id, user_id, final_level, final_coins)
    SELECT v_old_season_id, id, level, (SELECT balance FROM wallets WHERE user_id = profiles.id)
    FROM profiles;
  END IF;
  
  -- 4. Perform resets
  IF p_reset_coins THEN
    UPDATE wallets SET balance = 0;
  END IF;
  
  IF p_reset_xp THEN
    UPDATE profiles SET level = 1, experience = 0;
  END IF;
  
  IF p_reset_chat THEN
    DELETE FROM chat_messages WHERE channel = 'global';
  END IF;
  
  RETURN jsonb_build_object('success', true, 'new_season_id', v_new_season_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────
-- 6. PROFILE SCHEMA FIX (400 ERRORS)
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;
