-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — sql/58 Fix new-user wallet initial balance
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. Update handle_new_profile trigger to give new users 50 coins
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure the trigger is still attached (recreate if missing)
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Backfill existing users who have a wallet with 0 balance
--    (only update if wallet exists but was never topped up)
-- ─────────────────────────────────────────────────────────────────────
UPDATE public.wallets
SET balance = 50
WHERE balance = 0
  AND user_id IN (SELECT id FROM public.profiles);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Register migration
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename)
VALUES ('58_fix_new_user_wallet_balance.sql')
ON CONFLICT (filename) DO NOTHING;
