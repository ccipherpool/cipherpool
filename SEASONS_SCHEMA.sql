-- ═══════════════════════════════════════════════════════════════════
-- CIPHERPOOL — SEASONS SYSTEM
-- Run had script kaml f Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1️⃣ SEASONS TABLE — la table principale
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number          int  NOT NULL UNIQUE,            -- Saison 1, 2, 3...
  name            text NOT NULL,                   -- "Spring Cup 2026"
  description     text,
  status          text NOT NULL DEFAULT 'upcoming', -- upcoming | active | ended
  starts_at       timestamptz NOT NULL DEFAULT now(),
  ends_at         timestamptz,
  banner_url      text,
  theme_color     text DEFAULT '#10b981',
  -- Reset settings: chno y-tmsh mli saison jdida tbda
  reset_coins     boolean DEFAULT true,
  reset_xp        boolean DEFAULT true,
  reset_wins      boolean DEFAULT true,
  reset_avatars   boolean DEFAULT false,
  reset_chat      boolean DEFAULT true,
  reset_tournaments boolean DEFAULT true,
  reset_clans     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  created_by      uuid REFERENCES profiles(id),
  ended_at        timestamptz,
  ended_by        uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_number ON seasons(number);

-- Constraint: ghir wahda active à la fois
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_season
  ON seasons (status) WHERE status = 'active';


-- ───────────────────────────────────────────────────────────────────
-- 2️⃣ SEASON_SNAPSHOTS — Sauvegarde stats avant reset
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS season_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id   uuid REFERENCES seasons(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  coins       int DEFAULT 0,
  xp          int DEFAULT 0,
  wins        int DEFAULT 0,
  kills       int DEFAULT 0,
  points      int DEFAULT 0,
  rank        int,                  -- position f leaderboard final
  data        jsonb DEFAULT '{}',   -- autres stats
  created_at  timestamptz DEFAULT now(),
  UNIQUE(season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_season ON season_snapshots(season_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON season_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_rank ON season_snapshots(season_id, rank);


-- ───────────────────────────────────────────────────────────────────
-- 3️⃣ Z3id season_id 3la tables principales
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE tournaments         ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id);
ALTER TABLE chat_messages       ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id);

-- Bach n-trackiw match results par saison
ALTER TABLE match_results       ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id);

CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_season   ON wallet_transactions(season_id);
CREATE INDEX IF NOT EXISTS idx_chat_season        ON chat_messages(season_id);


-- ───────────────────────────────────────────────────────────────────
-- 4️⃣ HELPER : get current active season
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_active_season()
RETURNS uuid AS $$
  SELECT id FROM seasons WHERE status = 'active' LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ───────────────────────────────────────────────────────────────────
