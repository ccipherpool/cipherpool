-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/59 Add missing player_stats columns
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- win_streak and best_win_streak were defined in migration 16 but may not
-- have been applied if the table already existed before that migration.
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS win_streak      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_win_streak integer NOT NULL DEFAULT 0;

-- updated_at for tracking when stats last changed
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────
-- Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('59_player_stats_win_streak.sql')
ON CONFLICT (filename) DO NOTHING;
