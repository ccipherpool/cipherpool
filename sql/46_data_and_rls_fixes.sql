-- ════════════════════════════════════════════════════════════════════════════
-- CIPHERPOOL — Data & RLS Fixes
-- File: sql/46_data_and_rls_fixes.sql
-- Run in Supabase SQL Editor after 45_rpc_deduplication.sql
--
-- What this does:
--   1. Approves all existing active store items so they appear in the Store
--   2. Fixes store RLS policy to not require admin approval
--   3. Ensures rate_limit_logs table exists (required by check_rate_limit)
--   4. Ensures system_config has required defaults
--   5. Fixes stories/presence RLS
--   6. Cleans up duplicate RLS policies
--   7. Inserts seed store items if store is empty
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. APPROVE ALL ACTIVE STORE ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.store_items
SET approved = true, updated_at = now()
WHERE active = true AND approved = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FIX STORE RLS — Remove the strict approved=true requirement for public read
-- Any active item should be visible; only inactive ones are hidden.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS store_items_public_read     ON public.store_items;
DROP POLICY IF EXISTS store_items_read_active     ON public.store_items;
DROP POLICY IF EXISTS store_read_active           ON public.store_items;

-- Single clean read policy: active items visible to all authenticated users
CREATE POLICY "store_items_read_active" ON public.store_items
  FOR SELECT TO authenticated
  USING (active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ENSURE RATE_LIMIT_LOGS TABLE EXISTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_action
  ON public.rate_limit_logs (user_id, action, created_at DESC);

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limit_self" ON public.rate_limit_logs;
CREATE POLICY "rate_limit_self" ON public.rate_limit_logs
  FOR ALL USING (user_id = auth.uid());

-- Auto-cleanup old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '1 hour';
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SYSTEM_CONFIG DEFAULT VALUES
-- Ensure at least one config row exists (uuid PK, all defaults)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_config LIMIT 1) THEN
    INSERT INTO public.system_config DEFAULT VALUES;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIX STORIES — ensure expires_at default and privacy default
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stories
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours'),
  ALTER COLUMN privacy     SET DEFAULT 'public';

-- Fix existing stories that have expired or wrong privacy
UPDATE public.stories
SET expires_at = now() + interval '24 hours'
WHERE expires_at < now() - interval '1 hour';

UPDATE public.stories
SET privacy = 'public'
WHERE privacy IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. USER PRESENCE — ensure table exists and RLS is correct
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'online' CHECK (status IN ('online','away','busy','offline')),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_read_authenticated" ON public.user_presence;
DROP POLICY IF EXISTS "presence_write_self"          ON public.user_presence;

CREATE POLICY "presence_read_authenticated" ON public.user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "presence_write_self" ON public.user_presence
  FOR ALL TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FIX SITE_SETTINGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT 'null',
  label      text,
  is_public  boolean     NOT NULL DEFAULT false,
  updated_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_read_public" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_all"   ON public.site_settings;

CREATE POLICY "site_settings_read_public" ON public.site_settings
  FOR SELECT USING (is_public = true OR public.is_admin());

CREATE POLICY "site_settings_admin_all" ON public.site_settings
  FOR ALL USING (public.is_admin());

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL    ON public.site_settings TO authenticated;

