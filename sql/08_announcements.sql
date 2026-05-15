-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Announcements System
-- Tables: announcements, announcement_reads
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. ANNOUNCEMENTS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  content      text        NOT NULL,
  type         text        NOT NULL DEFAULT 'info'
                 CHECK (type IN ('info','warning','success','danger','maintenance','update')),
  priority     integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  is_pinned    boolean     NOT NULL DEFAULT false,
  target_roles text[]      DEFAULT NULL,  -- NULL = all users
  image_url    text,
  action_label text,
  action_url   text,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ann_active_idx   ON public.announcements(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS ann_date_idx     ON public.announcements(created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ann_read_active" ON public.announcements;
DROP POLICY IF EXISTS "ann_manage_admin" ON public.announcements;

CREATE POLICY "ann_read_active" ON public.announcements
  FOR SELECT USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      target_roles IS NULL
      OR (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      ) = ANY(target_roles)
    )
  );

CREATE POLICY "ann_manage_admin" ON public.announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT ON TABLE public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.announcements TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ANNOUNCEMENT READS (track which users have dismissed)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid        NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS ann_reads_user_idx ON public.announcement_reads(user_id);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ann_reads_self" ON public.announcement_reads
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ann_reads_admin" ON public.announcement_reads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

GRANT SELECT, INSERT ON TABLE public.announcement_reads TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: get_active_announcements — return unread active announcements
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS TABLE (
  id uuid, title text, content text, type text, priority integer,
  is_pinned boolean, image_url text, action_label text, action_url text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT a.id, a.title, a.content, a.type, a.priority,
         a.is_pinned, a.image_url, a.action_label, a.action_url, a.created_at
  FROM public.announcements a
  WHERE a.is_active = true
    AND (a.expires_at IS NULL OR a.expires_at > now())
    AND a.id NOT IN (
      SELECT announcement_id FROM public.announcement_reads WHERE user_id = auth.uid()
    )
  ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Insert a default welcome announcement
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.announcements (title, content, type, priority, is_pinned, is_active)
VALUES (
  'Welcome to CipherPool! 🎮',
  'The ultimate Free Fire tournament platform is now live. Join tournaments, earn CP, and climb the leaderboard. Good luck, soldier!',
  'success',
  100,
  true,
  true
)
ON CONFLICT DO NOTHING;
