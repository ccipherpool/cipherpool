-- ══════════════════════════════════════════════════════════════════════
-- CipherPool Platform OS Infrastructure
-- Creates all system-level tables for the Master Control Center
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. SYSTEM MODULES — registry of all platform subsystems
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_modules (
  id           text        PRIMARY KEY,  -- e.g. 'auth', 'wallet', 'tournaments'
  name         text        NOT NULL,
  description  text,
  category     text        NOT NULL DEFAULT 'core'
                CHECK (category IN ('core','economy','social','content','admin','ai','infra')),
  status       text        NOT NULL DEFAULT 'online'
                CHECK (status IN ('online','degraded','offline','maintenance')),
  health_score integer     NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  is_enabled   boolean     NOT NULL DEFAULT true,
  version      text        NOT NULL DEFAULT '1.0.0',
  dependencies text[]      DEFAULT '{}',
  config       jsonb       DEFAULT '{}',
  last_incident_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_read_admin" ON public.system_modules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "sm_write_super" ON public.system_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
GRANT SELECT ON public.system_modules TO authenticated;

-- Seed the 23 platform systems
INSERT INTO public.system_modules (id, name, description, category) VALUES
  ('auth',          'Auth System',          'User authentication and session management',       'core'),
  ('users',         'User System',          'User profiles, roles, and permissions',            'core'),
  ('profiles',      'Profile System',       'Player profiles, avatars, bios',                  'core'),
  ('wallet',        'Wallet System',        'Coins, transactions, and economy engine',          'economy'),
  ('tournaments',   'Tournament System',    'Tournament lifecycle management',                  'core'),
  ('matchmaking',   'Match System',         'Match creation, results, verification',            'core'),
  ('chat',          'Chat System',          'Global chat, clan chat, direct messages',          'social'),
  ('clans',         'Clan System',          'Clan management, wars, rankings',                  'social'),
  ('store',         'Store System',         'Item store, purchases, inventory',                 'economy'),
  ('inventory',     'Inventory System',     'User items, equipped gear, cosmetics',             'economy'),
  ('notifications', 'Notification System',  'Real-time alerts and push notifications',          'core'),
  ('reports',       'Report System',        'User reports, moderation queue',                   'admin'),
  ('moderation',    'Moderation System',    'Content moderation, bans, warnings',               'admin'),
  ('security',      'Security System',      'Auth guards, RLS, threat detection',               'infra'),
  ('ai',            'AI System',            'AI moderation, support, analytics',                'ai'),
  ('support',       'Support System',       'Tickets, help center, admin responses',            'core'),
  ('analytics',     'Analytics System',     'DAU/MAU, retention, engagement metrics',           'ai'),
  ('cms',           'CMS System',           'Announcements, news, content management',          'content'),
  ('events',        'Event System',         'Platform event bus and routing',                   'infra'),
  ('automation',    'Automation System',    'Rule-based triggers and automated actions',        'infra'),
  ('admin',         'Admin System',         'Staff tools, governance, recruitment',             'admin'),
  ('health',        'Health System',        'System health monitoring and alerting',            'infra'),
  ('audit',         'Audit Log System',     'Complete audit trail for all platform actions',    'infra')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 2. SYSTEM EVENTS — centralized event bus log
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,  -- e.g. 'USER_LOGIN', 'TOURNAMENT_JOINED'
  module_id   text        REFERENCES public.system_modules(id) ON DELETE SET NULL,
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata    jsonb       DEFAULT '{}',
  ip_address  inet,
  user_agent  text,
  severity    text        NOT NULL DEFAULT 'info'
                CHECK (severity IN ('debug','info','warn','error','critical')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS se_type_idx      ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS se_module_idx    ON public.system_events(module_id);
CREATE INDEX IF NOT EXISTS se_user_idx      ON public.system_events(user_id);
CREATE INDEX IF NOT EXISTS se_severity_idx  ON public.system_events(severity);
CREATE INDEX IF NOT EXISTS se_created_idx   ON public.system_events(created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "se_read_admin" ON public.system_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "se_insert_all" ON public.system_events
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT ON public.system_events TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3. SYSTEM ALERTS — critical alerts requiring admin attention
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    text        REFERENCES public.system_modules(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  description  text,
  severity     text        NOT NULL DEFAULT 'warn'
                CHECK (severity IN ('info','warn','error','critical')),
  status       text        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','acknowledged','resolved','ignored')),
  source       text        DEFAULT 'system',  -- 'system', 'ai', 'manual'
  metadata     jsonb       DEFAULT '{}',
  acknowledged_by uuid     REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sa_severity_idx  ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS sa_status_idx    ON public.system_alerts(status);
CREATE INDEX IF NOT EXISTS sa_module_idx    ON public.system_alerts(module_id);
CREATE INDEX IF NOT EXISTS sa_created_idx   ON public.system_alerts(created_at DESC);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_read_admin" ON public.system_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "sa_write_admin" ON public.system_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
GRANT SELECT, INSERT, UPDATE ON public.system_alerts TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 4. AI REPORTS — AI-generated analysis and recommendations
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type  text        NOT NULL,  -- 'moderation', 'security', 'analytics', 'health'
  module_id    text        REFERENCES public.system_modules(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  summary      text        NOT NULL,
  findings     jsonb       DEFAULT '[]',
  recommendations jsonb    DEFAULT '[]',
  risk_score   integer     DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  status       text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  reviewed_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ar_type_idx    ON public.ai_reports(report_type);
CREATE INDEX IF NOT EXISTS ar_status_idx  ON public.ai_reports(status);
CREATE INDEX IF NOT EXISTS ar_created_idx ON public.ai_reports(created_at DESC);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_read_admin" ON public.ai_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "ar_write_super" ON public.ai_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
GRANT SELECT ON public.ai_reports TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. AUTOMATION RULES — rule-based triggers and automated actions
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  description  text,
  trigger_event text       NOT NULL,  -- event_type that triggers this rule
  conditions   jsonb       DEFAULT '{}',
  actions      jsonb       DEFAULT '[]',
  is_enabled   boolean     NOT NULL DEFAULT true,
  priority     integer     NOT NULL DEFAULT 50,
  run_count    integer     NOT NULL DEFAULT 0,
  last_run_at  timestamptz,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_read_admin" ON public.automation_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "auto_write_super" ON public.automation_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
GRANT SELECT ON public.automation_rules TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 6. FEATURE FLAGS — runtime feature toggles
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key          text        PRIMARY KEY,
  name         text        NOT NULL,
  description  text,
  is_enabled   boolean     NOT NULL DEFAULT false,
  rollout_pct  integer     NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  target_roles text[]      DEFAULT '{}',  -- empty = all roles
  metadata     jsonb       DEFAULT '{}',
  updated_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_read_all" ON public.feature_flags
  FOR SELECT USING (true);
CREATE POLICY "ff_write_super" ON public.feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
GRANT SELECT ON public.feature_flags TO anon, authenticated;

-- Seed default flags
INSERT INTO public.feature_flags (key, name, description, is_enabled) VALUES
  ('stories',         'Stories System',     'User stories feature', true),
  ('clan_wars',       'Clan Wars',          'Competitive clan vs clan system', true),
  ('battle_pass',     'Battle Pass',        'Season battle pass progression', false),
  ('ai_moderation',   'AI Moderation',      'Automated content moderation', false),
  ('referrals',       'Referral System',    'Friend referral rewards', false),
  ('daily_rewards',   'Daily Rewards',      'Daily login reward system', true),
  ('leaderboard_realtime', 'Live Leaderboard', 'Real-time leaderboard updates', true)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 7. SYSTEM METRICS — time-series performance data
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   text        REFERENCES public.system_modules(id) ON DELETE SET NULL,
  metric_name text        NOT NULL,
  value       numeric     NOT NULL,
  unit        text,  -- 'ms', 'count', 'bytes', 'percent'
  tags        jsonb       DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smet_module_idx    ON public.system_metrics(module_id);
CREATE INDEX IF NOT EXISTS smet_name_idx      ON public.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS smet_recorded_idx  ON public.system_metrics(recorded_at DESC);

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smet_read_admin" ON public.system_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
CREATE POLICY "smet_insert_all" ON public.system_metrics
  FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT ON public.system_metrics TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 8. RPC: get_platform_overview
--    Returns a snapshot of all key metrics for the Command Center
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_platform_overview()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_result jsonb;
  v_online_users    bigint;
  v_total_users     bigint;
  v_active_tournaments bigint;
  v_open_reports    bigint;
  v_open_alerts     bigint;
  v_total_coins     bigint;
  v_systems_online  bigint;
  v_systems_total   bigint;
  v_new_users_today bigint;
BEGIN
  -- Online users (seen in last 5 minutes)
  SELECT COUNT(*) INTO v_online_users
  FROM public.profiles
  WHERE last_seen_at > now() - interval '5 minutes';

  -- Total users
  SELECT COUNT(*) INTO v_total_users
  FROM public.profiles
  WHERE role != 'banned';

  -- Active tournaments
  SELECT COUNT(*) INTO v_active_tournaments
  FROM public.tournaments
  WHERE status IN ('open','in_progress','registration_open');

  -- Open reports
  SELECT COUNT(*) INTO v_open_reports
  FROM public.reports
  WHERE status = 'pending';

  -- Open alerts
  SELECT COUNT(*) INTO v_open_alerts
  FROM public.system_alerts
  WHERE status IN ('open');

  -- Total economy (sum of all wallet balances)
  SELECT COALESCE(SUM(balance), 0) INTO v_total_coins
  FROM public.wallets;

  -- System health
  SELECT
    COUNT(*) FILTER (WHERE is_enabled AND status = 'online'),
    COUNT(*)
  INTO v_systems_online, v_systems_total
  FROM public.system_modules;

  -- New users today
  SELECT COUNT(*) INTO v_new_users_today
  FROM public.profiles
  WHERE created_at >= now()::date;

  v_result := jsonb_build_object(
    'online_users',      v_online_users,
    'total_users',       v_total_users,
    'active_tournaments',v_active_tournaments,
    'open_reports',      v_open_reports,
    'open_alerts',       v_open_alerts,
    'total_coins',       v_total_coins,
    'systems_online',    v_systems_online,
    'systems_total',     v_systems_total,
    'new_users_today',   v_new_users_today,
    'health_pct',        CASE WHEN v_systems_total > 0 THEN
                           ROUND((v_systems_online::numeric / v_systems_total) * 100)
                         ELSE 100 END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_overview() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 9. RPC: log_system_event (helper for frontend)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_event_type text,
  p_module_id  text DEFAULT NULL,
  p_metadata   jsonb DEFAULT '{}'
)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.system_events (event_type, module_id, user_id, metadata, severity)
  VALUES (
    p_event_type,
    p_module_id,
    auth.uid(),
    p_metadata,
    'info'
  );
$$;

GRANT EXECUTE ON FUNCTION public.log_system_event(text, text, jsonb) TO authenticated;
