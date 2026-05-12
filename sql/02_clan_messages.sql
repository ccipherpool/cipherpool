-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Clan Chat Messages
-- Table: clan_messages
-- Run AFTER 01_clans.sql
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clan_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id    uuid        NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clan_messages_clan_id_idx ON public.clan_messages(clan_id);
CREATE INDEX IF NOT EXISTS clan_messages_user_id_idx ON public.clan_messages(user_id);
CREATE INDEX IF NOT EXISTS clan_messages_created_idx ON public.clan_messages(created_at DESC);

ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clan_messages_select"  ON public.clan_messages;
DROP POLICY IF EXISTS "clan_messages_insert"  ON public.clan_messages;
DROP POLICY IF EXISTS "clan_messages_delete"  ON public.clan_messages;
DROP POLICY IF EXISTS "clan_messages_admin"   ON public.clan_messages;

-- Any authenticated user can read clan chat
CREATE POLICY "clan_messages_select" ON public.clan_messages
  FOR SELECT USING (true);

-- Only clan member can send (user_id must match caller)
CREATE POLICY "clan_messages_insert" ON public.clan_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own messages
CREATE POLICY "clan_messages_delete" ON public.clan_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage everything
CREATE POLICY "clan_messages_admin" ON public.clan_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Grants
GRANT SELECT                ON TABLE public.clan_messages TO anon, authenticated;
GRANT INSERT, DELETE        ON TABLE public.clan_messages TO authenticated;
