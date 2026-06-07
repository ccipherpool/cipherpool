-- Fix: get_broadcast_email_recipients — "user_id is ambiguous"
-- Root cause: RETURNS TABLE(user_id uuid,...) shadows unqualified
-- column refs inside the CASE block. Add table alias to all references.

DROP FUNCTION IF EXISTS public.get_broadcast_email_recipients(uuid);

CREATE OR REPLACE FUNCTION public.get_broadcast_email_recipients(p_broadcast_id uuid)
RETURNS TABLE(user_id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast   public.notification_broadcasts%ROWTYPE;
  v_user_ids    uuid[];
BEGIN
  SELECT * INTO v_broadcast
  FROM public.notification_broadcasts
  WHERE id = p_broadcast_id;

  IF v_broadcast.id IS NULL THEN
    RETURN;
  END IF;

  -- Resolve target IDs (mirror of send_global_notification)
  CASE v_broadcast.target_type
    WHEN 'all_users' THEN
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p WHERE p.role != 'banned';

    WHEN 'admins' THEN
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p WHERE p.role IN ('admin','super_admin','founder');

    WHEN 'founders' THEN
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p WHERE p.role = 'founder';

    WHEN 'specific_role' THEN
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p WHERE p.role = (v_broadcast.target_filters->>'role');

    WHEN 'tournament_participants' THEN
      SELECT array_agg(DISTINCT tp.user_id) INTO v_user_ids
      FROM public.tournament_participants tp
      WHERE tp.tournament_id = (v_broadcast.target_filters->>'tournament_id')::uuid;

    WHEN 'specific_users' THEN
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p
      WHERE p.id = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_broadcast.target_filters->'user_ids')::uuid)
      );

    WHEN 'online_users' THEN
      SELECT array_agg(DISTINCT p.id) INTO v_user_ids
      FROM public.profiles p
      INNER JOIN public.user_presence up ON up.user_id = p.id
      WHERE up.status IN ('online','idle')
        AND up.last_seen > now() - INTERVAL '15 minutes'
        AND p.role != 'banned';

    WHEN 'clan_members' THEN
      SELECT array_agg(DISTINCT cm.user_id) INTO v_user_ids
      FROM public.clan_members cm
      WHERE cm.clan_id = (v_broadcast.target_filters->>'clan_id')::uuid;

    WHEN 'team_members' THEN
      SELECT array_agg(DISTINCT tm.user_id) INTO v_user_ids
      FROM public.team_members tm
      WHERE tm.team_id = (v_broadcast.target_filters->>'team_id')::uuid;

    ELSE
      SELECT array_agg(p.id) INTO v_user_ids
      FROM public.profiles p WHERE p.role != 'banned';
  END CASE;

  -- Return profiles with email, filtering out those who opted out
  RETURN QUERY
    SELECT p.id AS user_id, au.email::text, p.username
    FROM public.profiles p
    INNER JOIN auth.users au ON au.id = p.id
    WHERE p.id = ANY(v_user_ids)
      AND au.email IS NOT NULL
      AND au.email != ''
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = p.id AND np.email_notifications = false
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_broadcast_email_recipients(uuid) TO service_role;
