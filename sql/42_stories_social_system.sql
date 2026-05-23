-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Stories & Social System
-- Creates: stories, story_views, story_reactions tables
--          get_dashboard_stories, get_user_stories, record_story_view RPCs
--          Storage bucket for stories media
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. STORIES TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url   text        NOT NULL,
  media_type  text        NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption     text,
  privacy     text        NOT NULL DEFAULT 'friends'
                CHECK (privacy IN ('public','friends','clan','team')),
  view_count  integer     NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_user_idx    ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS stories_expires_idx ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS stories_created_idx ON public.stories(created_at DESC);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_read_public"  ON public.stories;
DROP POLICY IF EXISTS "stories_read_owner"   ON public.stories;
DROP POLICY IF EXISTS "stories_insert_self"  ON public.stories;
DROP POLICY IF EXISTS "stories_delete_self"  ON public.stories;

-- Anyone can read public stories that haven't expired
CREATE POLICY "stories_read_public" ON public.stories
  FOR SELECT USING (
    expires_at > now()
    AND (
      privacy = 'public'
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
      )
    )
  );

CREATE POLICY "stories_insert_self" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_delete_self" ON public.stories
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

GRANT SELECT ON TABLE public.stories TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.stories TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 2. STORY VIEWS TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.story_views (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_story_idx  ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS story_views_viewer_idx ON public.story_views(viewer_id);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_insert_self" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "story_views_read_owner" ON public.story_views
  FOR SELECT USING (
    viewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON TABLE public.story_views TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3. STORY REACTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction   text        NOT NULL CHECK (char_length(reaction) <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS story_reactions_story_idx ON public.story_reactions(story_id);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_reactions_read_all" ON public.story_reactions
  FOR SELECT USING (true);

CREATE POLICY "story_reactions_write_self" ON public.story_reactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON TABLE public.story_reactions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.story_reactions TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKET FOR STORIES
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories',
  'stories',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm'];

-- Storage RLS policies for stories bucket
DROP POLICY IF EXISTS "stories_storage_read"   ON storage.objects;
DROP POLICY IF EXISTS "stories_storage_insert"  ON storage.objects;
DROP POLICY IF EXISTS "stories_storage_delete"  ON storage.objects;

CREATE POLICY "stories_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "stories_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "stories_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stories'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
      )
    )
  );


-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: get_dashboard_stories
--    Returns one row per user who has active stories,
--    with whether the current user has seen the latest story.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_stories()
RETURNS TABLE (
  user_id           uuid,
  username          text,
  avatar_url        text,
  story_count       bigint,
  has_unseen        boolean,
  latest_story_id   uuid,
  latest_media_url  text,
  latest_created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id                AS user_id,
    p.username,
    p.avatar_url,
    COUNT(s.id)         AS story_count,
    -- has_unseen: any story the viewer hasn't seen
    bool_or(
      NOT EXISTS (
        SELECT 1 FROM public.story_views sv
        WHERE sv.story_id = s.id AND sv.viewer_id = auth.uid()
      )
    ) AS has_unseen,
    (
      SELECT s2.id FROM public.stories s2
      WHERE s2.user_id = p.id AND s2.expires_at > now()
      ORDER BY s2.created_at DESC LIMIT 1
    ) AS latest_story_id,
    (
      SELECT s2.media_url FROM public.stories s2
      WHERE s2.user_id = p.id AND s2.expires_at > now()
      ORDER BY s2.created_at DESC LIMIT 1
    ) AS latest_media_url,
    (
      SELECT s2.created_at FROM public.stories s2
      WHERE s2.user_id = p.id AND s2.expires_at > now()
      ORDER BY s2.created_at DESC LIMIT 1
    ) AS latest_created_at
  FROM public.stories s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE
    s.expires_at > now()
    AND (
      s.privacy = 'public'
      OR s.user_id = auth.uid()
    )
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY
    -- own stories first
    (p.id = auth.uid()) DESC,
    -- then by latest activity
    MAX(s.created_at) DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stories() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: get_user_stories
--    Full story list for one user (for the viewer component)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_stories(p_user_id uuid)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  media_url   text,
  media_type  text,
  caption     text,
  privacy     text,
  view_count  integer,
  created_at  timestamptz,
  expires_at  timestamptz,
  reactions   jsonb
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    s.id,
    s.user_id,
    s.media_url,
    s.media_type,
    s.caption,
    s.privacy,
    s.view_count,
    s.created_at,
    s.expires_at,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('reaction', r.reaction, 'user_id', r.user_id))
        FROM public.story_reactions r
        WHERE r.story_id = s.id
      ),
      '[]'::jsonb
    ) AS reactions
  FROM public.stories s
  WHERE
    s.user_id = p_user_id
    AND s.expires_at > now()
    AND (
      s.user_id = auth.uid()
      OR s.privacy = 'public'
    )
  ORDER BY s.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stories(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 7. RPC: record_story_view (idempotent)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_story_view(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert the view (ignore duplicates)
  INSERT INTO public.story_views (story_id, viewer_id)
  VALUES (p_story_id, auth.uid())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  -- Increment view counter on the story
  UPDATE public.stories
  SET view_count = view_count + 1
  WHERE id = p_story_id
    AND user_id != auth.uid();  -- don't count own views
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_story_view(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 8. AUTO-CLEANUP: remove expired stories (optional trigger / cron)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.stories WHERE expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories() TO authenticated;
