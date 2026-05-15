-- CipherPool Phase A normalized migration set
-- 002_feature_tables.sql
-- Purpose: missing tables referenced by the current frontend.

CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_number integer,
  team_number integer,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','ready','left','kicked')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  room_id uuid,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'message',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','answered','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  image_url text,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'profile_edit',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'avatar',
  rarity text NOT NULL DEFAULT 'common',
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url text,
  active boolean NOT NULL DEFAULT true,
  approved boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.daily_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, date)
);

CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day integer NOT NULL UNIQUE CHECK (day > 0),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  item_id uuid REFERENCES public.store_items(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.user_daily_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES public.daily_rewards(id) ON DELETE SET NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'daily',
  target integer NOT NULL DEFAULT 1,
  reward_coins integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  reset_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, mission_id, reset_date)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  rarity text NOT NULL DEFAULT 'common',
  reward_coins integer NOT NULL DEFAULT 0,
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL UNIQUE,
  description text,
  accent_color text,
  is_open boolean NOT NULL DEFAULT true,
  captain_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disbanded')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('captain','co_captain','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, tournament_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  round integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  UNIQUE (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tag text UNIQUE,
  description text,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_url text,
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clan_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.player_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  kills integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  tournaments_played integer NOT NULL DEFAULT 0,
  top3_finishes integer NOT NULL DEFAULT 0,
  total_earnings integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  best_position integer,
  kd_ratio numeric(6,2) NOT NULL DEFAULT 0,
  mvp_count integer NOT NULL DEFAULT 0,
  win_streak integer NOT NULL DEFAULT 0,
  best_win_streak integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL UNIQUE REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_players integer NOT NULL DEFAULT 0,
  submitted_count integer NOT NULL DEFAULT 0,
  mvp_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_reason text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.feature_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.admin_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS ticket_id uuid,
  ADD COLUMN IF NOT EXISTS sender_id uuid,
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.admin_messages
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'avatar',
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS captain_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS number integer,
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_date timestamptz;

ALTER TABLE public.gift_transactions
  ADD COLUMN IF NOT EXISTS sender_id uuid,
  ADD COLUMN IF NOT EXISTS receiver_id uuid,
  ADD COLUMN IF NOT EXISTS item_id uuid,
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'feature',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reward_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.feature_comments
  ADD COLUMN IF NOT EXISTS comment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS steps_to_repro text,
  ADD COLUMN IF NOT EXISTS affected_page text,
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS browser_info text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reward_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

ALTER TABLE public.admin_applications
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS q_why_join text,
  ADD COLUMN IF NOT EXISTS q_experience text,
  ADD COLUMN IF NOT EXISTS q_conflict_scenario text,
  ADD COLUMN IF NOT EXISTS q_availability text,
  ADD COLUMN IF NOT EXISTS q_languages text,
  ADD COLUMN IF NOT EXISTS q_extra text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE TABLE IF NOT EXISTS public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','scheduled')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.store_items(id) ON DELETE SET NULL,
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','rejected','cancelled','expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL REFERENCES public.referral_codes(code),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  rewarded boolean NOT NULL DEFAULT false,
  referrer_reward integer NOT NULL DEFAULT 0,
  referred_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'feature',
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_note text,
  reward_given boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote integer NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feature_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  content text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  severity text NOT NULL DEFAULT 'medium',
  evidence_url text,
  screenshot_url text,
  steps_to_repro text,
  affected_page text,
  device_info text,
  browser_info text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reward_given boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivation text,
  q_why_join text,
  q_experience text,
  q_conflict_scenario text,
  q_availability text,
  q_languages text,
  q_extra text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.community_ideas_feed AS
SELECT
  fr.*,
  COUNT(*) FILTER (WHERE fv.vote = 1)::integer AS upvotes,
  COUNT(*) FILTER (WHERE fv.vote = -1)::integer AS downvotes,
  COALESCE(SUM(fv.vote), 0)::integer AS score,
  COALESCE(SUM(fv.vote), 0)::integer AS vote_score,
  COUNT(fc.id)::integer AS comments_count
FROM public.feature_requests fr
LEFT JOIN public.feature_votes fv ON fv.request_id = fr.id
LEFT JOIN public.feature_comments fc ON fc.request_id = fr.id
GROUP BY fr.id;

CREATE OR REPLACE VIEW public.bug_reports_admin_view AS
SELECT br.*, p.username, p.avatar_url
FROM public.bug_reports br
LEFT JOIN public.profiles p ON p.id = br.user_id;
