-- ================================================================
-- CIPHERPOOL SOCIAL SYSTEM — FULL MIGRATION
-- Version: 1.0.0
-- Tables: user_presence, friend_requests, friends, blocked_users,
--         stories, story_views, story_reactions,
--         conversations, conversation_members, direct_messages
-- ================================================================

-- ----------------------------------------------------------------
-- 1. USER PRESENCE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_presence (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'offline'
                 CHECK (status IN ('online','offline','away','in_game','in_tournament','streaming')),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  activity     JSONB       NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presence_select_all"   ON user_presence FOR SELECT USING (true);
CREATE POLICY "presence_upsert_self"  ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_update_self"  ON user_presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "presence_delete_self"  ON user_presence FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 2. FRIEND REQUESTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "freq_select_parties"  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "freq_insert_sender"   ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "freq_update_parties"  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "freq_delete_parties"  ON friend_requests FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ----------------------------------------------------------------
-- 3. FRIENDS  (bidirectional — one row per direction)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends_select_parties" ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_insert_self"    ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friends_update_self"    ON friends FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "friends_delete_parties" ON friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ----------------------------------------------------------------
-- 4. BLOCKED USERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_select_self"  ON blocked_users FOR SELECT  USING (auth.uid() = blocker_id);
CREATE POLICY "block_insert_self"  ON blocked_users FOR INSERT  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "block_delete_self"  ON blocked_users FOR DELETE  USING (auth.uid() = blocker_id);

-- ----------------------------------------------------------------
-- 5. STORIES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption       TEXT,
  privacy       TEXT NOT NULL DEFAULT 'friends'
                  CHECK (privacy IN ('public','friends','clan','team')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count    INT  NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Visibility: own + public + friends-only if friendship exists
CREATE POLICY "stories_select_visible" ON stories FOR SELECT
  USING (
    expires_at > now()
    AND (
      user_id = auth.uid()
      OR privacy = 'public'
      OR (
        privacy = 'friends'
        AND EXISTS (
          SELECT 1 FROM friends f
          WHERE f.user_id = stories.user_id AND f.friend_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "stories_insert_self"  ON stories FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update_self"  ON stories FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "stories_delete_self"  ON stories FOR DELETE  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 6. STORY VIEWS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sview_select" ON story_views FOR SELECT
  USING (
    auth.uid() = viewer_id
    OR EXISTS (SELECT 1 FROM stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );
CREATE POLICY "sview_insert_self" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ----------------------------------------------------------------
-- 7. STORY REACTIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sreact_select_all"   ON story_reactions FOR SELECT  USING (true);
CREATE POLICY "sreact_insert_self"  ON story_reactions FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sreact_update_self"  ON story_reactions FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "sreact_delete_self"  ON story_reactions FOR DELETE  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 8. CONVERSATIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name                 TEXT,
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_select_member" ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "conv_insert_any"    ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "conv_update_member" ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 9. CONVERSATION MEMBERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin        BOOLEAN NOT NULL DEFAULT false,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmem_select_self"   ON conversation_members FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "cmem_insert_self"   ON conversation_members FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cmem_update_self"   ON conversation_members FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "cmem_delete_self"   ON conversation_members FOR DELETE  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 10. DIRECT MESSAGES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direct_messages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id         UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content                 TEXT,
  media_url               TEXT,
  media_type              TEXT CHECK (media_type IN ('image','video','voice','file')),
  reply_to_id             UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
  is_edited               BOOLEAN NOT NULL DEFAULT false,
  is_deleted_for_everyone BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_select_member" ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = direct_messages.conversation_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "dm_insert_member" ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = direct_messages.conversation_id AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "dm_update_sender" ON direct_messages FOR UPDATE  USING (auth.uid() = sender_id);
CREATE POLICY "dm_delete_sender" ON direct_messages FOR DELETE  USING (auth.uid() = sender_id);

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Upsert own presence
CREATE OR REPLACE FUNCTION upsert_presence(p_status TEXT DEFAULT 'online')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_seen, updated_at)
  VALUES (auth.uid(), p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    status     = EXCLUDED.status,
    last_seen  = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Set self offline
CREATE OR REPLACE FUNCTION set_user_offline()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', last_seen = now(), updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Accept friend request → creates bidirectional friendship
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req
  FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  INSERT INTO friends (user_id, friend_id) VALUES (req.sender_id,   req.receiver_id) ON CONFLICT DO NOTHING;
  INSERT INTO friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id)   ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = auth.uid()
  JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv_id, auth.uid());
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv_id, other_user_id);

  RETURN conv_id;
END;
$$;

-- Record a story view (idempotent) + increment counter
CREATE OR REPLACE FUNCTION record_story_view(p_story_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO story_views (story_id, viewer_id)
  VALUES (p_story_id, auth.uid())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted THEN
    UPDATE stories SET view_count = view_count + 1 WHERE id = p_story_id;
  END IF;
END;
$$;

-- Dashboard stories feed:
-- Returns one row per user who has active stories, ordered:
--   1. current user first
--   2. unseen before seen
--   3. newest first
CREATE OR REPLACE FUNCTION get_dashboard_stories()
RETURNS TABLE (
  user_id          UUID,
  username         TEXT,
  avatar_url       TEXT,
  has_unseen       BOOLEAN,
  story_count      BIGINT,
  latest_story_id  UUID,
  latest_media_url TEXT,
  latest_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH visible AS (
    SELECT
      s.id,
      s.user_id,
      s.media_url,
      s.created_at,
      p.username,
      p.avatar_url,
      NOT EXISTS (
        SELECT 1 FROM story_views sv
        WHERE sv.story_id = s.id AND sv.viewer_id = auth.uid()
      ) AS is_unseen
    FROM stories s
    JOIN profiles p ON p.id = s.user_id
    WHERE
      s.expires_at > now()
      AND (
        s.user_id = auth.uid()
        OR s.privacy = 'public'
        OR (
          s.privacy = 'friends'
          AND EXISTS (
            SELECT 1 FROM friends f
            WHERE f.user_id = s.user_id AND f.friend_id = auth.uid()
          )
        )
      )
  ),
  grouped AS (
    SELECT
      v.user_id,
      v.username,
      v.avatar_url,
      bool_or(v.is_unseen)                                    AS has_unseen,
      COUNT(*)                                                 AS story_count,
      (array_agg(v.id         ORDER BY v.created_at DESC))[1] AS latest_story_id,
      (array_agg(v.media_url  ORDER BY v.created_at DESC))[1] AS latest_media_url,
      MAX(v.created_at)                                        AS latest_created_at
    FROM visible v
    GROUP BY v.user_id, v.username, v.avatar_url
  )
  SELECT *
  FROM grouped
  ORDER BY
    (CASE WHEN grouped.user_id = auth.uid() THEN 0 ELSE 1 END),
    has_unseen DESC,
    latest_created_at DESC;
END;
$$;

-- All non-expired stories for a given user (for viewer)
CREATE OR REPLACE FUNCTION get_user_stories(p_user_id UUID)
RETURNS TABLE (
  id          UUID,
  media_url   TEXT,
  media_type  TEXT,
  caption     TEXT,
  created_at  TIMESTAMPTZ,
  view_count  INT,
  is_seen     BOOLEAN,
  reactions   JSONB
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.media_url,
    s.media_type,
    s.caption,
    s.created_at,
    s.view_count,
    EXISTS (
      SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = auth.uid()
    ) AS is_seen,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('emoji', r.reaction, 'count', r.cnt))
        FROM (
          SELECT reaction, COUNT(*) AS cnt
          FROM story_reactions
          WHERE story_id = s.id
          GROUP BY reaction
        ) r
      ),
      '[]'::jsonb
    ) AS reactions
  FROM stories s
  WHERE s.user_id = p_user_id AND s.expires_at > now()
  ORDER BY s.created_at ASC;
END;
$$;

-- Check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends WHERE user_id = user_a AND friend_id = user_b
  );
$$;

-- ================================================================
-- REALTIME — enable for relevant tables
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;
ALTER PUBLICATION supabase_realtime ADD TABLE story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- ================================================================
-- STORAGE BUCKET + POLICIES
-- Run these in Supabase Dashboard > SQL Editor (as service role)
-- ================================================================

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'stories', 'stories', true,
--   52428800,  -- 50 MB
--   ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "stories_upload" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "stories_public_read" ON storage.objects FOR SELECT
--   USING (bucket_id = 'stories');

-- CREATE POLICY "stories_owner_delete" ON storage.objects FOR DELETE
--   USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ================================================================
-- SCHEDULED CLEANUP (requires pg_cron — enable in Supabase Dashboard)
-- ================================================================
-- SELECT cron.schedule(
--   'cleanup-expired-stories',
--   '0 * * * *',
--   $$ DELETE FROM stories WHERE expires_at < now() - INTERVAL '1 hour' $$
-- );
