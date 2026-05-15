-- CipherPool Phase A normalized migration set
-- 001_core_schema.sql
-- Purpose: canonical core tables in dependency-safe order.
-- Apply on a staging database first. Do not mix with legacy 01-18 files.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('super_admin','admin','founder','fondateur','designer','user','banned')),
  free_fire_id text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','approved','rejected')),
  verification_note text,
  bio text,
  country text DEFAULT 'MA',
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  fair_play_score integer NOT NULL DEFAULT 100,
  trust_score integer NOT NULL DEFAULT 100,
  is_verified boolean NOT NULL DEFAULT false,
  team_id uuid,
  banned_until timestamptz,
  banned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

CREATE OR REPLACE FUNCTION public.is_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_role(ARRAY[p_role]);
$$;

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('credit','debit','refund','prize','fee','purchase','gift_sent','gift_received','admin_adjustment','referral','daily_reward','mission_reward')),
  reason text NOT NULL,
  reference text,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_tx_date_idx ON public.wallet_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  game_type text NOT NULL DEFAULT 'free_fire',
  mode text NOT NULL DEFAULT 'solo',
  cs_format text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','active','upcoming','registration_closed','live','in_progress','results_open','results_closed','finished','completed','cancelled','full','disputed')),
  room_status text NOT NULL DEFAULT 'pending'
    CHECK (room_status IN ('pending','setup','open','live','results_open','results_closed','finished')),
  entry_fee integer NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  prize_coins integer NOT NULL DEFAULT 0 CHECK (prize_coins >= 0),
  max_players integer NOT NULL DEFAULT 100 CHECK (max_players > 0),
  current_players integer NOT NULL DEFAULT 0 CHECK (current_players >= 0),
  map text,
  room_id text,
  room_password text,
  rules text,
  banner_url text,
  background_color text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date timestamptz,
  start_time timestamptz,
  end_time timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournaments_status_idx ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS tournaments_created_idx ON public.tournaments(created_at DESC);
CREATE INDEX IF NOT EXISTS tournaments_creator_idx ON public.tournaments(created_by);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','joined','left','kicked')),
  team_name text,
  team_slot integer,
  rank integer,
  kills integer NOT NULL DEFAULT 0,
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS tp_tournament_idx ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS tp_user_idx ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS tp_status_idx ON public.tournament_participants(status);

DO $$
BEGIN
  IF to_regclass('public.tournament_players') IS NULL THEN
    EXECUTE 'CREATE VIEW public.tournament_players WITH (security_invoker = true) AS SELECT * FROM public.tournament_participants';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank integer,
  placement integer,
  kills integer NOT NULL DEFAULT 0 CHECK (kills >= 0),
  points integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','verified','rejected','disputed','auto_verified')),
  estimated_coins integer NOT NULL DEFAULT 0 CHECK (estimated_coins >= 0),
  coins_awarded integer NOT NULL DEFAULT 0 CHECK (coins_awarded >= 0),
  is_mvp boolean NOT NULL DEFAULT false,
  auto_verified boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  dispute_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS mr_tournament_idx ON public.match_results(tournament_id);
CREATE INDEX IF NOT EXISTS mr_user_idx ON public.match_results(user_id);
CREATE INDEX IF NOT EXISTS mr_status_idx ON public.match_results(status);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS free_fire_id text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'MA',
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fair_play_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'credit',
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS admin_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS game_type text NOT NULL DEFAULT 'free_fire',
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS cs_format text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS room_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS entry_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_players integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS current_players integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS map text,
  ADD COLUMN IF NOT EXISTS room_id text,
  ADD COLUMN IF NOT EXISTS room_password text,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS winner_id uuid,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS tournament_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS team_slot integer,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS tournament_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS placement integer,
  ADD COLUMN IF NOT EXISTS kills integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS estimated_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_awarded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_mvp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();


CREATE OR REPLACE FUNCTION public.normalize_match_result_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rank IS NULL AND NEW.placement IS NOT NULL THEN
    NEW.rank := NEW.placement;
  END IF;
  IF NEW.placement IS NULL AND NEW.rank IS NOT NULL THEN
    NEW.placement := NEW.rank;
  END IF;
  IF NEW.points IS NULL THEN
    NEW.points := 0;
  END IF;
  IF NEW.score IS NULL THEN
    NEW.score := NEW.points;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_match_result_fields_trg ON public.match_results;
CREATE TRIGGER normalize_match_result_fields_trg
  BEFORE INSERT OR UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.normalize_match_result_fields();

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('cheat','toxic','fraud','bug','other')),
  description text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_action text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  registration_enabled boolean NOT NULL DEFAULT true,
  tournaments_enabled boolean NOT NULL DEFAULT true,
  max_tournaments_per_day integer NOT NULL DEFAULT 10,
  min_withdrawal_amount integer NOT NULL DEFAULT 100,
  welcome_coins integer NOT NULL DEFAULT 50,
  site_name text NOT NULL DEFAULT 'CipherPool',
  site_description text DEFAULT 'Free Fire Tournament Platform',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  v_id_type text;
BEGIN
  SELECT data_type INTO v_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'system_config' AND column_name = 'id';

  IF v_id_type IN ('integer', 'bigint', 'smallint') THEN
    INSERT INTO public.system_config (id) VALUES (1) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_role(ARRAY['admin','super_admin'])
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.banned_until IS DISTINCT FROM OLD.banned_until
       OR NEW.banned_by IS DISTINCT FROM OLD.banned_by
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.fair_play_score IS DISTINCT FROM OLD.fair_play_score
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     ) THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed by the user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_security_fields_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();
