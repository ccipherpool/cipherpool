-- ═══════════════════════════════════════════════════════════════════
-- CipherPool · Supabase System Schema (Audit Fix 2026)
-- Run this in your Supabase SQL Editor to fix 400 Errors
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ──────────────────────────────────────────────────────────────────

-- WALLETS (Core Economy)
CREATE TABLE IF NOT EXISTS wallets (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    INTEGER DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MATCH RESULTS (Tactical Data)
CREATE TABLE IF NOT EXISTS match_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  winner_id     UUID REFERENCES auth.users(id),
  score_data    JSONB DEFAULT '{}',
  screenshot_url TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- REPORTS (Security)
CREATE TABLE IF NOT EXISTS reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID REFERENCES auth.users(id),
  reported_id  UUID REFERENCES auth.users(id),
  type         TEXT NOT NULL CHECK (type IN ('cheat', 'insult', 'spam', 'other')),
  reason       TEXT,
  evidence_url TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_by  UUID REFERENCES auth.users(id),
  resolved_action TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- SUPPORT TICKETS (Tactical Aid)
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- STORE ITEMS (Redesign 2026)
CREATE TABLE IF NOT EXISTS store_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL DEFAULT 0,
  type        TEXT NOT NULL CHECK (type IN ('avatar', 'banner', 'frame', 'badge', 'name_color', 'emote')),
  rarity      TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  image_url   TEXT,
  active      BOOLEAN DEFAULT true,
  approved    BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- DAILY STORE (Rotation)
CREATE TABLE IF NOT EXISTS daily_store (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id     UUID REFERENCES store_items(id) ON DELETE CASCADE,
  date        DATE DEFAULT current_date,
  discount    INTEGER DEFAULT 0,
  UNIQUE(item_id, date)
);

-- ADMIN LOGS (Audit Trail)
CREATE TABLE IF NOT EXISTS admin_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- SYSTEM CONFIG (Operational Protocols)
CREATE TABLE IF NOT EXISTS system_config (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode     BOOLEAN DEFAULT false,
  registration_enabled BOOLEAN DEFAULT true,
  tournaments_enabled  BOOLEAN DEFAULT true,
  updated_by           UUID REFERENCES auth.users(id),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────
-- 2. SECURITY & RLS
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Wallets: Users see their own, admins see all
CREATE POLICY "wallets_read_self" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_read_admin" ON wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Store: Everyone can read active/approved items
CREATE POLICY "store_read_all" ON store_items FOR SELECT USING (active = true AND approved = true);
CREATE POLICY "store_write_admin" ON store_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'designer'))
);

-- Admin Logs: Only admins can read/write
CREATE POLICY "admin_logs_access" ON admin_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ──────────────────────────────────────────────────────────────────
-- 3. FUNCTIONS & RPC
-- ──────────────────────────────────────────────────────────────────

-- Function to ban users
CREATE OR REPLACE FUNCTION ban_user(target_user UUID, banned_until TIMESTAMPTZ, banned_by UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET role = 'banned', 
      banned_until = $2
  WHERE id = $1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban users
CREATE OR REPLACE FUNCTION unban_user(target_user UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles 
  SET role = 'user', 
      banned_until = NULL
  WHERE id = $1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to adjust coins (Economy)
CREATE OR REPLACE FUNCTION admin_adjust_coins(p_target_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  new_bal INTEGER;
BEGIN
  INSERT INTO wallets (user_id, balance) VALUES (p_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE wallets SET balance = balance + p_amount 
  WHERE user_id = p_target_user_id
  RETURNING balance INTO new_bal;
  
  RETURN jsonb_build_object('success', true, 'new_balance', new_bal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
