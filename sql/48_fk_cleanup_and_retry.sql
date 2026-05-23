-- ════════════════════════════════════════════════════════════════════════════
-- CIPHERPOOL — FK Cleanup & Retry (migration 47 partial failure recovery)
-- File: sql/48_fk_cleanup_and_retry.sql
-- Run AFTER 47_missing_rpcs_and_schema_fixes.sql
--
-- Why this exists:
--   Migration 47 failed mid-run on the user_presence FK constraint because
--   a row in user_presence had a user_id present in auth.users but NOT in
--   public.profiles (orphaned row). Postgres aborts the batch on first error,
--   so everything after that point (support_tickets FKs, all RPCs, stories
--   grants, friends RLS) may or may not have applied.
--   This migration cleans the orphaned rows, then idempotently re-applies
--   everything that was at risk.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLEAN ORPHANED ROWS
-- Remove rows that reference auth.users UUIDs not present in public.profiles.
-- These are leftover from before the profile-creation trigger existed.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.user_presence
  WHERE user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.friends
  WHERE user_id   NOT IN (SELECT id FROM public.profiles)
     OR friend_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.friend_requests
  WHERE sender_id   NOT IN (SELECT id FROM public.profiles)
     OR receiver_id NOT IN (SELECT id FROM public.profiles);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. USER_PRESENCE FK → profiles (failed in migration 47)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_presence
  DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey;

ALTER TABLE public.user_presence
  ADD CONSTRAINT user_presence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SUPPORT_TICKETS FKs → profiles (may not have run in migration 47)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey,
  DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_id_fkey
    FOREIGN KEY (user_id)     REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT support_tickets_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPCS — idempotent re-create (may not have run in migration 47)
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. upsert_presence
CREATE OR REPLACE FUNCTION public.upsert_presence(p_status text DEFAULT 'online')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only upsert if the calling user has a profile row.
  -- This prevents FK violation when a user exists in auth.users but not profiles.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (auth.uid(), p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET status     = EXCLUDED.status,
        last_seen  = now(),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_presence(text) TO authenticated;

-- 4b. set_user_offline
CREATE OR REPLACE FUNCTION public.set_user_offline()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_presence
  SET status = 'offline', updated_at = now()
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.set_user_offline() TO authenticated;

-- 4c. accept_friend_request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
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

-- 4d. equip_item
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
-- 5. STORIES — refresh grants and RLS
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
-- 6. FRIENDS & FRIEND_REQUESTS — RLS + grants
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

DO $$ BEGIN RAISE NOTICE 'Migration 48_fk_cleanup_and_retry complete.'; END $$;
