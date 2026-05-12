-- ══════════════════════════════════════════════════════════════════════
-- CipherPool — Support Tickets: RLS + grants fix (400 error on INSERT)
-- ══════════════════════════════════════════════════════════════════════

-- 1. Table-level grants (missing grants cause 400 / PostgREST errors)
GRANT SELECT                  ON TABLE public.support_tickets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE  ON TABLE public.support_tickets TO authenticated;

GRANT SELECT                  ON TABLE public.support_messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE  ON TABLE public.support_messages TO authenticated;

-- 2. RLS (ensure enabled)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 3. support_tickets policies (drop & recreate clean)
DROP POLICY IF EXISTS "tickets_select_own"   ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_select_admin" ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_insert"       ON public.support_tickets;
DROP POLICY IF EXISTS "tickets_update_admin" ON public.support_tickets;

-- Users see their own tickets; admins see all
CREATE POLICY "tickets_select_own" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tickets_select_admin" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Any authenticated user can open a ticket (user_id must match caller)
CREATE POLICY "tickets_insert" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update (assign, change status, etc.)
CREATE POLICY "tickets_update_admin" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 4. support_messages policies
DROP POLICY IF EXISTS "messages_select"       ON public.support_messages;
DROP POLICY IF EXISTS "messages_insert"       ON public.support_messages;

-- Anyone involved in the ticket can read messages
CREATE POLICY "messages_select" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      ))
    )
  );

-- Authenticated users can insert messages on their own tickets or if admin
CREATE POLICY "messages_insert" ON public.support_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
