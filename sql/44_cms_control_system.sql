-- ══════════════════════════════════════════════════════════════════════
-- CipherPool CMS & Control System
-- Allows platform to be managed from inside the admin panel
-- Only founder/super_admin can modify settings
-- Every change is logged automatically
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. SITE SETTINGS — global key/value configuration
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key          text        PRIMARY KEY,
  value        jsonb       NOT NULL DEFAULT 'null',
  category     text        NOT NULL DEFAULT 'general'
                CHECK (category IN ('general','ui','economy','gameplay','social','security','maintenance')),
  label        text        NOT NULL,
  description  text,
  is_public    boolean     NOT NULL DEFAULT false,  -- can anon/user read it?
  updated_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_read_public" ON public.site_settings
  FOR SELECT USING (
    is_public = true
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

CREATE POLICY "ss_write_super" ON public.site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur'))
  );

GRANT SELECT ON public.site_settings TO anon, authenticated;

-- Default settings
INSERT INTO public.site_settings (key, value, category, label, description, is_public) VALUES
  ('platform_name',        '"CipherPool"',                  'general',     'Platform Name',        'Display name of the platform',          true),
  ('platform_tagline',     '"The Arena Awaits"',            'general',     'Tagline',              'Short tagline displayed on homepage',   true),
  ('maintenance_mode',     'false',                         'maintenance', 'Maintenance Mode',     'Disables all user access when true',    true),
  ('registration_enabled', 'true',                          'general',     'Registrations Open',   'Allow new user registrations',          true),
  ('max_tournament_size',  '100',                           'gameplay',    'Max Tournament Size',  'Maximum players per tournament',        false),
  ('starter_coins',        '500',                           'economy',     'Starter Coins',        'Coins given to new users',              false),
  ('daily_reward_amount',  '50',                            'economy',     'Daily Reward',         'Coins awarded for daily login',         false),
  ('min_withdraw_amount',  '100',                           'economy',     'Min Withdrawal',       'Minimum coins to withdraw',             false),
  ('discord_url',          '"https://discord.gg/cipherpool"','social',     'Discord URL',          'Link to official Discord server',       true),
  ('support_email',        '"support@cipherpool.gg"',       'general',     'Support Email',        'Contact email for support',             true)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 2. THEME SETTINGS — visual customization
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL DEFAULT 'default',
  is_active    boolean     NOT NULL DEFAULT false,
  config       jsonb       NOT NULL DEFAULT '{}',
  preview_url  text,
  updated_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ts_read_all" ON public.theme_settings
  FOR SELECT USING (true);

CREATE POLICY "ts_write_super" ON public.theme_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur'))
  );

GRANT SELECT ON public.theme_settings TO anon, authenticated;

INSERT INTO public.theme_settings (name, is_active, config) VALUES
  ('Cyber Dark', true, '{
    "primary": "#8B5CF6",
    "secondary": "#06B6D4",
    "background": "#020617",
    "surface": "#07091a",
    "accent": "#10B981",
    "danger": "#EF4444",
    "warning": "#F59E0B",
    "font_heading": "Space Grotesk",
    "font_body": "Satoshi",
    "border_radius": "16px"
  }'::jsonb)
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 3. HOMEPAGE SECTIONS — dynamic homepage content blocks
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text        NOT NULL UNIQUE,
  title        text,
  subtitle     text,
  content      jsonb       DEFAULT '{}',
  is_enabled   boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  section_type text        NOT NULL DEFAULT 'generic'
                CHECK (section_type IN ('hero','stats','features','tournaments','cta','testimonials','faq','generic')),
  updated_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hs_read_all" ON public.homepage_sections
  FOR SELECT USING (is_enabled = true OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur')
  ));

CREATE POLICY "hs_write_super" ON public.homepage_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur'))
  );

GRANT SELECT ON public.homepage_sections TO anon, authenticated;

