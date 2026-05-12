-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Seasons System
-- Tables: seasons, season_snapshots
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. SEASONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  number             integer     UNIQUE NOT NULL,
  name               text        NOT NULL,
  status             text        NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'completed', 'scheduled')),
  reset_coins        boolean     NOT NULL DEFAULT false,
  reset_xp           boolean     NOT NULL DEFAULT false,
  reset_stats        boolean     NOT NULL DEFAULT true,
  reset_tournaments  boolean     NOT NULL DEFAULT true,
  reset_chat         boolean     NOT NULL DEFAULT true,
  reset_avatars      boolean     NOT NULL DEFAULT false,
  reset_clans        boolean     NOT NULL DEFAULT false,
  start_date         timestamptz NOT NULL DEFAULT now(),
  end_date           timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_read_all"    ON public.seasons;
DROP POLICY IF EXISTS "seasons_write_admin" ON public.seasons;

CREATE POLICY "seasons_read_all" ON public.seasons
  FOR SELECT USING (true);

CREATE POLICY "seasons_write_admin" ON public.seasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT                  ON TABLE public.seasons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE  ON TABLE public.seasons TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. SEASON SNAPSHOTS (final standings per season)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.season_snapshots (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     uuid    NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id       uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_rank    integer,
  final_points  integer,
  final_level   integer,
  final_coins   integer,
  details       jsonb   NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS season_snapshots_season_idx ON public.season_snapshots(season_id);
CREATE INDEX IF NOT EXISTS season_snapshots_user_idx   ON public.season_snapshots(user_id);

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots_read_self"  ON public.season_snapshots;
DROP POLICY IF EXISTS "snapshots_write_admin" ON public.season_snapshots;

CREATE POLICY "snapshots_read_self" ON public.season_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "snapshots_write_admin" ON public.season_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT                  ON TABLE public.season_snapshots TO authenticated;
GRANT INSERT, UPDATE, DELETE  ON TABLE public.season_snapshots TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: start_new_season
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_new_season(
  p_name               text,
  p_number             integer,
  p_reset_coins        boolean DEFAULT false,
  p_reset_xp           boolean DEFAULT false,
  p_reset_stats        boolean DEFAULT true,
  p_reset_tournaments  boolean DEFAULT true,
  p_reset_chat         boolean DEFAULT true,
  p_reset_avatars      boolean DEFAULT false,
  p_reset_clans        boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_season_id uuid;
  v_new_season_id uuid;
BEGIN
  -- Close current active season
  UPDATE public.seasons
  SET status = 'completed', end_date = now()
  WHERE status = 'active'
  RETURNING id INTO v_old_season_id;

  -- Open new season
  INSERT INTO public.seasons
    (name, number, reset_coins, reset_xp, reset_stats, reset_tournaments, reset_chat, reset_avatars, reset_clans)
  VALUES
    (p_name, p_number, p_reset_coins, p_reset_xp, p_reset_stats, p_reset_tournaments, p_reset_chat, p_reset_avatars, p_reset_clans)
  RETURNING id INTO v_new_season_id;

  RETURN jsonb_build_object(
    'success',        true,
    'new_season_id',  v_new_season_id,
    'closed_season',  v_old_season_id
  );
END;
$$;
