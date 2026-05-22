-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/38 Chat Schema
-- Creates: chat_messages, private_conversations, private_messages,
--          user_presence. All with RLS, indexes, and Realtime.
-- Also adds a rate-limit RPC and a presence upsert RPC.
-- Safe to run multiple times (fully idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. chat_messages — public channel / room messages
--    channel: 'global' for the global chat, or a tournament/room id.
--    reply_to: self-reference for threaded replies.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    text        NOT NULL DEFAULT 'global',
  sender_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  type       text        NOT NULL DEFAULT 'text'
               CHECK (type IN ('text','system','announcement','emote')),
  reply_to   uuid        REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_deleted boolean     NOT NULL DEFAULT false,
  metadata   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cm_channel_date_idx
  ON public.chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS cm_sender_idx
  ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS cm_reply_idx
  ON public.chat_messages(reply_to)
  WHERE reply_to IS NOT NULL;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cm_read_all"       ON public.chat_messages;
DROP POLICY IF EXISTS "cm_insert_self"    ON public.chat_messages;
DROP POLICY IF EXISTS "cm_soft_delete"    ON public.chat_messages;
DROP POLICY IF EXISTS "cm_admin_all"      ON public.chat_messages;

-- Anyone authenticated can read non-deleted messages
CREATE POLICY "cm_read_all" ON public.chat_messages
  FOR SELECT USING (is_deleted = false OR auth.uid() = sender_id);

-- Users insert their own messages (rate limit enforced in RPC)
CREATE POLICY "cm_insert_self" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can soft-delete their own messages
CREATE POLICY "cm_soft_delete" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id AND is_deleted = true);

-- Admins have full access
CREATE POLICY "cm_admin_all" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;
GRANT UPDATE (is_deleted) ON TABLE public.chat_messages TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2. private_conversations — canonical pair record
--    user1_id < user2_id constraint enforces canonical ordering so
--    there is always exactly one row per pair regardless of who
--    initiates the conversation.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_conversations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message     text,
  last_message_at  timestamptz,
  unread_u1        integer     NOT NULL DEFAULT 0 CHECK (unread_u1 >= 0),
  unread_u2        integer     NOT NULL DEFAULT 0 CHECK (unread_u2 >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id),
  CHECK (user1_id <> user2_id)
);

CREATE INDEX IF NOT EXISTS pc_user1_idx ON public.private_conversations(user1_id);
CREATE INDEX IF NOT EXISTS pc_user2_idx ON public.private_conversations(user2_id);
CREATE INDEX IF NOT EXISTS pc_last_msg_idx
  ON public.private_conversations(last_message_at DESC NULLS LAST);

ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_read_self"   ON public.private_conversations;
DROP POLICY IF EXISTS "pc_admin_all"   ON public.private_conversations;

CREATE POLICY "pc_read_self" ON public.private_conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "pc_admin_all" ON public.private_conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

GRANT SELECT ON TABLE public.private_conversations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. private_messages — messages within a conversation
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_deleted      boolean     NOT NULL DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pm_conv_date_idx
  ON public.private_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pm_sender_idx
  ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS pm_unread_idx
  ON public.private_messages(conversation_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_read_participants"  ON public.private_messages;
DROP POLICY IF EXISTS "pm_insert_sender"      ON public.private_messages;
DROP POLICY IF EXISTS "pm_soft_delete_sender" ON public.private_messages;
DROP POLICY IF EXISTS "pm_admin_all"          ON public.private_messages;

CREATE POLICY "pm_read_participants" ON public.private_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.private_conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "pm_insert_sender" ON public.private_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.private_conversations
      WHERE id = conversation_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "pm_soft_delete_sender" ON public.private_messages
  FOR UPDATE USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id AND is_deleted = true);

CREATE POLICY "pm_admin_all" ON public.private_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

GRANT SELECT, INSERT ON TABLE public.private_messages TO authenticated;
GRANT UPDATE (is_deleted, read_at) ON TABLE public.private_messages TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. user_presence — online/idle/dnd/offline status
--    Single row per user (PK = user_id). Updated via RPC.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id    uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'offline'
               CHECK (status IN ('online','idle','dnd','offline')),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS up_status_idx
  ON public.user_presence(status)
  WHERE status IN ('online','idle');

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "up_read_all"   ON public.user_presence;
DROP POLICY IF EXISTS "up_write_self" ON public.user_presence;
DROP POLICY IF EXISTS "up_admin_all"  ON public.user_presence;

