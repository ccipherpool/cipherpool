-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Clans System
-- Tables: clans, clan_members
-- Run FIRST (before 02_clan_messages.sql)
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. CLANS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  tag           text        NOT NULL CHECK (char_length(tag) <= 5),
  description   text,
  rules         text,
  requirements  text,
  logo_url      text,
  accent_color  text        NOT NULL DEFAULT '#a855f7',
  is_open       boolean     NOT NULL DEFAULT true,
  leader_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points        integer     NOT NULL DEFAULT 0,
  wins          integer     NOT NULL DEFAULT 0,
  losses        integer     NOT NULL DEFAULT 0,
  discord_link  text,
  whatsapp_link text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clans_name_unique UNIQUE (name),
  CONSTRAINT clans_tag_unique  UNIQUE (tag)
);

CREATE INDEX IF NOT EXISTS clans_leader_id_idx ON public.clans(leader_id);
CREATE INDEX IF NOT EXISTS clans_points_idx    ON public.clans(points DESC);

-- Auto updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clans_set_updated_at ON public.clans;
CREATE TRIGGER clans_set_updated_at
  BEFORE UPDATE ON public.clans
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clans_select"        ON public.clans;
DROP POLICY IF EXISTS "clans_insert"        ON public.clans;
DROP POLICY IF EXISTS "clans_update_leader" ON public.clans;
DROP POLICY IF EXISTS "clans_delete_leader" ON public.clans;
DROP POLICY IF EXISTS "clans_admin_all"     ON public.clans;

CREATE POLICY "clans_select" ON public.clans
  FOR SELECT USING (true);

CREATE POLICY "clans_insert" ON public.clans
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "clans_update_leader" ON public.clans
  FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "clans_delete_leader" ON public.clans
  FOR DELETE USING (auth.uid() = leader_id);

CREATE POLICY "clans_admin_all" ON public.clans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Grants
GRANT SELECT                   ON TABLE public.clans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE   ON TABLE public.clans TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 2. CLAN_MEMBERS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clan_members (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id   uuid        NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member'
              CHECK (role IN ('leader', 'co-leader', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_members_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS clan_members_clan_id_idx ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS clan_members_user_id_idx ON public.clan_members(user_id);

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select"        ON public.clan_members;
DROP POLICY IF EXISTS "members_insert"        ON public.clan_members;
DROP POLICY IF EXISTS "members_delete_self"   ON public.clan_members;
DROP POLICY IF EXISTS "members_leader_manage" ON public.clan_members;
DROP POLICY IF EXISTS "members_admin_all"     ON public.clan_members;

CREATE POLICY "members_select" ON public.clan_members
  FOR SELECT USING (true);

CREATE POLICY "members_insert" ON public.clan_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_delete_self" ON public.clan_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "members_leader_manage" ON public.clan_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clans
      WHERE id = clan_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "members_admin_all" ON public.clan_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Grants
GRANT SELECT                   ON TABLE public.clan_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE   ON TABLE public.clan_members TO authenticated;
