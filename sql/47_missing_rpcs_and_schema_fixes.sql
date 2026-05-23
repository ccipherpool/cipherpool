-- ════════════════════════════════════════════════════════════════════════════
-- CIPHERPOOL — Missing RPCs & Schema Fixes
-- File: sql/47_missing_rpcs_and_schema_fixes.sql
-- Run in Supabase SQL Editor after 46_data_and_rls_fixes.sql
--
-- What this does:
--   1. Adds missing columns (seasons.theme_color, user_daily_claims.day/coins/xp, news.views)
--   2. Fixes support_tickets category CHECK (adds English category names)
--   3. Expands user_presence status CHECK to include all statuses
--   4. Recreates FK constraints on friends/friend_requests/user_presence → profiles
--      (PostgREST requires FKs to public.profiles to enable join syntax)
--   5. Creates missing RPCs: upsert_presence, set_user_offline,
--      accept_friend_request, equip_item
--   6. Refreshes stories grants/RLS
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. MISSING COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#10b981';

-- user_daily_claims: function inserts day/coins/xp but table has day_claimed/coins_got
ALTER TABLE public.user_daily_claims
  ADD COLUMN IF NOT EXISTS day    integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS coins  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp     integer DEFAULT 0;

-- news: views counter (safe no-op if column already exists)
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SUPPORT TICKETS — expand category CHECK to include English names
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_category_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
    CHECK (category = ANY(ARRAY[
      'general','tournament','billing','account','bug',
      'tournoi','coins','compte','paiement','classement','autre'
    ]));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. USER_PRESENCE — expand status CHECK to include all statuses used by frontend
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_presence
  DROP CONSTRAINT IF EXISTS user_presence_status_check;

ALTER TABLE public.user_presence
  ADD CONSTRAINT user_presence_status_check
    CHECK (status = ANY(ARRAY[
      'online','offline','away','busy',
      'in_game','in_tournament','streaming'
    ]));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FK CONSTRAINTS → profiles.id
-- PostgREST can only join public tables, so FKs must point to public.profiles
-- not auth.users (which is internal schema, unreachable via PostgREST joins).
-- profiles.id = auth.users.id (same UUID), so data integrity is preserved.
-- ─────────────────────────────────────────────────────────────────────────────

-- friends
ALTER TABLE public.friends
  DROP CONSTRAINT IF EXISTS friends_user_id_fkey,
  DROP CONSTRAINT IF EXISTS friends_friend_id_fkey;

ALTER TABLE public.friends
  ADD CONSTRAINT friends_user_id_fkey
    FOREIGN KEY (user_id)   REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT friends_friend_id_fkey
    FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- friend_requests
ALTER TABLE public.friend_requests
  DROP CONSTRAINT IF EXISTS friend_requests_sender_id_fkey,
  DROP CONSTRAINT IF EXISTS friend_requests_receiver_id_fkey;

ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_sender_id_fkey
    FOREIGN KEY (sender_id)   REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT friend_requests_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- user_presence
ALTER TABLE public.user_presence
  DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey;

ALTER TABLE public.user_presence
  ADD CONSTRAINT user_presence_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- support_tickets (for AdminSupport FK join syntax)
ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey,
  DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_id_fkey
    FOREIGN KEY (user_id)     REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT support_tickets_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MISSING RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. upsert_presence — called every 25s by usePresence hook
CREATE OR REPLACE FUNCTION public.upsert_presence(p_status text DEFAULT 'online')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (auth.uid(), p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET status     = EXCLUDED.status,
        last_seen  = now(),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_presence(text) TO authenticated;

-- 5b. set_user_offline — called on page unload / tab close
CREATE OR REPLACE FUNCTION public.set_user_offline()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_presence
  SET status = 'offline', updated_at = now()
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.set_user_offline() TO authenticated;

-- 5c. accept_friend_request — bidirectional friendship creation
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

  -- Bidirectional friendship (UNIQUE on user_id, friend_id prevents duplicates)
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

-- 5d. equip_item — type-scoped equip, syncs avatar_url on profiles
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

  -- Unequip all items of the same type for this user
  UPDATE public.user_items ui
  SET equipped = false
  FROM public.store_items si
  WHERE ui.user_id = v_user_id
    AND ui.item_id = si.id
    AND si.type    = v_type;

  -- Equip the selected item
  UPDATE public.user_items
  SET equipped = true
  WHERE user_id = v_user_id AND item_id = p_item_id;

  -- Sync avatar_url on profiles for avatar-type items
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
-- 6. STORIES — refresh grants and RLS (re-apply after potential table recreation)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON TABLE public.stories TO authenticated;
GRANT SELECT ON TABLE public.stories TO anon;

-- Ensure the read policy covers the current user's own stories
-- even when privacy = 'friends'
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

-- Ensure INSERT grant has WITH CHECK in place
DROP POLICY IF EXISTS "stories_insert_self" ON public.stories;
CREATE POLICY "stories_insert_self" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FRIENDS & FRIEND_REQUESTS — ensure RLS is enabled + sane policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friends_read_self"   ON public.friends;
DROP POLICY IF EXISTS "friends_write_self"  ON public.friends;

CREATE POLICY "friends_read_self" ON public.friends
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friends_write_self" ON public.friends
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE, UPDATE ON public.friends TO authenticated;

-- friend_requests policies are already set in the backup; ensure grants exist
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;

DO $$ BEGIN RAISE NOTICE 'Migration 47_missing_rpcs_and_schema_fixes complete.'; END $$;