CREATE POLICY "up_read_all" ON public.user_presence
  FOR SELECT USING (true);

CREATE POLICY "up_write_self" ON public.user_presence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "up_admin_all" ON public.user_presence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','super_admin')
    )
  );

GRANT SELECT ON TABLE public.user_presence TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.user_presence TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RPC: send_chat_message — rate-limited (30 messages / 60 seconds)
--    Inserting via RPC ensures the rate limit is always checked.
--    Returns the inserted row on success.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_chat_message(text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_content  text,
  p_channel  text    DEFAULT 'global',
  p_type     text    DEFAULT 'text',
  p_reply_to uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_profile   record;
  v_msg_count integer;
  v_msg_id    uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate content
  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;
  IF char_length(p_content) > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message too long (max 500 characters)');
  END IF;

  -- Check sender is not banned
  SELECT role INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile.role = 'banned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banned users cannot send messages');
  END IF;

  -- Rate limit: max 30 messages per 60 seconds per user per channel
  SELECT COUNT(*) INTO v_msg_count
  FROM public.chat_messages
  WHERE sender_id = v_user_id
    AND channel   = p_channel
    AND created_at >= now() - INTERVAL '60 seconds'
    AND is_deleted = false;

  IF v_msg_count >= 30 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Rate limit reached — wait before sending more messages'
    );
  END IF;

  INSERT INTO public.chat_messages
    (channel, sender_id, content, type, reply_to)
  VALUES
    (p_channel, v_user_id, p_content, COALESCE(p_type, 'text'), p_reply_to)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'id',      v_msg_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text, text, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC: update_presence — upsert user presence status
--    Called by the frontend on connect/disconnect/tab-focus events.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_presence(text);
CREATE OR REPLACE FUNCTION public.update_presence(p_status text DEFAULT 'online')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;

  IF p_status NOT IN ('online','idle','dnd','offline') THEN
    RAISE EXCEPTION 'Invalid presence status: %', p_status;
  END IF;

  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (v_user_id, p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET status     = EXCLUDED.status,
        last_seen  = EXCLUDED.last_seen,
        updated_at = EXCLUDED.updated_at;

  -- Keep profiles.last_seen_at in sync
  UPDATE public.profiles
  SET last_seen_at = now()
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_presence(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 7. RPC: get_or_create_conversation — returns conversation id for a
--    pair of users, creating the row if it doesn't exist yet.
--    Enforces canonical ordering (user1_id < user2_id).
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid);
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me   uuid := auth.uid();
  v_u1   uuid;
  v_u2   uuid;
  v_conv_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Canonical ordering
  IF v_me < p_other_user_id THEN
    v_u1 := v_me; v_u2 := p_other_user_id;
  ELSE
    v_u1 := p_other_user_id; v_u2 := v_me;
  END IF;

  INSERT INTO public.private_conversations (user1_id, user2_id)
  VALUES (v_u1, v_u2)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;

  SELECT id INTO v_conv_id
  FROM public.private_conversations
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 8. RPC: send_private_message — sends a DM and updates conversation
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_private_message(uuid, text);
CREATE OR REPLACE FUNCTION public.send_private_message(
  p_conversation_id uuid,
  p_content         text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conv    record;
  v_msg_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;
  IF char_length(p_content) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message too long (max 2000 characters)');
  END IF;

  SELECT * INTO v_conv
  FROM public.private_conversations
  WHERE id = p_conversation_id
    AND (user1_id = v_user_id OR user2_id = v_user_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversation not found');
  END IF;

  INSERT INTO public.private_messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_user_id, p_content)
  RETURNING id INTO v_msg_id;

  -- Update conversation metadata + increment unread for the OTHER user
  UPDATE public.private_conversations
  SET
    last_message    = LEFT(p_content, 100),
    last_message_at = now(),
    unread_u1 = CASE WHEN user2_id = v_user_id THEN unread_u1 + 1 ELSE unread_u1 END,
    unread_u2 = CASE WHEN user1_id = v_user_id THEN unread_u2 + 1 ELSE unread_u2 END
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'id', v_msg_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_private_message(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 9. ENABLE REALTIME on new tables
--    Supabase Realtime listens to these tables for live updates.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 10. REGISTER MIGRATION
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('38_chat_schema.sql')
ON CONFLICT (filename) DO NOTHING;