-- 5️⃣ RPC : start_new_season — bdé saison jdida (super admin only)
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_new_season(
  p_name text,
  p_description text DEFAULT NULL,
  p_reset_coins boolean DEFAULT true,
  p_reset_xp boolean DEFAULT true,
  p_reset_wins boolean DEFAULT true,
  p_reset_avatars boolean DEFAULT false,
  p_reset_chat boolean DEFAULT true,
  p_reset_tournaments boolean DEFAULT true,
  p_reset_clans boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_role text;
  v_user_id uuid;
  v_old_season_id uuid;
  v_new_season_id uuid;
  v_next_number int;
BEGIN
  -- Permission check
  v_user_id := auth.uid();
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;
  IF v_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admin can start a season');
  END IF;

  -- 1. End current active season
  SELECT id INTO v_old_season_id FROM seasons WHERE status = 'active';
  IF v_old_season_id IS NOT NULL THEN
    -- Snapshot all users' stats
    INSERT INTO season_snapshots (season_id, user_id, coins, xp, wins, points, rank)
    SELECT
      v_old_season_id,
      p.id,
      COALESCE(p.coins, 0),
      COALESCE(p.xp, 0),
      COALESCE(p.wins, 0),
      COALESCE(p.points, 0),
      ROW_NUMBER() OVER (ORDER BY COALESCE(p.points,0) DESC, COALESCE(p.wins,0) DESC)
    FROM profiles p
    WHERE COALESCE(p.is_banned, false) = false
    ON CONFLICT (season_id, user_id) DO NOTHING;

    -- Mark season as ended
    UPDATE seasons
       SET status='ended', ended_at=now(), ended_by=v_user_id
     WHERE id = v_old_season_id;
  END IF;

  -- 2. Determine next season number
  SELECT COALESCE(MAX(number), 0) + 1 INTO v_next_number FROM seasons;

  -- 3. Create new season
  INSERT INTO seasons (
    number, name, description, status, starts_at, created_by,
    reset_coins, reset_xp, reset_wins, reset_avatars,
    reset_chat, reset_tournaments, reset_clans
  ) VALUES (
    v_next_number, p_name, p_description, 'active', now(), v_user_id,
    p_reset_coins, p_reset_xp, p_reset_wins, p_reset_avatars,
    p_reset_chat, p_reset_tournaments, p_reset_clans
  ) RETURNING id INTO v_new_season_id;

  -- 4. Apply resets (super admin's choices)
  IF p_reset_coins THEN
    UPDATE profiles SET coins = 0;
    UPDATE wallets  SET balance = 0;
  END IF;

  IF p_reset_xp THEN
    UPDATE profiles SET xp = 0, level = 1;
  END IF;

  IF p_reset_wins THEN
    UPDATE profiles SET wins = 0, points = 0, kills = 0;
  END IF;

  IF p_reset_avatars THEN
    UPDATE profiles SET avatar_url = NULL, equipped_avatar = NULL;
  END IF;

  IF p_reset_chat THEN
    DELETE FROM chat_messages WHERE channel = 'global';
  END IF;

  IF p_reset_tournaments THEN
    -- N'efface PAS les tournois historiques, juste les marque comme archived
    UPDATE tournaments
       SET status = 'archived'
     WHERE season_id = v_old_season_id
       AND status IN ('open', 'full', 'ongoing');
  END IF;

  IF p_reset_clans THEN
    UPDATE clans SET points = 0, wins = 0;
  END IF;

  -- 5. Log action f audit_logs (ila kayna table)
  BEGIN
    INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (
      v_user_id, 'start_new_season', 'season', v_new_season_id,
      jsonb_build_object(
        'old_season_id', v_old_season_id,
        'season_number', v_next_number,
        'season_name', p_name
      )
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'new_season_id', v_new_season_id,
    'season_number', v_next_number,
    'old_season_id', v_old_season_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ───────────────────────────────────────────────────────────────────
-- 6️⃣ TRIGGER : auto-set season_id 3la inserts
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_set_season_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.season_id IS NULL THEN
    NEW.season_id := get_active_season();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tournaments_season ON tournaments;
CREATE TRIGGER trg_tournaments_season BEFORE INSERT ON tournaments
FOR EACH ROW EXECUTE FUNCTION auto_set_season_id();

DROP TRIGGER IF EXISTS trg_wallet_tx_season ON wallet_transactions;
CREATE TRIGGER trg_wallet_tx_season BEFORE INSERT ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION auto_set_season_id();

DROP TRIGGER IF EXISTS trg_chat_season ON chat_messages;
CREATE TRIGGER trg_chat_season BEFORE INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION auto_set_season_id();


-- ───────────────────────────────────────────────────────────────────
-- 7️⃣ RLS : seasons readable par tous, modifiables par super admin
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_read_all" ON seasons;
CREATE POLICY "seasons_read_all" ON seasons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "seasons_modify_super_admin" ON seasons;
CREATE POLICY "seasons_modify_super_admin" ON seasons FOR ALL TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

DROP POLICY IF EXISTS "snapshots_read_self_or_admin" ON season_snapshots;
CREATE POLICY "snapshots_read_self_or_admin" ON season_snapshots FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','founder','super_admin')
);


-- ───────────────────────────────────────────────────────────────────
-- 8️⃣ SEED — initial saison (ila ma kayna 7tta wahda)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO seasons (number, name, description, status, starts_at)
SELECT 1, 'Saison 1 — Genesis', 'La première saison CipherPool', 'active', now()
WHERE NOT EXISTS (SELECT 1 FROM seasons);


-- ═══════════════════════════════════════════════════════════════════
-- KIFACH STA3MEL B FRONTEND :
-- ═══════════════════════════════════════════════════════════════════
-- 1. Lire saison active:
--    const { data } = await supabase.from('seasons').select('*').eq('status','active').single();
--
-- 2. Démarrer nouvelle saison (super admin):
--    const { data } = await supabase.rpc('start_new_season', {
--      p_name: 'Saison 2 — Cyber Wars',
--      p_description: '...',
--      p_reset_coins: true,
--      p_reset_xp: true,
--      p_reset_wins: true,
--      p_reset_avatars: false,
--      p_reset_chat: true,
--      p_reset_tournaments: true,
--      p_reset_clans: false
--    });
--
-- 3. Voir hall of fame d'une saison:
--    const { data } = await supabase.from('season_snapshots')
--      .select('*, user:profiles(username, avatar_url)')
--      .eq('season_id', X).order('rank').limit(10);
-- ═══════════════════════════════════════════════════════════════════
