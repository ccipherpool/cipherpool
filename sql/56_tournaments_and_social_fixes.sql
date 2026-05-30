-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/56 Tournaments & Social FK Fixes
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. TOURNAMENTS — ensure all columns used by the frontend exist
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS start_date       timestamptz,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS game_type        text,
  ADD COLUMN IF NOT EXISTS cs_format        text,
  ADD COLUMN IF NOT EXISTS room_status      text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_players  integer NOT NULL DEFAULT 0;

-- Ensure status CHECK allows 'draft'
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_status_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_status_check
  CHECK (status IN (
    'draft','published','registration_open','full','ready','live',
    'results_pending','completed','archived','cancelled'
  ));

-- ─────────────────────────────────────────────────────────────────────
-- 2. TOURNAMENTS RLS — allow founders and above to INSERT
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tournaments_insert_founder" ON public.tournaments;
CREATE POLICY "tournaments_insert_founder" ON public.tournaments
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'founder', 'fondateur')
    )
  );

DROP POLICY IF EXISTS "tournaments_read_all" ON public.tournaments;
CREATE POLICY "tournaments_read_all" ON public.tournaments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournaments_update_founder" ON public.tournaments;
CREATE POLICY "tournaments_update_founder" ON public.tournaments
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.tournaments TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. SOCIAL FK CONSTRAINTS → public.profiles
-- PostgREST join syntax (table!fkey_name) only works when FKs point
-- to public schema tables, not auth.users.
--
-- Before adding FK constraints, delete orphaned rows (users that exist
-- in auth.users but have no profiles row). This happens when a user
-- signs up but the handle_new_user trigger failed or was skipped.
-- ─────────────────────────────────────────────────────────────────────

-- Purge orphans from user_presence
DELETE FROM public.user_presence
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Purge orphans from friends
DELETE FROM public.friends
WHERE user_id   NOT IN (SELECT id FROM public.profiles)
   OR friend_id NOT IN (SELECT id FROM public.profiles);

-- Purge orphans from friend_requests
DELETE FROM public.friend_requests
WHERE sender_id   NOT IN (SELECT id FROM public.profiles)
   OR receiver_id NOT IN (SELECT id FROM public.profiles);

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

-- ─────────────────────────────────────────────────────────────────────
-- 3b. Backfill missing profile rows for any auth.users that have none
--     (prevents FK failures going forward)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, email, username, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  u.created_at,
  now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 4. SEASONS — ensure end_date column exists (frontend uses it)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS end_date timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('56_tournaments_and_social_fixes.sql')
ON CONFLICT (filename) DO NOTHING;
