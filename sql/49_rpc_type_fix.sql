-- ════════════════════════════════════════════════════════════════════════════
-- CIPHERPOOL — RPC Type Fix (migration 48 partial failure recovery)
-- File: sql/49_rpc_type_fix.sql
-- Run AFTER 48_fk_cleanup_and_retry.sql
--
-- Why this exists:
--   Migration 48 failed on CREATE OR REPLACE accept_friend_request because
--   the function already existed in the DB with a different return type.
--   CREATE OR REPLACE cannot change a function's return type — must DROP first.
--   Everything after that point in migration 48 (equip_item, stories grants,
--   friends RLS) may not have run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. accept_friend_request — drop first to allow return-type change
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.accept_friend_request(uuid);

CREATE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_sender  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT sender_id INTO v_sender
  FROM public.friend_requests
  WHERE id = request_id
    AND receiver_id = v_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_user_id, v_sender)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_sender, v_user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. equip_item — drop + recreate (same pattern, ensures fresh state)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.equip_item(uuid);

CREATE FUNCTION public.equip_item(p_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_type    text;
  v_img     text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT type, image_url INTO v_type, v_img
  FROM public.store_items
  WHERE id = p_item_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned');
  END IF;

  UPDATE public.user_items ui
  SET equipped = false
  FROM public.store_items si
  WHERE ui.user_id = v_user_id
    AND ui.item_id = si.id
    AND si.type    = v_type;

  UPDATE public.user_items
  SET equipped = true
  WHERE user_id = v_user_id AND item_id = p_item_id;

  IF v_type = 'avatar' AND v_img IS NOT NULL THEN
    UPDATE public.profiles
    SET avatar_url = v_img
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_item(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. STORIES — grants and RLS (idempotent re-apply)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON TABLE public.stories TO authenticated;
GRANT SELECT ON TABLE public.stories TO anon;

DROP POLICY IF EXISTS "stories_read_public" ON public.stories;
CREATE POLICY "stories_read_public" ON public.stories
  FOR SELECT USING (
    expires_at > now()
    AND (
      privacy = 'public'
      OR user_id = auth.uid()
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "stories_insert_self" ON public.stories;
CREATE POLICY "stories_insert_self" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FRIENDS & FRIEND_REQUESTS — RLS + grants
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friends_read_self"  ON public.friends;
DROP POLICY IF EXISTS "friends_write_self" ON public.friends;

CREATE POLICY "friends_read_self" ON public.friends
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friends_write_self" ON public.friends
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE, UPDATE ON public.friends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Migration 49_rpc_type_fix complete.'; END $$;