-- Insert default public settings
INSERT INTO public.site_settings (key, value, label, is_public) VALUES
  ('platform_name',        '"CipherPool"',                  'Platform Name',        true),
  ('platform_tagline',     '"The Arena Awaits"',            'Tagline',              true),
  ('maintenance_mode',     'false',                          'Maintenance Mode',     true),
  ('registration_enabled', 'true',                           'Registration Enabled', true),
  ('discord_url',          '"https://discord.gg/cipherpool"', 'Discord URL',         true),
  ('starter_coins',        '500',                            'Starter Coins',        true),
  ('daily_reward_amount',  '50',                             'Daily Reward',         true)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7b. FIX CMS_AUDIT_TRIGGER — safe jsonb-based record ID (handles tables
--     with either an 'id' column or a 'key' column as PK)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cms_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cms_logs (actor_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(
      (row_to_json(NEW)::jsonb->>'id'),
      (row_to_json(NEW)::jsonb->>'key'),
      (row_to_json(OLD)::jsonb->>'id'),
      (row_to_json(OLD)::jsonb->>'key')
    ),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FIX FEATURE_FLAGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         text        PRIMARY KEY,
  is_enabled  boolean     NOT NULL DEFAULT true,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_admin" ON public.feature_flags;

CREATE POLICY "feature_flags_read"  ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_flags_admin" ON public.feature_flags FOR ALL    TO authenticated USING (public.is_admin());

GRANT SELECT ON public.feature_flags TO authenticated;

-- Default flags (include name column which is NOT NULL in real schema)
INSERT INTO public.feature_flags (key, name, is_enabled, description) VALUES
  ('store_enabled',          'Store',              true,  'Enable the item store'),
  ('clans_enabled',          'Clans',              true,  'Enable clan system'),
  ('tournaments_enabled',    'Tournaments',        true,  'Enable tournaments'),
  ('leaderboard_enabled',    'Leaderboard',        true,  'Enable leaderboard'),
  ('daily_rewards_enabled',  'Daily Rewards',      true,  'Enable daily rewards'),
  ('chat_enabled',           'Global Chat',        true,  'Enable global chat'),
  ('stories_enabled',        'Stories',            true,  'Enable stories system'),
  ('friends_enabled',        'Friends',            true,  'Enable friends system'),
  ('gifts_enabled',          'Gifts',              true,  'Enable gift system'),
  ('community_enabled',      'Community',          true,  'Enable community features'),
  ('admin_applications',     'Admin Applications', true,  'Enable admin applications'),
  ('bug_reports_enabled',    'Bug Reports',        true,  'Enable bug reports')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SEED STORE ITEMS (only if table is empty)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.store_items WHERE active = true LIMIT 1) THEN
    INSERT INTO public.store_items
      (name, description, type, rarity, price, active, approved, source, sort_order)
    VALUES
      ('Flame Avatar',        'Intense flame warrior avatar',   'avatar',     'epic',      500,  true, true, 'store', 1),
      ('Shadow Avatar',       'Dark shadow assassin avatar',    'avatar',     'rare',      300,  true, true, 'store', 2),
      ('Gold Avatar',         'Legendary golden warrior',       'avatar',     'legendary', 1500, true, true, 'store', 3),
      ('Classic Avatar',      'Clean classic player avatar',    'avatar',     'common',    100,  true, true, 'store', 4),
      ('Dark Banner',         'Sleek dark player banner',       'banner',     'rare',      400,  true, true, 'store', 5),
      ('Neon Banner',         'Neon glow animated banner',      'banner',     'epic',      800,  true, true, 'store', 6),
      ('Gold Frame',          'Premium golden profile frame',   'frame',      'epic',      600,  true, true, 'store', 7),
      ('Silver Frame',        'Clean silver profile frame',     'frame',      'rare',      250,  true, true, 'store', 8),
      ('MVP Badge',           'For the tournament champions',   'badge',      'legendary', 2000, true, true, 'store', 9),
      ('Pro Badge',           'Seasoned competitor badge',      'badge',      'epic',      750,  true, true, 'store', 10),
      ('Veteran Badge',       'Long-time platform veteran',     'badge',      'rare',      400,  true, true, 'store', 11),
      ('Crimson Name',        'Red hot name color',             'name_color', 'rare',      300,  true, true, 'store', 12),
      ('Gold Name',           'Legendary gold name color',      'name_color', 'legendary', 800,  true, true, 'store', 13),
      ('Cyber Blue Name',     'Electric blue name color',       'name_color', 'epic',      500,  true, true, 'store', 14),
      ('GG Emote',            'Classic good game emote',        'emote',      'common',    150,  true, true, 'store', 15),
      ('Champion Emote',      'Winner celebration emote',       'emote',      'epic',      600,  true, true, 'store', 16);
    RAISE NOTICE 'Seeded 16 store items.';
  ELSE
    RAISE NOTICE 'Store already has items — skipping seed.';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. FIX NOTIFICATIONS TABLE — ensure is_read column exists
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at  timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FIX WALLET_TRANSACTIONS — ensure admin_id column exists
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. FIX ADMIN_LOGS — ensure table exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  details    jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_logs_admin_read" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_read" ON public.admin_logs
  FOR SELECT USING (public.is_admin());

GRANT SELECT ON public.admin_logs TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Migration 46_data_and_rls_fixes complete.'; END $$;
