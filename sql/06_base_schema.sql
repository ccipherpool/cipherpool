-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Base Schema
-- Tables: profiles, wallets, wallet_transactions, tournaments,
--         tournament_players, match_results, reports, admin_logs,
--         system_config
-- Run this FIRST before other migration files.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text,
  username            text        UNIQUE,
  full_name           text,
  avatar_url          text,
  role                text        NOT NULL DEFAULT 'user'
                        CHECK (role IN ('super_admin','admin','founder','fondateur','designer','user','banned')),
  free_fire_id        text,
  verification_status text        NOT NULL DEFAULT 'unverified'
                        CHECK (verification_status IN ('unverified','pending','verified')),
  verification_note   text,
  bio                 text,
  country             text        DEFAULT 'MA',
  banned_until        timestamptz,
  banned_by           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_seen_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx   ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx  ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_ffid_idx   ON public.profiles(free_fire_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_self"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_write_admin"  ON public.profiles;

CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_write_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_write_admin" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- 2. WALLETS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance    integer     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_read_self"  ON public.wallets;
DROP POLICY IF EXISTS "wallets_read_admin" ON public.wallets;

CREATE POLICY "wallets_read_self" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_read_admin" ON public.wallets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT, UPDATE ON TABLE public.wallets TO authenticated;

-- Auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_profile();

-- ─────────────────────────────────────────────────────────────────────
-- 3. WALLET TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      integer     NOT NULL,
  type        text        NOT NULL CHECK (type IN ('credit','debit','refund','prize','fee')),
  reason      text        NOT NULL,
  reference   text,
  admin_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_tx_date_idx ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_tx_read_self" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallet_tx_read_admin" ON public.wallet_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;
GRANT INSERT ON TABLE public.wallet_transactions TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. TOURNAMENTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournaments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text,
  game_type       text        NOT NULL DEFAULT 'free_fire',
  status          text        NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','completed','cancelled','full')),
  entry_fee       integer     NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  prize_pool      integer     NOT NULL DEFAULT 0 CHECK (prize_pool >= 0),
  max_players     integer     NOT NULL DEFAULT 100,
  current_players integer     NOT NULL DEFAULT 0,
  mode            text        NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo','duo','squad')),
  map             text,
  room_id         text,
  room_password   text,
  rules           text,
  banner_url      text,
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_time      timestamptz,
  end_time        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournaments_status_idx  ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS tournaments_date_idx    ON public.tournaments(created_at DESC);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_read_all" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "tournaments_write_founder" ON public.tournaments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder','fondateur','admin','super_admin'))
  );

GRANT SELECT ON TABLE public.tournaments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tournaments TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. TOURNAMENT PLAYERS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tournament_players (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name     text,
  team_slot     integer,
  placement     integer,
  kills         integer     DEFAULT 0,
  is_ready      boolean     DEFAULT false,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS tp_tournament_idx ON public.tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS tp_user_idx       ON public.tournament_players(user_id);

ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_read_all" ON public.tournament_players
  FOR SELECT USING (true);

CREATE POLICY "tp_write_self" ON public.tournament_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tp_manage_founder" ON public.tournament_players
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('founder','fondateur','admin','super_admin'))
  );

GRANT SELECT ON TABLE public.tournament_players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.tournament_players TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. MATCH RESULTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.match_results (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  submitter_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  screenshot_url text,
  placement     integer,
  kills         integer     DEFAULT 0,
  score         integer     DEFAULT 0,
  status        text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mr_tournament_idx ON public.match_results(tournament_id);
CREATE INDEX IF NOT EXISTS mr_status_idx     ON public.match_results(status);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mr_read_all" ON public.match_results
  FOR SELECT USING (true);

CREATE POLICY "mr_write_self" ON public.match_results
  FOR INSERT WITH CHECK (auth.uid() = submitter_id);

CREATE POLICY "mr_manage_admin" ON public.match_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

GRANT SELECT ON TABLE public.match_results TO anon, authenticated;
GRANT INSERT ON TABLE public.match_results TO authenticated;
GRANT UPDATE, DELETE ON TABLE public.match_results TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. REPORTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  tournament_id     uuid        REFERENCES public.tournaments(id) ON DELETE SET NULL,
  type              text        NOT NULL CHECK (type IN ('cheat','toxic','fraud','bug','other')),
  description       text        NOT NULL,
  evidence_url      text,
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','resolved','dismissed')),
  resolved_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_action   text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_date_idx   ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_auth" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_read_self" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_manage_admin" ON public.reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT, INSERT ON TABLE public.reports TO authenticated;
GRANT UPDATE, DELETE ON TABLE public.reports TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. ADMIN LOGS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  details     jsonb       NOT NULL DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_logs_user_idx ON public.admin_logs(user_id);
CREATE INDEX IF NOT EXISTS admin_logs_date_idx ON public.admin_logs(created_at DESC);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_logs_write" ON public.admin_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

CREATE POLICY "admin_logs_read_admin" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT INSERT ON TABLE public.admin_logs TO authenticated;
GRANT SELECT ON TABLE public.admin_logs TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 9. SYSTEM CONFIG
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  id                      integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode        boolean     NOT NULL DEFAULT false,
  registration_enabled    boolean     NOT NULL DEFAULT true,
  tournaments_enabled     boolean     NOT NULL DEFAULT true,
  max_tournaments_per_day integer     NOT NULL DEFAULT 10,
  min_withdrawal_amount   integer     NOT NULL DEFAULT 100,
  welcome_coins           integer     NOT NULL DEFAULT 50,
  site_name               text        NOT NULL DEFAULT 'CipherPool',
  site_description        text        DEFAULT 'Free Fire Tournament Platform',
  updated_by              uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sysconfig_read_all" ON public.system_config
  FOR SELECT USING (true);

CREATE POLICY "sysconfig_write_admin" ON public.system_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

GRANT SELECT ON TABLE public.system_config TO anon, authenticated;
GRANT UPDATE ON TABLE public.system_config TO authenticated;