INSERT INTO public.homepage_sections (key, title, subtitle, section_type, sort_order, content) VALUES
  ('hero',        'The Arena Awaits',       'Compete. Win. Dominate.',     'hero',        1, '{"cta_label": "Enter Arena", "cta_url": "/tournaments"}'::jsonb),
  ('stats_bar',   'Platform Stats',         NULL,                          'stats',       2, '{"show_players": true, "show_tournaments": true, "show_prize": true}'::jsonb),
  ('features',    'Why CipherPool?',        'Built for champions',         'features',    3, '{"items": []}'::jsonb),
  ('tournaments', 'Active Tournaments',     'Join the action',             'tournaments', 4, '{"limit": 6, "show_prize": true}'::jsonb),
  ('cta',         'Ready to Compete?',      'Join thousands of players',   'cta',         5, '{"button_label": "Start Playing", "button_url": "/register"}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 4. NAVIGATION ITEMS — dynamic navigation management
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_zone     text        NOT NULL DEFAULT 'sidebar'
                CHECK (nav_zone IN ('sidebar','mobile_bottom','mobile_drawer','topnav')),
  label        text        NOT NULL,
  path         text        NOT NULL,
  icon_name    text,
  sort_order   integer     NOT NULL DEFAULT 0,
  section      text,
  is_enabled   boolean     NOT NULL DEFAULT true,
  min_role     text        NOT NULL DEFAULT 'user'
                CHECK (min_role IN ('user','admin','super_admin','founder','fondateur')),
  badge_type   text,  -- 'count_reports', 'count_alerts', etc.
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ni_read_all" ON public.navigation_items
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "ni_write_super" ON public.navigation_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur'))
  );

GRANT SELECT ON public.navigation_items TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 5. MEDIA ASSETS — centralized media library
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_assets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  url          text        NOT NULL,
  bucket       text        NOT NULL,
  path         text        NOT NULL,
  mime_type    text,
  size_bytes   bigint,
  width        integer,
  height       integer,
  alt_text     text,
  category     text        NOT NULL DEFAULT 'general'
                CHECK (category IN ('general','banner','avatar','logo','tournament','background','icon')),
  tags         text[]      DEFAULT '{}',
  uploaded_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ma_category_idx ON public.media_assets(category);
CREATE INDEX IF NOT EXISTS ma_bucket_idx   ON public.media_assets(bucket);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_read_all" ON public.media_assets
  FOR SELECT USING (true);

CREATE POLICY "ma_write_admin" ON public.media_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT INSERT, DELETE ON public.media_assets TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 6. CMS LOGS — audit trail for all admin/CMS changes
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cms_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text        NOT NULL,  -- 'update_setting', 'toggle_flag', 'publish_section', etc.
  table_name  text,
  record_id   text,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cl_actor_idx   ON public.cms_logs(actor_id);
CREATE INDEX IF NOT EXISTS cl_action_idx  ON public.cms_logs(action);
CREATE INDEX IF NOT EXISTS cl_created_idx ON public.cms_logs(created_at DESC);

ALTER TABLE public.cms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cl_read_admin" ON public.cms_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','founder','fondateur'))
  );

CREATE POLICY "cl_insert_self" ON public.cms_logs
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

GRANT SELECT, INSERT ON public.cms_logs TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 7. AUTO-LOG TRIGGER — tracks changes to site_settings, feature_flags
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cms_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.cms_logs (actor_id, action, table_name, record_id, old_value, new_value)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.key::text, NEW.id::text, OLD.key::text, OLD.id::text),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cms_log_site_settings    ON public.site_settings;
DROP TRIGGER IF EXISTS cms_log_feature_flags    ON public.feature_flags;
DROP TRIGGER IF EXISTS cms_log_homepage_sections ON public.homepage_sections;

CREATE TRIGGER cms_log_site_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.cms_audit_trigger();

CREATE TRIGGER cms_log_feature_flags
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.cms_audit_trigger();

CREATE TRIGGER cms_log_homepage_sections
  AFTER INSERT OR UPDATE OR DELETE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.cms_audit_trigger();


-- ─────────────────────────────────────────────────────────────────────
-- 8. RPC: get_site_settings_public
--    Returns all public settings as a key→value map (safe for frontend)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_site_settings_public()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_object_agg(key, value)
  FROM public.site_settings
  WHERE is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_site_settings_public() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 9. RPC: update_site_setting (super_admin/founder only)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_site_setting(
  p_key   text,
  p_value jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.site_settings
  SET value = p_value, updated_by = auth.uid(), updated_at = now()
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Setting key "%" not found', p_key;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_site_setting(text, jsonb) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 10. RPC: toggle_feature_flag (super_admin only)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_feature_flag(
  p_key      text,
  p_enabled  boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied — super_admin only';
  END IF;

  UPDATE public.feature_flags
  SET is_enabled = p_enabled, updated_by = auth.uid(), updated_at = now()
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature flag "%" not found', p_key;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_feature_flag(text, boolean) TO authenticated;
