--
-- PostgreSQL database dump
--

\restrict gbqRswrUVfaUKctOTd3Y8nFosVPhELGvpizqAZrQPdYA2edskWip6i5mb01McSj

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: item_rarity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_rarity AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
);


--
-- Name: item_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_source AS ENUM (
    'store',
    'achievement',
    'event',
    'season_pass',
    'admin_grant'
);


--
-- Name: item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_type AS ENUM (
    'avatar',
    'banner',
    'badge',
    'name_color',
    'frame',
    'emote'
);


--
-- Name: accept_friend_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_friend_request(request_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req
  FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE friend_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  INSERT INTO friends (user_id, friend_id) VALUES (req.sender_id,   req.receiver_id) ON CONFLICT DO NOTHING;
  INSERT INTO friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id)   ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;


--
-- Name: accept_invitation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_invitation(p_inv_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM invitations
  WHERE id = p_inv_id AND receiver_id = auth.uid() AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN RETURN FALSE; END IF;

  UPDATE invitations SET status = 'accepted' WHERE id = p_inv_id;
  RETURN TRUE;
END;
$$;


--
-- Name: accept_team_invite(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_team_invite(p_invite_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invite team_invites%ROWTYPE;
  v_count INT; v_max INT;
BEGIN
  SELECT * INTO v_invite FROM team_invites WHERE id=p_invite_id AND status='pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','Invitation introuvable ou expirée');
  END IF;
  -- Seul le destinataire peut accepter
  IF v_invite.invited_user != auth.uid() THEN
    RETURN jsonb_build_object('success',false,'error','Permission refusée');
  END IF;
  -- Déjà dans une équipe?
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id=auth.uid()) THEN
    RETURN jsonb_build_object('success',false,'error','Vous êtes déjà dans une équipe');
  END IF;
  -- Team pleine?
  SELECT COUNT(*) INTO v_count FROM team_members WHERE team_id=v_invite.team_id;
  SELECT COALESCE(max_members,6) INTO v_max FROM teams WHERE id=v_invite.team_id;
  IF v_count >= v_max THEN
    UPDATE team_invites SET status='expired' WHERE id=p_invite_id;
    RETURN jsonb_build_object('success',false,'error','Équipe complète');
  END IF;
  -- Tout bon → rejoindre
  INSERT INTO team_members(team_id, user_id, role) VALUES (v_invite.team_id, auth.uid(), 'member');
  UPDATE team_invites SET status='accepted' WHERE id=p_invite_id;
  -- Annuler autres invites de ce user
  UPDATE team_invites SET status='cancelled' 
  WHERE invited_user=auth.uid() AND id!=p_invite_id AND status='pending';
  RETURN jsonb_build_object('success',true,'team_id',v_invite.team_id);
END;$$;


--
-- Name: add_application_note(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_application_note(p_application_id uuid, p_content text, p_is_internal boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  INSERT INTO public.admin_application_notes (application_id, author_id, content, is_internal)
  VALUES (p_application_id, auth.uid(), p_content, p_is_internal);
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: add_season_xp(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_season_xp(p_user_id uuid, p_xp integer, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_season_id uuid;
  v_new_xp    integer;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active season');
  END IF;
  INSERT INTO public.user_season_pass (user_id, season_id, xp)
  VALUES (p_user_id, v_season_id, p_xp)
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET xp = public.user_season_pass.xp + p_xp, updated_at = now()
  RETURNING xp INTO v_new_xp;
  RETURN jsonb_build_object('success', true, 'new_xp', v_new_xp);
END;
$$;


--
-- Name: add_season_xp(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_season_xp(p_user_id uuid, p_season_id uuid, p_xp integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_usp     record;
  v_new_xp  integer;
  v_new_tier integer;
  v_tier    record;
BEGIN
  -- Upsert user season pass
  INSERT INTO public.user_season_pass (user_id, season_id, current_xp, current_tier)
  VALUES (p_user_id, p_season_id, 0, 0)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  SELECT * INTO v_usp FROM public.user_season_pass WHERE user_id = p_user_id AND season_id = p_season_id;
  v_new_xp := v_usp.current_xp + p_xp;

  -- Calculate new tier based on cumulative XP
  SELECT COALESCE(MAX(tier), 0) INTO v_new_tier
  FROM public.season_pass_tiers
  WHERE season_id = p_season_id
    AND xp_required <= v_new_xp;

  UPDATE public.user_season_pass
  SET current_xp = v_new_xp, current_tier = GREATEST(current_tier, v_new_tier), updated_at = now()
  WHERE user_id = p_user_id AND season_id = p_season_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_tier', GREATEST(v_usp.current_tier, v_new_tier),
    'leveled_up', GREATEST(v_usp.current_tier, v_new_tier) > v_usp.current_tier
  );
END;
$$;


--
-- Name: add_war_points(uuid, uuid, uuid, integer, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_war_points(p_war_id uuid, p_clan_id uuid, p_user_id uuid, p_points integer, p_kills integer DEFAULT 0, p_wins integer DEFAULT 0, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_war record;
BEGIN
  SELECT * INTO v_war FROM public.clan_wars WHERE id = p_war_id AND status = 'active';
  IF v_war IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'War not found or not active');
  END IF;

  -- Verify clan is in this war
  IF v_war.clan_a_id != p_clan_id AND v_war.clan_b_id != p_clan_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clan is not part of this war');
  END IF;

  -- Add contribution
  INSERT INTO public.clan_war_contributions (war_id, clan_id, user_id, points, kills, wins, reason)
  VALUES (p_war_id, p_clan_id, p_user_id, p_points, p_kills, p_wins, p_reason);

  -- Update war score
  IF v_war.clan_a_id = p_clan_id THEN
    UPDATE public.clan_wars SET clan_a_score = clan_a_score + p_points, updated_at = now() WHERE id = p_war_id;
  ELSE
    UPDATE public.clan_wars SET clan_b_score = clan_b_score + p_points, updated_at = now() WHERE id = p_war_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_adjust_coins(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_adjust_coins(p_target_user_id uuid, p_amount integer, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id    uuid := auth.uid();
  v_new_balance integer;
  v_tx_type     text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be 0');
  END IF;

  v_tx_type := CASE WHEN p_amount > 0 THEN 'admin_grant' ELSE 'debit' END;

  -- Ensure wallet exists
  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Adjust (floor at 0 for deductions)
  UPDATE public.wallets
  SET balance    = CASE WHEN p_amount < 0
                        THEN GREATEST(0, balance + p_amount)
                        ELSE balance + p_amount END,
      updated_at = now()
  WHERE user_id = p_target_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User wallet not found');
  END IF;

  -- Transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (p_target_user_id, p_amount, v_tx_type,
    format('[Admin] %s', p_reason));

  -- Admin log
  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'adjust_coins', p_target_user_id,
      jsonb_build_object('amount', p_amount, 'reason', p_reason, 'new_balance', v_new_balance));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- User notification
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_target_user_id,
      CASE WHEN p_amount > 0 THEN 'coins_received' ELSE 'system' END,
      CASE WHEN p_amount > 0
           THEN format('💰 +%s CP reçus', p_amount)
           ELSE format('⚠️ %s CP déduits', ABS(p_amount)) END,
      format('%s', p_reason),
      jsonb_build_object('amount', p_amount, 'reason', p_reason, 'new_balance', v_new_balance)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', p_amount);
END;
$$;


--
-- Name: admin_grant_item(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_grant_item(p_target_user_id uuid, p_item_id uuid, p_reason text DEFAULT 'Admin Grant'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_item     record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_item FROM public.store_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  INSERT INTO public.user_items (user_id, item_id)
  VALUES (p_target_user_id, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'grant_item', p_target_user_id,
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name, 'reason', p_reason));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_target_user_id, 'gift',
      format('🎁 Cadeau Admin: %s', v_item.name),
      format('Un administrateur t''a offert "%s" — %s', v_item.name, p_reason),
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'item_name', v_item.name);
END;
$$;


--
-- Name: admin_grant_reward(uuid, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_grant_reward(p_target_user uuid, p_coins integer DEFAULT 100, p_xp integer DEFAULT 50, p_reason text DEFAULT 'Admin reward'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role NOT IN ('admin','super_admin','founder') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  UPDATE profiles SET coins = COALESCE(coins,0)+p_coins, xp = COALESCE(xp,0)+p_xp WHERE id = p_target_user;
  INSERT INTO admin_logs(user_id,action,details) VALUES (auth.uid(),'grant_reward',
    jsonb_build_object('target',p_target_user,'coins',p_coins,'xp',p_xp,'reason',p_reason));
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: admin_remove_item(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_remove_item(p_target_user_id uuid, p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_item     record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT name INTO v_item FROM public.store_items WHERE id = p_item_id;

  DELETE FROM public.user_items
  WHERE user_id = p_target_user_id AND item_id = p_item_id;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
    VALUES (v_admin_id, 'remove_item', p_target_user_id,
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_review_application(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_review_application(p_application_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.admin_applications
  SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_application_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_review_bug(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_review_bug(p_bug_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.bug_reports
  SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_bug_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_review_idea(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_review_idea(p_idea_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.community_ideas
  SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_idea_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_verify_result(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_verify_result(p_result_id uuid, p_action text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN RETURN jsonb_build_object('success', false, 'error', 'Staff only'); END IF;
  IF p_action NOT IN ('approve','reject') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid action'); END IF;
  UPDATE public.match_results
  SET status = CASE WHEN p_action = 'approve' THEN 'verified' ELSE 'rejected' END,
      verified_at = now(),
      verified_by = auth.uid(),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_result_id;
  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;


--
-- Name: admin_verify_result(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_verify_result(p_result_id uuid, p_approved boolean, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_result      record;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  SELECT * INTO v_result FROM public.match_results WHERE id = p_result_id;
  UPDATE public.match_results
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(), reviewed_at = now(), admin_note = p_note, updated_at = now()
  WHERE id = p_result_id;
  IF p_approved THEN
    UPDATE public.tournaments SET status = 'completed', winner_id = v_result.winner_id, updated_at = now()
    WHERE id = v_result.tournament_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: admin_verify_user(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_verify_user(target_user_id uuid, new_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.profiles
  set 
    verification_status = new_status,
    verified_at = case when new_status = 'approved' then now() else null end
  where id = target_user_id;
end;
$$;


--
-- Name: advance_tournament_status(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_tournament_status(p_tournament_id uuid, p_to_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current text;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT status INTO v_current
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF NOT public.valid_tournament_transition(v_current, p_to_status) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   format('Invalid transition: %s → %s', v_current, p_to_status)
    );
  END IF;

  UPDATE public.tournaments
  SET status = p_to_status, updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_to_status);
END;
$$;


--
-- Name: ai_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ai_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


--
-- Name: analytics_active_players_daily(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_active_players_daily(p_days integer DEFAULT 30) RETURNS TABLE(day date, active_users bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    DATE(created_at) AS day,
    COUNT(DISTINCT user_id) AS active_users
  FROM public.wallet_transactions
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;


--
-- Name: analytics_coin_flow_daily(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_coin_flow_daily(p_days integer DEFAULT 30) RETURNS TABLE(day date, credits bigint, debits bigint, net bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    DATE(created_at) AS day,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS credits,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)), 0) AS debits,
    COALESCE(SUM(amount), 0) AS net
  FROM public.wallet_transactions
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;


--
-- Name: analytics_platform_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_platform_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_total_users        bigint;
  v_new_users_7d       bigint;
  v_new_users_30d      bigint;
  v_total_tournaments  bigint;
  v_active_tournaments bigint;
  v_total_matches      bigint;
  v_total_coins        bigint;
  v_total_transactions bigint;
  v_total_clans        bigint;
  v_verified_players   bigint;
  v_banned_users       bigint;
  v_avg_fair_play      numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_new_users_7d  FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_new_users_30d FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_total_tournaments FROM public.tournaments;
  SELECT COUNT(*) INTO v_active_tournaments FROM public.tournaments WHERE status IN ('open','ongoing');
  SELECT COUNT(*) INTO v_total_matches FROM public.match_results;
  SELECT COALESCE(SUM(balance), 0) INTO v_total_coins FROM public.wallets;
  SELECT COUNT(*) INTO v_total_transactions FROM public.wallet_transactions;
  SELECT COUNT(*) INTO v_total_clans FROM public.clans;
  SELECT COUNT(*) INTO v_verified_players FROM public.profiles WHERE is_verified = true;
  SELECT COUNT(*) INTO v_banned_users FROM public.profiles WHERE role = 'banned';
  SELECT ROUND(AVG(fair_play_score), 1) INTO v_avg_fair_play FROM public.profiles;

  RETURN jsonb_build_object(
    'total_users',        v_total_users,
    'new_users_7d',       v_new_users_7d,
    'new_users_30d',      v_new_users_30d,
    'total_tournaments',  v_total_tournaments,
    'active_tournaments', v_active_tournaments,
    'total_matches',      v_total_matches,
    'total_coins',        v_total_coins,
    'total_transactions', v_total_transactions,
    'total_clans',        v_total_clans,
    'verified_players',   v_verified_players,
    'banned_users',       v_banned_users,
    'avg_fair_play',      v_avg_fair_play
  );
END;
$$;


--
-- Name: analytics_referral_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_referral_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_total_codes    bigint;
  v_total_uses     bigint;
  v_total_rewarded bigint;
  v_coins_spent    bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_codes FROM public.referral_codes WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_uses  FROM public.referral_uses;
  SELECT COUNT(*) INTO v_total_rewarded FROM public.referral_uses WHERE rewarded = true;
  SELECT COALESCE(SUM(referrer_reward + referred_reward), 0) INTO v_coins_spent FROM public.referral_uses WHERE rewarded = true;
  RETURN jsonb_build_object(
    'active_codes',    v_total_codes,
    'total_referrals', v_total_uses,
    'rewarded',        v_total_rewarded,
    'coins_spent',     v_coins_spent
  );
END;
$$;


--
-- Name: analytics_registrations_daily(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_registrations_daily(p_days integer DEFAULT 30) RETURNS TABLE(day date, count bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    DATE(created_at) AS day,
    COUNT(*) AS count
  FROM public.profiles
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$;


--
-- Name: analytics_top_earners(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_top_earners(p_limit integer DEFAULT 10) RETURNS TABLE(username text, avatar_url text, balance bigint, fair_play_score integer, is_verified boolean)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    p.username,
    p.avatar_url,
    w.balance::bigint,
    p.fair_play_score,
    p.is_verified
  FROM public.wallets w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE p.role NOT IN ('banned')
  ORDER BY w.balance DESC
  LIMIT p_limit;
$$;


--
-- Name: analytics_tournament_breakdown(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_tournament_breakdown() RETURNS TABLE(status text, count bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT status, COUNT(*) AS count
  FROM public.tournaments
  GROUP BY status
  ORDER BY count DESC;
$$;


--
-- Name: analytics_tournaments_weekly(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.analytics_tournaments_weekly(p_weeks integer DEFAULT 12) RETURNS TABLE(week_start date, created bigint, completed bigint)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT
    DATE_TRUNC('week', created_at)::date AS week_start,
    COUNT(*) AS created,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed
  FROM public.tournaments
  WHERE created_at >= NOW() - (p_weeks || ' weeks')::interval
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week_start ASC;
$$;


--
-- Name: apply_fair_play_event(uuid, text, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_fair_play_event(p_user_id uuid, p_event_type text, p_delta integer, p_reason text DEFAULT NULL::text, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_new_score   integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  INSERT INTO public.fair_play_events (user_id, event_type, delta, reason, admin_id, tournament_id)
  VALUES (p_user_id, p_event_type, p_delta, p_reason, auth.uid(), p_tournament_id);
  UPDATE public.profiles
  SET fair_play_score = GREATEST(0, LEAST(200, fair_play_score + p_delta)), updated_at = now()
  WHERE id = p_user_id RETURNING fair_play_score INTO v_new_score;
  RETURN jsonb_build_object('success', true, 'new_score', v_new_score, 'delta', p_delta);
END;
$$;


--
-- Name: apply_report_action(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_report_action(p_report_id uuid, p_action text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  INSERT INTO public.report_actions (report_id, actor_id, action, note) VALUES (p_report_id, auth.uid(), p_action, p_note);
  UPDATE public.reports SET updated_at = now() WHERE id = p_report_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: apply_report_action(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_report_action(p_report_id uuid, p_action text, p_note text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_assign_to uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_report      record;
  v_old_status  text;
  v_effective_status text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Report not found'); END IF;

  v_old_status := v_report.status;

  CASE p_action
    WHEN 'assign' THEN
      IF p_assign_to IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','assign_to required for assign action');
      END IF;
      UPDATE public.reports SET assigned_to = p_assign_to, updated_at = now() WHERE id = p_report_id;
      v_effective_status := v_old_status;

    WHEN 'resolve' THEN
      UPDATE public.reports SET
        status = 'resolved', resolved_by = v_caller_id, resolved_at = now(),
        resolved_action = p_note, updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := 'resolved';

    WHEN 'dismiss' THEN
      UPDATE public.reports SET
        status = 'dismissed', resolved_by = v_caller_id, resolved_at = now(),
        resolved_action = p_note, updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := 'dismissed';

    WHEN 'status_change' THEN
      IF p_new_status NOT IN ('pending','resolved','dismissed') THEN
        RETURN jsonb_build_object('success',false,'error','Invalid status');
      END IF;
      UPDATE public.reports SET
        status = p_new_status,
        resolved_by = CASE WHEN p_new_status IN ('resolved','dismissed') THEN v_caller_id ELSE resolved_by END,
        resolved_at = CASE WHEN p_new_status IN ('resolved','dismissed') THEN now() ELSE resolved_at END,
        resolved_action = p_note,
        updated_at = now()
      WHERE id = p_report_id;
      v_effective_status := p_new_status;

    WHEN 'warn_user' THEN
      IF v_report.reported_user_id IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No reported user on this report');
      END IF;
      PERFORM public.issue_warning(
        v_report.reported_user_id,
        COALESCE(p_note, 'Community report: ' || v_report.type),
        'minor'
      );
      v_effective_status := v_old_status;

    WHEN 'escalate' THEN
      UPDATE public.reports SET severity = 'critical', updated_at = now() WHERE id = p_report_id;
      v_effective_status := v_old_status;

    ELSE
      v_effective_status := v_old_status;
  END CASE;

  INSERT INTO public.report_actions (report_id, actor_id, action, old_status, new_status, note, metadata)
  VALUES (p_report_id, v_caller_id, p_action, v_old_status, v_effective_status, p_note,
    jsonb_build_object('assign_to', p_assign_to));

  RETURN jsonb_build_object('success',true,'action',p_action,'new_status',v_effective_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;


--
-- Name: approve_ai_action(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_ai_action(p_action_id uuid, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
  UPDATE public.ai_action_queue
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(), notes = p_note, updated_at = now()
  WHERE id = p_action_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: approve_ai_action(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_ai_action(p_action_id uuid, p_note text DEFAULT NULL::text, p_conditions text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_action public.ai_action_queue%ROWTYPE;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_action FROM public.ai_action_queue WHERE id = p_action_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Action not found'; END IF;
  IF v_action.status != 'pending' THEN
    RAISE EXCEPTION 'Action is not pending (status: %)', v_action.status;
  END IF;

  -- Record approval
  INSERT INTO public.ai_approvals (action_id, reviewer_id, decision, note, conditions)
  VALUES (p_action_id, auth.uid(), 'approved', p_note, p_conditions)
  ON CONFLICT (action_id, reviewer_id) DO UPDATE
    SET decision = 'approved', note = p_note, conditions = p_conditions, reviewed_at = now();

  -- Update action status
  UPDATE public.ai_action_queue
  SET status = 'approved', updated_at = now()
  WHERE id = p_action_id;

  -- Log
  INSERT INTO public.ai_audit_log (
    event_type, actor_id, actor_type, target_id, target_type, description
  ) VALUES (
    'action_approved', auth.uid(), 'super_admin',
    p_action_id, 'ai_action_queue',
    'AI action approved: ' || v_action.title
  );

  RETURN true;
END;
$$;


--
-- Name: approve_email_campaign(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_email_campaign(p_campaign_id uuid, p_approver_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_approver_id;
  IF v_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can approve campaigns');
  END IF;

  UPDATE public.email_campaigns
  SET status = 'approved', approved_by = p_approver_id, approved_at = now()
  WHERE id = p_campaign_id AND status = 'pending_review';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found or not in pending_review status');
  END IF;

  PERFORM public.log_email_event(p_campaign_id, 'approved', p_approver_id, '{}');
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: approve_notification_job(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_notification_job(p_job_id uuid, p_approver_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
  UPDATE public.notification_jobs SET status = 'approved', approved_by = p_approver_id, updated_at = now()
  WHERE id = p_job_id AND status = 'pending_approval';
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: approve_team_join_request(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_team_join_request(p_request_id uuid, p_team_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT; v_max INT;
BEGIN
  -- Only captain/co-captain or admin
  IF NOT (
    EXISTS (SELECT 1 FROM team_members WHERE team_id=p_team_id AND user_id=auth.uid() AND role IN ('captain','co_captain'))
    OR is_admin()
  ) THEN
    RETURN jsonb_build_object('success',false,'error','Permission refusée');
  END IF;
  -- Already in a team?
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id=p_user_id) THEN
    -- Cancel this request
    UPDATE team_join_requests SET status='cancelled', reviewed_at=NOW(), reviewed_by=auth.uid()
    WHERE id=p_request_id;
    RETURN jsonb_build_object('success',false,'error','Ce joueur est déjà dans une équipe');
  END IF;
  -- Team full?
  SELECT COUNT(*) INTO v_count FROM team_members WHERE team_id=p_team_id;
  SELECT COALESCE(max_members,6) INTO v_max FROM teams WHERE id=p_team_id;
  IF v_count >= v_max THEN
    RETURN jsonb_build_object('success',false,'error','Équipe complète');
  END IF;
  -- Add member
  INSERT INTO team_members(team_id, user_id, role) VALUES (p_team_id, p_user_id, 'member')
  ON CONFLICT DO NOTHING;
  -- Accept request
  UPDATE team_join_requests SET status='accepted', reviewed_at=NOW(), reviewed_by=auth.uid()
  WHERE id=p_request_id AND status='pending';
  -- Cancel other pending requests from this user
  UPDATE team_join_requests SET status='cancelled'
  WHERE user_id=p_user_id AND id!=p_request_id AND status='pending';
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: approve_tournament_request(uuid, uuid, uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_tournament_request(p_request_id uuid, p_tournament_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_reviewer_id uuid DEFAULT NULL::uuid, approved boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  UPDATE public.tournament_participants
  SET status = CASE WHEN approved THEN 'approved' ELSE 'rejected' END,
      approved_at = now(),
      approved_by = auth.uid()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: approve_user_verification(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_user_verification(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'founder', 'fondateur') THEN
    RETURN json_build_object('success', false, 'error', 'Permission refusée');
  END IF;

  UPDATE profiles
  SET verification_status = 'verified', updated_at = NOW()
  WHERE id = p_user_id AND verification_status = 'pending';

  -- Log dans admin_logs si la table existe
  BEGIN
    INSERT INTO admin_logs (admin_id, action, target_id, created_at)
    VALUES (auth.uid(), 'verify_user', p_user_id, NOW());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: are_friends(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.are_friends(user_a uuid, user_b uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends WHERE user_id = user_a AND friend_id = user_b
  );
$$;


--
-- Name: assign_application_reviewer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_application_reviewer(p_app_id uuid, p_reviewer_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  UPDATE public.admin_applications
  SET assigned_reviewer = p_reviewer_id, status = 'under_review', updated_at = now()
  WHERE id = p_app_id;

  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, new_value, details)
  VALUES (p_app_id, v_caller_id, 'assigned', p_reviewer_id::text,
    jsonb_build_object('reviewer_id', p_reviewer_id));

  RETURN jsonb_build_object('success',true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM);
END;
$$;


--
-- Name: assign_team_and_seat(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_team_and_seat(p_tournament_id uuid, p_user_id uuid, p_participant_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_tournament RECORD;
  v_team_count INTEGER;
  v_team_size INTEGER;
  v_team_number INTEGER;
  v_seat_number INTEGER;
BEGIN
  -- جلب معلومات البطولة
  SELECT * INTO v_tournament 
  FROM tournaments 
  WHERE id = p_tournament_id;

  -- تحديد حجم الفريق حسب mode
  CASE v_tournament.mode
    WHEN 'solo' THEN
      v_team_size := 1;
    WHEN 'duo' THEN
      v_team_size := 2;
    WHEN 'squad' THEN
      v_team_size := 4;
    ELSE
      v_team_size := 1;
  END CASE;

  -- حساب عدد الفرق المطلوبة
  v_team_count := CEIL(v_tournament.max_players::float / v_team_size);

  -- البحث عن أول فريق فيه مقاعد فارغة
  FOR v_team_number IN 1..v_team_count LOOP
    SELECT COUNT(*) INTO v_seat_number
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND status = 'approved'
      AND team_number = v_team_number;

    IF v_seat_number < v_team_size THEN
      -- وجدنا فريق فيه مكان
      UPDATE tournament_participants
      SET 
        team_number = v_team_number,
        seat_number = v_seat_number + 1,
        is_ready = false
      WHERE id = p_participant_id;
      
      RETURN;
    END IF;
  END LOOP;

  -- إذا كل الفرق كاملة، نحطو في فريق جديد
  v_team_number := v_team_count + 1;
  
  UPDATE tournament_participants
  SET 
    team_number = v_team_number,
    seat_number = 1,
    is_ready = false
  WHERE id = p_participant_id;

END;
$$;


--
-- Name: auto_verify_match(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_verify_match(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_pending_count integer;
  v_agreed_winner uuid;
BEGIN
  SELECT COUNT(*) INTO v_pending_count FROM public.match_results
  WHERE tournament_id = p_tournament_id AND status = 'pending';
  IF v_pending_count < 2 THEN
    RETURN jsonb_build_object('auto_verified', false, 'reason', 'Not enough submissions');
  END IF;
  SELECT winner_id INTO v_agreed_winner
  FROM public.match_results
  WHERE tournament_id = p_tournament_id AND status = 'pending'
  GROUP BY winner_id HAVING COUNT(*) >= 2
  LIMIT 1;
  IF v_agreed_winner IS NOT NULL THEN
    UPDATE public.match_results SET status = 'approved', updated_at = now()
    WHERE tournament_id = p_tournament_id AND status = 'pending';
    UPDATE public.tournaments SET status = 'completed', winner_id = v_agreed_winner, updated_at = now()
    WHERE id = p_tournament_id;
    RETURN jsonb_build_object('auto_verified', true, 'winner_id', v_agreed_winner);
  END IF;
  UPDATE public.match_results SET status = 'disputed', updated_at = now()
  WHERE tournament_id = p_tournament_id AND status = 'pending';
  UPDATE public.tournaments SET status = 'disputed', updated_at = now()
  WHERE id = p_tournament_id;
  RETURN jsonb_build_object('auto_verified', false, 'reason', 'Dispute detected');
END;
$$;


--
-- Name: ban_user(uuid, text, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ban_user(p_user_id uuid, p_reason text DEFAULT 'Violation of terms'::text, p_duration interval DEFAULT NULL::interval) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_until       timestamptz;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  v_until := CASE WHEN p_duration IS NOT NULL THEN now() + p_duration ELSE NULL END;
  UPDATE public.profiles SET banned_until = v_until, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, 'system', '🚫 Account Restricted',
          format('Your account has been restricted. Reason: %s', p_reason),
          jsonb_build_object('reason', p_reason, 'until', v_until));
  RETURN jsonb_build_object('success', true, 'banned_until', v_until);
END;
$$;


--
-- Name: ban_user(uuid, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ban_user(target_user uuid, banned_until timestamp with time zone, banned_by uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- التحقق من الصلاحية
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- تحديث المستخدم
  UPDATE public.profiles 
  SET role = 'banned', 
      banned_until = ban_user.banned_until
  WHERE id = target_user;
  
  RETURN TRUE;
END;
$$;


--
-- Name: broadcast_notification(text, text, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.broadcast_notification(p_title text, p_message text, p_type text DEFAULT 'info'::text, p_roles text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id   uuid    := auth.uid();
  v_rows       integer;
  v_ann_id     uuid;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin','founder','fondateur']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF char_length(COALESCE(p_title, '')) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title required');
  END IF;

  -- Use the announcements table for mass broadcasts (lazy-read pattern)
  -- This avoids inserting N notification rows and locking the table.
  INSERT INTO public.announcements (
    title, content, type, priority, is_active, is_pinned,
    target_roles, created_by, expires_at
  )
  VALUES (
    p_title, p_message,
    CASE p_type
      WHEN 'warning'     THEN 'warning'
      WHEN 'success'     THEN 'success'
      WHEN 'danger'      THEN 'danger'
      WHEN 'maintenance' THEN 'maintenance'
      WHEN 'update'      THEN 'update'
      ELSE 'info'
    END,
    5, true, false,
    p_roles,
    v_admin_id,
    now() + INTERVAL '7 days'
  )
  RETURNING id INTO v_ann_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, details)
    VALUES (v_admin_id, 'broadcast_notification',
      jsonb_build_object(
        'title', p_title, 'type', p_type,
        'roles', p_roles, 'announcement_id', v_ann_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',         true,
    'announcement_id', v_ann_id
  );
END;
$$;


--
-- Name: broadcast_notification(text, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.broadcast_notification(p_role text, p_type text, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb, p_action_url text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count integer := 0;
BEGIN
  IF p_role = 'all' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT id, p_type, p_title, p_message, p_data, p_action_url FROM public.profiles;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    SELECT id, p_type, p_title, p_message, p_data, p_action_url FROM public.profiles WHERE role = p_role;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: calculate_ff_points(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_ff_points(p_placement integer, p_kills integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE placement_pts INT;
BEGIN
  placement_pts := CASE p_placement
    WHEN 1  THEN 12
    WHEN 2  THEN 9
    WHEN 3  THEN 8
    WHEN 4  THEN 7
    WHEN 5  THEN 6
    WHEN 6  THEN 5
    WHEN 7  THEN 4
    WHEN 8  THEN 3
    WHEN 9  THEN 2
    WHEN 10 THEN 1
    ELSE 0
  END;
  RETURN placement_pts + COALESCE(p_kills, 0); -- 1 point per kill
END;
$$;


--
-- Name: can_manage_team(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_team(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id=p_team_id AND user_id=auth.uid() AND role IN ('captain','co_captain')
  ) OR is_admin();
$$;


--
-- Name: cancel_gift(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_gift(p_gift_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
BEGIN
  SELECT * INTO v_gift FROM public.gift_transactions WHERE id = p_gift_id;
  IF v_gift IS NULL OR v_gift.sender_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  IF v_gift.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel processed gift');
  END IF;
  UPDATE public.gift_transactions SET status = 'cancelled' WHERE id = p_gift_id;
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason)
  VALUES (v_user_id, v_gift.amount, 'refund', 'Gift cancelled — refunded');
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: check_achievements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_achievements() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Wins achievements
  WITH user_wins AS (
    SELECT COUNT(*) as wins_count
    FROM public.match_results
    WHERE user_id = NEW.user_id AND position = 1
  )
  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT 
    NEW.user_id,
    a.id
  FROM public.achievements a
  CROSS JOIN user_wins uw
  WHERE a.condition_type = 'wins' 
    AND uw.wins_count >= a.condition_value
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = NEW.user_id AND ua.achievement_id = a.id
    );
  
  -- Kills achievements
  WITH user_kills AS (
    SELECT SUM(kills) as kills_total
    FROM public.match_results
    WHERE user_id = NEW.user_id
  )
  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT 
    NEW.user_id,
    a.id
  FROM public.achievements a
  CROSS JOIN user_kills uk
  WHERE a.condition_type = 'kills' 
    AND uk.kills_total >= a.condition_value
    AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = NEW.user_id AND ua.achievement_id = a.id
    );
  
  RETURN NEW;
END;
$$;


--
-- Name: check_achievements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_achievements(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_stats player_stats%ROWTYPE;
  v_ach achievements%ROWTYPE;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_stats FROM player_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_ach IN SELECT * FROM achievements LOOP
    -- Skip already earned
    IF EXISTS(SELECT 1 FROM user_achievements WHERE user_id=p_user_id AND achievement_id=v_ach.id) THEN
      CONTINUE;
    END IF;

    -- Check condition
    IF (v_ach.condition_type='kills'     AND COALESCE(v_stats.kills,0) >= v_ach.condition_value) OR
       (v_ach.condition_type='wins'      AND COALESCE(v_stats.wins,0)  >= v_ach.condition_value) OR
       (v_ach.condition_type='matches'   AND COALESCE(v_stats.tournaments_played,0) >= v_ach.condition_value) OR
       (v_ach.condition_type='top3'      AND COALESCE(v_stats.wins,0)  >= v_ach.condition_value)
    THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_ach.id) ON CONFLICT DO NOTHING;

      -- Reward coins
      IF v_ach.coins_reward > 0 THEN
        UPDATE wallets SET balance = balance + v_ach.coins_reward WHERE user_id = p_user_id;
      END IF;
      -- Reward XP
      IF v_ach.xp_reward > 0 THEN
        UPDATE profiles SET xp = COALESCE(xp,0) + v_ach.xp_reward WHERE id = p_user_id;
      END IF;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


--
-- Name: check_ban_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ban_status(p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid  uuid := COALESCE(p_user_id, auth.uid());
  v_prof record;
BEGIN
  SELECT banned_until INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof.banned_until IS NULL THEN
    RETURN jsonb_build_object('is_banned', false);
  END IF;
  IF v_prof.banned_until < now() THEN
    UPDATE public.profiles SET banned_until = NULL WHERE id = v_uid;
    RETURN jsonb_build_object('is_banned', false);
  END IF;
  RETURN jsonb_build_object('is_banned', true, 'banned_until', v_prof.banned_until);
END;
$$;


--
-- Name: check_birthday_reward(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_birthday_reward() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_profile   record;
  v_today     date := CURRENT_DATE;
  v_coins     integer := 200;
  v_curr_year integer := EXTRACT(YEAR FROM NOW())::integer;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF v_profile IS NULL OR v_profile.birthday IS NULL THEN
    RETURN jsonb_build_object('is_birthday', false);
  END IF;
  IF EXTRACT(MONTH FROM v_profile.birthday) != EXTRACT(MONTH FROM v_today) THEN
    RETURN jsonb_build_object('is_birthday', false);
  END IF;
  IF EXTRACT(DAY FROM v_profile.birthday) != EXTRACT(DAY FROM v_today) THEN
    RETURN jsonb_build_object('is_birthday', false);
  END IF;
  IF v_profile.birthday_reward_year = v_curr_year THEN
    RETURN jsonb_build_object('is_birthday', true, 'already_rewarded', true);
  END IF;
  PERFORM public.grant_coins(v_user_id, v_coins, '🎂 Birthday reward!');
  UPDATE public.profiles SET birthday_reward_year = v_curr_year, updated_at = NOW() WHERE id = v_user_id;
  RETURN jsonb_build_object('is_birthday', true, 'already_rewarded', false, 'coins', v_coins);
END;
$$;


--
-- Name: check_chat_rate_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_chat_rate_limit(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE msg_count INT;
BEGIN
  SELECT COUNT(*) INTO msg_count FROM chat_messages
  WHERE sender_id = p_user_id AND created_at > NOW() - INTERVAL '3 seconds';
  RETURN msg_count < 3;
END;
$$;


--
-- Name: check_rate_limit(text, integer, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_action text, p_max_calls integer DEFAULT 10, p_window interval DEFAULT '00:01:00'::interval) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_reset   timestamptz;
BEGIN
  SELECT COUNT(*), MAX(created_at) + p_window
  INTO v_count, v_reset
  FROM public.rate_limits
  WHERE user_id = v_user_id AND action = p_action AND created_at > now() - p_window;
  IF v_count >= p_max_calls THEN
    RETURN jsonb_build_object('allowed', false, 'count', v_count, 'reset_at', v_reset, 'remaining', 0);
  END IF;
  INSERT INTO public.rate_limits (user_id, action) VALUES (v_user_id, p_action);
  RETURN jsonb_build_object('allowed', true, 'count', v_count + 1, 'remaining', p_max_calls - v_count - 1);
END;
$$;


--
-- Name: check_rate_limit(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(check_user_id uuid, check_endpoint text, max_requests integer, window_minutes integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Clean old entries
  DELETE FROM rate_limits
  WHERE window_start < NOW() - (window_minutes || ' minutes')::INTERVAL;

  -- Get current count
  SELECT request_count INTO current_count
  FROM rate_limits
  WHERE user_id = check_user_id
  AND endpoint = check_endpoint;

  IF current_count IS NULL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count)
    VALUES (check_user_id, check_endpoint, 1);
    RETURN true;
  ELSIF current_count < max_requests THEN
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE user_id = check_user_id
    AND endpoint = check_endpoint;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;


--
-- Name: check_team_membership(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_team_membership(p_team_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id=p_team_id AND user_id=p_user_id);
$$;


--
-- Name: check_user_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_permission(p_user_id uuid, required_role text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND CASE required_role
        WHEN 'super_admin' THEN role = 'super_admin'
        WHEN 'admin'       THEN role IN ('admin','super_admin')
        WHEN 'founder'     THEN role IN ('founder','fondateur','admin','super_admin')
        ELSE role NOT IN ('banned')
      END
  );
$$;


--
-- Name: check_user_permission(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_permission(p_user_id uuid, required_role text DEFAULT 'user'::text, permission_name text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND CASE COALESCE(required_role, permission_name, 'user')
        WHEN 'super_admin' THEN role = 'super_admin'
        WHEN 'admin' THEN role IN ('admin','super_admin')
        WHEN 'founder' THEN role IN ('founder','fondateur','admin','super_admin')
        WHEN 'designer' THEN role IN ('designer','admin','super_admin')
        ELSE role <> 'banned'
      END
  );
$$;


--
-- Name: check_wallet_rate_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_wallet_rate_limit() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_result jsonb;
BEGIN
  v_result := public.check_rate_limit('wallet_transfer', 5, '1 minute'::interval);
  RETURN (v_result->>'allowed')::boolean;
END;
$$;


--
-- Name: claim_daily_reward(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_daily_reward(p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id  uuid;
  v_caller   uuid := auth.uid();
  v_last     record;
  v_streak   integer := 1;
  v_day      integer;
  v_reward   record;
  v_today    date := CURRENT_DATE;
BEGIN
  -- Non-admins always claim for themselves regardless of p_user_id
  IF public.is_role(ARRAY['admin','super_admin']) AND p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := v_caller;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock wallet before any reads to prevent double-claim under concurrent requests
  PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  SELECT * INTO v_last
  FROM public.user_daily_claims
  WHERE user_id = v_user_id
  ORDER BY claimed_at DESC
  LIMIT 1;

  IF v_last IS NOT NULL AND v_last.claimed_at::date = v_today THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Already claimed today',
      'next_claim', (v_today + 1)::text
    );
  END IF;

  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last.claimed_at::date = v_today - 1 THEN
    v_streak := v_last.streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_day := ((v_streak - 1) % 7) + 1;

  SELECT * INTO v_reward FROM public.daily_rewards WHERE day = v_day;
  IF NOT FOUND THEN
    v_reward.coins      := 50;
    v_reward.xp         := 100;
    v_reward.is_special := false;
  END IF;

  UPDATE public.wallets
  SET balance = balance + v_reward.coins, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_user_id, v_reward.coins, 'daily_reward',
    format('Récompense Jour %s — Streak %s 🔥', v_day, v_streak)
  );

  BEGIN
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + v_reward.xp, updated_at = now()
    WHERE id = v_user_id;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  INSERT INTO public.user_daily_claims (user_id, claimed_at, day, streak, coins, xp)
  VALUES (v_user_id, now(), v_day, v_streak, v_reward.coins, v_reward.xp);

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'reward',
      CASE WHEN v_reward.is_special THEN '🎉 Récompense Spéciale !' ELSE '🎁 Récompense Journalière' END,
      format('+%s CP · +%s XP · Jour %s · Streak %s 🔥', v_reward.coins, v_reward.xp, v_day, v_streak),
      jsonb_build_object(
        'coins', v_reward.coins, 'xp', v_reward.xp,
        'day', v_day, 'streak', v_streak
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',    true,
    'coins',      v_reward.coins,
    'xp',         v_reward.xp,
    'day',        v_day,
    'streak',     v_streak,
    'is_special', COALESCE(v_reward.is_special, false)
  );
END;
$$;


--
-- Name: claim_gift(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_gift(p_gift_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
  v_sender  record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_gift
  FROM public.gift_transactions
  WHERE id = p_gift_id AND receiver_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  IF v_gift.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Gift already %s', v_gift.status));
  END IF;
  IF v_gift.expires_at < now() THEN
    UPDATE public.gift_transactions SET status = 'expired' WHERE id = p_gift_id;
    RETURN jsonb_build_object('success', false, 'error', 'Gift has expired');
  END IF;

  SELECT username INTO v_sender FROM public.profiles WHERE id = v_gift.sender_id;

  -- Lock receiver wallet before crediting
  PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  UPDATE public.gift_transactions
  SET status = 'claimed', claimed_at = now()
  WHERE id = p_gift_id;

  UPDATE public.wallets
  SET balance = balance + v_gift.amount, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_user_id, v_gift.amount, 'gift_received',
    format('Gift from @%s', COALESCE(v_sender.username, 'user'))
  );

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id, 'coins_received',
      format('✅ %s CP reçus !', v_gift.amount),
      format('Cadeau de @%s réclamé.', COALESCE(v_sender.username, 'user')),
      jsonb_build_object('gift_id', p_gift_id, 'amount', v_gift.amount)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'amount',  v_gift.amount,
    'sender',  v_sender.username
  );
END;
$$;


--
-- Name: claim_mission_reward(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_mission_reward(p_user_id uuid DEFAULT NULL::uuid, p_mission_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_caller  uuid := auth.uid();
  v_mission record;
  v_um      record;
  v_today   date := CURRENT_DATE;
BEGIN
  IF p_mission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission ID required');
  END IF;

  IF public.is_role(ARRAY['admin','super_admin']) AND p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := v_caller;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission introuvable');
  END IF;

  SELECT * INTO v_um FROM public.user_missions
  WHERE user_id = v_user_id AND mission_id = p_mission_id AND reset_date = v_today;

  IF v_um IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non démarrée');
  END IF;
  IF NOT v_um.completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non complétée');
  END IF;
  IF v_um.claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Récompense déjà réclamée');
  END IF;

  -- Mark claimed first (prevents double-claim under concurrent calls)
  UPDATE public.user_missions SET claimed = true WHERE id = v_um.id;

  IF COALESCE(v_mission.coins_reward, 0) > 0 THEN
    -- Lock wallet row
    PERFORM 1 FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

    UPDATE public.wallets
    SET balance = balance + v_mission.coins_reward, updated_at = now()
    WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (v_user_id, v_mission.coins_reward, 'mission_reward',
      format('Mission: %s', v_mission.title));
  END IF;

  BEGIN
    IF COALESCE(v_mission.xp_reward, 0) > 0 THEN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_mission.xp_reward, updated_at = now()
      WHERE id = v_user_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'coins',   v_mission.coins_reward,
    'xp',      v_mission.xp_reward,
    'mission', v_mission.title
  );
END;
$$;


--
-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND read_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: cleanup_rate_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_rate_limits() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: cleanup_stale_presence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_stale_presence() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.user_presence
  SET status = 'offline', updated_at = now()
  WHERE status IN ('online','idle')
    AND last_seen < now() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


--
-- Name: close_registration(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_registration(p_tournament_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE tournaments
  SET status = 'locked', room_status = 'ready'
  WHERE id = p_tournament_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: comment_feature(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comment_feature(p_feature_id uuid, p_content text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.feature_comments (feature_id, author_id, content)
  VALUES (p_feature_id, auth.uid(), p_content) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'comment_id', v_id);
END;
$$;


--
-- Name: comment_idea(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comment_idea(p_idea_id uuid, p_content text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.community_idea_comments (idea_id, author_id, content)
  VALUES (p_idea_id, auth.uid(), p_content) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'comment_id', v_id);
END;
$$;


--
-- Name: create_default_notification_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_notification_preferences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, text, uuid, uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL::text, p_link text DEFAULT NULL::text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid, p_category text DEFAULT 'general'::text, p_priority text DEFAULT 'normal'::text, p_meta jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_notif_id UUID;
  v_pref RECORD;
BEGIN
  -- Vérifier les préférences de l'utilisateur
  SELECT * INTO v_pref FROM notification_preferences WHERE user_id = p_user_id;

  -- Si pas de préférences, créer avec valeurs par défaut
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id)
    ON CONFLICT DO NOTHING;
    v_pref.in_app_enabled := true;
    v_pref.chat_enabled := true;
    v_pref.team_enabled := true;
    v_pref.tournament_enabled := true;
    v_pref.admin_enabled := true;
  END IF;

  -- Vérifier si ce type est activé
  IF p_category = 'chat'       AND NOT COALESCE(v_pref.chat_enabled, true)       THEN RETURN NULL; END IF;
  IF p_category = 'team'       AND NOT COALESCE(v_pref.team_enabled, true)       THEN RETURN NULL; END IF;
  IF p_category = 'tournament' AND NOT COALESCE(v_pref.tournament_enabled, true) THEN RETURN NULL; END IF;
  IF p_category = 'admin'      AND NOT COALESCE(v_pref.admin_enabled, true)      THEN RETURN NULL; END IF;

  -- Insérer la notification
  INSERT INTO notifications (
    user_id, type, title, body, link,
    entity_type, entity_id, actor_id,
    category, priority, meta
  ) VALUES (
    p_user_id, p_type, p_title, p_body, p_link,
    p_entity_type, p_entity_id, p_actor_id,
    p_category, p_priority, p_meta
  )
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;


--
-- Name: create_profile_on_signup(uuid, text, text, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_profile_on_signup(user_id uuid, user_email text, full_name text, age integer, city text, country text, free_fire_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (
    id, email, full_name, age, city, country,
    free_fire_id, role, verification_status
  )
  values (
    user_id, user_email, full_name, age, city, country,
    free_fire_id, 'user', 'pending'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    age = excluded.age,
    city = excluded.city,
    country = excluded.country,
    free_fire_id = excluded.free_fire_id;
end;
$$;


--
-- Name: create_team(text, text, text, text, boolean, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team(p_name text, p_tag text, p_description text, p_accent_color text, p_is_open boolean, p_captain_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_team teams%ROWTYPE;
BEGIN
  -- Insert team
  INSERT INTO teams (name, tag, description, accent_color, is_open, captain_id, status)
  VALUES (p_name, UPPER(p_tag), p_description, p_accent_color, p_is_open, p_captain_id, 'active')
  RETURNING * INTO v_team;

  -- Add captain as member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team.id, p_captain_id, 'captain')
  ON CONFLICT DO NOTHING;

  -- Update profile team_id
  UPDATE profiles SET team_id = v_team.id WHERE id = p_captain_id;

  RETURN json_build_object('success', true, 'team_id', v_team.id, 'team', row_to_json(v_team));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: create_team(text, text, text, text, boolean, uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team(p_name text, p_tag text, p_description text DEFAULT NULL::text, p_accent_color text DEFAULT '#00d4ff'::text, p_is_open boolean DEFAULT true, p_captain_id uuid DEFAULT NULL::uuid, p_max_members integer DEFAULT 6, p_region text DEFAULT 'MA'::text, p_team_type text DEFAULT 'competitive'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_team_id UUID;
  v_captain UUID;
BEGIN
  v_captain := COALESCE(p_captain_id, auth.uid());
  
  -- تحقق أن المستخدم ما عندوش فريق
  IF EXISTS (
    SELECT 1 FROM team_members WHERE user_id = v_captain
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Vous êtes déjà dans une équipe');
  END IF;

  -- تحقق TAG فريد
  IF EXISTS (SELECT 1 FROM teams WHERE tag = p_tag) THEN
    RETURN json_build_object('success', false, 'error', 'Ce TAG est déjà utilisé');
  END IF;

  -- خلق الفريق
  INSERT INTO teams (
    name, tag, description, accent_color,
    is_open, captain_id, max_members, region, team_type,
    points, wins, tournaments_played
  )
  VALUES (
    p_name, p_tag, p_description, p_accent_color,
    p_is_open, v_captain, p_max_members, p_region, p_team_type,
    0, 0, 0
  )
  RETURNING id INTO v_team_id;

  -- أضف الcaptain كعضو
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, v_captain, 'captain');

  RETURN json_build_object('success', true, 'team_id', v_team_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: delete_tournament_complete(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_tournament_complete(tournament_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Seulement super_admin peut supprimer un tournoi complet
  IF v_caller_role NOT IN ('super_admin') THEN
    RAISE EXCEPTION 'Accès refusé : super_admin requis';
  END IF;

  -- Log avant suppression
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (auth.uid(), 'delete_tournament', json_build_object('tournament_id', tournament_id));

  -- Suppression en cascade
  DELETE FROM match_results       WHERE tournament_id = delete_tournament_complete.tournament_id;
  DELETE FROM tournament_participants WHERE tournament_id = delete_tournament_complete.tournament_id;
  DELETE FROM room_members        WHERE tournament_id = delete_tournament_complete.tournament_id;
  DELETE FROM room_messages       WHERE tournament_id = delete_tournament_complete.tournament_id;
  DELETE FROM matches             WHERE tournament_id = delete_tournament_complete.tournament_id;
  DELETE FROM tournaments         WHERE id = delete_tournament_complete.tournament_id;
END;
$$;


--
-- Name: delete_user_complete(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_complete(target_user uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only super_admin can delete users
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
  END IF;

  -- Cannot delete yourself
  IF target_user = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Impossible de supprimer votre propre compte');
  END IF;

  -- Clean up all user data in correct FK order
  UPDATE profiles SET team_id = NULL WHERE id = target_user;
  DELETE FROM team_messages    WHERE sender_id = target_user;
  DELETE FROM team_members     WHERE user_id = target_user;
  DELETE FROM team_join_requests WHERE user_id = target_user;
  DELETE FROM team_invites     WHERE invited_user = target_user OR invited_by = target_user;
  DELETE FROM tournament_participants WHERE user_id = target_user;
  DELETE FROM room_members     WHERE user_id = target_user;
  DELETE FROM match_results    WHERE user_id = target_user;
  DELETE FROM wallet_transactions WHERE user_id = target_user;
  DELETE FROM user_items       WHERE user_id = target_user;
  DELETE FROM user_achievements WHERE user_id = target_user;
  DELETE FROM user_missions    WHERE user_id = target_user;
  DELETE FROM user_daily_claims WHERE user_id = target_user;
  DELETE FROM support_messages WHERE sender_id = target_user;
  DELETE FROM support_tickets  WHERE user_id = target_user;
  DELETE FROM chat_messages    WHERE sender_id = target_user;
  DELETE FROM reports          WHERE reporter_id = target_user OR reported_id = target_user;
  DELETE FROM admin_messages   WHERE user_id = target_user;
  DELETE FROM admin_logs       WHERE user_id = target_user;
  DELETE FROM notifications    WHERE user_id = target_user OR actor_id = target_user;
  DELETE FROM player_stats     WHERE user_id = target_user;
  DELETE FROM wallets          WHERE user_id = target_user;
  DELETE FROM profiles         WHERE id = target_user;

  -- Delete from auth.users (requires service role — will work with SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: dismiss_ai_alert(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dismiss_ai_alert(p_alert_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
  UPDATE public.ai_alerts SET status = 'dismissed', updated_at = now() WHERE id = p_alert_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: dismiss_ai_alert(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dismiss_ai_alert(p_alert_id uuid, p_reason text DEFAULT 'false_positive'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.ai_alerts
  SET
    status       = 'dismissed',
    dismissed_by = auth.uid(),
    dismissed_at = now(),
    dismiss_reason = p_reason,
    updated_at   = now()
  WHERE id = p_alert_id;

  INSERT INTO public.ai_audit_log (
    event_type, actor_id, actor_type, target_id, target_type, description
  ) VALUES (
    'alert_dismissed', auth.uid(), 'super_admin',
    p_alert_id, 'ai_alert',
    'Alert dismissed: ' || p_reason
  );

  RETURN true;
END;
$$;


--
-- Name: distribute_match_rewards(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.distribute_match_rewards(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_tournament  record;
  v_prize       integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF v_tournament.winner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No winner set');
  END IF;
  v_prize := v_tournament.prize_pool;
  IF v_prize > 0 THEN
    UPDATE public.wallets SET balance = balance + v_prize, updated_at = now()
    WHERE user_id = v_tournament.winner_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
    VALUES (v_tournament.winner_id, v_prize, 'prize', 'Tournament prize', p_tournament_id::text);
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (v_tournament.winner_id, 'reward', '🏆 Tournament Prize!',
            format('Congratulations! You won %s CP!', v_prize),
            jsonb_build_object('prize', v_prize, 'tournament_id', p_tournament_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'prize', v_prize);
END;
$$;


--
-- Name: emergency_freeze(text, interval); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.emergency_freeze(p_reason text, p_duration interval DEFAULT '01:00:00'::interval) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  PERFORM public.update_system_setting('maintenance_mode', 'true', 'Emergency freeze: ' || p_reason);
  PERFORM public.update_system_setting('login_enabled', 'false', 'Emergency freeze');
  INSERT INTO public.emergency_actions (action_type, reason, initiated_by, expires_at)
  VALUES ('freeze', p_reason, auth.uid(), now() + p_duration);
  RETURN jsonb_build_object('success', true, 'expires_at', now() + p_duration);
END;
$$;


--
-- Name: emergency_freeze(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.emergency_freeze(p_reason text, p_action text DEFAULT 'emergency_freeze'::text, p_severity text DEFAULT 'critical'::text, p_ip text DEFAULT NULL::text, p_agent text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
  v_keys_frozen text[] := ARRAY[
    'emergency_freeze',
    'wallet_transfers_enabled',
    'marketplace_enabled',
    'gifts_enabled',
    'tournament_joins_enabled',
    'result_submission_enabled',
    'registrations_enabled',
    'chat_enabled'
  ];
  v_key text;
  v_old_value text;
  v_action_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin or founder can trigger emergency freeze');
  END IF;

  -- Freeze all critical settings
  FOREACH v_key IN ARRAY v_keys_frozen LOOP
    SELECT value INTO v_old_value FROM public.system_settings WHERE key = v_key;
    IF FOUND THEN
      UPDATE public.system_settings
      SET value = 'false', updated_by = v_actor_id, updated_at = now()
      WHERE key = v_key;

      INSERT INTO public.system_feature_logs (
        setting_key, old_value, new_value,
        changed_by, changed_by_role, reason,
        ip_address, user_agent
      ) VALUES (
        v_key, v_old_value, 'false',
        v_actor_id, v_actor_role,
        'EMERGENCY FREEZE: ' || p_reason,
        p_ip::inet, p_agent
      );
    END IF;
  END LOOP;

  -- Set emergency_freeze flag to true
  UPDATE public.system_settings
  SET value = 'true', updated_by = v_actor_id, updated_at = now()
  WHERE key = 'emergency_freeze';

  -- Log the emergency action
  INSERT INTO public.emergency_actions (
    action_type, title, description, severity, status,
    triggered_by, triggered_role, reason, affected_keys,
    ip_address
  ) VALUES (
    p_action,
    'Emergency Freeze Activated',
    'All critical platform operations have been frozen. Reason: ' || p_reason,
    p_severity, 'active',
    v_actor_id, v_actor_role, p_reason,
    v_keys_frozen,
    p_ip::inet
  )
  RETURNING id INTO v_action_id;

  RETURN jsonb_build_object(
    'success',     true,
    'action_id',   v_action_id,
    'frozen_keys', v_keys_frozen,
    'triggered_by', v_actor_id,
    'triggered_at', now(),
    'message',     'Emergency freeze activated. ' || array_length(v_keys_frozen, 1)::text || ' systems disabled.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Emergency freeze failed: ' || SQLERRM);
END;
$$;


--
-- Name: equip_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.equip_item(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_type    text;
  v_img     text;
BEGIN
  SELECT type, image_url INTO v_type, v_img
  FROM public.store_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not owned');
  END IF;

  -- Unequip same type only
  UPDATE public.user_items ui
  SET equipped = false
  FROM public.store_items si
  WHERE ui.user_id = v_user_id
    AND ui.item_id = si.id
    AND si.type = v_type;

  -- Equip selected
  UPDATE public.user_items
  SET equipped = true
  WHERE user_id = v_user_id AND item_id = p_item_id;

  -- Sync avatar_url on profiles
  IF v_type = 'avatar' THEN
    UPDATE public.profiles SET avatar_url = v_img WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: expire_old_gifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_gifts() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.gift_transactions SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now()
    RETURNING sender_id, amount
  )
  UPDATE public.wallets w SET balance = balance + e.amount
  FROM expired e WHERE w.user_id = e.sender_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: fair_play_rank(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fair_play_rank(score integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN score >= 180 THEN 'Exemplary'
    WHEN score >= 140 THEN 'Honorable'
    WHEN score >= 100 THEN 'Fair'
    WHEN score >= 60  THEN 'Caution'
    WHEN score >= 30  THEN 'Warning'
    ELSE 'Restricted'
  END;
$$;


--
-- Name: fair_play_tier(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fair_play_tier(score integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN score >= 160 THEN 'trusted'
    WHEN score >= 120 THEN 'normal'
    WHEN score >= 70  THEN 'suspicious'
    ELSE                   'high_risk'
  END;
$$;


--
-- Name: final_review_admin_application(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.final_review_admin_application(p_application_id uuid, p_decision text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_app record;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  SELECT * INTO v_app FROM public.admin_applications WHERE id = p_application_id;
  UPDATE public.admin_applications
  SET status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), admin_note = p_note, updated_at = now()
  WHERE id = p_application_id;
  IF p_decision = 'approved' THEN
    UPDATE public.profiles SET role = 'admin', updated_at = now() WHERE id = v_app.applicant_id;
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (v_app.applicant_id, 'achievement', '🎉 Admin Application Approved!', 'Welcome to the team!');
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (v_app.applicant_id, 'system', 'Application Update',
            format('Your application has been %s.', p_decision));
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: final_review_admin_application(uuid, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.final_review_admin_application(p_app_id uuid, p_status text, p_note text DEFAULT NULL::text, p_blacklist_days integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_caller_id   uuid := auth.uid();
  v_app         record;
  v_old_status  text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','super_admin only');
  END IF;

  IF p_status NOT IN ('approved','rejected','on_hold') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid status: use approved / rejected / on_hold');
  END IF;

  SELECT * INTO v_app FROM public.admin_applications WHERE id = p_app_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;

  v_old_status := v_app.status;

  UPDATE public.admin_applications SET
    status            = p_status,
    final_note        = p_note,
    final_decision_by = v_caller_id,
    final_decision_at = now(),
    reviewed_by       = v_caller_id,
    reviewed_at       = now(),
    admin_note        = COALESCE(p_note, admin_note),
    blacklist_until   = CASE
      WHEN p_blacklist_days IS NOT NULL
      THEN now() + (p_blacklist_days || ' days')::interval
      ELSE blacklist_until
    END,
    updated_at = now()
  WHERE id = p_app_id;

  IF p_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, sender_id, type, title, message, metadata)
    VALUES (v_app.user_id, v_caller_id, 'achievement',
      'Application Approved!',
      'Your admin application has been approved. Welcome to the CipherPool team!',
      jsonb_build_object('app_id', p_app_id));

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'admin_approved', 20, 'Admin application approved', v_caller_id);

  ELSIF p_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, sender_id, type, title, message, metadata)
    VALUES (v_app.user_id, v_caller_id, 'system',
      'Application Update',
      COALESCE(p_note, 'Your admin application was reviewed. Thank you for your interest.'),
      jsonb_build_object('app_id', p_app_id, 'status', p_status));

    INSERT INTO public.user_reputation_events (user_id, event_type, delta, note, created_by)
    VALUES (v_app.user_id, 'application_rejected', 0, 'Application rejected', v_caller_id);
  END IF;

  INSERT INTO public.admin_application_audit (application_id, actor_id, action, old_value, new_value, details)
  VALUES (p_app_id, v_caller_id, 'final_decision', v_old_status, p_status,
    jsonb_build_object('note', p_note, 'blacklist_days', p_blacklist_days));

  RETURN jsonb_build_object('success',true,'status',p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;


--
-- Name: force_resolve_dispute(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.force_resolve_dispute(p_tournament_id uuid, p_result_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  UPDATE public.match_results SET status = 'verified', verified_at = now(), verified_by = auth.uid()
  WHERE tournament_id = p_tournament_id AND id = ANY(p_result_ids);
  UPDATE public.match_results SET status = 'rejected', verified_at = now(), verified_by = auth.uid()
  WHERE tournament_id = p_tournament_id AND NOT (id = ANY(p_result_ids));
  UPDATE public.tournaments SET status = 'completed', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: force_resolve_dispute(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.force_resolve_dispute(p_tournament_id uuid, p_winner_id uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.tournaments
  SET status = 'completed', winner_id = p_winner_id, updated_at = now()
  WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: get_active_announcements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_announcements() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(a))
    FROM (
      SELECT * FROM public.announcements
      WHERE is_active = true AND (expires_at IS NULL OR expires_at > now())
      ORDER BY is_pinned DESC, created_at DESC LIMIT 20
    ) a
  );
END;
$$;


--
-- Name: get_active_window(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_window() RETURNS TABLE(id uuid, open_at timestamp with time zone, close_at timestamp with time zone, duration_minutes integer, seconds_remaining integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.open_at,
    s.close_at,
    s.duration_minutes,
    EXTRACT(EPOCH FROM (s.close_at - NOW()))::INTEGER AS seconds_remaining
  FROM site_schedule s
  WHERE s.status IN ('pending', 'active')
  AND s.open_at  <= NOW()
  AND s.close_at >= NOW()
  ORDER BY s.open_at DESC
  LIMIT 1;
END;
$$;


--
-- Name: get_admin_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_result JSON;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT json_build_object(
    'total_users',       (SELECT COUNT(*) FROM profiles WHERE role != 'banned'),
    'total_tournaments', (SELECT COUNT(*) FROM tournaments),
    'open_tickets',      (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'total_coins',       (SELECT COALESCE(SUM(balance), 0) FROM wallets)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_anti_cheat_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_anti_cheat_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin','moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_cases',    COUNT(*),
    'open_cases',     COUNT(*) FILTER (WHERE status = 'open'),
    'critical_cases', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high_cases',     COUNT(*) FILTER (WHERE severity = 'high'),
    'resolved_today', COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= now() - interval '24 hours'),
    'avg_suspicion',  ROUND(AVG(suspicion_score)),
    'by_severity',    jsonb_build_object(
      'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
      'high',     COUNT(*) FILTER (WHERE severity = 'high'),
      'medium',   COUNT(*) FILTER (WHERE severity = 'medium'),
      'low',      COUNT(*) FILTER (WHERE severity = 'low')
    ),
    'by_status', jsonb_build_object(
      'open',          COUNT(*) FILTER (WHERE status = 'open'),
      'under_review',  COUNT(*) FILTER (WHERE status = 'under_review'),
      'escalated',     COUNT(*) FILTER (WHERE status = 'escalated'),
      'resolved',      COUNT(*) FILTER (WHERE status = 'resolved')
    )
  ) INTO v_result
  FROM public.ai_anti_cheat_cases;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_dashboard_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_dashboard_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_scans',          (SELECT COUNT(*) FROM public.ai_scan_reports),
    'scans_today',          (SELECT COUNT(*) FROM public.ai_scan_reports WHERE created_at >= CURRENT_DATE),
    'open_alerts',          (SELECT COUNT(*) FROM public.ai_alerts WHERE status = 'open'),
    'critical_alerts',      (SELECT COUNT(*) FROM public.ai_alerts WHERE status = 'open' AND severity = 'critical'),
    'emergency_alerts',     (SELECT COUNT(*) FROM public.ai_alerts WHERE status = 'open' AND severity = 'emergency'),
    'pending_actions',      (SELECT COUNT(*) FROM public.ai_action_queue WHERE status = 'pending'),
    'approved_actions',     (SELECT COUNT(*) FROM public.ai_action_queue WHERE status = 'approved'),
    'memory_entries',       (SELECT COUNT(*) FROM public.ai_memory),
    'overall_health',       (
      SELECT COALESCE(AVG(score)::integer, 100)
      FROM public.ai_health_scores
      WHERE subsystem = 'overall'
        AND recorded_at >= now() - interval '1 hour'
    ),
    'last_scan',            (
      SELECT jsonb_build_object(
        'id', id, 'type', scan_type, 'status', status,
        'health_score', health_score, 'completed_at', completed_at,
        'issues_found', issues_found
      )
      FROM public.ai_scan_reports
      ORDER BY created_at DESC LIMIT 1
    ),
    'recent_alerts',        (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'severity', severity, 'category', category,
        'title', title, 'created_at', created_at, 'status', status
      ))
      FROM (
        SELECT * FROM public.ai_alerts
        WHERE status = 'open'
        ORDER BY
          CASE severity WHEN 'emergency' THEN 1 WHEN 'critical' THEN 2
                        WHEN 'warning' THEN 3 ELSE 4 END,
          created_at DESC
        LIMIT 5
      ) sub
    ),
    'health_by_subsystem',  (
      SELECT jsonb_object_agg(subsystem, jsonb_build_object('score', score, 'status', status))
      FROM (
        SELECT DISTINCT ON (subsystem) subsystem, score, status
        FROM public.ai_health_scores
        ORDER BY subsystem, recorded_at DESC
      ) latest
    ),
    'pending_approvals',    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'action_type', action_type, 'priority', priority,
        'title', title, 'risk_level', risk_level, 'created_at', created_at
      ))
      FROM (
        SELECT * FROM public.ai_action_queue
        WHERE status = 'pending'
        ORDER BY
          CASE priority WHEN 'emergency' THEN 1 WHEN 'critical' THEN 2
                        WHEN 'high' THEN 3 WHEN 'normal' THEN 4 ELSE 5 END,
          created_at DESC
        LIMIT 5
      ) sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_full_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_full_dashboard() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    -- Module health
    'modules_total',    (SELECT COUNT(*) FROM public.ai_modules),
    'modules_active',   (SELECT COUNT(*) FROM public.ai_modules WHERE status = 'active'),
    'modules_error',    (SELECT COUNT(*) FROM public.ai_modules WHERE status = 'error'),
    'avg_module_health',(SELECT ROUND(AVG(health_score)) FROM public.ai_modules),

    -- Scans (from SQL 30)
    'last_scan',        (SELECT row_to_json(s) FROM public.ai_scan_reports s ORDER BY created_at DESC LIMIT 1),
    'scans_today',      (SELECT COUNT(*) FROM public.ai_scan_reports WHERE created_at >= now() - interval '24 hours'),

    -- Alerts (from SQL 30)
    'open_alerts',      (SELECT COUNT(*) FROM public.ai_alerts WHERE status = 'active'),
    'critical_alerts',  (SELECT COUNT(*) FROM public.ai_alerts WHERE status = 'active' AND severity = 'critical'),

    -- Anti-cheat
    'ac_open_cases',    (SELECT COUNT(*) FROM public.ai_anti_cheat_cases WHERE status IN ('open','under_review')),
    'ac_critical',      (SELECT COUNT(*) FROM public.ai_anti_cheat_cases WHERE severity = 'critical' AND status != 'resolved'),

    -- QA
    'open_bugs',        (SELECT COUNT(*) FROM public.ai_qa_bugs WHERE status = 'open'),
    'critical_bugs',    (SELECT COUNT(*) FROM public.ai_qa_bugs WHERE severity IN ('critical','blocker') AND status = 'open'),

    -- Security
    'security_events',  (SELECT COUNT(*) FROM public.ai_security_events WHERE status = 'open'),
    'security_critical',(SELECT COUNT(*) FROM public.ai_security_events WHERE severity IN ('critical','emergency') AND status = 'open'),

    -- Recommendations
    'pending_recs',     (SELECT COUNT(*) FROM public.ai_recommendations WHERE status = 'pending'),
    'critical_recs',    (SELECT COUNT(*) FROM public.ai_recommendations WHERE priority = 'critical' AND status = 'pending'),

    -- Self-healing
    'pending_heals',    (SELECT COUNT(*) FROM public.ai_self_healing_actions WHERE status = 'pending'),
    'heals_today',      (SELECT COUNT(*) FROM public.ai_self_healing_actions WHERE created_at >= now() - interval '24 hours'),

    -- Memory (from SQL 30)
    'memory_entries',   (SELECT COUNT(*) FROM public.ai_memory),

    -- Risk
    'current_risk',     (SELECT overall_risk FROM public.ai_risk_assessments ORDER BY created_at DESC LIMIT 1),
    'risk_score',       (SELECT risk_score FROM public.ai_risk_assessments ORDER BY created_at DESC LIMIT 1),

    -- Mobile
    'avg_mobile_score', (SELECT ROUND(AVG(overall_score)) FROM public.ai_mobile_scores WHERE tested_at >= now() - interval '7 days'),

    -- Simulation
    'last_simulation',  (SELECT row_to_json(s) FROM public.ai_simulation_runs s ORDER BY created_at DESC LIMIT 1),

    -- Timestamp
    'generated_at',     now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_health_timeline(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_health_timeline(p_subsystem text DEFAULT 'overall'::text, p_hours integer DEFAULT 24) RETURNS TABLE(recorded_at timestamp with time zone, score integer, status text, delta integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT h.recorded_at, h.score, h.status, h.delta
  FROM public.ai_health_scores h
  WHERE h.subsystem = p_subsystem
    AND h.recorded_at >= now() - (p_hours || ' hours')::interval
  ORDER BY h.recorded_at ASC;
END;
$$;


--
-- Name: get_ai_memory_context(text[], text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_memory_context(p_tags text[] DEFAULT '{}'::text[], p_type text DEFAULT NULL::text, p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, memory_type text, key text, value jsonb, confidence numeric, last_updated timestamp with time zone, tags text[])
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT m.id, m.memory_type, m.key, m.value, m.confidence, m.last_updated, m.tags
  FROM public.ai_memory m
  WHERE (p_type IS NULL OR m.memory_type = p_type)
    AND (array_length(p_tags, 1) IS NULL OR m.tags && p_tags)
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.confidence DESC, m.last_updated DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_ai_module_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_module_status() RETURNS TABLE(module_key text, module_name text, status text, health_score integer, last_run_at timestamp with time zone, next_run_at timestamp with time zone, total_runs integer, failed_runs integer, issues_detected integer, uptime_pct numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    m.module_key,
    m.module_name,
    m.status,
    m.health_score,
    m.last_run_at,
    m.next_run_at,
    m.total_runs,
    m.failed_runs,
    m.issues_detected,
    CASE WHEN m.total_runs > 0
      THEN ROUND(((m.total_runs - m.failed_runs)::numeric / m.total_runs) * 100, 2)
      ELSE 100.0
    END AS uptime_pct
  FROM public.ai_modules m
  ORDER BY m.module_key;
END;
$$;


--
-- Name: get_ai_qa_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_qa_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_last_run record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_last_run
  FROM public.ai_qa_test_runs
  ORDER BY created_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'total_runs',     COUNT(*),
    'last_run',       row_to_json(v_last_run),
    'open_bugs',      (SELECT COUNT(*) FROM public.ai_qa_bugs WHERE status = 'open'),
    'critical_bugs',  (SELECT COUNT(*) FROM public.ai_qa_bugs WHERE severity IN ('critical','blocker') AND status = 'open'),
    'bugs_by_severity', (
      SELECT jsonb_object_agg(severity, cnt)
      FROM (
        SELECT severity, COUNT(*) as cnt
        FROM public.ai_qa_bugs
        WHERE status = 'open'
        GROUP BY severity
      ) s
    ),
    'bugs_by_category', (
      SELECT jsonb_object_agg(category, cnt)
      FROM (
        SELECT category, COUNT(*) as cnt
        FROM public.ai_qa_bugs
        WHERE status = 'open'
        GROUP BY category
      ) c
    ),
    'avg_pass_rate',  ROUND(AVG(pass_rate), 2)
  ) INTO v_result
  FROM public.ai_qa_test_runs;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_recommendations_feed(integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_recommendations_feed(p_limit integer DEFAULT 20, p_priority text DEFAULT NULL::text, p_category text DEFAULT NULL::text) RETURNS TABLE(id uuid, title text, description text, category text, priority text, status text, confidence_score integer, affected_systems text[], estimated_impact text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.title, r.description, r.category, r.priority,
    r.status, r.confidence_score, r.affected_systems,
    r.estimated_impact, r.created_at
  FROM public.ai_recommendations r
  WHERE
    (p_priority IS NULL OR r.priority = p_priority)
    AND (p_category IS NULL OR r.category = p_category)
    AND r.status IN ('pending','accepted','in_progress')
  ORDER BY
    CASE r.priority
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'medium'   THEN 3
      WHEN 'low'      THEN 4
      ELSE 5
    END,
    r.confidence_score DESC,
    r.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_ai_risk_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_risk_dashboard() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_latest record;
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_latest
  FROM public.ai_risk_assessments
  ORDER BY created_at DESC LIMIT 1;

  SELECT jsonb_build_object(
    'current',        row_to_json(v_latest),
    'history_7d',     (
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.created_at)
      FROM (
        SELECT risk_score, overall_risk, created_at
        FROM public.ai_risk_assessments
        WHERE created_at >= now() - interval '7 days'
        ORDER BY created_at
      ) r
    ),
    'open_security',  (SELECT COUNT(*) FROM public.ai_security_events WHERE status = 'open'),
    'open_ac_cases',  (SELECT COUNT(*) FROM public.ai_anti_cheat_cases WHERE status IN ('open','under_review')),
    'open_bugs',      (SELECT COUNT(*) FROM public.ai_qa_bugs WHERE status = 'open'),
    'pending_heals',  (SELECT COUNT(*) FROM public.ai_self_healing_actions WHERE status = 'pending')
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: get_ai_security_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ai_security_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_events',     COUNT(*),
    'open_events',      COUNT(*) FILTER (WHERE status = 'open'),
    'critical_events',  COUNT(*) FILTER (WHERE severity = 'critical'),
    'emergency_events', COUNT(*) FILTER (WHERE severity = 'emergency'),
    'last_24h',         COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
    'by_category',      jsonb_object_agg(category, cnt)
  ) INTO v_result
  FROM (
    SELECT
      status, severity, created_at,
      category,
      COUNT(*) OVER (PARTITION BY category) as cnt
    FROM public.ai_security_events
  ) s;

  RETURN v_result;
END;
$$;


--
-- Name: get_all_system_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_system_settings() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur','admin','moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settings', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          s.id,
          'key',         s.key,
          'value',       s.value,
          'category',    s.category,
          'label',       s.label,
          'description', s.description,
          'data_type',   s.data_type,
          'updated_by',  s.updated_by,
          'updated_at',  s.updated_at,
          'updater',     p.username
        )
        ORDER BY s.category, s.key
      )
      FROM public.system_settings s
      LEFT JOIN public.profiles p ON p.id = s.updated_by
    )
  );
END;
$$;


--
-- Name: get_campaign_audience(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_audience(p_segment_type text) RETURNS TABLE(user_id uuid, email text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, au.email::text
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE
    -- Exclude banned users
    (p.is_banned IS NULL OR p.is_banned = false)
    -- Exclude unsubscribed
    AND au.email NOT IN (SELECT eu.email FROM public.email_unsubscribes eu)
    -- Segment filter
    AND CASE
      WHEN p_segment_type = 'all_users'          THEN true
      WHEN p_segment_type = 'active_users'       THEN p.updated_at > now() - interval '30 days'
      WHEN p_segment_type = 'inactive_users'     THEN p.updated_at <= now() - interval '30 days'
      WHEN p_segment_type = 'tournament_players' THEN EXISTS (
        SELECT 1 FROM public.tournament_participants tp WHERE tp.user_id = p.id
      )
      WHEN p_segment_type = 'clan_members'       THEN p.clan_id IS NOT NULL
      WHEN p_segment_type = 'super_admins'       THEN p.role = 'super_admin'
      ELSE true
    END;
END;
$$;


--
-- Name: get_dashboard_stories(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_stories() RETURNS TABLE(user_id uuid, username text, avatar_url text, has_unseen boolean, story_count bigint, latest_story_id uuid, latest_media_url text, latest_created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH visible AS (
    SELECT
      s.id,
      s.user_id,
      s.media_url,
      s.created_at,
      p.username,
      p.avatar_url,
      NOT EXISTS (
        SELECT 1 FROM story_views sv
        WHERE sv.story_id = s.id AND sv.viewer_id = auth.uid()
      ) AS is_unseen
    FROM stories s
    JOIN profiles p ON p.id = s.user_id
    WHERE
      s.expires_at > now()
      AND (
        s.user_id = auth.uid()
        OR s.privacy = 'public'
        OR (
          s.privacy = 'friends'
          AND EXISTS (
            SELECT 1 FROM friends f
            WHERE f.user_id = s.user_id AND f.friend_id = auth.uid()
          )
        )
      )
  ),
  grouped AS (
    SELECT
      v.user_id,
      v.username,
      v.avatar_url,
      bool_or(v.is_unseen)                                    AS has_unseen,
      COUNT(*)                                                 AS story_count,
      (array_agg(v.id         ORDER BY v.created_at DESC))[1] AS latest_story_id,
      (array_agg(v.media_url  ORDER BY v.created_at DESC))[1] AS latest_media_url,
      MAX(v.created_at)                                        AS latest_created_at
    FROM visible v
    GROUP BY v.user_id, v.username, v.avatar_url
  )
  SELECT *
  FROM grouped
  ORDER BY
    (CASE WHEN grouped.user_id = auth.uid() THEN 0 ELSE 1 END),
    has_unseen DESC,
    latest_created_at DESC;
END;
$$;


--
-- Name: get_disputed_tournaments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_disputed_tournaments() RETURNS TABLE(tournament_id uuid, tournament_name text, submissions bigint, dispute_reason text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT t.id, t.name, COUNT(mr.id), mv.dispute_reason, mv.created_at
  FROM public.tournaments t
  JOIN public.match_verifications mv ON mv.tournament_id = t.id
  LEFT JOIN public.match_results mr ON mr.tournament_id = t.id
  WHERE public.is_admin() AND (mv.status = 'disputed' OR t.status = 'disputed')
  GROUP BY t.id, t.name, mv.dispute_reason, mv.created_at
  ORDER BY mv.created_at DESC;
$$;


--
-- Name: get_error_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_error_stats(p_hours integer DEFAULT 24) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  RETURN (
    SELECT jsonb_build_object('total', COUNT(*))
    FROM public.error_logs
    WHERE created_at > now() - (p_hours || ' hours')::interval
  );
END;
$$;


--
-- Name: get_governance_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_governance_dashboard() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success',false,'error','Staff only');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applications', jsonb_build_object(
      'total',        (SELECT COUNT(*) FROM public.admin_applications),
      'pending',      (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'pending'),
      'under_review', (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'under_review'),
      'approved',     (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'approved'),
      'rejected',     (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'rejected'),
      'on_hold',      (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'on_hold'),
      'this_week',    (SELECT COUNT(*) FROM public.admin_applications WHERE created_at > now() - INTERVAL '7 days')
    ),
    'reports', jsonb_build_object(
      'total',        (SELECT COUNT(*) FROM public.reports),
      'pending',      (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
      'resolved',     (SELECT COUNT(*) FROM public.reports WHERE status = 'resolved'),
      'dismissed',    (SELECT COUNT(*) FROM public.reports WHERE status = 'dismissed'),
      'this_week',    (SELECT COUNT(*) FROM public.reports WHERE created_at > now() - INTERVAL '7 days'),
      'critical_open',(SELECT COUNT(*) FROM public.reports WHERE severity = 'critical' AND status = 'pending'),
      'high_open',    (SELECT COUNT(*) FROM public.reports WHERE severity = 'high' AND status = 'pending'),
      'by_type', (
        SELECT jsonb_object_agg(type, cnt) FROM (
          SELECT type, COUNT(*) AS cnt FROM public.reports GROUP BY type
        ) t
      )
    ),
    'warnings', jsonb_build_object(
      'total_active', (SELECT COUNT(*) FROM public.user_warnings WHERE resolved = false),
      'this_week',    (SELECT COUNT(*) FROM public.user_warnings WHERE created_at > now() - INTERVAL '7 days'),
      'critical',     (SELECT COUNT(*) FROM public.user_warnings WHERE severity = 'critical' AND resolved = false)
    ),
    'votes', jsonb_build_object(
      'total',     (SELECT COUNT(*) FROM public.admin_application_votes),
      'this_week', (SELECT COUNT(*) FROM public.admin_application_votes WHERE created_at > now() - INTERVAL '7 days'),
      'approve',   (SELECT COUNT(*) FROM public.admin_application_votes WHERE vote = 'approve'),
      'reject',    (SELECT COUNT(*) FROM public.admin_application_votes WHERE vote = 'reject')
    ),
    'recent_decisions', (
      SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.final_decision_at DESC), '[]') FROM (
        SELECT
          aa.id,
          aa.status,
          aa.final_decision_at,
          aa.final_note,
          aa.readiness_score,
          p.username  AS applicant,
          p.avatar_url AS applicant_avatar,
          r.username  AS decided_by
        FROM public.admin_applications aa
        JOIN public.profiles p ON p.id = aa.user_id
        LEFT JOIN public.profiles r ON r.id = aa.final_decision_by
        WHERE aa.final_decision_at IS NOT NULL
        ORDER BY aa.final_decision_at DESC
        LIMIT 8
      ) d
    ),
    'recent_reports', (
      SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]') FROM (
        SELECT
          rp.id, rp.type, rp.severity, rp.status, rp.title, rp.created_at,
          p.username AS reporter
        FROM public.reports rp
        JOIN public.profiles p ON p.id = rp.reporter_id
        ORDER BY rp.created_at DESC
        LIMIT 8
      ) r
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;


--
-- Name: get_my_gifts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_gifts() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(row_to_json(g))
    FROM (
      SELECT gt.*, sp.username AS sender_username, rp.username AS receiver_username
      FROM public.gift_transactions gt
      LEFT JOIN public.profiles sp ON sp.id = gt.sender_id
      LEFT JOIN public.profiles rp ON rp.id = gt.receiver_id
      WHERE gt.sender_id = auth.uid() OR gt.receiver_id = auth.uid()
      ORDER BY gt.created_at DESC
    ) g
  );
END;
$$;


--
-- Name: get_my_readiness(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_readiness() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_prof       record;
  v_score      integer := 0;
  v_tournaments integer;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_user_id;
  IF v_prof IS NULL THEN RETURN jsonb_build_object('score', 0); END IF;
  IF v_prof.avatar_url IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.bio IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.is_verified THEN v_score := v_score + 20; END IF;
  SELECT COUNT(*) INTO v_tournaments FROM public.tournament_players WHERE user_id = v_user_id;
  v_score := v_score + LEAST(40, v_tournaments * 5);
  RETURN jsonb_build_object('score', LEAST(100, v_score), 'tournaments', v_tournaments);
END;
$$;


--
-- Name: get_next_window(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_window() RETURNS TABLE(id uuid, open_at timestamp with time zone, close_at timestamp with time zone, duration_minutes integer, seconds_until_open integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.open_at,
    s.close_at,
    s.duration_minutes,
    EXTRACT(EPOCH FROM (s.open_at - NOW()))::INTEGER AS seconds_until_open
  FROM site_schedule s
  WHERE s.status = 'pending'
  AND s.open_at > NOW()
  ORDER BY s.open_at ASC
  LIMIT 1;
END;
$$;


--
-- Name: get_notification_audience(text, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_notification_audience(p_segment text, p_custom_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(user_id uuid, email text, username text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF p_segment = 'custom' AND p_custom_ids IS NOT NULL THEN
    RETURN QUERY SELECT p.id, p.email, p.username FROM public.profiles p WHERE p.id = ANY(p_custom_ids);
  ELSIF p_segment = 'all' THEN
    RETURN QUERY SELECT p.id, p.email, p.username FROM public.profiles p WHERE p.banned_until IS NULL OR p.banned_until < now();
  ELSIF p_segment = 'active' THEN
    RETURN QUERY SELECT p.id, p.email, p.username FROM public.profiles p
      WHERE p.updated_at > now() - INTERVAL '30 days' AND (p.banned_until IS NULL OR p.banned_until < now());
  ELSE
    RETURN QUERY SELECT p.id, p.email, p.username FROM public.profiles p WHERE p.role = p_segment;
  END IF;
END;
$$;


--
-- Name: get_or_create_conversation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_conversation(other_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = auth.uid()
  JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv_id, auth.uid());
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (conv_id, other_user_id);

  RETURN conv_id;
END;
$$;


--
-- Name: get_pending_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_users() RETURNS TABLE(id uuid, username text, full_name text, email text, created_at timestamp with time zone, avatar_url text, free_fire_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'founder', 'fondateur') THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.username::text,
      p.full_name::text,
      p.email::text,
      p.created_at,
      p.avatar_url::text,
      p.free_fire_id::text
    FROM profiles p
    WHERE p.verification_status = 'pending'
      AND p.role = 'user'
    ORDER BY p.created_at DESC;
END;
$$;


--
-- Name: get_pending_users_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_users_count() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'founder', 'fondateur') THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE verification_status = 'pending'
    AND role = 'user';

  RETURN v_count;
END;
$$;


--
-- Name: get_profile_completion(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profile_completion(p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid  uuid := COALESCE(p_user_id, auth.uid());
  v_prof record;
  v_score integer := 0;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof IS NULL THEN RETURN jsonb_build_object('score', 0, 'complete', false); END IF;
  IF v_prof.username IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.avatar_url IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.bio IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.country IS NOT NULL THEN v_score := v_score + 20; END IF;
  IF v_prof.birthday IS NOT NULL THEN v_score := v_score + 20; END IF;
  RETURN jsonb_build_object('score', v_score, 'complete', v_score = 100);
END;
$$;


--
-- Name: get_system_setting(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_system_setting(p_key text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_setting record;
BEGIN
  SELECT * INTO v_setting FROM public.system_settings WHERE key = p_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('key', v_setting.key, 'value', v_setting.value,
    'category', v_setting.category, 'description', v_setting.description, 'updated_at', v_setting.updated_at);
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: team_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text DEFAULT 'Je souhaite rejoindre votre équipe.'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT team_join_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: get_team_join_requests(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_join_requests(p_team_id uuid) RETURNS SETOF public.team_join_requests
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM team_join_requests
  WHERE team_id = p_team_id
    AND status = 'pending'
  ORDER BY created_at DESC;
END;
$$;


--
-- Name: get_team_ranking(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_ranking() RETURNS TABLE(team_id uuid, team_name text, team_tag text, logo_url text, captain_name text, points integer, wins integer, losses integer, tournaments_played integer, total_kills integer, member_count bigint, rank bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    t.id, t.name, t.tag, t.logo_url,
    p.full_name,
    t.points, t.wins, t.losses,
    t.tournaments_played, t.total_kills,
    COUNT(tm.id) AS member_count,
    ROW_NUMBER() OVER (ORDER BY t.points DESC, t.wins DESC) AS rank
  FROM teams t
  LEFT JOIN profiles p ON p.id = t.captain_id
  LEFT JOIN team_members tm ON tm.team_id = t.id
  WHERE t.status = 'active'
  GROUP BY t.id, p.full_name
  ORDER BY t.points DESC, t.wins DESC;
$$;


--
-- Name: get_team_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_role(p_team_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM team_members WHERE team_id=p_team_id AND user_id=auth.uid() LIMIT 1;
$$;


--
-- Name: get_tournament_submissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tournament_submissions(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  RETURN (
    SELECT jsonb_agg(row_to_json(r))
    FROM (
      SELECT mr.*, p.username, p.avatar_url
      FROM public.match_results mr
      JOIN public.profiles p ON p.id = mr.submitted_by
      WHERE mr.tournament_id = p_tournament_id
      ORDER BY mr.created_at DESC
    ) r
  );
END;
$$;


--
-- Name: get_unread_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_count() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::integer FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
$$;


--
-- Name: get_unread_notification_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notification_count() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::integer FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
$$;


--
-- Name: get_user_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_balance(user_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_balance INTEGER;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Seulement soi-même ou admin peut voir un solde
  IF auth.uid() != user_uuid AND v_caller_role NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT balance INTO v_balance FROM wallets WHERE user_id = user_uuid;
  RETURN COALESCE(v_balance, 0);
END;
$$;


--
-- Name: get_user_stories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_stories(p_user_id uuid) RETURNS TABLE(id uuid, media_url text, media_type text, caption text, created_at timestamp with time zone, view_count integer, is_seen boolean, reactions jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.media_url,
    s.media_type,
    s.caption,
    s.created_at,
    s.view_count,
    EXISTS (
      SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = auth.uid()
    ) AS is_seen,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('emoji', r.reaction, 'count', r.cnt))
        FROM (
          SELECT reaction, COUNT(*) AS cnt
          FROM story_reactions
          WHERE story_id = s.id
          GROUP BY reaction
        ) r
      ),
      '[]'::jsonb
    ) AS reactions
  FROM stories s
  WHERE s.user_id = p_user_id AND s.expires_at > now()
  ORDER BY s.created_at ASC;
END;
$$;


--
-- Name: grant_coins(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_coins(target_user uuid, amount integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  wallet_id UUID;
BEGIN
  -- التحقق من الصلاحية
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- البحث عن المحفظة أو إنشائها
  SELECT id INTO wallet_id FROM public.wallets WHERE user_id = target_user;
  
  IF wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (target_user, amount)
    RETURNING id INTO wallet_id;
  ELSE
    UPDATE public.wallets SET balance = balance + amount WHERE user_id = target_user;
  END IF;
  
  -- تسجيل المعاملة
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, created_at)
  VALUES (target_user, amount, 'admin_grant', 'Granted by admin', now());
  
  RETURN TRUE;
END;
$$;


--
-- Name: grant_coins(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_coins(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'Admin grant'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_new_balance integer;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.wallets SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason)
  VALUES (p_user_id, p_amount, 'grant', p_reason);
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, 'reward', '💰 CP Received', format('You received %s CP. Reason: %s', p_amount, p_reason),
          jsonb_build_object('amount', p_amount));
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;


--
-- Name: handle_new_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: increment_news_views(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_news_views(news_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE news SET views = views + 1 WHERE id = news_id;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
    AND role IN ('admin','super_admin','founder','fondateur')
  );
$$;


--
-- Name: is_email_verified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_email_verified() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL FROM auth.users WHERE id = auth.uid()),
    false
  );
$$;


--
-- Name: is_role(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_role(p_roles text[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(p_roles)
  );
$$;


--
-- Name: is_role(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_role(p_role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_role(ARRAY[p_role]);
$$;


--
-- Name: is_site_open(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_site_open() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM site_schedule
    WHERE status IN ('pending', 'active')
    AND open_at  <= NOW()
    AND close_at >= NOW()
  );
END;
$$;


--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role = 'super_admin'
  FROM profiles
  WHERE id = uid
  LIMIT 1;
$$;


--
-- Name: is_super_or_founder(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_or_founder() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin','founder','fondateur')
  );
$$;


--
-- Name: is_team_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_member(p_team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;


--
-- Name: is_user_muted(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_muted(check_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_mutes
    WHERE user_id = check_user_id
    AND muted_until > NOW()
  );
END;
$$;


--
-- Name: issue_warning(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_warning(p_user_id uuid, p_reason text, p_severity text DEFAULT 'low'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  INSERT INTO public.user_warnings (user_id, admin_id, reason, severity) VALUES (p_user_id, auth.uid(), p_reason, p_severity);
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, 'system', '⚠️ Warning Issued', format('Warning: %s', p_reason), jsonb_build_object('severity', p_severity));
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: join_tournament(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_tournament(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_t          record;
  v_wallet_bal integer;
  v_already_in boolean;
BEGIN
  -- Lock the tournament row to serialise concurrent registrations
  SELECT id, status, entry_fee, max_players, current_players
  INTO v_t
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_t.status <> 'registration_open' THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Tournament not accepting registrations (status: %s)', v_t.status));
  END IF;

  IF v_t.current_players >= v_t.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
  ) INTO v_already_in;

  IF v_already_in THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    -- Lock wallet row to prevent concurrent spend
    SELECT balance INTO v_wallet_bal
    FROM public.wallets
    WHERE user_id = auth.uid()
    FOR UPDATE;

    IF COALESCE(v_wallet_bal, 0) < v_t.entry_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET balance = balance - v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, description, reference)
    VALUES
      (auth.uid(), -v_t.entry_fee, 'fee', 'Tournament entry fee', p_tournament_id::text);
  END IF;

  INSERT INTO public.tournament_participants
    (tournament_id, user_id, status, approved_at, approved_by)
  VALUES
    (p_tournament_id, auth.uid(), 'approved', now(), auth.uid());

  UPDATE public.tournaments
  SET
    current_players = current_players + 1,
    status = CASE
      WHEN current_players + 1 >= max_players THEN 'full'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true, 'tournament_id', p_tournament_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;


--
-- Name: leave_team(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_team(p_team_id uuid, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id;
  UPDATE profiles SET team_id = NULL WHERE id = p_user_id;
END;
$$;


--
-- Name: leave_tournament(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_tournament(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_t       record;
  v_deleted integer;
BEGIN
  SELECT id, status, entry_fee, current_players
  INTO v_t
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_t.status NOT IN ('registration_open', 'full') THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Cannot leave a tournament that has already started');
  END IF;

  DELETE FROM public.tournament_participants
  WHERE tournament_id = p_tournament_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'approved', 'joined');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not registered in this tournament');
  END IF;

  IF v_t.entry_fee > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_t.entry_fee, updated_at = now()
    WHERE user_id = auth.uid();

    INSERT INTO public.wallet_transactions
      (user_id, amount, type, description, reference)
    VALUES
      (auth.uid(), v_t.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
  END IF;

  UPDATE public.tournaments
  SET
    current_players = GREATEST(0, current_players - 1),
    status = CASE
      WHEN status = 'full' THEN 'registration_open'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_tournament_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;


--
-- Name: leave_tournament(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_tournament(p_tournament_id uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE
        v_user_id uuid := COALESCE(p_user_id, auth.uid());
        v_t public.tournaments%ROWTYPE;
      BEGIN
        IF v_user_id <> auth.uid() AND NOT public.is_admin() THEN
          RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
        END IF;
        SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
        DELETE FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id;
        IF FOUND THEN
          UPDATE public.tournaments SET current_players = GREATEST(0, current_players - 1), updated_at = now() WHERE id = p_tournament_id;
          IF v_t.entry_fee > 0 THEN
            UPDATE public.wallets SET balance = balance + v_t.entry_fee, updated_at = now() WHERE user_id = v_user_id;
            INSERT INTO public.wallet_transactions (user_id, amount, type, reason, reference)
            VALUES (v_user_id, v_t.entry_fee, 'refund', 'Tournament leave refund', p_tournament_id::text);
          END IF;
        END IF;
        RETURN jsonb_build_object('success', true);
      END;
      $$;


--
-- Name: log_client_error(text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_client_error(p_message text, p_stack text DEFAULT NULL::text, p_url text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text, p_context jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.error_logs (user_id, error_type, message, stack, url, user_agent, context)
  VALUES (auth.uid(), 'client', p_message, p_stack, p_url, p_user_agent, p_context)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: log_email_event(uuid, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_email_event(p_campaign_id uuid, p_event_type text, p_actor_id uuid, p_details jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.email_events(campaign_id, event_type, actor_id, details)
  VALUES (p_campaign_id, p_event_type, p_actor_id, p_details);
END;
$$;


--
-- Name: log_performance_metric(text, text, double precision, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_performance_metric(p_page text, p_metric_name text, p_value double precision, p_unit text DEFAULT 'ms'::text, p_context jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.performance_metrics (user_id, page, metric_name, value, unit, context)
  VALUES (auth.uid(), p_page, p_metric_name, p_value, p_unit, p_context);
END;
$$;


--
-- Name: mark_all_notifications_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_all_notifications_read(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now(), is_seen = true, seen_at = COALESCE(seen_at, now())
  WHERE user_id = p_user_id AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: mark_notification_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notification_read(p_notification_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.notifications SET read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;


--
-- Name: mark_notifications_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notifications_read() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE notifications SET is_read = true WHERE user_id = auth.uid() AND is_read = false;
$$;


--
-- Name: mark_notifications_read(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notifications_read(p_notification_ids uuid[] DEFAULT NULL::uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  -- If no IDs given: mark all as read
  IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = v_user_id AND is_read = false;
  ELSE
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


--
-- Name: mark_notifications_seen(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notifications_seen(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_seen = true, seen_at = now()
  WHERE user_id = p_user_id AND is_seen = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: normalize_match_result_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_match_result_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.rank IS NULL AND NEW.placement IS NOT NULL THEN
    NEW.rank := NEW.placement;
  END IF;
  IF NEW.placement IS NULL AND NEW.rank IS NOT NULL THEN
    NEW.placement := NEW.rank;
  END IF;
  IF NEW.points IS NULL THEN
    NEW.points := 0;
  END IF;
  IF NEW.score IS NULL THEN
    NEW.score := NEW.points;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notif_on_join_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notif_on_join_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_team RECORD;
  v_requester RECORD;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Récupérer info équipe
    SELECT t.*, p.id as cap_id, p.full_name as cap_name
    INTO v_team
    FROM teams t
    JOIN profiles p ON p.id = t.captain_id
    WHERE t.id = NEW.team_id;

    -- Récupérer nom du demandeur
    SELECT full_name INTO v_requester FROM profiles WHERE id = NEW.user_id;

    -- Notifier le captain
    IF v_team.cap_id IS NOT NULL THEN
      PERFORM create_notification(
        p_user_id    => v_team.cap_id,
        p_type       => 'team_join_request',
        p_title      => 'Nouvelle demande d''adhésion',
        p_body       => v_requester.full_name || ' veut rejoindre ' || v_team.name,
        p_link       => '/teams/' || NEW.team_id::text,
        p_entity_type => 'team',
        p_entity_id  => NEW.team_id,
        p_actor_id   => NEW.user_id,
        p_category   => 'team',
        p_priority   => 'normal',
        p_meta       => jsonb_build_object('request_id', NEW.id, 'team_name', v_team.name)
      );
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Notifier le demandeur
    IF NEW.status = 'approved' THEN
      SELECT name INTO v_team FROM teams WHERE id = NEW.team_id;
      PERFORM create_notification(
        p_user_id    => NEW.user_id,
        p_type       => 'team_join_accepted',
        p_title      => '🎉 Demande acceptée !',
        p_body       => 'Tu as rejoint l''équipe ' || v_team.name,
        p_link       => '/teams/' || NEW.team_id::text,
        p_entity_type => 'team',
        p_entity_id  => NEW.team_id,
        p_category   => 'team',
        p_priority   => 'high',
        p_meta       => jsonb_build_object('team_id', NEW.team_id)
      );
    ELSE
      PERFORM create_notification(
        p_user_id    => NEW.user_id,
        p_type       => 'team_join_rejected',
        p_title      => 'Demande refusée',
        p_body       => 'Ta demande d''adhésion a été refusée',
        p_link       => '/teams',
        p_category   => 'team',
        p_priority   => 'normal'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notif_on_tournament_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notif_on_tournament_approval() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_tour RECORD;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    SELECT name INTO v_tour FROM tournaments WHERE id = NEW.tournament_id;
    PERFORM create_notification(
      p_user_id    => NEW.user_id,
      p_type       => 'tournament_approved',
      p_title      => '✅ Accepté dans le tournoi !',
      p_body       => 'Tu peux maintenant rejoindre la salle : ' || COALESCE(v_tour.name, 'Tournoi'),
      p_link       => '/tournaments/' || NEW.tournament_id::text || '/room',
      p_entity_type => 'tournament',
      p_entity_id  => NEW.tournament_id,
      p_category   => 'tournament',
      p_priority   => 'high'
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notif_on_tournament_live(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notif_on_tournament_live() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status != 'live'
     AND (NEW.status = 'live' OR NEW.room_status = 'live') THEN

    INSERT INTO notifications (user_id, type, title, body, link, entity_type, entity_id, category, priority)
    SELECT
      tp.user_id,
      'tournament_started',
      '🔴 Match commencé !',
      'Le tournoi ' || NEW.name || ' est en cours',
      '/tournaments/' || NEW.id::text || '/room',
      'tournament',
      NEW.id,
      'tournament',
      'urgent'
    FROM tournament_participants tp
    WHERE tp.tournament_id = NEW.id
      AND tp.status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: populate_campaign_recipients(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_campaign_recipients(p_campaign_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_segment text;
  v_count   integer;
BEGIN
  SELECT segment_type INTO v_segment FROM public.email_campaigns WHERE id = p_campaign_id;

  -- Clear existing pending recipients
  DELETE FROM public.email_campaign_recipients
  WHERE campaign_id = p_campaign_id AND status = 'pending';

  -- Insert new recipients
  INSERT INTO public.email_campaign_recipients(campaign_id, user_id, email, status)
  SELECT p_campaign_id, a.user_id, a.email, 'pending'
  FROM public.get_campaign_audience(v_segment) a;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.email_campaigns
  SET total_recipients = v_count
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;


--
-- Name: protect_profile_security_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_profile_security_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.id
     AND NOT public.is_role(ARRAY['admin','super_admin'])
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.banned_until IS DISTINCT FROM OLD.banned_until
       OR NEW.banned_by IS DISTINCT FROM OLD.banned_by
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.fair_play_score IS DISTINCT FROM OLD.fair_play_score
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     ) THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed by the user';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: purchase_item(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchase_item(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_item        record;
  v_balance     integer;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_item
  FROM public.store_items
  WHERE id = p_item_id AND active = true AND approved = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or unavailable');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_items
    WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already owned');
  END IF;

  -- Lock wallet row first to prevent concurrent purchase race
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < v_item.price THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_balance, 'required', v_item.price
    );
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_item.price, updated_at = now()
  WHERE user_id = v_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (v_user_id, -v_item.price, 'purchase', format('Boutique: %s', v_item.name));

  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id, 'achievement',
      format('🎉 %s acheté !', v_item.name),
      format('Tu possèdes maintenant "%s"', v_item.name),
      jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name, 'price', v_item.price)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',     true,
    'new_balance', v_new_balance,
    'item_name',   v_item.name
  );
END;
$$;


--
-- Name: recalculate_fair_play_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_fair_play_score(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_delta integer;
  v_new_score   integer;
BEGIN
  IF NOT public.is_role(ARRAY['admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  SELECT COALESCE(SUM(delta), 0)
  INTO v_total_delta
  FROM public.fair_play_events
  WHERE user_id = p_user_id;

  v_new_score := GREATEST(0, LEAST(200, 100 + v_total_delta));

  UPDATE public.profiles
  SET fair_play_score = v_new_score, updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success',   true,
    'user_id',   p_user_id,
    'new_score', v_new_score,
    'tier',      public.fair_play_tier(v_new_score)
  );
END;
$$;


--
-- Name: record_story_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_story_view(p_story_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO story_views (story_id, viewer_id)
  VALUES (p_story_id, auth.uid())
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted THEN
    UPDATE stories SET view_count = view_count + 1 WHERE id = p_story_id;
  END IF;
END;
$$;


--
-- Name: reject_ai_action(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_ai_action(p_action_id uuid, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
  UPDATE public.ai_action_queue
  SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), notes = p_note, updated_at = now()
  WHERE id = p_action_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: reject_gift(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_gift(p_gift_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gift    record;
BEGIN
  SELECT * INTO v_gift FROM public.gift_transactions WHERE id = p_gift_id;
  IF v_gift IS NULL OR v_gift.receiver_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  IF v_gift.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift already processed');
  END IF;
  UPDATE public.gift_transactions SET status = 'rejected' WHERE id = p_gift_id;
  UPDATE public.wallets SET balance = balance + v_gift.amount, updated_at = now() WHERE user_id = v_gift.sender_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, reason)
  VALUES (v_gift.sender_id, v_gift.amount, 'refund', 'Gift rejected — refunded');
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: reject_user_verification(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_user_verification(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin', 'admin', 'founder', 'fondateur') THEN
    RETURN json_build_object('success', false, 'error', 'Permission refusée');
  END IF;

  UPDATE profiles
  SET verification_status = 'rejected', updated_at = NOW()
  WHERE id = p_user_id AND verification_status = 'pending';

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: resolve_clan_war(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_clan_war(p_war_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_war       record;
  v_winner_id uuid;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;

  SELECT * INTO v_war FROM public.clan_wars WHERE id = p_war_id AND status = 'active';
  IF v_war IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'War not found or already resolved');
  END IF;

  -- Determine winner
  IF v_war.clan_a_score > v_war.clan_b_score THEN
    v_winner_id := v_war.clan_a_id;
  ELSIF v_war.clan_b_score > v_war.clan_a_score THEN
    v_winner_id := v_war.clan_b_id;
  ELSE
    v_winner_id := NULL; -- Draw
  END IF;

  -- Mark as completed
  UPDATE public.clan_wars
  SET status = 'completed', winner_clan_id = v_winner_id, ends_at = now(), updated_at = now()
  WHERE id = p_war_id;

  -- Notify clan members (winners)
  IF v_winner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT cm.user_id, 'announcement', '🏆 Clan War Victory!',
           'Your clan won the war! Collect your rewards.', jsonb_build_object('war_id', p_war_id)
    FROM public.clan_members cm WHERE cm.clan_id = v_winner_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'winner_clan_id', v_winner_id);
END;
$$;


--
-- Name: resolve_emergency(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_emergency(p_action_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  UPDATE public.emergency_actions SET resolved_at = now(), resolved_by = auth.uid() WHERE id = p_action_id;
  PERFORM public.update_system_setting('maintenance_mode', 'false', 'Emergency resolved');
  PERFORM public.update_system_setting('login_enabled', 'true', 'Emergency resolved');
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: resolve_emergency(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_emergency(p_action_id uuid, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin or founder can resolve emergencies');
  END IF;

  UPDATE public.emergency_actions
  SET
    status           = 'resolved',
    resolved_by      = v_actor_id,
    resolved_at      = now(),
    resolution_notes = p_notes
  WHERE id = p_action_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emergency action not found or already resolved');
  END IF;

  RETURN jsonb_build_object(
    'success',     true,
    'action_id',   p_action_id,
    'resolved_at', now(),
    'resolved_by', v_actor_id
  );
END;
$$;


--
-- Name: revoke_verification(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_verification(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.profiles
  SET is_verified = false, verified_at = NULL, verified_by = NULL, verified_note = NULL, updated_at = now()
  WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: run_health_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_health_check() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_score  integer := 100;
  v_users  integer;
  v_active integer;
BEGIN
  SELECT COUNT(*) INTO v_users  FROM public.profiles;
  SELECT COUNT(*) INTO v_active FROM public.tournaments WHERE status = 'open';
  IF v_users = 0 THEN v_score := v_score - 30; END IF;
  INSERT INTO public.health_checks (check_name, status, score, details)
  VALUES ('full_check',
          CASE WHEN v_score >= 80 THEN 'ok' WHEN v_score >= 50 THEN 'warning' ELSE 'critical' END,
          v_score,
          jsonb_build_object('users', v_users, 'active_tournaments', v_active));
  RETURN jsonb_build_object('score', v_score, 'users', v_users, 'active_tournaments', v_active);
END;
$$;


--
-- Name: sanitize_chat_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sanitize_chat_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.content := LEFT(regexp_replace(COALESCE(NEW.content,''), '<[^>]+>', '', 'g'), 500);
  IF LENGTH(TRIM(NEW.content)) = 0 THEN RAISE EXCEPTION 'Empty message'; END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sanitize_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sanitize_profile() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.bio       := LEFT(regexp_replace(COALESCE(NEW.bio,''),       '<[^>]+>', '', 'g'), 250);
  NEW.full_name := LEFT(regexp_replace(COALESCE(NEW.full_name,''), '<[^>]+>', '', 'g'), 50);
  NEW.free_fire_id := LEFT(COALESCE(NEW.free_fire_id,''), 20);
  RETURN NEW;
END;
$$;


--
-- Name: schedule_maintenance(text, timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_maintenance(p_title text, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  INSERT INTO public.maintenance_schedules (title, scheduled_start, scheduled_end, message, created_by)
  VALUES (p_title, p_start_at, p_end_at, p_message, auth.uid()) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'schedule_id', v_id);
END;
$$;


--
-- Name: schedule_maintenance(text, text, text, timestamp with time zone, timestamp with time zone, text[], boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_maintenance(p_title text, p_description text DEFAULT NULL::text, p_mode text DEFAULT 'full'::text, p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_systems text[] DEFAULT '{}'::text[], p_notify boolean DEFAULT true, p_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
  v_id         uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin or founder can schedule maintenance');
  END IF;

  IF p_start IS NULL THEN
    p_start := now() + interval '1 hour';
  END IF;
  IF p_end IS NULL THEN
    p_end := p_start + interval '2 hours';
  END IF;

  INSERT INTO public.maintenance_schedules (
    title, description, mode, status,
    scheduled_start, scheduled_end,
    affected_systems, notify_users, notify_message,
    created_by
  ) VALUES (
    p_title, p_description, p_mode, 'scheduled',
    p_start, p_end,
    p_systems, p_notify, p_message,
    v_actor_id
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'id',      v_id,
    'title',   p_title,
    'mode',    p_mode,
    'start',   p_start,
    'end',     p_end
  );
END;
$$;


--
-- Name: send_gift(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_gift(p_receiver_id uuid, p_amount integer, p_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sender_id    uuid := auth.uid();
  v_sender       record;
  v_receiver     record;
  v_sender_bal   integer;
  v_gift_id      uuid;
  v_recent_count integer;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send gift to yourself');
  END IF;

  IF p_amount IS NULL OR p_amount < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum gift is 10 CP');
  END IF;
  IF p_amount > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum gift is 10,000 CP');
  END IF;

  SELECT * INTO v_sender FROM public.profiles WHERE id = v_sender_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  IF v_sender.role = 'banned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Banned users cannot send gifts');
  END IF;

  SELECT * INTO v_receiver FROM public.profiles WHERE id = p_receiver_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receiver not found');
  END IF;

  -- Rate limiting
  SELECT COUNT(*) INTO v_recent_count
  FROM public.gift_transactions
  WHERE sender_id = v_sender_id
    AND created_at >= now() - INTERVAL '24 hours'
    AND status != 'cancelled';

  IF v_recent_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only send 5 gifts per 24 hours');
  END IF;

  -- Lock wallet row before balance read to prevent concurrent double-send
  SELECT balance INTO v_sender_bal
  FROM public.wallets
  WHERE user_id = v_sender_id
  FOR UPDATE;

  IF v_sender_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found');
  END IF;

  IF v_sender_bal < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient balance',
      'balance', v_sender_bal, 'required', p_amount
    );
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = v_sender_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (
    v_sender_id, -p_amount, 'gift_sent',
    format('Gift to @%s', COALESCE(v_receiver.username, 'user'))
  );

  INSERT INTO public.gift_transactions (sender_id, receiver_id, type, amount, message)
  VALUES (v_sender_id, p_receiver_id, 'coins', p_amount, p_message)
  RETURNING id INTO v_gift_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_receiver_id, 'coins_received',
      format('🎁 Gift from @%s!', COALESCE(v_sender.username, 'Someone')),
      format('%s CP sent to you%s. Claim it from your notifications!',
        p_amount,
        CASE WHEN p_message IS NOT NULL
             THEN format(' with message: "%s"', LEFT(p_message, 80))
             ELSE '' END
      ),
      jsonb_build_object(
        'gift_id', v_gift_id, 'amount', p_amount,
        'sender_id', v_sender_id, 'sender_username', v_sender.username,
        'action', 'claim_gift'
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_sender_id, 'system',
      format('✅ Gift sent to @%s', COALESCE(v_receiver.username, 'user')),
      format('%s CP sent. Waiting for them to claim.', p_amount),
      jsonb_build_object('gift_id', v_gift_id, 'receiver_id', p_receiver_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',  true,
    'gift_id',  v_gift_id,
    'amount',   p_amount,
    'receiver', v_receiver.username
  );
END;
$$;


--
-- Name: send_gift(uuid, uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_gift(p_receiver_id uuid, p_item_id uuid DEFAULT NULL::uuid, p_amount integer DEFAULT 0, p_message text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE
        v_sender uuid := auth.uid();
        v_balance integer;
        v_gift_id uuid;
      BEGIN
        IF p_amount > 0 THEN
          SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_sender FOR UPDATE;
          IF COALESCE(v_balance, 0) < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
          UPDATE public.wallets SET balance = balance - p_amount, updated_at = now() WHERE user_id = v_sender;
          INSERT INTO public.wallet_transactions (user_id, amount, type, reason) VALUES (v_sender, -p_amount, 'gift_sent', 'Gift sent');
        END IF;
        INSERT INTO public.gift_transactions (sender_id, receiver_id, item_id, coins, message)
        VALUES (v_sender, p_receiver_id, p_item_id, COALESCE(p_amount,0), p_message)
        RETURNING id INTO v_gift_id;
        RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id);
      END;
      $$;


--
-- Name: send_invitation(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_invitation(p_type text, p_resource_id uuid, p_receiver_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  inv_id UUID;
  sender_name TEXT;
BEGIN
  -- Blocked check: cannot invite someone who blocked you or vice versa
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_receiver_id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = p_receiver_id)
  ) THEN
    RAISE EXCEPTION 'Cannot invite a blocked user';
  END IF;

  SELECT username INTO sender_name FROM profiles WHERE id = auth.uid();

  INSERT INTO invitations (type, resource_id, sender_id, receiver_id)
  VALUES (p_type, p_resource_id, auth.uid(), p_receiver_id)
  RETURNING id INTO inv_id;

  INSERT INTO notifications (user_id, sender_id, type, title, message, metadata)
  VALUES (
    p_receiver_id,
    auth.uid(),
    p_type || '_invite',
    sender_name || ' invited you to a ' || p_type,
    'Tap to view the invitation.',
    jsonb_build_object('invitation_id', inv_id, 'resource_id', p_resource_id, 'type', p_type)
  );

  RETURN inv_id;
END;
$$;


--
-- Name: send_notification(uuid, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb, p_action_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


--
-- Name: set_user_offline(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_offline() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline', last_seen = now(), updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;


--
-- Name: set_user_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_role(p_user_id uuid, p_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.is_super_or_founder() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;
END;
$$;


--
-- Name: setup_room(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_room(p_tournament_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  INSERT INTO public.room_members (tournament_id, user_id)
  SELECT tournament_id, user_id FROM public.tournament_participants
  WHERE tournament_id = p_tournament_id AND status IN ('approved','joined')
  ON CONFLICT (tournament_id, user_id) DO NOTHING;
  UPDATE public.tournaments SET room_status = 'open', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: setup_room(uuid, text, text, timestamp with time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.setup_room(p_tournament_id uuid, p_room_code text DEFAULT NULL::text, p_room_password text DEFAULT NULL::text, p_start_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_match_duration integer DEFAULT 10, p_result_window integer DEFAULT 30) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Vérification d'accès
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RAISE EXCEPTION 'Accès refusé : rôle insuffisant';
  END IF;

  -- Vérifier que le tournoi existe
  IF NOT EXISTS (SELECT 1 FROM tournaments WHERE id = p_tournament_id) THEN
    RAISE EXCEPTION 'Tournoi introuvable';
  END IF;

  UPDATE tournaments SET
    room_status = 'ready',
    status = 'locked',
    room_code = COALESCE(p_room_code, room_code),
    room_password = COALESCE(p_room_password, room_password),
    match_duration = p_match_duration
  WHERE id = p_tournament_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: spend_coins(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_coins(p_user_id uuid, p_amount integer, p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_balance INT;
BEGIN
  IF p_amount <= 0 OR p_amount > 100000 THEN 
    RETURN json_build_object('success',false,'error','Invalid amount'); 
  END IF;
  SELECT coins INTO v_balance FROM profiles WHERE id = p_user_id;
  IF v_balance < p_amount THEN
    RETURN json_build_object('success',false,'error','Insufficient coins');
  END IF;
  UPDATE profiles SET coins = coins - p_amount WHERE id = p_user_id AND id = auth.uid();
  RETURN json_build_object('success',true,'new_balance', v_balance - p_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success',false,'error',SQLERRM);
END;
$$;


--
-- Name: start_match(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_match(p_tournament_id uuid DEFAULT NULL::uuid, tournament_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  p_tournament_id := COALESCE(p_tournament_id, tournament_id);
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  UPDATE public.tournaments SET status = 'live', room_status = 'live', updated_at = now() WHERE id = p_tournament_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: start_new_season(text, date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_new_season(p_name text, p_start_date date, p_end_date date, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_caller_role text;
  v_season_id   uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  UPDATE public.seasons SET is_active = false, updated_at = now() WHERE is_active = true;
  INSERT INTO public.seasons (name, start_date, end_date, description, is_active, status)
  VALUES (p_name, p_start_date, p_end_date, p_description, true, 'active')
  RETURNING id INTO v_season_id;
  RETURN jsonb_build_object('success', true, 'season_id', v_season_id);
END;
$$;


--
-- Name: start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_new_season(p_name text, p_number integer DEFAULT NULL::integer, p_description text DEFAULT ''::text, p_reset_coins boolean DEFAULT false, p_reset_xp boolean DEFAULT false, p_reset_stats boolean DEFAULT true, p_reset_wins boolean DEFAULT true, p_reset_avatars boolean DEFAULT false, p_reset_chat boolean DEFAULT true, p_reset_tournaments boolean DEFAULT true, p_reset_clans boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id      uuid    := auth.uid();
  v_old_id        uuid;
  v_new_id        uuid;
  v_season_number integer;
  v_rows_updated  integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_admin_id
      AND role IN ('admin','super_admin','founder','fondateur')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.seasons
  SET status = 'completed', end_date = now()
  WHERE status = 'active'
  RETURNING id INTO v_old_id;

  IF p_number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO v_season_number FROM public.seasons;
  ELSE
    v_season_number := p_number;
  END IF;

  INSERT INTO public.seasons (
    name, number, status,
    reset_coins, reset_xp, reset_stats,
    reset_tournaments, reset_chat, reset_avatars, reset_clans
  )
  VALUES (
    p_name, v_season_number, 'active',
    p_reset_coins, p_reset_xp, p_reset_stats,
    p_reset_tournaments, p_reset_chat, p_reset_avatars, p_reset_clans
  )
  RETURNING id INTO v_new_id;

  IF p_reset_coins THEN
    -- Log all deductions first (before zeroing, so we capture real amounts)
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    SELECT w.user_id, -w.balance, 'season_reset',
           format('Season reset: %s', p_name)
    FROM public.wallets w
    WHERE w.balance > 0;

    -- Batch reset: 500 rows per iteration to avoid full-table lock
    LOOP
      WITH batch AS (
        SELECT id FROM public.wallets WHERE balance > 0 LIMIT 500
      )
      UPDATE public.wallets
      SET balance = 0, updated_at = now()
      WHERE id IN (SELECT id FROM batch);

      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      EXIT WHEN v_rows_updated = 0;
    END LOOP;
  END IF;

  BEGIN
    INSERT INTO public.season_audit_log (admin_id, action, season_id, details)
    VALUES (v_admin_id, 'start_new_season', v_new_id,
      jsonb_build_object(
        'name', p_name, 'number', v_season_number,
        'closed_season', v_old_id,
        'resets', jsonb_build_object(
          'coins', p_reset_coins, 'xp', p_reset_xp, 'stats', p_reset_stats,
          'wins', p_reset_wins, 'avatars', p_reset_avatars, 'chat', p_reset_chat,
          'tournaments', p_reset_tournaments, 'clans', p_reset_clans
        )
      )
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'new_season_id', v_new_id,
    'season_number', v_season_number,
    'closed_season', v_old_id
  );
END;
$$;


--
-- Name: submit_admin_application(text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_admin_application(p_why_join text DEFAULT NULL::text, p_experience text DEFAULT NULL::text, p_conflict_scenario text DEFAULT NULL::text, p_availability text DEFAULT NULL::text, p_languages text DEFAULT NULL::text, p_extra text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.admin_applications (user_id, motivation, q_why_join, q_experience, q_conflict_scenario, q_availability, q_languages, q_extra)
  VALUES (auth.uid(), p_why_join, p_why_join, p_experience, p_conflict_scenario, p_availability, p_languages, p_extra)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;


--
-- Name: submit_ai_action(text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_ai_action(p_action_type text, p_target_type text DEFAULT NULL::text, p_target_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.ai_action_queue (action_type, target_type, target_id, description, payload, status)
  VALUES (p_action_type, p_target_type, p_target_id, p_description, p_payload, 'pending')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'action_id', v_id);
END;
$$;


--
-- Name: submit_ai_action(text, text, text, text, text, text, uuid, text, jsonb, boolean, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_ai_action(p_action_type text, p_title text, p_description text, p_rationale text, p_priority text DEFAULT 'normal'::text, p_risk_level text DEFAULT 'low'::text, p_target_entity uuid DEFAULT NULL::uuid, p_target_type text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb, p_is_reversible boolean DEFAULT true, p_rollback_plan text DEFAULT NULL::text, p_alert_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_action_id uuid;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.ai_action_queue (
    alert_id, action_type, priority, title, description, rationale,
    target_entity, target_type, payload, risk_level,
    is_reversible, rollback_plan, submitted_by
  ) VALUES (
    p_alert_id, p_action_type, p_priority, p_title, p_description, p_rationale,
    p_target_entity, p_target_type, p_payload, p_risk_level,
    p_is_reversible, p_rollback_plan, auth.uid()
  ) RETURNING id INTO v_action_id;

  -- Log
  INSERT INTO public.ai_audit_log (
    event_type, actor_id, actor_type, target_id, target_type, description,
    after_state
  ) VALUES (
    'action_submitted', auth.uid(), 'super_admin',
    v_action_id, 'ai_action_queue',
    'AI action submitted: ' || p_title,
    jsonb_build_object('action_type', p_action_type, 'priority', p_priority, 'risk_level', p_risk_level)
  );

  RETURN v_action_id;
END;
$$;


--
-- Name: submit_ai_recommendation_feedback(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_ai_recommendation_feedback(p_rec_id uuid, p_status text, p_feedback text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin','founder','fondateur','admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_status NOT IN ('accepted','rejected','deferred','in_progress') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.ai_recommendations
  SET
    status         = p_status,
    admin_feedback = p_feedback,
    reviewed_by    = auth.uid(),
    reviewed_at    = now(),
    updated_at     = now()
  WHERE id = p_rec_id;
END;
$$;


--
-- Name: submit_bug_report(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_bug_report(p_title text, p_description text, p_severity text DEFAULT 'medium'::text, p_steps text DEFAULT NULL::text, p_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.bug_reports (reporter_id, title, description, severity, steps_to_reproduce, url)
  VALUES (auth.uid(), p_title, p_description, p_severity, p_steps, p_url) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'bug_id', v_id);
END;
$$;


--
-- Name: submit_bug_report(text, text, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_bug_report(p_title text, p_description text, p_category text DEFAULT 'general'::text, p_severity text DEFAULT 'medium'::text, p_steps text DEFAULT NULL::text, p_screenshot_url text DEFAULT NULL::text, p_affected_page text DEFAULT NULL::text, p_device_info text DEFAULT NULL::text, p_browser_info text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.bug_reports (user_id, title, description, category, severity, steps_to_repro, screenshot_url, evidence_url, affected_page, device_info, browser_info)
  VALUES (auth.uid(), p_title, p_description, p_category, COALESCE(p_severity,'medium'), p_steps, p_screenshot_url, p_screenshot_url, p_affected_page, p_device_info, p_browser_info)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;


--
-- Name: submit_feature_request(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_feature_request(p_title text, p_description text, p_category text DEFAULT 'general'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.feature_requests (author_id, title, description, category)
  VALUES (auth.uid(), p_title, p_description, p_category) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;


--
-- Name: submit_idea(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_idea(p_title text, p_description text, p_category text DEFAULT 'general'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.community_ideas (author_id, title, description, category)
  VALUES (auth.uid(), p_title, p_description, p_category) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'idea_id', v_id);
END;
$$;


--
-- Name: submit_match_result(uuid, uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_match_result(p_tournament_id uuid, p_winner_id uuid, p_score text DEFAULT NULL::text, p_screenshot_url text DEFAULT NULL::text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_result_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tournament_players WHERE tournament_id = p_tournament_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  INSERT INTO public.match_results (tournament_id, submitted_by, winner_id, score, screenshot_url, notes, status)
  VALUES (p_tournament_id, v_user_id, p_winner_id, p_score, p_screenshot_url, p_notes, 'pending')
  RETURNING id INTO v_result_id;
  RETURN jsonb_build_object('success', true, 'result_id', v_result_id);
END;
$$;


--
-- Name: submit_match_result(uuid, integer, uuid, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_match_result(p_tournament_id uuid, p_match_number integer, p_team_id uuid, p_placement integer, p_kills integer, p_screenshot_url text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_points INT;
  v_result_id UUID;
  v_tournament tournaments%ROWTYPE;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;

  -- Check window open
  IF v_tournament.room_status NOT IN ('results_open','finished') THEN
    RETURN json_build_object('success',false,'error','Fenêtre de soumission fermée');
  END IF;
  IF v_tournament.result_deadline IS NOT NULL AND NOW() > v_tournament.result_deadline THEN
    RETURN json_build_object('success',false,'error','Délai de soumission dépassé');
  END IF;

  -- Check participant
  IF NOT EXISTS (
    SELECT 1 FROM tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = auth.uid() AND status = 'approved'
  ) AND NOT EXISTS (
    SELECT 1 FROM tournaments WHERE id = p_tournament_id AND created_by = auth.uid()
  ) THEN
    RETURN json_build_object('success',false,'error','Not an approved participant');
  END IF;

  -- No duplicate
  IF EXISTS (
    SELECT 1 FROM match_results
    WHERE tournament_id = p_tournament_id AND match_number = p_match_number AND submitted_by = auth.uid()
  ) THEN
    RETURN json_build_object('success',false,'error','Déjà soumis pour ce match');
  END IF;

  -- Validate kills (max 30 for Free Fire)
  IF p_kills > 30 THEN
    RETURN json_build_object('success',false,'error','Nombre de kills invalide (max 30)');
  END IF;

  -- Calculate points
  v_points := calculate_ff_points(p_placement, p_kills);

  INSERT INTO match_results (tournament_id, match_number, submitted_by, team_id, placement, kills, points, screenshot_url)
  VALUES (p_tournament_id, p_match_number, auth.uid(), p_team_id, p_placement, p_kills, v_points, p_screenshot_url)
  RETURNING id INTO v_result_id;

  RETURN json_build_object('success',true,'result_id',v_result_id,'points',v_points);
END;
$$;


--
-- Name: submit_match_result(uuid, integer, integer, text, integer, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_match_result(p_tournament_id uuid, p_rank integer DEFAULT NULL::integer, p_kills integer DEFAULT 0, p_screenshot_url text DEFAULT NULL::text, p_match_number integer DEFAULT NULL::integer, p_team_id uuid DEFAULT NULL::uuid, p_placement integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
BEGIN
  p_rank := COALESCE(p_rank, p_placement);
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_participants WHERE tournament_id = p_tournament_id AND user_id = v_user_id
    UNION
    SELECT 1 FROM public.room_members WHERE tournament_id = p_tournament_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;
  IF p_rank IS NULL OR p_rank < 1 OR p_kills IS NULL OR p_kills < 0 OR COALESCE(p_screenshot_url, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid result');
  END IF;
  v_points := GREATEST(0, 13 - LEAST(p_rank, 13)) + p_kills;
  INSERT INTO public.match_results (tournament_id, user_id, rank, kills, points, score, screenshot_url, estimated_coins, status)
  VALUES (p_tournament_id, v_user_id, p_rank, p_kills, v_points, v_points, p_screenshot_url, v_points * 10, 'pending');
  RETURN jsonb_build_object('success', true, 'points', v_points, 'coins_estimate', v_points * 10);
END;
$$;


--
-- Name: submit_report(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_report(p_reported_user_id uuid, p_reason text, p_description text DEFAULT NULL::text, p_evidence_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_report_id uuid;
BEGIN
  INSERT INTO public.reports (reporter_id, reported_user_id, reason, description, evidence_url, status)
  VALUES (auth.uid(), p_reported_user_id, p_reason, p_description, p_evidence_url, 'pending')
  RETURNING id INTO v_report_id;
  RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
END;
$$;


--
-- Name: submit_report_v2(text, text, text, uuid, text, uuid, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_report_v2(p_title text, p_type text, p_description text, p_reported_user_id uuid DEFAULT NULL::uuid, p_severity text DEFAULT 'medium'::text, p_tournament_id uuid DEFAULT NULL::uuid, p_evidence_urls text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count   integer;
  v_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Not authenticated');
  END IF;

  IF p_type NOT IN ('cheat','toxic','fraud','bug','other') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid report type');
  END IF;

  IF p_severity NOT IN ('low','medium','high','critical') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid severity');
  END IF;

  IF p_reported_user_id = v_user_id THEN
    RETURN jsonb_build_object('success',false,'error','Cannot report yourself');
  END IF;

  -- Rate limit: 10 reports per 24 hours
  SELECT COUNT(*) INTO v_count FROM public.reports
  WHERE reporter_id = v_user_id AND created_at > now() - INTERVAL '24 hours';
  IF v_count >= 10 THEN
    RETURN jsonb_build_object('success',false,'error','Report limit reached (10 per 24h)');
  END IF;

  INSERT INTO public.reports (
    reporter_id, reported_user_id, tournament_id,
    title, type, description, severity, evidence_urls,
    evidence_url
  ) VALUES (
    v_user_id, p_reported_user_id, p_tournament_id,
    p_title, p_type, p_description, p_severity, p_evidence_urls,
    CASE WHEN p_evidence_urls IS NOT NULL AND array_length(p_evidence_urls,1) > 0
         THEN p_evidence_urls[1] ELSE NULL END
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success',true,'id',v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success',false,'error',SQLERRM,'detail',SQLSTATE);
END;
$$;


--
-- Name: sync_room_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_room_status(p_tournament_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- Recalculer le statut basé sur les données actuelles
  UPDATE tournaments
  SET room_status = CASE
    WHEN status = 'live' THEN 'live'
    WHEN status = 'locked' THEN 'ready'
    WHEN status = 'finished' THEN 'finished'
    ELSE 'registration'
  END
  WHERE id = p_tournament_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: sync_tournament_player_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_tournament_player_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tournaments
    SET current_players = (
      SELECT COUNT(*) FROM public.tournament_participants
      WHERE tournament_id = NEW.tournament_id
        AND status IN ('approved', 'joined')
    ),
    updated_at = now()
    WHERE id = NEW.tournament_id;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tournaments
    SET current_players = (
      SELECT COUNT(*) FROM public.tournament_participants
      WHERE tournament_id = OLD.tournament_id
        AND status IN ('approved', 'joined')
    ),
    updated_at = now()
    WHERE id = OLD.tournament_id;

    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change may affect the count (e.g. approved → kicked)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE public.tournaments
      SET current_players = (
        SELECT COUNT(*) FROM public.tournament_participants
        WHERE tournament_id = NEW.tournament_id
          AND status IN ('approved', 'joined')
      ),
      updated_at = now()
      WHERE id = NEW.tournament_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: system_health_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.system_health_check() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur','admin','moderator') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'settings', (
      SELECT jsonb_object_agg(key, value)
      FROM public.system_settings
    ),
    'platform', jsonb_build_object(
      'total_users',       (SELECT COUNT(*) FROM public.profiles),
      'active_today',      (SELECT COUNT(*) FROM public.profiles WHERE updated_at >= now() - interval '24 hours'),
      'banned_users',      (SELECT COUNT(*) FROM public.profiles WHERE is_banned = true),
      'total_tournaments', (SELECT COUNT(*) FROM public.tournaments),
      'live_tournaments',  (SELECT COUNT(*) FROM public.tournaments WHERE status IN ('live','checkin','ready')),
      'pending_reports',   (SELECT COUNT(*) FROM public.reports WHERE status = 'pending'),
      'critical_reports',  (SELECT COUNT(*) FROM public.reports WHERE severity = 'critical' AND status NOT IN ('resolved','dismissed')),
      'pending_applications', (SELECT COUNT(*) FROM public.admin_applications WHERE status = 'pending')
    ),
    'emergency', jsonb_build_object(
      'active_emergencies', (SELECT COUNT(*) FROM public.emergency_actions WHERE status = 'active'),
      'latest', (
        SELECT row_to_json(e)
        FROM (
          SELECT id, action_type, title, severity, status, created_at
          FROM public.emergency_actions
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        ) e
      )
    ),
    'maintenance', jsonb_build_object(
      'scheduled', (
        SELECT jsonb_agg(row_to_json(m))
        FROM (
          SELECT id, title, mode, status, scheduled_start, scheduled_end
          FROM public.maintenance_schedules
          WHERE status IN ('scheduled','active')
          ORDER BY scheduled_start ASC
          LIMIT 5
        ) m
      )
    ),
    'recent_changes', (
      SELECT jsonb_agg(row_to_json(l))
      FROM (
        SELECT
          fl.setting_key,
          fl.old_value,
          fl.new_value,
          fl.reason,
          fl.created_at,
          p.username AS changed_by_username
        FROM public.system_feature_logs fl
        LEFT JOIN public.profiles p ON p.id = fl.changed_by
        ORDER BY fl.created_at DESC
        LIMIT 10
      ) l
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Health check failed: ' || SQLERRM);
END;
$$;


--
-- Name: team_admin_delete(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_admin_delete(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success',false,'error','Admin requis');
  END IF;
  -- Null out profiles.team_id first (FK constraint)
  UPDATE profiles SET team_id = NULL WHERE team_id = p_team_id;
  -- Delete in correct FK order
  DELETE FROM team_messages    WHERE team_id = p_team_id;
  DELETE FROM team_invites     WHERE team_id = p_team_id;
  DELETE FROM team_members     WHERE team_id = p_team_id;
  -- Handle team_tournaments if exists
  DELETE FROM team_tournaments WHERE team_id = p_team_id;
  -- Finally delete team
  DELETE FROM teams WHERE id = p_team_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: team_admin_set_expiry(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_admin_set_expiry(p_team_id uuid, p_days integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success',false,'error','Admin requis');
  END IF;
  IF p_days IS NULL OR p_days < 0 THEN
    UPDATE teams SET expires_at=NULL WHERE id=p_team_id;
  ELSE
    UPDATE teams SET expires_at = NOW() + (p_days || ' days')::INTERVAL WHERE id=p_team_id;
  END IF;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_admin_set_visibility(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_admin_set_visibility(p_team_id uuid, p_hidden boolean, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success',false,'error','Admin requis');
  END IF;
  UPDATE teams SET hidden=p_hidden, hidden_reason=p_reason WHERE id=p_team_id;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_disband(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_disband(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF get_team_role(p_team_id) != 'captain' AND NOT is_admin() THEN
    RETURN jsonb_build_object('success',false,'error','Seul le capitaine peut dissoudre');
  END IF;
  UPDATE profiles SET team_id = NULL WHERE team_id = p_team_id;
  DELETE FROM team_messages    WHERE team_id = p_team_id;
  DELETE FROM team_invites     WHERE team_id = p_team_id;
  DELETE FROM team_members     WHERE team_id = p_team_id;
  DELETE FROM team_tournaments WHERE team_id = p_team_id;
  UPDATE teams SET status = 'disbanded' WHERE id = p_team_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


--
-- Name: team_invite_user(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_invite_user(p_team_id uuid, p_target_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT; v_max INT;
BEGIN
  IF NOT can_manage_team(p_team_id) THEN
    RETURN jsonb_build_object('success',false,'error','Permission refusée');
  END IF;
  -- Target déjà dans équipe
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id=p_target_user_id) THEN
    RETURN jsonb_build_object('success',false,'error','Ce joueur est déjà dans une équipe');
  END IF;
  -- Invitation déjà envoyée
  IF EXISTS (SELECT 1 FROM team_invites WHERE team_id=p_team_id AND invited_user=p_target_user_id AND status='pending') THEN
    RETURN jsonb_build_object('success',false,'error','Invitation déjà envoyée');
  END IF;
  -- Équipe pleine?
  SELECT COUNT(*) INTO v_count FROM team_members WHERE team_id=p_team_id;
  SELECT COALESCE(max_members,6) INTO v_max FROM teams WHERE id=p_team_id;
  IF v_count >= v_max THEN
    RETURN jsonb_build_object('success',false,'error','Équipe complète');
  END IF;
  INSERT INTO team_invites(team_id, invited_by, invited_user, type)
  VALUES (p_team_id, auth.uid(), p_target_user_id, 'invite')
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_kick_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_kick_member(p_team_id uuid, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_my_role TEXT; v_target_role TEXT;
BEGIN
  v_my_role := get_team_role(p_team_id);
  IF NOT (v_my_role = 'captain' OR is_admin()) THEN
    RETURN jsonb_build_object('success',false,'error','Seul le capitaine peut expulser');
  END IF;
  SELECT role INTO v_target_role FROM team_members WHERE team_id=p_team_id AND user_id=p_user_id;
  IF v_target_role = 'captain' THEN
    RETURN jsonb_build_object('success',false,'error','Impossible d''expulser le capitaine');
  END IF;
  DELETE FROM team_members WHERE team_id=p_team_id AND user_id=p_user_id;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_promote_member(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_promote_member(p_team_id uuid, p_user_id uuid, p_role text DEFAULT 'co_captain'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_my_role TEXT;
BEGIN
  v_my_role := get_team_role(p_team_id);
  IF v_my_role != 'captain' AND NOT is_admin() THEN
    RETURN jsonb_build_object('success',false,'error','Seul le capitaine peut promouvoir');
  END IF;
  IF p_role NOT IN ('member','co_captain') THEN
    RETURN jsonb_build_object('success',false,'error','Rôle invalide');
  END IF;
  UPDATE team_members SET role=p_role WHERE team_id=p_team_id AND user_id=p_user_id;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_request_join(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_request_join(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT; v_max INT; v_open BOOLEAN;
BEGIN
  -- Already in a team?
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('success',false,'error','Vous êtes déjà dans une équipe');
  END IF;
  -- Team exists and open?
  SELECT is_open, COALESCE(max_members,6) INTO v_open, v_max
  FROM teams WHERE id = p_team_id AND (status IS NULL OR status = 'active');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','Équipe introuvable');
  END IF;
  IF NOT v_open THEN
    RETURN jsonb_build_object('success',false,'error','Cette équipe n''accepte pas de membres');
  END IF;
  -- Full?
  SELECT COUNT(*) INTO v_count FROM team_members WHERE team_id = p_team_id;
  IF v_count >= v_max THEN
    RETURN jsonb_build_object('success',false,'error','Équipe complète');
  END IF;
  -- Already requested?
  IF EXISTS (SELECT 1 FROM team_join_requests WHERE team_id=p_team_id AND user_id=auth.uid() AND status='pending') THEN
    RETURN jsonb_build_object('success',false,'error','Demande déjà envoyée');
  END IF;
  -- Insert request
  INSERT INTO team_join_requests(team_id, user_id)
  VALUES (p_team_id, auth.uid());
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: team_update(uuid, text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.team_update(p_team_id uuid, p_name text, p_description text, p_accent_color text, p_is_open boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT can_manage_team(p_team_id) THEN
    RETURN jsonb_build_object('success',false,'error','Permission refusée');
  END IF;
  UPDATE teams SET
    name=COALESCE(NULLIF(p_name,''), name),
    description=p_description,
    accent_color=COALESCE(NULLIF(p_accent_color,''), accent_color),
    is_open=p_is_open
  WHERE id=p_team_id;
  RETURN jsonb_build_object('success',true);
END;$$;


--
-- Name: trigger_ai_scan(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_ai_scan(p_scan_type text DEFAULT 'full'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_report_id uuid;
BEGIN
  IF NOT public.is_super_or_founder() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Create scan report
  INSERT INTO public.ai_scan_reports (
    scan_type, status, triggered_by, is_scheduled
  ) VALUES (
    p_scan_type, 'running', auth.uid(), false
  ) RETURNING id INTO v_report_id;

  -- Log to audit
  INSERT INTO public.ai_audit_log (
    event_type, actor_id, actor_type, target_id, target_type, description
  ) VALUES (
    'manual_trigger', auth.uid(), 'super_admin',
    v_report_id, 'ai_scan_report',
    'Manual AI scan triggered: ' || p_scan_type
  );

  RETURN v_report_id;
END;
$$;


--
-- Name: trigger_self_healing_action(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_self_healing_action(p_action_type text, p_target text DEFAULT NULL::text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_or_founder() THEN RETURN jsonb_build_object('success', false, 'error', 'Super admin only'); END IF;
  INSERT INTO public.ai_self_healing_actions (action_type, target, description, status, initiated_by)
  VALUES (p_action_type, p_target, p_description, 'pending', auth.uid()) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'action_id', v_id);
END;
$$;


--
-- Name: unban_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unban_user(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.profiles SET banned_until = NULL, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: unsubscribe_user_notifications(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unsubscribe_user_notifications(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.user_notification_preferences
  SET push_enabled = false, email_enabled = false, marketing_emails = false, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_idea_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_idea_status(p_idea_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.community_ideas
  SET status = p_status, admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = p_idea_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_maintenance_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_maintenance_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_player_stats(uuid, integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_player_stats(p_user_id uuid, p_kills integer DEFAULT 0, p_wins integer DEFAULT 0, p_losses integer DEFAULT 0, p_points integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_role(ARRAY['founder','fondateur','admin','super_admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only');
  END IF;
  INSERT INTO public.player_stats (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.player_stats SET
    kills = kills + COALESCE(p_kills, 0),
    wins = wins + COALESCE(p_wins, 0),
    losses = losses + COALESCE(p_losses, 0),
    total_points = total_points + COALESCE(p_points, 0),
    tournaments_played = tournaments_played + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_report_status(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_report_status(p_report_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.reports SET status = p_status, updated_at = now() WHERE id = p_report_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_system_setting(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_setting(p_key text, p_value text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin only');
  END IF;
  INSERT INTO public.system_settings (key, value, description, updated_by)
  VALUES (p_key, p_value, p_description, auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET value = p_value, description = COALESCE(p_description, system_settings.description),
      updated_by = auth.uid(), updated_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: update_system_setting(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_setting(p_key text, p_value text, p_reason text DEFAULT NULL::text, p_ip text DEFAULT NULL::text, p_agent text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_actor_id   uuid := auth.uid();
  v_actor_role text;
  v_old_value  text;
  v_setting    public.system_settings%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super_admin or founder can modify system settings');
  END IF;

  SELECT * INTO v_setting FROM public.system_settings WHERE key = p_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Setting key not found: ' || p_key);
  END IF;

  v_old_value := v_setting.value;

  -- Update the setting
  UPDATE public.system_settings
  SET
    value      = p_value,
    updated_by = v_actor_id,
    updated_at = now()
  WHERE key = p_key;

  -- Write immutable audit log
  INSERT INTO public.system_feature_logs (
    setting_key, old_value, new_value,
    changed_by, changed_by_role, reason,
    ip_address, user_agent
  ) VALUES (
    p_key, v_old_value, p_value,
    v_actor_id, v_actor_role, p_reason,
    p_ip::inet, p_agent
  );

  RETURN jsonb_build_object(
    'success',   true,
    'key',       p_key,
    'old_value', v_old_value,
    'new_value', p_value,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Internal error updating setting');
END;
$$;


--
-- Name: update_system_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


--
-- Name: update_xp_from_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_xp_from_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  xp_gain INTEGER;
BEGIN
  xp_gain := NEW.kills * 10;
  
  IF NEW.position = 1 THEN
    xp_gain := xp_gain + 100;
  END IF;
  
  IF NEW.mvp THEN
    xp_gain := xp_gain + 50;
  END IF;
  
  UPDATE public.profiles
  SET 
    xp = xp + xp_gain,
    level = 1 + FLOOR((xp + xp_gain) / 100)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: upsert_presence(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_presence(p_status text DEFAULT 'online'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_seen, updated_at)
  VALUES (auth.uid(), p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    status     = EXCLUDED.status,
    last_seen  = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$;


--
-- Name: valid_tournament_transition(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.valid_tournament_transition(p_from text, p_to text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT (p_from, p_to) IN (
    ('draft',             'published'),
    ('draft',             'cancelled'),
    ('published',         'registration_open'),
    ('published',         'cancelled'),
    ('registration_open', 'full'),
    ('registration_open', 'ready'),
    ('registration_open', 'cancelled'),
    ('full',              'ready'),
    ('full',              'registration_open'),   -- player left
    ('full',              'cancelled'),
    ('ready',             'live'),
    ('ready',             'cancelled'),
    ('live',              'results_pending'),
    ('live',              'completed'),
    ('results_pending',   'completed'),
    ('completed',         'archived')
  );
$$;


--
-- Name: verify_match_result(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_match_result(p_result_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_role TEXT; v_result match_results%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin','super_admin','founder') THEN
    RETURN json_build_object('success',false,'error','Unauthorized');
  END IF;

  UPDATE match_results
  SET status = p_status, admin_note = p_note,
      verified_by = auth.uid(), verified_at = NOW()
  WHERE id = p_result_id
  RETURNING * INTO v_result;

  -- If verified: update player stats
  IF p_status = 'verified' THEN
    -- Update player stats
    INSERT INTO player_stats (user_id, tournament_id, matches_played, total_kills, best_placement, total_points)
    VALUES (v_result.submitted_by, v_result.tournament_id, 1, v_result.kills, v_result.placement, v_result.points)
    ON CONFLICT (user_id, tournament_id) DO UPDATE SET
      matches_played  = player_stats.matches_played + 1,
      total_kills     = player_stats.total_kills + EXCLUDED.total_kills,
      best_placement  = LEAST(player_stats.best_placement, EXCLUDED.best_placement),
      total_points    = player_stats.total_points + EXCLUDED.total_points;

    -- Give coins reward: 10 coins per point
    UPDATE profiles SET coins = COALESCE(coins,0) + (v_result.points * 10)
    WHERE id = v_result.submitted_by;
  END IF;

  RETURN json_build_object('success',true,'status',p_status,'points',v_result.points);
END;
$$;


--
-- Name: verify_player(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_player(p_user_id uuid, p_note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  UPDATE public.profiles
  SET is_verified = true, verified_at = now(), verified_by = auth.uid(), verified_note = p_note, updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (p_user_id, 'achievement', '✅ Verified Player Badge!', 'You are now a Verified Player on CipherPool.');
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: vote_admin_application(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_admin_application(p_application_id uuid, p_vote text, p_comment text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin','super_admin','founder','fondateur') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin only');
  END IF;
  INSERT INTO public.admin_application_votes (application_id, voter_id, vote, comment)
  VALUES (p_application_id, auth.uid(), p_vote, p_comment)
  ON CONFLICT (application_id, voter_id) DO UPDATE SET vote = p_vote, comment = p_comment, updated_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: vote_feature(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_feature(p_feature_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_already boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.feature_votes WHERE feature_id = p_feature_id AND user_id = auth.uid()) INTO v_already;
  IF v_already THEN
    DELETE FROM public.feature_votes WHERE feature_id = p_feature_id AND user_id = auth.uid();
    UPDATE public.feature_requests SET vote_count = GREATEST(0, vote_count - 1) WHERE id = p_feature_id;
    RETURN jsonb_build_object('success', true, 'voted', false);
  ELSE
    INSERT INTO public.feature_votes (feature_id, user_id) VALUES (p_feature_id, auth.uid());
    UPDATE public.feature_requests SET vote_count = vote_count + 1 WHERE id = p_feature_id;
    RETURN jsonb_build_object('success', true, 'voted', true);
  END IF;
END;
$$;


--
-- Name: vote_feature(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_feature(p_request_id uuid, p_vote integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.feature_votes (request_id, user_id, vote)
  VALUES (p_request_id, auth.uid(), CASE WHEN p_vote >= 0 THEN 1 ELSE -1 END)
  ON CONFLICT (request_id, user_id) DO UPDATE SET vote = EXCLUDED.vote;
  RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: vote_idea(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_idea(p_idea_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE v_already boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.community_idea_votes WHERE idea_id = p_idea_id AND user_id = auth.uid()) INTO v_already;
  IF v_already THEN
    DELETE FROM public.community_idea_votes WHERE idea_id = p_idea_id AND user_id = auth.uid();
    UPDATE public.community_ideas SET vote_count = GREATEST(0, vote_count - 1) WHERE id = p_idea_id;
    RETURN jsonb_build_object('success', true, 'voted', false);
  ELSE
    INSERT INTO public.community_idea_votes (idea_id, user_id) VALUES (p_idea_id, auth.uid());
    UPDATE public.community_ideas SET vote_count = vote_count + 1 WHERE id = p_idea_id;
    RETURN jsonb_build_object('success', true, 'voted', true);
  END IF;
END;
$$;


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(10) DEFAULT '🏆'::character varying,
    category character varying(30) DEFAULT 'combat'::character varying,
    rarity character varying(20) DEFAULT 'common'::character varying,
    coins_reward integer DEFAULT 0,
    xp_reward integer DEFAULT 50,
    condition_type character varying(30),
    condition_value integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: admin_application_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_application_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    old_value text,
    new_value text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_application_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_application_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    is_internal boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_application_notes_content_check CHECK (((char_length(content) >= 1) AND (char_length(content) <= 2000)))
);


--
-- Name: admin_application_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_application_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    voter_id uuid NOT NULL,
    vote text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_application_votes_vote_check CHECK ((vote = ANY (ARRAY['approve'::text, 'reject'::text, 'neutral'::text, 'request_info'::text])))
);


--
-- Name: admin_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    motivation text,
    q_why_join text,
    q_experience text,
    q_conflict_scenario text,
    q_availability text,
    q_languages text,
    q_extra text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_role text DEFAULT 'moderator'::text,
    vote_score integer DEFAULT 0 NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    assigned_reviewer uuid,
    final_decision_by uuid,
    final_decision_at timestamp with time zone,
    final_note text,
    blacklist_until timestamp with time zone,
    eligibility_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    risk_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: admin_candidate_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_candidate_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scorer_id uuid NOT NULL,
    dimension text NOT NULL,
    score integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    CONSTRAINT admin_candidate_scores_score_check CHECK (((score >= 1) AND (score <= 10)))
);


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action text NOT NULL,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    target_user_id uuid
);


--
-- Name: admin_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text,
    content text,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    is_global boolean DEFAULT false,
    type text DEFAULT 'info'::text,
    message text DEFAULT ''::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone,
    is_read boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_messages_type_check CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'update'::text])))
);


--
-- Name: ai_action_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_action_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid,
    scan_report_id uuid,
    action_type text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    rationale text NOT NULL,
    target_entity uuid,
    target_type text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    risk_level text DEFAULT 'low'::text NOT NULL,
    is_reversible boolean DEFAULT true NOT NULL,
    rollback_plan text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '48:00:00'::interval),
    created_by_ai boolean DEFAULT true NOT NULL,
    submitted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_action_queue_action_type_check CHECK ((action_type = ANY (ARRAY['ban_user'::text, 'mute_user'::text, 'flag_user'::text, 'unflag_user'::text, 'suspend_tournament'::text, 'cancel_match'::text, 'freeze_wallet'::text, 'unfreeze_wallet'::text, 'revoke_admin'::text, 'grant_restriction'::text, 'send_warning'::text, 'send_notification'::text, 'update_setting'::text, 'rollback_setting'::text, 'run_migration'::text, 'archive_data'::text, 'escalate_investigation'::text, 'close_investigation'::text, 'update_rls_policy'::text, 'optimize_index'::text, 'clear_cache'::text, 'restart_realtime'::text, 'custom'::text]))),
    CONSTRAINT ai_action_queue_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'critical'::text, 'emergency'::text]))),
    CONSTRAINT ai_action_queue_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'destructive'::text]))),
    CONSTRAINT ai_action_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executing'::text, 'completed'::text, 'failed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: ai_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scan_report_id uuid,
    severity text DEFAULT 'warning'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    affected_system text,
    affected_entity uuid,
    entity_type text,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    recommended_action text,
    auto_fixable boolean DEFAULT false NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    dismissed_by uuid,
    dismissed_at timestamp with time zone,
    dismiss_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_alerts_category_check CHECK ((category = ANY (ARRAY['security'::text, 'economy'::text, 'performance'::text, 'database'::text, 'frontend'::text, 'realtime'::text, 'tournament'::text, 'anti_cheat'::text, 'governance'::text, 'infrastructure'::text, 'general'::text, 'rls'::text, 'authentication'::text, 'data_integrity'::text]))),
    CONSTRAINT ai_alerts_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text, 'emergency'::text]))),
    CONSTRAINT ai_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'in_progress'::text, 'resolved'::text, 'dismissed'::text, 'false_positive'::text])))
);


--
-- Name: ai_anti_cheat_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_anti_cheat_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_id uuid NOT NULL,
    case_number text DEFAULT ((('AC-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr((gen_random_uuid())::text, 1, 6)) NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    violation_types text[] DEFAULT '{}'::text[] NOT NULL,
    suspicion_score integer DEFAULT 0 NOT NULL,
    confidence_score integer DEFAULT 0 NOT NULL,
    fair_play_impact integer DEFAULT 0 NOT NULL,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    flagged_matches uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    flagged_transactions uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    behavioral_patterns jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_summary text,
    ai_recommendation text,
    risk_timeline jsonb DEFAULT '[]'::jsonb NOT NULL,
    silent_restrictions jsonb DEFAULT '{}'::jsonb NOT NULL,
    admin_notes text,
    assigned_to uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_action text,
    auto_detected boolean DEFAULT true NOT NULL,
    detection_module text DEFAULT 'ai-anti-cheat'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_anti_cheat_cases_confidence_score_check CHECK (((confidence_score >= 0) AND (confidence_score <= 100))),
    CONSTRAINT ai_anti_cheat_cases_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_anti_cheat_cases_status_check CHECK ((status = ANY (ARRAY['open'::text, 'under_review'::text, 'escalated'::text, 'resolved'::text, 'dismissed'::text]))),
    CONSTRAINT ai_anti_cheat_cases_suspicion_score_check CHECK (((suspicion_score >= 0) AND (suspicion_score <= 100)))
);


--
-- Name: ai_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    note text,
    conditions text,
    reviewed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_approvals_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'request_info'::text, 'delegated'::text])))
);


--
-- Name: ai_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    actor_id uuid,
    actor_type text DEFAULT 'ai'::text NOT NULL,
    target_id uuid,
    target_type text,
    description text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_audit_log_actor_type_check CHECK ((actor_type = ANY (ARRAY['ai'::text, 'super_admin'::text, 'admin'::text, 'system'::text]))),
    CONSTRAINT ai_audit_log_event_type_check CHECK ((event_type = ANY (ARRAY['scan_started'::text, 'scan_completed'::text, 'scan_failed'::text, 'alert_created'::text, 'alert_resolved'::text, 'alert_dismissed'::text, 'action_submitted'::text, 'action_approved'::text, 'action_rejected'::text, 'action_executed'::text, 'action_failed'::text, 'action_rolled_back'::text, 'memory_updated'::text, 'health_recorded'::text, 'approval_requested'::text, 'approval_granted'::text, 'approval_denied'::text, 'schedule_changed'::text, 'system_override'::text, 'manual_trigger'::text])))
);


--
-- Name: ai_health_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_health_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subsystem text NOT NULL,
    score integer NOT NULL,
    previous_score integer,
    delta integer GENERATED ALWAYS AS (
CASE
    WHEN (previous_score IS NOT NULL) THEN (score - previous_score)
    ELSE 0
END) STORED,
    status text DEFAULT 'healthy'::text NOT NULL,
    issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    scan_report_id uuid,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_health_scores_previous_score_check CHECK (((previous_score >= 0) AND (previous_score <= 100))),
    CONSTRAINT ai_health_scores_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT ai_health_scores_status_check CHECK ((status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'warning'::text, 'critical'::text, 'unknown'::text]))),
    CONSTRAINT ai_health_scores_subsystem_check CHECK ((subsystem = ANY (ARRAY['frontend'::text, 'backend'::text, 'database'::text, 'realtime'::text, 'authentication'::text, 'economy'::text, 'tournaments'::text, 'social'::text, 'notifications'::text, 'storage'::text, 'security'::text, 'performance'::text, 'overall'::text])))
);


--
-- Name: ai_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    memory_type text DEFAULT 'pattern'::text NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence numeric(4,3) DEFAULT 1.0 NOT NULL,
    source text DEFAULT 'ai_scan'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    update_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_memory_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT ai_memory_memory_type_check CHECK ((memory_type = ANY (ARRAY['pattern'::text, 'baseline'::text, 'anomaly'::text, 'recommendation'::text, 'user_behavior'::text, 'system_state'::text, 'historical'::text, 'config_snapshot'::text, 'dependency_map'::text])))
);


--
-- Name: ai_mobile_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_mobile_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scan_id uuid,
    device_type text NOT NULL,
    device_name text NOT NULL,
    screen_width integer,
    screen_height integer,
    device_category text DEFAULT 'mobile'::text NOT NULL,
    overall_score integer DEFAULT 0 NOT NULL,
    ux_stability_score integer DEFAULT 0 NOT NULL,
    touch_quality_score integer DEFAULT 0 NOT NULL,
    scroll_smoothness integer DEFAULT 0 NOT NULL,
    visual_consistency integer DEFAULT 0 NOT NULL,
    performance_score integer DEFAULT 0 NOT NULL,
    issues_found integer DEFAULT 0 NOT NULL,
    critical_issues integer DEFAULT 0 NOT NULL,
    issue_list jsonb DEFAULT '[]'::jsonb NOT NULL,
    screenshots text[] DEFAULT '{}'::text[] NOT NULL,
    fps_avg numeric(6,2),
    load_time_ms integer,
    tested_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_mobile_scores_device_category_check CHECK ((device_category = ANY (ARRAY['mobile'::text, 'tablet'::text, 'foldable'::text, 'desktop'::text, 'ultrawide'::text]))),
    CONSTRAINT ai_mobile_scores_overall_score_check CHECK (((overall_score >= 0) AND (overall_score <= 100))),
    CONSTRAINT ai_mobile_scores_performance_score_check CHECK (((performance_score >= 0) AND (performance_score <= 100))),
    CONSTRAINT ai_mobile_scores_scroll_smoothness_check CHECK (((scroll_smoothness >= 0) AND (scroll_smoothness <= 100))),
    CONSTRAINT ai_mobile_scores_touch_quality_score_check CHECK (((touch_quality_score >= 0) AND (touch_quality_score <= 100))),
    CONSTRAINT ai_mobile_scores_ux_stability_score_check CHECK (((ux_stability_score >= 0) AND (ux_stability_score <= 100))),
    CONSTRAINT ai_mobile_scores_visual_consistency_check CHECK (((visual_consistency >= 0) AND (visual_consistency <= 100)))
);


--
-- Name: ai_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_key text NOT NULL,
    module_name text NOT NULL,
    module_path text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    health_score integer DEFAULT 100 NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    run_interval_minutes integer DEFAULT 60 NOT NULL,
    total_runs integer DEFAULT 0 NOT NULL,
    failed_runs integer DEFAULT 0 NOT NULL,
    issues_detected integer DEFAULT 0 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    capabilities text[] DEFAULT '{}'::text[] NOT NULL,
    dependencies text[] DEFAULT '{}'::text[] NOT NULL,
    version text DEFAULT '1.0.0'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_modules_health_score_check CHECK (((health_score >= 0) AND (health_score <= 100))),
    CONSTRAINT ai_modules_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text, 'maintenance'::text, 'initializing'::text])))
);


--
-- Name: ai_qa_bugs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_qa_bugs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_run_id uuid,
    title text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    category text DEFAULT 'ui'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    route text,
    component text,
    steps_to_reproduce text,
    expected_behavior text,
    actual_behavior text,
    screenshots text[] DEFAULT '{}'::text[] NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    browser_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    suggested_fix text,
    ai_confidence integer DEFAULT 80 NOT NULL,
    auto_detected boolean DEFAULT true NOT NULL,
    assigned_to uuid,
    fixed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_qa_bugs_ai_confidence_check CHECK (((ai_confidence >= 0) AND (ai_confidence <= 100))),
    CONSTRAINT ai_qa_bugs_category_check CHECK ((category = ANY (ARRAY['ui'::text, 'ux'::text, 'functional'::text, 'performance'::text, 'security'::text, 'mobile'::text, 'realtime'::text, 'economy'::text, 'auth'::text, 'data'::text]))),
    CONSTRAINT ai_qa_bugs_severity_check CHECK ((severity = ANY (ARRAY['trivial'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'blocker'::text]))),
    CONSTRAINT ai_qa_bugs_status_check CHECK ((status = ANY (ARRAY['open'::text, 'confirmed'::text, 'in_progress'::text, 'fixed'::text, 'wont_fix'::text, 'duplicate'::text])))
);


--
-- Name: ai_qa_test_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_qa_test_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_name text NOT NULL,
    run_type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger_type text DEFAULT 'scheduled'::text NOT NULL,
    triggered_by uuid,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms integer,
    total_tests integer DEFAULT 0 NOT NULL,
    passed_tests integer DEFAULT 0 NOT NULL,
    failed_tests integer DEFAULT 0 NOT NULL,
    skipped_tests integer DEFAULT 0 NOT NULL,
    pass_rate numeric(5,2) DEFAULT 0 NOT NULL,
    routes_tested text[] DEFAULT '{}'::text[] NOT NULL,
    components_tested text[] DEFAULT '{}'::text[] NOT NULL,
    flows_tested text[] DEFAULT '{}'::text[] NOT NULL,
    bugs_found integer DEFAULT 0 NOT NULL,
    critical_bugs integer DEFAULT 0 NOT NULL,
    summary text,
    raw_results jsonb DEFAULT '{}'::jsonb NOT NULL,
    screenshots text[] DEFAULT '{}'::text[] NOT NULL,
    environment jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_qa_test_runs_run_type_check CHECK ((run_type = ANY (ARRAY['full'::text, 'smoke'::text, 'regression'::text, 'security'::text, 'performance'::text, 'mobile'::text, 'realtime'::text, 'economy'::text]))),
    CONSTRAINT ai_qa_test_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'passed'::text, 'failed'::text, 'partial'::text, 'cancelled'::text]))),
    CONSTRAINT ai_qa_test_runs_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['scheduled'::text, 'manual'::text, 'post_deploy'::text, 'on_demand'::text])))
);


--
-- Name: ai_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'performance'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    affected_systems text[] DEFAULT '{}'::text[] NOT NULL,
    estimated_impact text,
    implementation_effort text DEFAULT 'medium'::text,
    code_snippet text,
    sql_snippet text,
    source_refs jsonb DEFAULT '[]'::jsonb NOT NULL,
    confidence_score integer DEFAULT 80 NOT NULL,
    source_module text DEFAULT 'ai-recommendations'::text NOT NULL,
    source_scan_id uuid,
    admin_feedback text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    implemented_at timestamp with time zone,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_recommendations_category_check CHECK ((category = ANY (ARRAY['architecture'::text, 'performance'::text, 'security'::text, 'ux'::text, 'database'::text, 'caching'::text, 'realtime'::text, 'anti_cheat'::text, 'governance'::text, 'mobile'::text, 'economy'::text, 'infrastructure'::text, 'code_quality'::text]))),
    CONSTRAINT ai_recommendations_confidence_score_check CHECK (((confidence_score >= 0) AND (confidence_score <= 100))),
    CONSTRAINT ai_recommendations_implementation_effort_check CHECK ((implementation_effort = ANY (ARRAY['trivial'::text, 'low'::text, 'medium'::text, 'high'::text, 'very_high'::text]))),
    CONSTRAINT ai_recommendations_priority_check CHECK ((priority = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT ai_recommendations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'in_progress'::text, 'implemented'::text, 'deferred'::text])))
);


--
-- Name: ai_risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_type text DEFAULT 'platform'::text NOT NULL,
    overall_risk text DEFAULT 'low'::text NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    security_risk integer DEFAULT 0 NOT NULL,
    economy_risk integer DEFAULT 0 NOT NULL,
    stability_risk integer DEFAULT 0 NOT NULL,
    compliance_risk integer DEFAULT 0 NOT NULL,
    risk_factors jsonb DEFAULT '[]'::jsonb NOT NULL,
    mitigations jsonb DEFAULT '[]'::jsonb NOT NULL,
    trend text DEFAULT 'stable'::text NOT NULL,
    delta_7d integer DEFAULT 0 NOT NULL,
    scan_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_risk_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['platform'::text, 'security'::text, 'economy'::text, 'tournament'::text, 'infrastructure'::text, 'governance'::text, 'realtime'::text]))),
    CONSTRAINT ai_risk_assessments_compliance_risk_check CHECK (((compliance_risk >= 0) AND (compliance_risk <= 100))),
    CONSTRAINT ai_risk_assessments_economy_risk_check CHECK (((economy_risk >= 0) AND (economy_risk <= 100))),
    CONSTRAINT ai_risk_assessments_overall_risk_check CHECK ((overall_risk = ANY (ARRAY['minimal'::text, 'low'::text, 'moderate'::text, 'high'::text, 'critical'::text, 'emergency'::text]))),
    CONSTRAINT ai_risk_assessments_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100))),
    CONSTRAINT ai_risk_assessments_security_risk_check CHECK (((security_risk >= 0) AND (security_risk <= 100))),
    CONSTRAINT ai_risk_assessments_stability_risk_check CHECK (((stability_risk >= 0) AND (stability_risk <= 100))),
    CONSTRAINT ai_risk_assessments_trend_check CHECK ((trend = ANY (ARRAY['improving'::text, 'stable'::text, 'degrading'::text, 'critical'::text])))
);


--
-- Name: ai_scan_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_scan_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scan_type text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer,
    issues_found integer DEFAULT 0 NOT NULL,
    critical_count integer DEFAULT 0 NOT NULL,
    warning_count integer DEFAULT 0 NOT NULL,
    info_count integer DEFAULT 0 NOT NULL,
    health_score integer DEFAULT 100 NOT NULL,
    summary text,
    raw_findings jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    triggered_by uuid,
    is_scheduled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_scan_reports_health_score_check CHECK (((health_score >= 0) AND (health_score <= 100))),
    CONSTRAINT ai_scan_reports_scan_type_check CHECK ((scan_type = ANY (ARRAY['full'::text, 'security'::text, 'economy'::text, 'performance'::text, 'database'::text, 'frontend'::text, 'realtime'::text, 'tournament'::text, 'anti_cheat'::text, 'governance'::text, 'infrastructure'::text]))),
    CONSTRAINT ai_scan_reports_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'partial'::text])))
);


--
-- Name: ai_scan_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_scan_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scan_type text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    interval_hours integer DEFAULT 1 NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    run_count integer DEFAULT 0 NOT NULL,
    last_status text DEFAULT 'never_run'::text,
    last_health integer DEFAULT 100,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_scan_schedule_interval_hours_check CHECK (((interval_hours >= 1) AND (interval_hours <= 168))),
    CONSTRAINT ai_scan_schedule_scan_type_check CHECK ((scan_type = ANY (ARRAY['full'::text, 'security'::text, 'economy'::text, 'performance'::text, 'database'::text, 'frontend'::text, 'realtime'::text, 'tournament'::text, 'anti_cheat'::text, 'governance'::text, 'infrastructure'::text])))
);


--
-- Name: ai_security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    category text DEFAULT 'auth'::text NOT NULL,
    actor_id uuid,
    actor_role text,
    target_id uuid,
    description text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    status text DEFAULT 'open'::text NOT NULL,
    auto_action text,
    admin_response text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    is_immutable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_security_events_category_check CHECK ((category = ANY (ARRAY['auth'::text, 'permission_abuse'::text, 'economy_exploit'::text, 'brute_force'::text, 'spam'::text, 'account_farming'::text, 'admin_abuse'::text, 'token_abuse'::text, 'exploit_attempt'::text, 'data_breach'::text, 'role_escalation'::text]))),
    CONSTRAINT ai_security_events_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text, 'emergency'::text]))),
    CONSTRAINT ai_security_events_status_check CHECK ((status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'false_positive'::text])))
);


--
-- Name: ai_self_healing_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_self_healing_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    action_category text DEFAULT 'safe'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger_reason text NOT NULL,
    affected_system text NOT NULL,
    action_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    rollback_plan jsonb DEFAULT '{}'::jsonb NOT NULL,
    executed_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms integer,
    result text,
    error_message text,
    requires_approval boolean DEFAULT false NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    auto_executed boolean DEFAULT false NOT NULL,
    module_source text DEFAULT 'ai-self-healing'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_self_healing_actions_action_category_check CHECK ((action_category = ANY (ARRAY['safe'::text, 'requires_approval'::text, 'forbidden'::text]))),
    CONSTRAINT ai_self_healing_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'executing'::text, 'completed'::text, 'failed'::text, 'rolled_back'::text, 'cancelled'::text])))
);


--
-- Name: ai_simulation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_simulation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    event_type text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    description text NOT NULL,
    affected_system text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_simulation_events_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])))
);


--
-- Name: ai_simulation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_simulation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger_type text DEFAULT 'post_deploy'::text NOT NULL,
    triggered_by uuid,
    simulated_users integer DEFAULT 1000 NOT NULL,
    duration_seconds integer DEFAULT 300 NOT NULL,
    user_profiles jsonb DEFAULT '{}'::jsonb NOT NULL,
    scenarios text[] DEFAULT '{}'::text[] NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_ms integer,
    peak_concurrent integer,
    total_actions integer DEFAULT 0 NOT NULL,
    failed_actions integer DEFAULT 0 NOT NULL,
    avg_response_ms numeric(8,2),
    p95_response_ms numeric(8,2),
    p99_response_ms numeric(8,2),
    max_response_ms numeric(8,2),
    error_rate numeric(5,2),
    crashes_detected integer DEFAULT 0 NOT NULL,
    bottlenecks jsonb DEFAULT '[]'::jsonb NOT NULL,
    race_conditions integer DEFAULT 0 NOT NULL,
    duplicate_txns integer DEFAULT 0 NOT NULL,
    realtime_desyncs integer DEFAULT 0 NOT NULL,
    health_score integer DEFAULT 100 NOT NULL,
    summary text,
    recommendations jsonb DEFAULT '[]'::jsonb NOT NULL,
    raw_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_simulation_runs_health_score_check CHECK (((health_score >= 0) AND (health_score <= 100))),
    CONSTRAINT ai_simulation_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT ai_simulation_runs_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['post_deploy'::text, 'manual'::text, 'scheduled'::text, 'stress_test'::text])))
);


--
-- Name: ai_visual_regression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_visual_regression (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    build_id text NOT NULL,
    previous_build text,
    route text NOT NULL,
    component text,
    viewport text DEFAULT 'desktop'::text NOT NULL,
    status text DEFAULT 'pass'::text NOT NULL,
    diff_percentage numeric(6,3) DEFAULT 0 NOT NULL,
    baseline_url text,
    current_url text,
    diff_url text,
    issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    severity text DEFAULT 'low'::text NOT NULL,
    auto_approved boolean DEFAULT false NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_visual_regression_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_visual_regression_status_check CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text, 'skipped'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    entity_type text,
    entity_id uuid,
    actor_id uuid,
    category text DEFAULT 'general'::text,
    priority text DEFAULT 'normal'::text,
    image_url text,
    meta jsonb DEFAULT '{}'::jsonb,
    is_seen boolean DEFAULT false NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    seen_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone,
    read boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: all_notifications; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.all_notifications WITH (security_invoker='true') AS
 SELECT id,
    user_id,
    type,
    title,
    message,
    is_read,
    expires_at,
    data,
    created_at
   FROM public.notifications
  WHERE (((expires_at IS NULL) OR (expires_at > now())) AND (auth.uid() = user_id))
  ORDER BY created_at DESC;


--
-- Name: announcement_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL,
    read boolean DEFAULT true NOT NULL,
    is_read boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    target_roles text[] DEFAULT ARRAY['all'::text] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    key text NOT NULL,
    value text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text,
    performed_by uuid,
    target_user uuid,
    details text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text,
    image_url text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    approved boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_type text DEFAULT 'auto'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    size_bytes bigint,
    location text,
    initiated_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    error text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT backup_logs_backup_type_check CHECK ((backup_type = ANY (ARRAY['auto'::text, 'manual'::text, 'pre_migration'::text]))),
    CONSTRAINT backup_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'success'::text, 'failed'::text])))
);


--
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blocked_users_check CHECK ((blocker_id <> blocked_id))
);


--
-- Name: bug_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bug_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'general'::text,
    severity text DEFAULT 'medium'::text NOT NULL,
    evidence_url text,
    screenshot_url text,
    steps_to_repro text,
    affected_page text,
    device_info text,
    browser_info text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    reward_given boolean DEFAULT false NOT NULL,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    age integer,
    city text,
    country text,
    free_fire_id text,
    avatar_url text,
    id_card_url text,
    selfie_url text,
    role text DEFAULT 'user'::text,
    verification_status text DEFAULT 'pending'::text,
    daily_last_claim timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    verification_level integer DEFAULT 0,
    verified_at timestamp with time zone,
    document_url text,
    rejection_reason text,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    email text,
    banned_until timestamp with time zone,
    last_seen timestamp with time zone DEFAULT now(),
    equipped_avatar uuid,
    equipped_banner uuid,
    equipped_badge uuid,
    equipped_frame uuid,
    equipped_name_color uuid,
    team_id uuid,
    bio text,
    avatar_mode text DEFAULT 'auto'::text,
    is_banned boolean DEFAULT false,
    username text,
    experience integer DEFAULT 0,
    fair_play_score integer DEFAULT 100 NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_by uuid,
    verified_note text,
    verification_note text,
    trust_score integer DEFAULT 100 NOT NULL,
    banned_by uuid,
    last_seen_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN profiles.xp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.xp IS 'Experience points. Canonical name — never use "experience".';


--
-- Name: bug_reports_admin_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.bug_reports_admin_view AS
 SELECT br.id,
    br.user_id,
    br.title,
    br.description,
    br.category,
    br.severity,
    br.evidence_url,
    br.screenshot_url,
    br.steps_to_repro,
    br.affected_page,
    br.device_info,
    br.browser_info,
    br.status,
    br.admin_note,
    br.reward_given,
    br.reviewed_by,
    br.created_at,
    p.username,
    p.avatar_url
   FROM (public.bug_reports br
     LEFT JOIN public.profiles p ON ((p.id = br.user_id)));


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    channel text DEFAULT 'général'::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    audio_url text,
    season_id uuid,
    deleted_at timestamp with time zone,
    user_id uuid,
    message text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'message'::text NOT NULL,
    reply_to uuid
);


--
-- Name: chat_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clan_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    team_id uuid,
    pseudo text NOT NULL,
    ff_id text NOT NULL,
    role text NOT NULL,
    skills jsonb DEFAULT '[]'::jsonb,
    experience jsonb DEFAULT '[]'::jsonb,
    hours_per_day integer,
    has_mic boolean,
    schedule_ok boolean,
    message text,
    status text DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    clan_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clan_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clan_members_role_check CHECK ((role = ANY (ARRAY['leader'::text, 'co-leader'::text, 'member'::text])))
);


--
-- Name: clan_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'message'::text NOT NULL
);


--
-- Name: clan_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    user_id uuid,
    team_id uuid,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    mode text DEFAULT 'Clash Squad'::text,
    room_id text,
    room_password text,
    notes text,
    status text DEFAULT 'scheduled'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clan_war_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_war_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    war_id uuid NOT NULL,
    clan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tournament_id uuid,
    points integer DEFAULT 0 NOT NULL,
    kills integer DEFAULT 0,
    wins integer DEFAULT 0,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clan_wars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clan_wars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clan_a_id uuid NOT NULL,
    clan_b_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    clan_a_score integer DEFAULT 0 NOT NULL,
    clan_b_score integer DEFAULT 0 NOT NULL,
    winner_clan_id uuid,
    prize_pool_cp integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    declared_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clan_wars_check CHECK ((clan_a_id <> clan_b_id)),
    CONSTRAINT clan_wars_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: clans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    tag text NOT NULL,
    description text,
    rules text,
    requirements text,
    logo_url text,
    accent_color text DEFAULT '#a855f7'::text NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    leader_id uuid NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    discord_link text,
    whatsapp_link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: clan_war_leaderboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clan_war_leaderboard AS
 SELECT c.id,
    c.name,
    c.tag,
    c.logo_url,
    c.accent_color,
    count(
        CASE
            WHEN (cw.winner_clan_id = c.id) THEN 1
            ELSE NULL::integer
        END) AS war_wins,
    count(
        CASE
            WHEN (((cw.clan_a_id = c.id) OR (cw.clan_b_id = c.id)) AND (cw.status = 'completed'::text)) THEN 1
            ELSE NULL::integer
        END) AS total_wars,
    COALESCE(sum(
        CASE
            WHEN (cw.clan_a_id = c.id) THEN cw.clan_a_score
            WHEN (cw.clan_b_id = c.id) THEN cw.clan_b_score
            ELSE 0
        END), (0)::bigint) AS total_points
   FROM (public.clans c
     LEFT JOIN public.clan_wars cw ON ((((cw.clan_a_id = c.id) OR (cw.clan_b_id = c.id)) AND (cw.status = 'completed'::text))))
  GROUP BY c.id, c.name, c.tag, c.logo_url, c.accent_color
  ORDER BY (count(
        CASE
            WHEN (cw.winner_clan_id = c.id) THEN 1
            ELSE NULL::integer
        END)) DESC, COALESCE(sum(
        CASE
            WHEN (cw.clan_a_id = c.id) THEN cw.clan_a_score
            WHEN (cw.clan_b_id = c.id) THEN cw.clan_b_score
            ELSE 0
        END), (0)::bigint) DESC;


--
-- Name: community_idea_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_idea_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_idea_comments_content_check CHECK (((char_length(content) >= 1) AND (char_length(content) <= 1000)))
);


--
-- Name: community_idea_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_idea_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_ideas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_ideas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    admin_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_ideas_category_check CHECK ((category = ANY (ARRAY['gameplay'::text, 'ui'::text, 'economy'::text, 'social'::text, 'tournament'::text, 'other'::text, 'general'::text]))),
    CONSTRAINT community_ideas_description_check CHECK (((char_length(description) >= 20) AND (char_length(description) <= 5000))),
    CONSTRAINT community_ideas_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'implemented'::text]))),
    CONSTRAINT community_ideas_title_check CHECK (((char_length(title) >= 5) AND (char_length(title) <= 200)))
);


--
-- Name: community_ideas_feed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.community_ideas_feed AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS user_id,
    NULL::text AS title,
    NULL::text AS description,
    NULL::text AS category,
    NULL::text AS status,
    NULL::uuid AS reviewed_by,
    NULL::text AS admin_note,
    NULL::boolean AS reward_given,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::integer AS upvotes,
    NULL::integer AS downvotes,
    NULL::integer AS score,
    NULL::integer AS vote_score,
    NULL::integer AS comments_count;


--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    last_read_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text DEFAULT 'direct'::text NOT NULL,
    name text,
    last_message_at timestamp with time zone,
    last_message_preview text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT conversations_type_check CHECK ((type = ANY (ARRAY['direct'::text, 'group'::text])))
);


--
-- Name: daily_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day integer NOT NULL,
    coins integer NOT NULL,
    xp integer DEFAULT 0,
    icon character varying(10) DEFAULT '💎'::character varying,
    is_special boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_store (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    discount_pct integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text,
    media_url text,
    media_type text,
    reply_to_id uuid,
    is_edited boolean DEFAULT false NOT NULL,
    is_deleted_for_everyone boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT direct_messages_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'voice'::text, 'file'::text])))
);


--
-- Name: email_campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    user_id uuid,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    provider_message_id text,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_campaign_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text, 'unsubscribed'::text])))
);


--
-- Name: email_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    text_body text,
    segment_type text DEFAULT 'all_users'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    sent_at timestamp with time zone,
    ai_generated boolean DEFAULT false,
    total_recipients integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT email_campaigns_segment_type_check CHECK ((segment_type = ANY (ARRAY['all_users'::text, 'active_users'::text, 'inactive_users'::text, 'tournament_players'::text, 'clan_members'::text, 'super_admins'::text]))),
    CONSTRAINT email_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: email_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    event_type text NOT NULL,
    actor_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    text_body text,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_unsubscribes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_unsubscribes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    reason text,
    unsubscribed_at timestamp with time zone DEFAULT now()
);


--
-- Name: emergency_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type text NOT NULL,
    title text NOT NULL,
    description text,
    severity text DEFAULT 'high'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    triggered_by uuid,
    triggered_role text,
    reason text NOT NULL,
    affected_keys text[] DEFAULT '{}'::text[],
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    auto_resolve_at timestamp with time zone,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emergency_actions_action_type_check CHECK ((action_type = ANY (ARRAY['emergency_freeze'::text, 'force_maintenance'::text, 'disable_registrations'::text, 'disable_login'::text, 'disable_tournaments'::text, 'disable_economy'::text, 'disable_chat'::text, 'disable_marketplace'::text, 'force_logout_all'::text, 'read_only_mode'::text, 'custom'::text]))),
    CONSTRAINT emergency_actions_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT emergency_actions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'resolved'::text, 'expired'::text])))
);


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    error_type text DEFAULT 'client'::text NOT NULL,
    message text NOT NULL,
    stack text,
    url text,
    user_agent text,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    severity text DEFAULT 'error'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT error_logs_severity_check CHECK ((severity = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'critical'::text])))
);


--
-- Name: fair_play_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fair_play_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    delta integer NOT NULL,
    reason text,
    admin_id uuid,
    tournament_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fair_play_events_event_type_check CHECK ((event_type = ANY (ARRAY['report_confirmed'::text, 'report_dismissed'::text, 'tournament_won'::text, 'fair_match'::text, 'toxic_behavior'::text, 'account_restored'::text, 'rage_quit'::text, 'multiple_accounts'::text, 'good_sportsmanship'::text, 'manual_admin'::text])))
);


--
-- Name: feature_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    content text,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text DEFAULT 'feature'::text,
    status text DEFAULT 'open'::text NOT NULL,
    reviewed_by uuid,
    admin_note text,
    reward_given boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vote_score integer DEFAULT 0 NOT NULL,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL
);


--
-- Name: feature_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_votes_vote_check CHECK ((vote = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friend_requests_check CHECK ((sender_id <> receiver_id)),
    CONSTRAINT friend_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: friends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friends_check CHECK ((user_id <> friend_id))
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    addressee_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    responded_at timestamp with time zone,
    CONSTRAINT friendships_check CHECK ((requester_id <> addressee_id)),
    CONSTRAINT friendships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: gift_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    item_id uuid,
    coins integer DEFAULT 0 NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    CONSTRAINT gift_transactions_coins_check CHECK ((coins >= 0)),
    CONSTRAINT gift_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'claimed'::text, 'rejected'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: health_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    check_name text NOT NULL,
    status text DEFAULT 'ok'::text NOT NULL,
    score integer DEFAULT 100 NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT health_checks_score_check CHECK (((score >= 0) AND (score <= 100))),
    CONSTRAINT health_checks_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'warning'::text, 'critical'::text, 'unknown'::text])))
);


--
-- Name: inapp_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inapp_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    action_url text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inapp_notifications_type_check CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text, 'achievement'::text, 'gift'::text, 'tournament'::text])))
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    resource_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT invitations_type_check CHECK ((type = ANY (ARRAY['clan'::text, 'team'::text, 'tournament'::text])))
);


--
-- Name: ip_bans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    reason text,
    banned_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category text,
    views integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    mode text DEFAULT 'full'::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    affected_systems text[] DEFAULT '{}'::text[],
    notify_users boolean DEFAULT true,
    notify_message text,
    created_by uuid,
    cancelled_by uuid,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT maintenance_schedules_mode_check CHECK ((mode = ANY (ARRAY['full'::text, 'partial'::text, 'read_only'::text, 'emergency'::text]))),
    CONSTRAINT maintenance_schedules_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT valid_schedule CHECK ((scheduled_end > scheduled_start))
);


--
-- Name: match_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    result_id uuid,
    raised_by uuid,
    reason text,
    status text DEFAULT 'open'::text,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_disputes_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: match_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid NOT NULL,
    user_id uuid NOT NULL,
    team_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    user_id uuid,
    "position" integer,
    kills integer DEFAULT 0,
    mvp boolean DEFAULT false,
    reward integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    tournament_id uuid,
    placement integer DEFAULT 1,
    points integer DEFAULT 0,
    estimated_coins integer DEFAULT 0,
    screenshot_url text,
    status text DEFAULT 'pending'::text,
    submitted_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    rank integer,
    score integer DEFAULT 0 NOT NULL,
    coins_awarded integer DEFAULT 0 NOT NULL,
    is_mvp boolean DEFAULT false NOT NULL,
    auto_verified boolean DEFAULT false NOT NULL,
    verified_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    dispute_reason text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: match_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_players integer DEFAULT 0 NOT NULL,
    submitted_count integer DEFAULT 0 NOT NULL,
    mvp_user_id uuid,
    dispute_reason text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    round integer,
    match_number integer,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    icon character varying(10) DEFAULT '🎯'::character varying,
    type character varying(20) DEFAULT 'daily'::character varying,
    category character varying(20) DEFAULT 'game'::character varying,
    coins_reward integer DEFAULT 50,
    xp_reward integer DEFAULT 30,
    target_value integer DEFAULT 1,
    condition_type character varying(30),
    is_active boolean DEFAULT true,
    resets_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    reward_coins integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: moderation_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moderation_reviews_decision_check CHECK ((decision = ANY (ARRAY['approve'::text, 'reject'::text, 'escalate'::text, 'dismiss'::text, 'warn'::text, 'ban'::text]))),
    CONSTRAINT moderation_reviews_target_type_check CHECK ((target_type = ANY (ARRAY['report'::text, 'tournament'::text, 'user'::text, 'message'::text, 'clan'::text])))
);


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(200),
    content text,
    excerpt text,
    cover_url text,
    category character varying(30) DEFAULT 'general'::character varying,
    tags text[] DEFAULT '{}'::text[],
    author_id uuid,
    published boolean DEFAULT false,
    featured boolean DEFAULT false,
    views integer DEFAULT 0,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'draft'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    event_type text NOT NULL,
    user_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_events_event_type_check CHECK ((event_type = ANY (ARRAY['sent'::text, 'delivered'::text, 'opened'::text, 'clicked'::text, 'failed'::text, 'unsubscribed'::text])))
);


--
-- Name: notification_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    title text NOT NULL,
    body text NOT NULL,
    segment text DEFAULT 'all'::text NOT NULL,
    custom_user_ids uuid[],
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    total_recipients integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    created_by uuid NOT NULL,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_jobs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    chat_enabled boolean DEFAULT true NOT NULL,
    team_enabled boolean DEFAULT true NOT NULL,
    tournament_enabled boolean DEFAULT true NOT NULL,
    admin_enabled boolean DEFAULT true NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'push'::text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_templates_type_check CHECK ((type = ANY (ARRAY['push'::text, 'email'::text, 'sms'::text, 'in_app'::text])))
);


--
-- Name: notifications_with_actor; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.notifications_with_actor AS
 SELECT n.id,
    n.user_id,
    n.type,
    n.title,
    n.body,
    n.link,
    n.entity_type,
    n.entity_id,
    n.actor_id,
    n.category,
    n.priority,
    n.image_url,
    n.meta,
    n.is_seen,
    n.is_read,
    n.seen_at,
    n.read_at,
    n.created_at,
    p.full_name AS actor_name,
    p.avatar_url AS actor_avatar,
    p.role AS actor_role
   FROM (public.notifications n
     LEFT JOIN public.profiles p ON ((p.id = n.actor_id)));


--
-- Name: performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    page text NOT NULL,
    metric_name text NOT NULL,
    value double precision NOT NULL,
    unit text DEFAULT 'ms'::text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: player_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.player_statistics WITH (security_invoker='true') AS
 SELECT user_id,
    count(*) AS total_matches,
    count(*) FILTER (WHERE ("position" = 1)) AS wins,
    COALESCE(round((((count(*) FILTER (WHERE ("position" = 1)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric)), (0)::numeric) AS win_rate,
    count(*) FILTER (WHERE (mvp = true)) AS mvp_count,
    sum(reward) AS total_earned,
    sum(kills) AS total_kills
   FROM public.match_results
  GROUP BY user_id;


--
-- Name: player_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tournaments_played integer DEFAULT 0,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    kills integer DEFAULT 0,
    deaths integer DEFAULT 0,
    rank integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    top3_finishes integer DEFAULT 0,
    total_earnings integer DEFAULT 0,
    best_position integer DEFAULT 0,
    mvp_count integer DEFAULT 0,
    kd_ratio numeric(5,2) DEFAULT 0,
    total_points integer DEFAULT 0
);


--
-- Name: rate_limit_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limit_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    ip_address text,
    attempts integer DEFAULT 1 NOT NULL,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now()
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uses_count integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code text NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    rewarded boolean DEFAULT false NOT NULL,
    referrer_reward integer DEFAULT 0 NOT NULL,
    referred_reward integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: report_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_actions_action_check CHECK ((action = ANY (ARRAY['assign'::text, 'status_change'::text, 'warn_user'::text, 'ban_user'::text, 'dismiss'::text, 'escalate'::text, 'note'::text, 'resolve'::text])))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid,
    reported_id uuid,
    type text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text,
    resolved_by uuid,
    resolved_action text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    severity text DEFAULT 'medium'::text,
    evidence_urls text[],
    assigned_to uuid,
    CONSTRAINT reports_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text, 'ignored'::text]))),
    CONSTRAINT reports_type_check CHECK ((type = ANY (ARRAY['cheat'::text, 'insult'::text, 'spam'::text, 'other'::text])))
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    permission_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    user_id uuid,
    seat_number integer,
    team_number integer DEFAULT 1,
    is_ready boolean DEFAULT false,
    joined_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'joined'::text NOT NULL
);


--
-- Name: room_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    user_id uuid,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    type text DEFAULT 'message'::text NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id bigint NOT NULL,
    filename text NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: season_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid,
    action text NOT NULL,
    actor_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: season_pass_missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_pass_missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    xp_reward integer DEFAULT 100 NOT NULL,
    coins_reward integer DEFAULT 0 NOT NULL,
    target_count integer DEFAULT 1 NOT NULL,
    icon text DEFAULT '🎯'::text,
    is_active boolean DEFAULT true NOT NULL,
    reset_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT season_pass_missions_category_check CHECK ((category = ANY (ARRAY['play'::text, 'win'::text, 'social'::text, 'profile'::text, 'clan'::text]))),
    CONSTRAINT season_pass_missions_type_check CHECK ((type = ANY (ARRAY['daily'::text, 'weekly'::text, 'seasonal'::text, 'event'::text])))
);


--
-- Name: season_pass_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_pass_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid NOT NULL,
    tier integer NOT NULL,
    xp_required integer DEFAULT 500 NOT NULL,
    free_coins integer DEFAULT 0,
    free_item_id uuid,
    free_badge_id uuid,
    free_label text,
    premium_coins integer DEFAULT 0,
    premium_item_id uuid,
    premium_badge_id uuid,
    premium_label text,
    CONSTRAINT season_pass_tiers_tier_check CHECK (((tier >= 1) AND (tier <= 100)))
);


--
-- Name: season_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.season_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season_id uuid,
    user_id uuid,
    final_rank integer,
    final_points integer,
    final_level integer,
    final_coins integer,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number integer NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text,
    reset_coins boolean DEFAULT false,
    reset_xp boolean DEFAULT false,
    reset_stats boolean DEFAULT true,
    reset_tournaments boolean DEFAULT true,
    reset_chat boolean DEFAULT true,
    reset_avatars boolean DEFAULT false,
    reset_clans boolean DEFAULT false,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    ended_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now(),
    CONSTRAINT seasons_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'scheduled'::text])))
);


--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    user_agent text,
    severity text DEFAULT 'info'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT security_audit_log_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: site_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    open_at timestamp with time zone NOT NULL,
    close_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_by uuid,
    ticket_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: store_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    type public.item_type NOT NULL,
    rarity public.item_rarity DEFAULT 'common'::public.item_rarity NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    image_url text,
    preview_url text,
    color_value text,
    active boolean DEFAULT true NOT NULL,
    limited boolean DEFAULT false NOT NULL,
    limited_until timestamp with time zone,
    daily_rotation boolean DEFAULT false NOT NULL,
    source public.item_source DEFAULT 'store'::public.item_source NOT NULL,
    created_by uuid,
    approved_by uuid,
    approved boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    featured boolean DEFAULT false,
    show_in_chat boolean DEFAULT true,
    show_in_leaderboard boolean DEFAULT true,
    show_in_team boolean DEFAULT true,
    visible_in_store boolean DEFAULT true,
    show_in_profile boolean DEFAULT true
);


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    media_url text NOT NULL,
    media_type text DEFAULT 'image'::text NOT NULL,
    caption text,
    privacy text DEFAULT 'friends'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    tournament_id uuid,
    CONSTRAINT stories_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text]))),
    CONSTRAINT stories_privacy_check CHECK ((privacy = ANY (ARRAY['public'::text, 'friends'::text, 'clan'::text, 'team'::text])))
);


--
-- Name: story_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction text DEFAULT '🔥'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: story_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    sender_id uuid,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    assigned_to uuid,
    subject text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['tournoi'::text, 'coins'::text, 'compte'::text, 'paiement'::text, 'classement'::text, 'autre'::text]))),
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['normal'::text, 'urgent'::text, 'critique'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'pending'::text, 'answered'::text, 'closed'::text])))
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    maintenance_mode boolean DEFAULT false,
    registration_enabled boolean DEFAULT true,
    tournaments_enabled boolean DEFAULT true,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    type text
);


--
-- Name: system_feature_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_feature_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    old_value text,
    new_value text NOT NULL,
    changed_by uuid,
    changed_by_role text,
    reason text,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text DEFAULT 'true'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    description text,
    data_type text DEFAULT 'boolean'::text NOT NULL,
    is_sensitive boolean DEFAULT false,
    requires_restart boolean DEFAULT false,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_settings_category_check CHECK ((category = ANY (ARRAY['general'::text, 'auth'::text, 'tournaments'::text, 'economy'::text, 'social'::text, 'moderation'::text, 'notifications'::text, 'admin'::text, 'realtime'::text, 'security'::text, 'maintenance'::text]))),
    CONSTRAINT system_settings_data_type_check CHECK ((data_type = ANY (ARRAY['boolean'::text, 'integer'::text, 'text'::text, 'json'::text])))
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    invited_user uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'invite'::text,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_invites_type_check CHECK ((type = ANY (ARRAY['invite'::text, 'request'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    kills_in_team integer DEFAULT 0,
    wins_in_team integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_tournaments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    tournament_id uuid NOT NULL,
    "position" integer,
    prize_won integer DEFAULT 0,
    kills integer DEFAULT 0,
    joined_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    tag character varying(6) NOT NULL,
    description text,
    logo_url text,
    banner_url text,
    accent_color character varying(7) DEFAULT '#00d4ff'::character varying,
    captain_id uuid NOT NULL,
    game_type character varying(30) DEFAULT 'free_fire'::character varying,
    max_members integer DEFAULT 6,
    is_open boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    wins integer DEFAULT 0,
    losses integer DEFAULT 0,
    tournaments_played integer DEFAULT 0,
    total_kills integer DEFAULT 0,
    rank integer,
    points integer DEFAULT 0,
    season integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    region text DEFAULT 'MA'::text,
    team_type text DEFAULT 'competitive'::text,
    expires_at timestamp with time zone,
    hidden boolean DEFAULT false NOT NULL,
    hidden_reason text,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: tournament_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    round integer,
    match_number integer,
    player1_id uuid,
    player2_id uuid,
    team1_name text,
    team2_name text,
    score1 integer DEFAULT 0,
    score2 integer DEFAULT 0,
    winner_id uuid,
    status text DEFAULT 'pending'::text,
    scheduled_time timestamp without time zone,
    completed_time timestamp without time zone
);


--
-- Name: tournament_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    user_id uuid,
    status text DEFAULT 'pending'::text,
    requested_at timestamp without time zone DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    seat_number integer,
    is_ready boolean DEFAULT false,
    team_number integer,
    team_name text,
    team_slot integer,
    rank integer,
    kills integer DEFAULT 0 NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tournament_players; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.tournament_players WITH (security_invoker='true') AS
 SELECT id,
    tournament_id,
    user_id,
    status,
    requested_at,
    reviewed_by,
    reviewed_at,
    seat_number,
    is_ready,
    team_number
   FROM public.tournament_participants;


--
-- Name: tournament_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid,
    user_id uuid,
    team_name text,
    status text DEFAULT 'registered'::text,
    registered_at timestamp without time zone DEFAULT now()
);


--
-- Name: tournament_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reminder_type text DEFAULT '1h'::text NOT NULL,
    sent_at timestamp with time zone,
    is_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournament_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['24h'::text, '1h'::text, '15m'::text, 'start'::text])))
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    game_type text NOT NULL,
    mode text NOT NULL,
    max_players integer NOT NULL,
    current_players integer DEFAULT 0,
    entry_fee integer DEFAULT 0,
    prize_coins integer NOT NULL,
    status text DEFAULT 'open'::text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_by uuid,
    winner_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    banner_url text,
    background_color text DEFAULT '#6D28D9'::text,
    cs_format text,
    team_size integer,
    room_code text,
    room_password text,
    room_status text DEFAULT 'registration'::text,
    start_time timestamp with time zone,
    match_duration integer DEFAULT 20,
    result_window integer DEFAULT 10,
    end_time timestamp with time zone,
    result_deadline timestamp with time zone,
    match_end_time timestamp with time zone,
    season_id uuid,
    map text,
    room_id text,
    rules text,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'solo'::text NOT NULL,
    CONSTRAINT tournaments_room_status_check CHECK ((room_status = ANY (ARRAY['registration'::text, 'ready'::text, 'waiting'::text, 'live'::text, 'finished'::text, 'results_open'::text, 'results_closed'::text]))),
    CONSTRAINT tournaments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'registration_open'::text, 'full'::text, 'ready'::text, 'live'::text, 'results_pending'::text, 'completed'::text, 'archived'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN tournaments.prize_coins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tournaments.prize_coins IS 'Canonical tournament prize amount in coins.';


--
-- Name: COLUMN tournaments.banner_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tournaments.banner_url IS 'صورة غلاف البطولة';


--
-- Name: COLUMN tournaments.background_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tournaments.background_color IS 'لون الخلفية المخصص';


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_daily_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_daily_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    claimed_at timestamp with time zone DEFAULT now(),
    day_claimed integer NOT NULL,
    coins_got integer DEFAULT 0,
    streak integer DEFAULT 1,
    reward_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id uuid NOT NULL,
    equipped boolean DEFAULT false NOT NULL,
    purchased_at timestamp with time zone DEFAULT now(),
    source public.item_source DEFAULT 'store'::public.item_source NOT NULL,
    price_paid integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_mission_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_mission_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    rewarded boolean DEFAULT false NOT NULL
);


--
-- Name: user_missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mission_id uuid NOT NULL,
    progress integer DEFAULT 0,
    completed boolean DEFAULT false,
    claimed boolean DEFAULT false,
    completed_at timestamp with time zone,
    claimed_at timestamp with time zone,
    reset_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_mutes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_mutes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    muted_by uuid,
    muted_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    user_id uuid NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    tournament_alerts boolean DEFAULT true NOT NULL,
    gift_alerts boolean DEFAULT true NOT NULL,
    clan_alerts boolean DEFAULT true NOT NULL,
    system_alerts boolean DEFAULT true NOT NULL,
    marketing_emails boolean DEFAULT false NOT NULL,
    birthday_emails boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence (
    user_id uuid NOT NULL,
    status text DEFAULT 'offline'::text NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    activity jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_presence_status_check CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text, 'in_game'::text, 'in_tournament'::text, 'streaming'::text])))
);


--
-- Name: user_reputation_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reputation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    delta integer DEFAULT 0 NOT NULL,
    reason text,
    admin_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_season_pass; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_season_pass (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    season_id uuid NOT NULL,
    current_xp integer DEFAULT 0 NOT NULL,
    current_tier integer DEFAULT 0 NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    purchased_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_warnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    reason text NOT NULL,
    severity text DEFAULT 'low'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_warnings_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    amount integer NOT NULL,
    type text,
    reference_id uuid,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    reference text,
    admin_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_type_check CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text, 'refund'::text, 'prize'::text, 'fee'::text, 'purchase'::text, 'gift_sent'::text, 'gift_received'::text, 'admin_adjustment'::text, 'admin_grant'::text, 'season_reset'::text, 'referral'::text, 'daily_reward'::text, 'mission_reward'::text, 'reward'::text, 'tournament'::text])))
);


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    balance integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    season_id uuid
);


--
-- Name: COLUMN wallets.balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wallets.balance IS 'Coin balance. Never mutate directly — always go through RPCs or wallet_transactions.';


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: achievements achievements_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_key_key UNIQUE (key);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: admin_application_audit admin_application_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_audit
    ADD CONSTRAINT admin_application_audit_pkey PRIMARY KEY (id);


--
-- Name: admin_application_notes admin_application_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_notes
    ADD CONSTRAINT admin_application_notes_pkey PRIMARY KEY (id);


--
-- Name: admin_application_votes admin_application_votes_application_id_voter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_votes
    ADD CONSTRAINT admin_application_votes_application_id_voter_id_key UNIQUE (application_id, voter_id);


--
-- Name: admin_application_votes admin_application_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_votes
    ADD CONSTRAINT admin_application_votes_pkey PRIMARY KEY (id);


--
-- Name: admin_applications admin_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_applications
    ADD CONSTRAINT admin_applications_pkey PRIMARY KEY (id);


--
-- Name: admin_candidate_scores admin_candidate_scores_application_id_scorer_id_dimension_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_candidate_scores
    ADD CONSTRAINT admin_candidate_scores_application_id_scorer_id_dimension_key UNIQUE (application_id, scorer_id, dimension);


--
-- Name: admin_candidate_scores admin_candidate_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_candidate_scores
    ADD CONSTRAINT admin_candidate_scores_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_messages admin_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_action_queue ai_action_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_queue
    ADD CONSTRAINT ai_action_queue_pkey PRIMARY KEY (id);


--
-- Name: ai_alerts ai_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_alerts
    ADD CONSTRAINT ai_alerts_pkey PRIMARY KEY (id);


--
-- Name: ai_anti_cheat_cases ai_anti_cheat_cases_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_anti_cheat_cases
    ADD CONSTRAINT ai_anti_cheat_cases_case_number_key UNIQUE (case_number);


--
-- Name: ai_anti_cheat_cases ai_anti_cheat_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_anti_cheat_cases
    ADD CONSTRAINT ai_anti_cheat_cases_pkey PRIMARY KEY (id);


--
-- Name: ai_approvals ai_approvals_action_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_approvals
    ADD CONSTRAINT ai_approvals_action_id_reviewer_id_key UNIQUE (action_id, reviewer_id);


--
-- Name: ai_approvals ai_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_approvals
    ADD CONSTRAINT ai_approvals_pkey PRIMARY KEY (id);


--
-- Name: ai_audit_log ai_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_log
    ADD CONSTRAINT ai_audit_log_pkey PRIMARY KEY (id);


--
-- Name: ai_health_scores ai_health_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_scores
    ADD CONSTRAINT ai_health_scores_pkey PRIMARY KEY (id);


--
-- Name: ai_memory ai_memory_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_memory
    ADD CONSTRAINT ai_memory_key_key UNIQUE (key);


--
-- Name: ai_memory ai_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_memory
    ADD CONSTRAINT ai_memory_pkey PRIMARY KEY (id);


--
-- Name: ai_mobile_scores ai_mobile_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_mobile_scores
    ADD CONSTRAINT ai_mobile_scores_pkey PRIMARY KEY (id);


--
-- Name: ai_modules ai_modules_module_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_modules
    ADD CONSTRAINT ai_modules_module_key_key UNIQUE (module_key);


--
-- Name: ai_modules ai_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_modules
    ADD CONSTRAINT ai_modules_pkey PRIMARY KEY (id);


--
-- Name: ai_qa_bugs ai_qa_bugs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_qa_bugs
    ADD CONSTRAINT ai_qa_bugs_pkey PRIMARY KEY (id);


--
-- Name: ai_qa_test_runs ai_qa_test_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_qa_test_runs
    ADD CONSTRAINT ai_qa_test_runs_pkey PRIMARY KEY (id);


--
-- Name: ai_recommendations ai_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations
    ADD CONSTRAINT ai_recommendations_pkey PRIMARY KEY (id);


--
-- Name: ai_risk_assessments ai_risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_risk_assessments
    ADD CONSTRAINT ai_risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: ai_scan_reports ai_scan_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_scan_reports
    ADD CONSTRAINT ai_scan_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_scan_schedule ai_scan_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_scan_schedule
    ADD CONSTRAINT ai_scan_schedule_pkey PRIMARY KEY (id);


--
-- Name: ai_scan_schedule ai_scan_schedule_scan_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_scan_schedule
    ADD CONSTRAINT ai_scan_schedule_scan_type_key UNIQUE (scan_type);


--
-- Name: ai_security_events ai_security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_security_events
    ADD CONSTRAINT ai_security_events_pkey PRIMARY KEY (id);


--
-- Name: ai_self_healing_actions ai_self_healing_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_self_healing_actions
    ADD CONSTRAINT ai_self_healing_actions_pkey PRIMARY KEY (id);


--
-- Name: ai_simulation_events ai_simulation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_simulation_events
    ADD CONSTRAINT ai_simulation_events_pkey PRIMARY KEY (id);


--
-- Name: ai_simulation_runs ai_simulation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_simulation_runs
    ADD CONSTRAINT ai_simulation_runs_pkey PRIMARY KEY (id);


--
-- Name: ai_visual_regression ai_visual_regression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_visual_regression
    ADD CONSTRAINT ai_visual_regression_pkey PRIMARY KEY (id);


--
-- Name: announcement_reads announcement_reads_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);


--
-- Name: announcement_reads announcement_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: avatars avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatars
    ADD CONSTRAINT avatars_pkey PRIMARY KEY (id);


--
-- Name: backup_logs backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (id);


--
-- Name: bug_reports bug_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_reactions chat_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: chat_reactions chat_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_pkey PRIMARY KEY (id);


--
-- Name: clan_applications clan_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_applications
    ADD CONSTRAINT clan_applications_pkey PRIMARY KEY (id);


--
-- Name: clan_members clan_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_members
    ADD CONSTRAINT clan_members_pkey PRIMARY KEY (id);


--
-- Name: clan_members clan_members_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_members
    ADD CONSTRAINT clan_members_user_unique UNIQUE (user_id);


--
-- Name: clan_messages clan_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_messages
    ADD CONSTRAINT clan_messages_pkey PRIMARY KEY (id);


--
-- Name: clan_tests clan_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_tests
    ADD CONSTRAINT clan_tests_pkey PRIMARY KEY (id);


--
-- Name: clan_war_contributions clan_war_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_war_contributions
    ADD CONSTRAINT clan_war_contributions_pkey PRIMARY KEY (id);


--
-- Name: clan_wars clan_wars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_wars
    ADD CONSTRAINT clan_wars_pkey PRIMARY KEY (id);


--
-- Name: clans clans_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clans
    ADD CONSTRAINT clans_name_unique UNIQUE (name);


--
-- Name: clans clans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clans
    ADD CONSTRAINT clans_pkey PRIMARY KEY (id);


--
-- Name: clans clans_tag_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clans
    ADD CONSTRAINT clans_tag_unique UNIQUE (tag);


--
-- Name: community_idea_comments community_idea_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_comments
    ADD CONSTRAINT community_idea_comments_pkey PRIMARY KEY (id);


--
-- Name: community_idea_votes community_idea_votes_idea_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_votes
    ADD CONSTRAINT community_idea_votes_idea_id_user_id_key UNIQUE (idea_id, user_id);


--
-- Name: community_idea_votes community_idea_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_votes
    ADD CONSTRAINT community_idea_votes_pkey PRIMARY KEY (id);


--
-- Name: community_ideas community_ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_ideas
    ADD CONSTRAINT community_ideas_pkey PRIMARY KEY (id);


--
-- Name: conversation_members conversation_members_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: daily_rewards daily_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_rewards
    ADD CONSTRAINT daily_rewards_pkey PRIMARY KEY (id);


--
-- Name: daily_store daily_store_item_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store
    ADD CONSTRAINT daily_store_item_id_date_key UNIQUE (item_id, date);


--
-- Name: daily_store daily_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store
    ADD CONSTRAINT daily_store_pkey PRIMARY KEY (id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: email_campaign_recipients email_campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: email_campaigns email_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_pkey PRIMARY KEY (id);


--
-- Name: email_events email_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribes email_unsubscribes_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribes
    ADD CONSTRAINT email_unsubscribes_email_key UNIQUE (email);


--
-- Name: email_unsubscribes email_unsubscribes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribes
    ADD CONSTRAINT email_unsubscribes_pkey PRIMARY KEY (id);


--
-- Name: emergency_actions emergency_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_actions
    ADD CONSTRAINT emergency_actions_pkey PRIMARY KEY (id);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: fair_play_events fair_play_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fair_play_events
    ADD CONSTRAINT fair_play_events_pkey PRIMARY KEY (id);


--
-- Name: feature_comments feature_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_comments
    ADD CONSTRAINT feature_comments_pkey PRIMARY KEY (id);


--
-- Name: feature_requests feature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);


--
-- Name: feature_votes feature_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_pkey PRIMARY KEY (id);


--
-- Name: feature_votes feature_votes_request_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_request_id_user_id_key UNIQUE (request_id, user_id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_sender_id_receiver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_sender_id_receiver_id_key UNIQUE (sender_id, receiver_id);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: friends friends_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_requester_id_addressee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_addressee_id_key UNIQUE (requester_id, addressee_id);


--
-- Name: gift_transactions gift_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_pkey PRIMARY KEY (id);


--
-- Name: health_checks health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checks
    ADD CONSTRAINT health_checks_pkey PRIMARY KEY (id);


--
-- Name: inapp_notifications inapp_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inapp_notifications
    ADD CONSTRAINT inapp_notifications_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_type_resource_id_receiver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_type_resource_id_receiver_id_key UNIQUE (type, resource_id, receiver_id);


--
-- Name: ip_bans ip_bans_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_ip_address_key UNIQUE (ip_address);


--
-- Name: ip_bans ip_bans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: match_disputes match_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_disputes
    ADD CONSTRAINT match_disputes_pkey PRIMARY KEY (id);


--
-- Name: match_participants match_participants_match_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_id_user_id_key UNIQUE (match_id, user_id);


--
-- Name: match_participants match_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- Name: match_verifications match_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_verifications
    ADD CONSTRAINT match_verifications_pkey PRIMARY KEY (id);


--
-- Name: match_verifications match_verifications_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_verifications
    ADD CONSTRAINT match_verifications_tournament_id_key UNIQUE (tournament_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: missions missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missions
    ADD CONSTRAINT missions_pkey PRIMARY KEY (id);


--
-- Name: moderation_reviews moderation_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reviews
    ADD CONSTRAINT moderation_reviews_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: news news_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_slug_key UNIQUE (slug);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: notification_jobs notification_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_jobs
    ADD CONSTRAINT notification_jobs_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: notification_recipients notification_recipients_job_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_job_id_user_id_key UNIQUE (job_id, user_id);


--
-- Name: notification_recipients notification_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_name_key UNIQUE (name);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: performance_metrics performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rate_limit_violations rate_limit_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);


--
-- Name: referral_uses referral_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_pkey PRIMARY KEY (id);


--
-- Name: referral_uses referral_uses_referred_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referred_id_key UNIQUE (referred_id);


--
-- Name: report_actions report_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_actions
    ADD CONSTRAINT report_actions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_id_key UNIQUE (role, permission_id);


--
-- Name: room_members room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_pkey PRIMARY KEY (id);


--
-- Name: room_members room_members_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- Name: room_messages room_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT room_messages_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: season_audit_log season_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_audit_log
    ADD CONSTRAINT season_audit_log_pkey PRIMARY KEY (id);


--
-- Name: season_pass_missions season_pass_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_missions
    ADD CONSTRAINT season_pass_missions_pkey PRIMARY KEY (id);


--
-- Name: season_pass_tiers season_pass_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_tiers
    ADD CONSTRAINT season_pass_tiers_pkey PRIMARY KEY (id);


--
-- Name: season_pass_tiers season_pass_tiers_season_id_tier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_tiers
    ADD CONSTRAINT season_pass_tiers_season_id_tier_key UNIQUE (season_id, tier);


--
-- Name: season_snapshots season_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_pkey PRIMARY KEY (id);


--
-- Name: seasons seasons_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_number_key UNIQUE (number);


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seasons
    ADD CONSTRAINT seasons_pkey PRIMARY KEY (id);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: site_schedule site_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_schedule
    ADD CONSTRAINT site_schedule_pkey PRIMARY KEY (id);


--
-- Name: store_items store_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_pkey PRIMARY KEY (id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_reactions story_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_reactions
    ADD CONSTRAINT story_reactions_pkey PRIMARY KEY (id);


--
-- Name: story_reactions story_reactions_story_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_reactions
    ADD CONSTRAINT story_reactions_story_id_user_id_key UNIQUE (story_id, user_id);


--
-- Name: story_views story_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_pkey PRIMARY KEY (id);


--
-- Name: story_views story_views_story_id_viewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_viewer_id_key UNIQUE (story_id, viewer_id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: system_feature_logs system_feature_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_feature_logs
    ADD CONSTRAINT system_feature_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_team_id_invited_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_team_id_invited_user_key UNIQUE (team_id, invited_user);


--
-- Name: team_join_requests team_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_join_requests
    ADD CONSTRAINT team_join_requests_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: team_messages team_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_messages
    ADD CONSTRAINT team_messages_pkey PRIMARY KEY (id);


--
-- Name: team_tournaments team_tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_tournaments
    ADD CONSTRAINT team_tournaments_pkey PRIMARY KEY (id);


--
-- Name: team_tournaments team_tournaments_team_id_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_tournaments
    ADD CONSTRAINT team_tournaments_team_id_tournament_id_key UNIQUE (team_id, tournament_id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tag_key UNIQUE (tag);


--
-- Name: tournament_matches tournament_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);


--
-- Name: tournament_participants tournament_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_pkey PRIMARY KEY (id);


--
-- Name: tournament_participants tournament_participants_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- Name: tournament_registrations tournament_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_pkey PRIMARY KEY (id);


--
-- Name: tournament_registrations tournament_registrations_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- Name: tournament_reminders tournament_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_reminders
    ADD CONSTRAINT tournament_reminders_pkey PRIMARY KEY (id);


--
-- Name: tournament_reminders tournament_reminders_tournament_id_user_id_reminder_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_reminders
    ADD CONSTRAINT tournament_reminders_tournament_id_user_id_reminder_type_key UNIQUE (tournament_id, user_id, reminder_type);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: team_members uniq_team_member_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT uniq_team_member_user UNIQUE (user_id);


--
-- Name: teams uniq_team_tag; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT uniq_team_tag UNIQUE (tag) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tournament_participants unique_player_tournament; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT unique_player_tournament UNIQUE (tournament_id, user_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_daily_claims user_daily_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_claims
    ADD CONSTRAINT user_daily_claims_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_pkey PRIMARY KEY (id);


--
-- Name: user_items user_items_user_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_item_id_key UNIQUE (user_id, item_id);


--
-- Name: user_mission_progress user_mission_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mission_progress
    ADD CONSTRAINT user_mission_progress_pkey PRIMARY KEY (id);


--
-- Name: user_mission_progress user_mission_progress_user_id_mission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mission_progress
    ADD CONSTRAINT user_mission_progress_user_id_mission_id_key UNIQUE (user_id, mission_id);


--
-- Name: user_missions user_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_pkey PRIMARY KEY (id);


--
-- Name: user_missions user_missions_user_id_mission_id_reset_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_user_id_mission_id_reset_date_key UNIQUE (user_id, mission_id, reset_date);


--
-- Name: user_mutes user_mutes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mutes
    ADD CONSTRAINT user_mutes_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (user_id);


--
-- Name: user_reputation_events user_reputation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reputation_events
    ADD CONSTRAINT user_reputation_events_pkey PRIMARY KEY (id);


--
-- Name: user_season_pass user_season_pass_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass
    ADD CONSTRAINT user_season_pass_pkey PRIMARY KEY (id);


--
-- Name: user_season_pass user_season_pass_user_id_season_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass
    ADD CONSTRAINT user_season_pass_user_id_season_id_key UNIQUE (user_id, season_id);


--
-- Name: user_warnings user_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);


--
-- Name: aa_status_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aa_status_date_idx ON public.admin_applications USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'under_review'::text, 'shortlisted'::text]));


--
-- Name: admin_logs_admin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_logs_admin_idx ON public.admin_logs USING btree (admin_id);


--
-- Name: admin_logs_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_logs_date_idx ON public.admin_logs USING btree (created_at DESC);


--
-- Name: admin_logs_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_logs_target_idx ON public.admin_logs USING btree (target_user_id);


--
-- Name: ai_ac_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_ac_created_idx ON public.ai_anti_cheat_cases USING btree (created_at DESC);


--
-- Name: ai_ac_player_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_ac_player_idx ON public.ai_anti_cheat_cases USING btree (player_id);


--
-- Name: ai_ac_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_ac_severity_idx ON public.ai_anti_cheat_cases USING btree (severity);


--
-- Name: ai_ac_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_ac_status_idx ON public.ai_anti_cheat_cases USING btree (status);


--
-- Name: ai_action_queue_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_action_queue_created_idx ON public.ai_action_queue USING btree (created_at DESC);


--
-- Name: ai_action_queue_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_action_queue_expires_idx ON public.ai_action_queue USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: ai_action_queue_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_action_queue_priority_idx ON public.ai_action_queue USING btree (priority);


--
-- Name: ai_action_queue_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_action_queue_status_idx ON public.ai_action_queue USING btree (status);


--
-- Name: ai_alerts_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_alerts_category_idx ON public.ai_alerts USING btree (category);


--
-- Name: ai_alerts_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_alerts_created_idx ON public.ai_alerts USING btree (created_at DESC);


--
-- Name: ai_alerts_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_alerts_severity_idx ON public.ai_alerts USING btree (severity);


--
-- Name: ai_alerts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_alerts_status_idx ON public.ai_alerts USING btree (status);


--
-- Name: ai_approvals_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_approvals_action_idx ON public.ai_approvals USING btree (action_id);


--
-- Name: ai_approvals_decision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_approvals_decision_idx ON public.ai_approvals USING btree (decision);


--
-- Name: ai_approvals_reviewer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_approvals_reviewer_idx ON public.ai_approvals USING btree (reviewer_id);


--
-- Name: ai_audit_log_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_audit_log_actor_idx ON public.ai_audit_log USING btree (actor_id);


--
-- Name: ai_audit_log_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_audit_log_created_idx ON public.ai_audit_log USING btree (created_at DESC);


--
-- Name: ai_audit_log_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_audit_log_event_idx ON public.ai_audit_log USING btree (event_type);


--
-- Name: ai_bugs_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_bugs_category_idx ON public.ai_qa_bugs USING btree (category);


--
-- Name: ai_bugs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_bugs_created_idx ON public.ai_qa_bugs USING btree (created_at DESC);


--
-- Name: ai_bugs_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_bugs_severity_idx ON public.ai_qa_bugs USING btree (severity);


--
-- Name: ai_bugs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_bugs_status_idx ON public.ai_qa_bugs USING btree (status);


--
-- Name: ai_heal_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_heal_category_idx ON public.ai_self_healing_actions USING btree (action_category);


--
-- Name: ai_heal_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_heal_created_idx ON public.ai_self_healing_actions USING btree (created_at DESC);


--
-- Name: ai_heal_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_heal_status_idx ON public.ai_self_healing_actions USING btree (status);


--
-- Name: ai_health_scores_recorded_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_health_scores_recorded_idx ON public.ai_health_scores USING btree (recorded_at DESC);


--
-- Name: ai_health_scores_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_health_scores_score_idx ON public.ai_health_scores USING btree (score);


--
-- Name: ai_health_scores_subsystem_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_health_scores_subsystem_idx ON public.ai_health_scores USING btree (subsystem);


--
-- Name: ai_memory_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_memory_expires_idx ON public.ai_memory USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: ai_memory_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_memory_key_idx ON public.ai_memory USING btree (key);


--
-- Name: ai_memory_tags_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_memory_tags_idx ON public.ai_memory USING gin (tags);


--
-- Name: ai_memory_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_memory_type_idx ON public.ai_memory USING btree (memory_type);


--
-- Name: ai_mobile_device_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_mobile_device_idx ON public.ai_mobile_scores USING btree (device_type);


--
-- Name: ai_mobile_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_mobile_score_idx ON public.ai_mobile_scores USING btree (overall_score);


--
-- Name: ai_mobile_tested_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_mobile_tested_idx ON public.ai_mobile_scores USING btree (tested_at DESC);


--
-- Name: ai_modules_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_modules_key_idx ON public.ai_modules USING btree (module_key);


--
-- Name: ai_modules_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_modules_status_idx ON public.ai_modules USING btree (status);


--
-- Name: ai_qa_runs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_qa_runs_created_idx ON public.ai_qa_test_runs USING btree (created_at DESC);


--
-- Name: ai_qa_runs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_qa_runs_status_idx ON public.ai_qa_test_runs USING btree (status);


--
-- Name: ai_qa_runs_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_qa_runs_type_idx ON public.ai_qa_test_runs USING btree (run_type);


--
-- Name: ai_rec_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_rec_category_idx ON public.ai_recommendations USING btree (category);


--
-- Name: ai_rec_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_rec_created_idx ON public.ai_recommendations USING btree (created_at DESC);


--
-- Name: ai_rec_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_rec_priority_idx ON public.ai_recommendations USING btree (priority);


--
-- Name: ai_rec_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_rec_status_idx ON public.ai_recommendations USING btree (status);


--
-- Name: ai_risk_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_risk_created_idx ON public.ai_risk_assessments USING btree (created_at DESC);


--
-- Name: ai_risk_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_risk_level_idx ON public.ai_risk_assessments USING btree (overall_risk);


--
-- Name: ai_risk_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_risk_type_idx ON public.ai_risk_assessments USING btree (assessment_type);


--
-- Name: ai_scan_reports_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_scan_reports_created_idx ON public.ai_scan_reports USING btree (created_at DESC);


--
-- Name: ai_scan_reports_health_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_scan_reports_health_idx ON public.ai_scan_reports USING btree (health_score);


--
-- Name: ai_scan_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_scan_reports_status_idx ON public.ai_scan_reports USING btree (status);


--
-- Name: ai_scan_reports_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_scan_reports_type_idx ON public.ai_scan_reports USING btree (scan_type);


--
-- Name: ai_sec_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sec_actor_idx ON public.ai_security_events USING btree (actor_id);


--
-- Name: ai_sec_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sec_created_idx ON public.ai_security_events USING btree (created_at DESC);


--
-- Name: ai_sec_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sec_severity_idx ON public.ai_security_events USING btree (severity);


--
-- Name: ai_sec_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sec_status_idx ON public.ai_security_events USING btree (status);


--
-- Name: ai_sec_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sec_type_idx ON public.ai_security_events USING btree (event_type);


--
-- Name: ai_sim_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sim_created_idx ON public.ai_simulation_runs USING btree (created_at DESC);


--
-- Name: ai_sim_events_run_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sim_events_run_idx ON public.ai_simulation_events USING btree (run_id);


--
-- Name: ai_sim_events_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sim_events_severity_idx ON public.ai_simulation_events USING btree (severity);


--
-- Name: ai_sim_events_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sim_events_time_idx ON public.ai_simulation_events USING btree (occurred_at DESC);


--
-- Name: ai_sim_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_sim_status_idx ON public.ai_simulation_runs USING btree (status);


--
-- Name: ai_vr_build_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_vr_build_idx ON public.ai_visual_regression USING btree (build_id);


--
-- Name: ai_vr_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_vr_created_idx ON public.ai_visual_regression USING btree (created_at DESC);


--
-- Name: ai_vr_route_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_vr_route_idx ON public.ai_visual_regression USING btree (route);


--
-- Name: ai_vr_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_vr_status_idx ON public.ai_visual_regression USING btree (status);


--
-- Name: app_audit_app_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_audit_app_idx ON public.admin_application_audit USING btree (application_id);


--
-- Name: app_notes_app_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_notes_app_idx ON public.admin_application_notes USING btree (application_id);


--
-- Name: app_votes_app_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_votes_app_idx ON public.admin_application_votes USING btree (application_id);


--
-- Name: clan_members_clan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clan_members_clan_id_idx ON public.clan_members USING btree (clan_id);


--
-- Name: clan_members_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clan_members_user_id_idx ON public.clan_members USING btree (user_id);


--
-- Name: clan_messages_clan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clan_messages_clan_id_idx ON public.clan_messages USING btree (clan_id);


--
-- Name: clan_messages_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clan_messages_created_idx ON public.clan_messages USING btree (created_at DESC);


--
-- Name: clan_messages_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clan_messages_user_id_idx ON public.clan_messages USING btree (user_id);


--
-- Name: clans_leader_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clans_leader_id_idx ON public.clans USING btree (leader_id);


--
-- Name: clans_points_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clans_points_idx ON public.clans USING btree (points DESC);


--
-- Name: cm_reply_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_reply_idx ON public.chat_messages USING btree (reply_to) WHERE (reply_to IS NOT NULL);


--
-- Name: cw_clan_a_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cw_clan_a_idx ON public.clan_wars USING btree (clan_a_id);


--
-- Name: cw_clan_b_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cw_clan_b_idx ON public.clan_wars USING btree (clan_b_id);


--
-- Name: cw_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cw_status_idx ON public.clan_wars USING btree (status);


--
-- Name: cwc_clan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cwc_clan_idx ON public.clan_war_contributions USING btree (clan_id);


--
-- Name: cwc_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cwc_user_idx ON public.clan_war_contributions USING btree (user_id);


--
-- Name: cwc_war_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cwc_war_idx ON public.clan_war_contributions USING btree (war_id);


--
-- Name: cwc_war_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cwc_war_user_idx ON public.clan_war_contributions USING btree (war_id, user_id);


--
-- Name: fpe_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fpe_date_idx ON public.fair_play_events USING btree (created_at DESC);


--
-- Name: fpe_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fpe_user_idx ON public.fair_play_events USING btree (user_id);


--
-- Name: fr_vote_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fr_vote_score_idx ON public.feature_requests USING btree (vote_score DESC) WHERE (status <> ALL (ARRAY['completed'::text, 'rejected'::text]));


--
-- Name: gt_receiver_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gt_receiver_idx ON public.gift_transactions USING btree (receiver_id);


--
-- Name: gt_sender_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gt_sender_idx ON public.gift_transactions USING btree (sender_id);


--
-- Name: gt_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gt_status_idx ON public.gift_transactions USING btree (status);


--
-- Name: idx_chat_messages_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_channel ON public.chat_messages USING btree (channel);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_reactions_message ON public.chat_reactions USING btree (message_id);


--
-- Name: idx_ecr_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecr_campaign_id ON public.email_campaign_recipients USING btree (campaign_id);


--
-- Name: idx_ecr_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecr_email ON public.email_campaign_recipients USING btree (email);


--
-- Name: idx_ecr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecr_status ON public.email_campaign_recipients USING btree (status);


--
-- Name: idx_ee_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ee_campaign_id ON public.email_events USING btree (campaign_id);


--
-- Name: idx_ee_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ee_event_type ON public.email_events USING btree (event_type);


--
-- Name: idx_emergency_actions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_actions_created ON public.emergency_actions USING btree (created_at DESC);


--
-- Name: idx_emergency_actions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_actions_status ON public.emergency_actions USING btree (status);


--
-- Name: idx_emergency_actions_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emergency_actions_triggered ON public.emergency_actions USING btree (triggered_by);


--
-- Name: idx_error_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_error_logs_type ON public.error_logs USING btree (error_type, created_at DESC);


--
-- Name: idx_friendships_addressee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_addressee ON public.friendships USING btree (addressee_id);


--
-- Name: idx_friendships_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friendships_requester ON public.friendships USING btree (requester_id);


--
-- Name: idx_ideas_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideas_author ON public.community_ideas USING btree (author_id);


--
-- Name: idx_ideas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideas_status ON public.community_ideas USING btree (status);


--
-- Name: idx_inapp_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inapp_user ON public.inapp_notifications USING btree (user_id, is_read);


--
-- Name: idx_maintenance_schedules_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_schedules_start ON public.maintenance_schedules USING btree (scheduled_start);


--
-- Name: idx_maintenance_schedules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_schedules_status ON public.maintenance_schedules USING btree (status);


--
-- Name: idx_news_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_category ON public.news USING btree (category);


--
-- Name: idx_news_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_news_published ON public.news USING btree (published, published_at DESC);


--
-- Name: idx_notif_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notif_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_is_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notif_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_type ON public.notifications USING btree (type);


--
-- Name: idx_notif_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_perf_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_perf_page ON public.performance_metrics USING btree (page, created_at DESC);


--
-- Name: idx_rep_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rep_events_user ON public.user_reputation_events USING btree (user_id);


--
-- Name: idx_rl_violations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rl_violations_user ON public.rate_limit_violations USING btree (user_id);


--
-- Name: idx_sec_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_audit_action ON public.security_audit_log USING btree (action, created_at DESC);


--
-- Name: idx_sec_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sec_audit_actor ON public.security_audit_log USING btree (actor_id);


--
-- Name: idx_site_schedule_open_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_schedule_open_at ON public.site_schedule USING btree (open_at);


--
-- Name: idx_site_schedule_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_schedule_status ON public.site_schedule USING btree (status);


--
-- Name: idx_store_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_items_active ON public.store_items USING btree (active, approved);


--
-- Name: idx_store_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_items_type ON public.store_items USING btree (type);


--
-- Name: idx_system_feature_logs_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_feature_logs_changed_by ON public.system_feature_logs USING btree (changed_by);


--
-- Name: idx_system_feature_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_feature_logs_created_at ON public.system_feature_logs USING btree (created_at DESC);


--
-- Name: idx_system_feature_logs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_feature_logs_key ON public.system_feature_logs USING btree (setting_key);


--
-- Name: idx_team_invites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invites_user ON public.team_invites USING btree (invited_user);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_team_messages_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_messages_team_id ON public.team_messages USING btree (team_id, created_at DESC);


--
-- Name: idx_teams_captain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_captain ON public.teams USING btree (captain_id);


--
-- Name: idx_teams_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_points ON public.teams USING btree (points DESC);


--
-- Name: idx_tm_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tm_team ON public.team_messages USING btree (team_id, created_at DESC);


--
-- Name: idx_tournament_participants_ready; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_participants_ready ON public.tournament_participants USING btree (tournament_id, is_ready);


--
-- Name: idx_tournament_participants_seat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_participants_seat ON public.tournament_participants USING btree (tournament_id, seat_number);


--
-- Name: idx_tournament_participants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_participants_status ON public.tournament_participants USING btree (status);


--
-- Name: idx_tournament_participants_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_participants_tournament_id ON public.tournament_participants USING btree (tournament_id);


--
-- Name: idx_tournament_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournament_participants_user_id ON public.tournament_participants USING btree (user_id);


--
-- Name: idx_unsub_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unsub_email ON public.email_unsubscribes USING btree (email);


--
-- Name: idx_user_ach_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ach_user ON public.user_achievements USING btree (user_id);


--
-- Name: idx_user_claims_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_claims_user ON public.user_daily_claims USING btree (user_id);


--
-- Name: idx_user_items_equip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_items_equip ON public.user_items USING btree (user_id, equipped);


--
-- Name: idx_user_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_items_user ON public.user_items USING btree (user_id);


--
-- Name: idx_user_missions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_missions ON public.user_missions USING btree (user_id);


--
-- Name: idx_warnings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warnings_user ON public.user_warnings USING btree (user_id);


--
-- Name: mr_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mr_status_idx ON public.match_results USING btree (status);


--
-- Name: mr_tournament_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mr_tournament_idx ON public.match_results USING btree (tournament_id);


--
-- Name: mr_tournament_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mr_tournament_status_idx ON public.match_results USING btree (tournament_id, status);


--
-- Name: mr_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mr_user_idx ON public.match_results USING btree (user_id);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: profiles_fp_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_fp_score_idx ON public.profiles USING btree (fair_play_score DESC);


--
-- Name: profiles_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_level_idx ON public.profiles USING btree (level DESC);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);


--
-- Name: profiles_username_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_username_idx ON public.profiles USING btree (username);


--
-- Name: profiles_verified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_verified_idx ON public.profiles USING btree (is_verified);


--
-- Name: profiles_xp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_xp_idx ON public.profiles USING btree (xp DESC);


--
-- Name: referral_uses_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_uses_code_idx ON public.referral_uses USING btree (referral_code);


--
-- Name: report_actions_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX report_actions_idx ON public.report_actions USING btree (report_id);


--
-- Name: reports_assigned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_assigned_idx ON public.reports USING btree (assigned_to);


--
-- Name: reports_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_severity_idx ON public.reports USING btree (severity);


--
-- Name: reports_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_type_idx ON public.reports USING btree (type);


--
-- Name: season_snapshots_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX season_snapshots_season_idx ON public.season_snapshots USING btree (season_id);


--
-- Name: season_snapshots_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX season_snapshots_user_idx ON public.season_snapshots USING btree (user_id);


--
-- Name: spm_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX spm_season_idx ON public.season_pass_missions USING btree (season_id, is_active);


--
-- Name: spt_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX spt_season_idx ON public.season_pass_tiers USING btree (season_id);


--
-- Name: tournaments_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tournaments_created_idx ON public.tournaments USING btree (created_at DESC);


--
-- Name: tournaments_creator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tournaments_creator_idx ON public.tournaments USING btree (created_by);


--
-- Name: tournaments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tournaments_status_idx ON public.tournaments USING btree (status);


--
-- Name: tp_status_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tp_status_date_idx ON public.tournament_participants USING btree (status, joined_at DESC);


--
-- Name: tp_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tp_status_idx ON public.tournament_participants USING btree (status);


--
-- Name: tp_tournament_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tp_tournament_idx ON public.tournament_participants USING btree (tournament_id);


--
-- Name: tp_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tp_user_idx ON public.tournament_participants USING btree (user_id);


--
-- Name: udc_user_claimed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX udc_user_claimed_idx ON public.user_daily_claims USING btree (user_id, claimed_at DESC);


--
-- Name: um_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX um_user_date_idx ON public.user_missions USING btree (user_id, reset_date);


--
-- Name: ump_mission_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ump_mission_idx ON public.user_mission_progress USING btree (mission_id);


--
-- Name: ump_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ump_user_idx ON public.user_mission_progress USING btree (user_id);


--
-- Name: uniq_pending_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_pending_request ON public.team_join_requests USING btree (team_id, user_id) WHERE (status = 'pending'::text);


--
-- Name: user_items_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_items_item_idx ON public.user_items USING btree (item_id);


--
-- Name: user_items_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_items_user_idx ON public.user_items USING btree (user_id);


--
-- Name: usp_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usp_season_idx ON public.user_season_pass USING btree (season_id);


--
-- Name: usp_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usp_user_idx ON public.user_season_pass USING btree (user_id);


--
-- Name: wallet_tx_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_tx_date_idx ON public.wallet_transactions USING btree (created_at DESC);


--
-- Name: wallet_tx_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_tx_user_date_idx ON public.wallet_transactions USING btree (user_id, created_at DESC);


--
-- Name: wallet_tx_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions USING btree (user_id);


--
-- Name: community_ideas_feed _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.community_ideas_feed AS
 SELECT fr.id,
    fr.user_id,
    fr.title,
    fr.description,
    fr.category,
    fr.status,
    fr.reviewed_by,
    fr.admin_note,
    fr.reward_given,
    fr.created_at,
    fr.updated_at,
    (count(*) FILTER (WHERE (fv.vote = 1)))::integer AS upvotes,
    (count(*) FILTER (WHERE (fv.vote = '-1'::integer)))::integer AS downvotes,
    (COALESCE(sum(fv.vote), (0)::bigint))::integer AS score,
    (COALESCE(sum(fv.vote), (0)::bigint))::integer AS vote_score,
    (count(fc.id))::integer AS comments_count
   FROM ((public.feature_requests fr
     LEFT JOIN public.feature_votes fv ON ((fv.request_id = fr.id)))
     LEFT JOIN public.feature_comments fc ON ((fc.request_id = fr.id)))
  GROUP BY fr.id;


--
-- Name: ai_action_queue ai_action_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_action_queue_updated_at BEFORE UPDATE ON public.ai_action_queue FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: ai_alerts ai_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_alerts_updated_at BEFORE UPDATE ON public.ai_alerts FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: ai_scan_schedule ai_scan_schedule_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_scan_schedule_updated_at BEFORE UPDATE ON public.ai_scan_schedule FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: match_results check_achievements_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_achievements_trigger AFTER INSERT ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.check_achievements();


--
-- Name: match_results normalize_match_result_fields_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_match_result_fields_trg BEFORE INSERT OR UPDATE ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.normalize_match_result_fields();


--
-- Name: profiles on_profile_create_notif_prefs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_create_notif_prefs AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();


--
-- Name: profiles on_profile_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();


--
-- Name: profiles protect_profile_security_fields_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_profile_security_fields_trg BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security_fields();


--
-- Name: chat_messages sanitize_chat_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sanitize_chat_trigger BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.sanitize_chat_message();


--
-- Name: profiles sanitize_profile_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sanitize_profile_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sanitize_profile();


--
-- Name: tournament_participants sync_player_count_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_player_count_trg AFTER INSERT OR DELETE OR UPDATE ON public.tournament_participants FOR EACH ROW EXECUTE FUNCTION public.sync_tournament_player_count();


--
-- Name: ai_anti_cheat_cases trg_ai_anti_cheat_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_anti_cheat_cases_updated_at BEFORE UPDATE ON public.ai_anti_cheat_cases FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: ai_modules trg_ai_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_modules_updated_at BEFORE UPDATE ON public.ai_modules FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: ai_qa_bugs trg_ai_qa_bugs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_qa_bugs_updated_at BEFORE UPDATE ON public.ai_qa_bugs FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: ai_recommendations trg_ai_recommendations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_recommendations_updated_at BEFORE UPDATE ON public.ai_recommendations FOR EACH ROW EXECUTE FUNCTION public.ai_set_updated_at();


--
-- Name: email_campaigns trg_email_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_templates trg_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maintenance_schedules trg_maintenance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.update_maintenance_timestamp();


--
-- Name: team_join_requests trg_notif_join_request; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notif_join_request AFTER INSERT OR UPDATE ON public.team_join_requests FOR EACH ROW EXECUTE FUNCTION public.notif_on_join_request();


--
-- Name: tournament_participants trg_notif_tournament_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notif_tournament_approval AFTER UPDATE ON public.tournament_participants FOR EACH ROW EXECUTE FUNCTION public.notif_on_tournament_approval();


--
-- Name: tournaments trg_notif_tournament_live; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notif_tournament_live AFTER UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.notif_on_tournament_live();


--
-- Name: system_settings trg_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_timestamp();


--
-- Name: match_results update_xp_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_xp_trigger AFTER INSERT ON public.match_results FOR EACH ROW EXECUTE FUNCTION public.update_xp_from_match();


--
-- Name: admin_application_audit admin_application_audit_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_audit
    ADD CONSTRAINT admin_application_audit_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_application_audit admin_application_audit_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_audit
    ADD CONSTRAINT admin_application_audit_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admin_applications(id) ON DELETE CASCADE;


--
-- Name: admin_application_notes admin_application_notes_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_notes
    ADD CONSTRAINT admin_application_notes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admin_applications(id) ON DELETE CASCADE;


--
-- Name: admin_application_notes admin_application_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_notes
    ADD CONSTRAINT admin_application_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_application_votes admin_application_votes_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_votes
    ADD CONSTRAINT admin_application_votes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admin_applications(id) ON DELETE CASCADE;


--
-- Name: admin_application_votes admin_application_votes_voter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_application_votes
    ADD CONSTRAINT admin_application_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_applications admin_applications_assigned_reviewer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_applications
    ADD CONSTRAINT admin_applications_assigned_reviewer_fkey FOREIGN KEY (assigned_reviewer) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_applications admin_applications_final_decision_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_applications
    ADD CONSTRAINT admin_applications_final_decision_by_fkey FOREIGN KEY (final_decision_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_applications admin_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_applications
    ADD CONSTRAINT admin_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_applications admin_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_applications
    ADD CONSTRAINT admin_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_candidate_scores admin_candidate_scores_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_candidate_scores
    ADD CONSTRAINT admin_candidate_scores_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.admin_applications(id) ON DELETE CASCADE;


--
-- Name: admin_candidate_scores admin_candidate_scores_scorer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_candidate_scores
    ADD CONSTRAINT admin_candidate_scores_scorer_id_fkey FOREIGN KEY (scorer_id) REFERENCES public.profiles(id);


--
-- Name: admin_candidate_scores admin_candidate_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_candidate_scores
    ADD CONSTRAINT admin_candidate_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_logs admin_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_logs admin_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_user_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_messages admin_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_action_queue ai_action_queue_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_queue
    ADD CONSTRAINT ai_action_queue_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.ai_alerts(id) ON DELETE SET NULL;


--
-- Name: ai_action_queue ai_action_queue_scan_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_queue
    ADD CONSTRAINT ai_action_queue_scan_report_id_fkey FOREIGN KEY (scan_report_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_action_queue ai_action_queue_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_action_queue
    ADD CONSTRAINT ai_action_queue_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_alerts ai_alerts_dismissed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_alerts
    ADD CONSTRAINT ai_alerts_dismissed_by_fkey FOREIGN KEY (dismissed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_alerts ai_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_alerts
    ADD CONSTRAINT ai_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_alerts ai_alerts_scan_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_alerts
    ADD CONSTRAINT ai_alerts_scan_report_id_fkey FOREIGN KEY (scan_report_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_anti_cheat_cases ai_anti_cheat_cases_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_anti_cheat_cases
    ADD CONSTRAINT ai_anti_cheat_cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_anti_cheat_cases ai_anti_cheat_cases_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_anti_cheat_cases
    ADD CONSTRAINT ai_anti_cheat_cases_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_anti_cheat_cases ai_anti_cheat_cases_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_anti_cheat_cases
    ADD CONSTRAINT ai_anti_cheat_cases_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_approvals ai_approvals_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_approvals
    ADD CONSTRAINT ai_approvals_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.ai_action_queue(id) ON DELETE CASCADE;


--
-- Name: ai_approvals ai_approvals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_approvals
    ADD CONSTRAINT ai_approvals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_audit_log ai_audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_log
    ADD CONSTRAINT ai_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_health_scores ai_health_scores_scan_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_health_scores
    ADD CONSTRAINT ai_health_scores_scan_report_id_fkey FOREIGN KEY (scan_report_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_mobile_scores ai_mobile_scores_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_mobile_scores
    ADD CONSTRAINT ai_mobile_scores_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_qa_bugs ai_qa_bugs_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_qa_bugs
    ADD CONSTRAINT ai_qa_bugs_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_qa_bugs ai_qa_bugs_test_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_qa_bugs
    ADD CONSTRAINT ai_qa_bugs_test_run_id_fkey FOREIGN KEY (test_run_id) REFERENCES public.ai_qa_test_runs(id) ON DELETE SET NULL;


--
-- Name: ai_qa_test_runs ai_qa_test_runs_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_qa_test_runs
    ADD CONSTRAINT ai_qa_test_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_recommendations ai_recommendations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations
    ADD CONSTRAINT ai_recommendations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_recommendations ai_recommendations_source_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations
    ADD CONSTRAINT ai_recommendations_source_scan_id_fkey FOREIGN KEY (source_scan_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_risk_assessments ai_risk_assessments_scan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_risk_assessments
    ADD CONSTRAINT ai_risk_assessments_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.ai_scan_reports(id) ON DELETE SET NULL;


--
-- Name: ai_scan_reports ai_scan_reports_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_scan_reports
    ADD CONSTRAINT ai_scan_reports_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_scan_schedule ai_scan_schedule_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_scan_schedule
    ADD CONSTRAINT ai_scan_schedule_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_security_events ai_security_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_security_events
    ADD CONSTRAINT ai_security_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_security_events ai_security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_security_events
    ADD CONSTRAINT ai_security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_security_events ai_security_events_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_security_events
    ADD CONSTRAINT ai_security_events_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_self_healing_actions ai_self_healing_actions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_self_healing_actions
    ADD CONSTRAINT ai_self_healing_actions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_simulation_events ai_simulation_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_simulation_events
    ADD CONSTRAINT ai_simulation_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.ai_simulation_runs(id) ON DELETE CASCADE;


--
-- Name: ai_simulation_runs ai_simulation_runs_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_simulation_runs
    ADD CONSTRAINT ai_simulation_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_visual_regression ai_visual_regression_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_visual_regression
    ADD CONSTRAINT ai_visual_regression_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: announcement_reads announcement_reads_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_reads announcement_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_reads
    ADD CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: app_config app_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: avatars avatars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatars
    ADD CONSTRAINT avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: backup_logs backup_logs_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT backup_logs_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.profiles(id);


--
-- Name: blocked_users blocked_users_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blocked_users blocked_users_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bug_reports bug_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bug_reports bug_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_reports
    ADD CONSTRAINT bug_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_reply_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_fkey FOREIGN KEY (reply_to) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_reactions chat_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clan_applications clan_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_applications
    ADD CONSTRAINT clan_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: clan_applications clan_applications_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_applications
    ADD CONSTRAINT clan_applications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: clan_applications clan_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_applications
    ADD CONSTRAINT clan_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clan_members clan_members_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_members
    ADD CONSTRAINT clan_members_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clans(id) ON DELETE CASCADE;


--
-- Name: clan_members clan_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_members
    ADD CONSTRAINT clan_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clan_messages clan_messages_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_messages
    ADD CONSTRAINT clan_messages_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clans(id) ON DELETE CASCADE;


--
-- Name: clan_messages clan_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_messages
    ADD CONSTRAINT clan_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clan_tests clan_tests_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_tests
    ADD CONSTRAINT clan_tests_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.clan_applications(id) ON DELETE CASCADE;


--
-- Name: clan_tests clan_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_tests
    ADD CONSTRAINT clan_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: clan_tests clan_tests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_tests
    ADD CONSTRAINT clan_tests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: clan_tests clan_tests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_tests
    ADD CONSTRAINT clan_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: clan_war_contributions clan_war_contributions_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_war_contributions
    ADD CONSTRAINT clan_war_contributions_clan_id_fkey FOREIGN KEY (clan_id) REFERENCES public.clans(id) ON DELETE CASCADE;


--
-- Name: clan_war_contributions clan_war_contributions_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_war_contributions
    ADD CONSTRAINT clan_war_contributions_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: clan_war_contributions clan_war_contributions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_war_contributions
    ADD CONSTRAINT clan_war_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clan_war_contributions clan_war_contributions_war_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_war_contributions
    ADD CONSTRAINT clan_war_contributions_war_id_fkey FOREIGN KEY (war_id) REFERENCES public.clan_wars(id) ON DELETE CASCADE;


--
-- Name: clan_wars clan_wars_clan_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_wars
    ADD CONSTRAINT clan_wars_clan_a_id_fkey FOREIGN KEY (clan_a_id) REFERENCES public.clans(id) ON DELETE CASCADE;


--
-- Name: clan_wars clan_wars_clan_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_wars
    ADD CONSTRAINT clan_wars_clan_b_id_fkey FOREIGN KEY (clan_b_id) REFERENCES public.clans(id) ON DELETE CASCADE;


--
-- Name: clan_wars clan_wars_declared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_wars
    ADD CONSTRAINT clan_wars_declared_by_fkey FOREIGN KEY (declared_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: clan_wars clan_wars_winner_clan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clan_wars
    ADD CONSTRAINT clan_wars_winner_clan_id_fkey FOREIGN KEY (winner_clan_id) REFERENCES public.clans(id) ON DELETE SET NULL;


--
-- Name: clans clans_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clans
    ADD CONSTRAINT clans_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_idea_comments community_idea_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_comments
    ADD CONSTRAINT community_idea_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_idea_comments community_idea_comments_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_comments
    ADD CONSTRAINT community_idea_comments_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.community_ideas(id) ON DELETE CASCADE;


--
-- Name: community_idea_votes community_idea_votes_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_votes
    ADD CONSTRAINT community_idea_votes_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.community_ideas(id) ON DELETE CASCADE;


--
-- Name: community_idea_votes community_idea_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_idea_votes
    ADD CONSTRAINT community_idea_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_ideas community_ideas_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_ideas
    ADD CONSTRAINT community_ideas_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: community_ideas community_ideas_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_ideas
    ADD CONSTRAINT community_ideas_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_store daily_store_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_store
    ADD CONSTRAINT daily_store_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id);


--
-- Name: direct_messages direct_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.direct_messages(id) ON DELETE SET NULL;


--
-- Name: direct_messages direct_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_campaign_recipients email_campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE;


--
-- Name: email_campaign_recipients email_campaign_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaign_recipients
    ADD CONSTRAINT email_campaign_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_campaigns email_campaigns_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_campaigns email_campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_events email_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_events email_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_events
    ADD CONSTRAINT email_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE;


--
-- Name: email_templates email_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_unsubscribes email_unsubscribes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribes
    ADD CONSTRAINT email_unsubscribes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: emergency_actions emergency_actions_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_actions
    ADD CONSTRAINT emergency_actions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: emergency_actions emergency_actions_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_actions
    ADD CONSTRAINT emergency_actions_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: error_logs error_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: fair_play_events fair_play_events_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fair_play_events
    ADD CONSTRAINT fair_play_events_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: fair_play_events fair_play_events_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fair_play_events
    ADD CONSTRAINT fair_play_events_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: fair_play_events fair_play_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fair_play_events
    ADD CONSTRAINT fair_play_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feature_comments feature_comments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_comments
    ADD CONSTRAINT feature_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE;


--
-- Name: feature_comments feature_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_comments
    ADD CONSTRAINT feature_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feature_requests feature_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: feature_requests feature_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: feature_votes feature_votes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.feature_requests(id) ON DELETE CASCADE;


--
-- Name: feature_votes feature_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_votes
    ADD CONSTRAINT feature_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friends friends_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friends friends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_addressee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: gift_transactions gift_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id) ON DELETE SET NULL;


--
-- Name: gift_transactions gift_transactions_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: gift_transactions gift_transactions_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_transactions
    ADD CONSTRAINT gift_transactions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: inapp_notifications inapp_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inapp_notifications
    ADD CONSTRAINT inapp_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ip_bans ip_bans_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_bans
    ADD CONSTRAINT ip_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.profiles(id);


--
-- Name: maintenance_schedules maintenance_schedules_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: maintenance_schedules maintenance_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: match_disputes match_disputes_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_disputes
    ADD CONSTRAINT match_disputes_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.profiles(id);


--
-- Name: match_disputes match_disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_disputes
    ADD CONSTRAINT match_disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- Name: match_disputes match_disputes_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_disputes
    ADD CONSTRAINT match_disputes_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.match_results(id);


--
-- Name: match_participants match_participants_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_participants match_participants_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_participants match_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_participants
    ADD CONSTRAINT match_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: match_verifications match_verifications_mvp_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_verifications
    ADD CONSTRAINT match_verifications_mvp_user_id_fkey FOREIGN KEY (mvp_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: match_verifications match_verifications_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_verifications
    ADD CONSTRAINT match_verifications_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: match_verifications match_verifications_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_verifications
    ADD CONSTRAINT match_verifications_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: moderation_reviews moderation_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_reviews
    ADD CONSTRAINT moderation_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id);


--
-- Name: news news_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id);


--
-- Name: notification_events notification_events_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.notification_jobs(id);


--
-- Name: notification_events notification_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: notification_jobs notification_jobs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_jobs
    ADD CONSTRAINT notification_jobs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: notification_jobs notification_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_jobs
    ADD CONSTRAINT notification_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: notification_jobs notification_jobs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_jobs
    ADD CONSTRAINT notification_jobs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.notification_jobs(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: performance_metrics performance_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: player_stats player_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_equipped_avatar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_equipped_avatar_fkey FOREIGN KEY (equipped_avatar) REFERENCES public.store_items(id);


--
-- Name: profiles profiles_equipped_badge_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_equipped_badge_fkey FOREIGN KEY (equipped_badge) REFERENCES public.store_items(id);


--
-- Name: profiles profiles_equipped_banner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_equipped_banner_fkey FOREIGN KEY (equipped_banner) REFERENCES public.store_items(id);


--
-- Name: profiles profiles_equipped_frame_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_equipped_frame_fkey FOREIGN KEY (equipped_frame) REFERENCES public.store_items(id);


--
-- Name: profiles profiles_equipped_name_color_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_equipped_name_color_fkey FOREIGN KEY (equipped_name_color) REFERENCES public.store_items(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: profiles profiles_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: rate_limit_violations rate_limit_violations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limit_violations
    ADD CONSTRAINT rate_limit_violations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: rate_limits rate_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referral_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referral_code_fkey FOREIGN KEY (referral_code) REFERENCES public.referral_codes(code);


--
-- Name: referral_uses referral_uses_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: report_actions report_actions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_actions
    ADD CONSTRAINT report_actions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: report_actions report_actions_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_actions
    ADD CONSTRAINT report_actions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reports reports_reported_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: room_members room_members_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: room_members room_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_members
    ADD CONSTRAINT room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: room_messages room_messages_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT room_messages_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: room_messages room_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_messages
    ADD CONSTRAINT room_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: season_audit_log season_audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_audit_log
    ADD CONSTRAINT season_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: season_audit_log season_audit_log_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_audit_log
    ADD CONSTRAINT season_audit_log_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE SET NULL;


--
-- Name: season_pass_missions season_pass_missions_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_missions
    ADD CONSTRAINT season_pass_missions_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_pass_tiers season_pass_tiers_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_pass_tiers
    ADD CONSTRAINT season_pass_tiers_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_snapshots season_snapshots_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: season_snapshots season_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.season_snapshots
    ADD CONSTRAINT season_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: security_audit_log security_audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: site_schedule site_schedule_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_schedule
    ADD CONSTRAINT site_schedule_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: site_schedule site_schedule_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_schedule
    ADD CONSTRAINT site_schedule_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;


--
-- Name: store_items store_items_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: store_items store_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: stories stories_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: stories stories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_reactions story_reactions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_reactions
    ADD CONSTRAINT story_reactions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_reactions story_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_reactions
    ADD CONSTRAINT story_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: system_config system_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: system_feature_logs system_feature_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_feature_logs
    ADD CONSTRAINT system_feature_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_invites team_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: team_invites team_invites_invited_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_invited_user_fkey FOREIGN KEY (invited_user) REFERENCES public.profiles(id);


--
-- Name: team_invites team_invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_join_requests team_join_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_join_requests
    ADD CONSTRAINT team_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_join_requests team_join_requests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_join_requests
    ADD CONSTRAINT team_join_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_join_requests team_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_join_requests
    ADD CONSTRAINT team_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_messages team_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_messages
    ADD CONSTRAINT team_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_messages team_messages_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_messages
    ADD CONSTRAINT team_messages_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_tournaments team_tournaments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_tournaments
    ADD CONSTRAINT team_tournaments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_tournaments team_tournaments_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_tournaments
    ADD CONSTRAINT team_tournaments_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: teams teams_captain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_player1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.profiles(id);


--
-- Name: tournament_matches tournament_matches_player2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.profiles(id);


--
-- Name: tournament_matches tournament_matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_matches tournament_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id);


--
-- Name: tournament_participants tournament_participants_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: tournament_participants tournament_participants_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_participants tournament_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_participants
    ADD CONSTRAINT tournament_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tournament_reminders tournament_reminders_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_reminders
    ADD CONSTRAINT tournament_reminders_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_reminders tournament_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_reminders
    ADD CONSTRAINT tournament_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: tournaments tournaments_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: tournaments tournaments_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id);


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_daily_claims user_daily_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_daily_claims
    ADD CONSTRAINT user_daily_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id) ON DELETE CASCADE;


--
-- Name: user_items user_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_items
    ADD CONSTRAINT user_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_mission_progress user_mission_progress_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mission_progress
    ADD CONSTRAINT user_mission_progress_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.season_pass_missions(id) ON DELETE CASCADE;


--
-- Name: user_mission_progress user_mission_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mission_progress
    ADD CONSTRAINT user_mission_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_missions user_missions_mission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE;


--
-- Name: user_missions user_missions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_missions
    ADD CONSTRAINT user_missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_mutes user_mutes_muted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mutes
    ADD CONSTRAINT user_mutes_muted_by_fkey FOREIGN KEY (muted_by) REFERENCES public.profiles(id);


--
-- Name: user_mutes user_mutes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_mutes
    ADD CONSTRAINT user_mutes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_reputation_events user_reputation_events_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reputation_events
    ADD CONSTRAINT user_reputation_events_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);


--
-- Name: user_reputation_events user_reputation_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reputation_events
    ADD CONSTRAINT user_reputation_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_season_pass user_season_pass_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass
    ADD CONSTRAINT user_season_pass_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;


--
-- Name: user_season_pass user_season_pass_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_season_pass
    ADD CONSTRAINT user_season_pass_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_warnings user_warnings_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);


--
-- Name: user_warnings user_warnings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_warnings
    ADD CONSTRAINT user_warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: wallets wallets_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_season_id_fkey FOREIGN KEY (season_id) REFERENCES public.seasons(id);


--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_messages Admins can insert admin messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert admin messages" ON public.admin_messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.role = 'super_admin'::text))))));


--
-- Name: knowledge_base Anyone can view knowledge base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view knowledge base" ON public.knowledge_base FOR SELECT TO authenticated USING (true);


--
-- Name: matches Anyone can view matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);


--
-- Name: room_messages Anyone can view room messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view room messages" ON public.room_messages FOR SELECT USING (true);


--
-- Name: room_messages Approved participants can read room messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved participants can read room messages" ON public.room_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tournament_participants tp
  WHERE ((tp.user_id = auth.uid()) AND (tp.tournament_id = room_messages.tournament_id) AND (tp.status = 'approved'::text)))));


--
-- Name: room_messages Approved participants can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved participants can send messages" ON public.room_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tournament_participants tp
  WHERE ((tp.user_id = auth.uid()) AND (tp.tournament_id = room_messages.tournament_id) AND (tp.status = 'approved'::text)))));


--
-- Name: room_messages Authenticated users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can send messages" ON public.room_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_mutes Check if user is muted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Check if user is muted" ON public.user_mutes FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.role = 'super_admin'::text)))))));


--
-- Name: system_config Enable read for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read for all users" ON public.system_config FOR SELECT USING (true);


--
-- Name: system_config Enable update for super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for super_admin" ON public.system_config FOR UPDATE USING ((auth.uid() IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.role = 'super_admin'::text))));


--
-- Name: tournament_registrations Founders can view tournament registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Founders can view tournament registrations" ON public.tournament_registrations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tournaments
  WHERE ((tournaments.id = tournament_registrations.tournament_id) AND (tournaments.created_by = auth.uid())))));


--
-- Name: wallet_transactions Only system can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: room_messages Organizer can delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organizer can delete messages" ON public.room_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.tournaments t
  WHERE ((t.id = room_messages.tournament_id) AND (t.created_by = auth.uid())))));


--
-- Name: admin_logs Super admin can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can view logs" ON public.admin_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: admin_logs Super admin full access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin full access logs" ON public.admin_logs TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: user_mutes Super admin full access mutes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin full access mutes" ON public.user_mutes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: reports Super admin full access reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin full access reports" ON public.reports TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: admin_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.admin_messages FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text))))));


--
-- Name: chat_messages Users can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((sender_id = auth.uid()));


--
-- Name: tournament_registrations Users can register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can register" ON public.tournament_registrations FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.tournaments
  WHERE ((tournaments.id = tournament_registrations.tournament_id) AND (tournaments.status = 'open'::text) AND (tournaments.current_players < tournaments.max_players))))));


--
-- Name: admin_messages Users can update read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update read status" ON public.admin_messages FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR (is_global = true))) WITH CHECK (((user_id = auth.uid()) OR (is_global = true)));


--
-- Name: admin_messages Users can view admin messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view admin messages" ON public.admin_messages FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (is_global = true)));


--
-- Name: tournament_registrations Users can view own registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own registrations" ON public.tournament_registrations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: wallet_transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: achievements achievements_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY achievements_read ON public.achievements FOR SELECT USING (true);


--
-- Name: admin_application_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_application_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_application_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_application_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_application_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_application_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_applications admin_apps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_apps_select ON public.admin_applications FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: admin_applications admin_apps_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_apps_self ON public.admin_applications USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: admin_applications admin_apps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_apps_update ON public.admin_applications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_candidate_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_candidate_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: email_campaigns admin_draft_campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_draft_campaigns ON public.email_campaigns FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: admin_messages admin_insert_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_insert_messages ON public.admin_messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.role = 'super_admin'::text))))));


--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_logs admin_logs_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_logs_insert_staff ON public.admin_logs FOR INSERT WITH CHECK (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: admin_logs admin_logs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_logs_policy ON public.admin_logs USING (public.is_super_admin(auth.uid()));


--
-- Name: admin_logs admin_logs_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_logs_read_admin ON public.admin_logs FOR SELECT USING (public.is_admin());


--
-- Name: site_schedule admin_manage_schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_manage_schedule ON public.site_schedule USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_messages admin_messages_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_messages_admin_insert ON public.admin_messages FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: admin_messages admin_messages_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_messages_read_self ON public.admin_messages FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: admin_messages admin_messages_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_messages_update_self ON public.admin_messages FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: email_templates admin_read_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_read_templates ON public.email_templates FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: clan_tests admins all tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins all tests" ON public.clan_tests TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_applications admins read all apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read all apps" ON public.clan_applications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_applications admins update apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins update apps" ON public.clan_applications FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: ai_anti_cheat_cases ai_ac_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_ac_modify ON public.ai_anti_cheat_cases USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_anti_cheat_cases ai_ac_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_ac_select ON public.ai_anti_cheat_cases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text, 'moderator'::text]))))));


--
-- Name: ai_action_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_action_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_anti_cheat_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_anti_cheat_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_audit_log ai_audit_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_audit_log_insert ON public.ai_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: ai_qa_bugs ai_bugs_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_bugs_modify ON public.ai_qa_bugs USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_qa_bugs ai_bugs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_bugs_select ON public.ai_qa_bugs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text, 'moderator'::text]))))));


--
-- Name: ai_self_healing_actions ai_heal_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_heal_modify ON public.ai_self_healing_actions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_self_healing_actions ai_heal_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_heal_select ON public.ai_self_healing_actions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_health_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_health_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_mobile_scores ai_mobile_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_mobile_modify ON public.ai_mobile_scores USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_mobile_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_mobile_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_mobile_scores ai_mobile_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_mobile_select ON public.ai_mobile_scores FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_modules ai_modules_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_modules_modify ON public.ai_modules USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_modules ai_modules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_modules_select ON public.ai_modules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_qa_bugs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_qa_bugs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_qa_test_runs ai_qa_runs_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_qa_runs_modify ON public.ai_qa_test_runs USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_qa_test_runs ai_qa_runs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_qa_runs_select ON public.ai_qa_test_runs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_qa_test_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_qa_test_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_recommendations ai_rec_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_rec_modify ON public.ai_recommendations USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_recommendations ai_rec_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_rec_select ON public.ai_recommendations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_risk_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_risk_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_risk_assessments ai_risk_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_risk_insert ON public.ai_risk_assessments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_risk_assessments ai_risk_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_risk_select ON public.ai_risk_assessments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_scan_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_scan_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_scan_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_scan_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_security_events ai_sec_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_sec_insert ON public.ai_security_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_security_events ai_sec_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_sec_select ON public.ai_security_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_security_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_security_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_self_healing_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_self_healing_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_simulation_events ai_sim_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_sim_events_select ON public.ai_simulation_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_simulation_runs ai_sim_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_sim_modify ON public.ai_simulation_runs USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_simulation_runs ai_sim_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_sim_select ON public.ai_simulation_runs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: ai_simulation_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_simulation_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_simulation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_simulation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_visual_regression; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_visual_regression ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_visual_regression ai_vr_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_vr_modify ON public.ai_visual_regression USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: ai_visual_regression ai_vr_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_vr_select ON public.ai_visual_regression FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: chat_messages allow_delete_chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete_chat_messages ON public.chat_messages FOR DELETE TO authenticated USING (((auth.uid() = sender_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: chat_reactions allow_delete_chat_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_delete_chat_reactions ON public.chat_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_messages allow_insert_chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert_chat_messages ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id));


--
-- Name: chat_reactions allow_insert_chat_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_insert_chat_reactions ON public.chat_reactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages allow_select_chat_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_select_chat_messages ON public.chat_messages FOR SELECT TO authenticated USING (true);


--
-- Name: chat_reactions allow_select_chat_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_select_chat_reactions ON public.chat_reactions FOR SELECT TO authenticated USING (true);


--
-- Name: announcement_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: announcement_reads announcement_reads_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcement_reads_self ON public.announcement_reads USING ((auth.uid() = user_id));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_admin_all ON public.announcements USING (public.is_admin());


--
-- Name: announcements announcements_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_read_active ON public.announcements FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: admin_application_audit app_audit_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_audit_insert_staff ON public.admin_application_audit FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_application_audit app_audit_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_audit_select_staff ON public.admin_application_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_application_audit app_audit_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_audit_staff ON public.admin_application_audit USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config app_config_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_read ON public.app_config FOR SELECT USING (true);


--
-- Name: app_config app_config_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_config_write ON public.app_config USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: admin_application_notes app_notes_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_notes_insert_staff ON public.admin_application_notes FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: admin_application_notes app_notes_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_notes_select_staff ON public.admin_application_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_application_notes app_notes_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_notes_staff ON public.admin_application_notes USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: admin_application_votes app_votes_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_votes_insert_staff ON public.admin_application_votes FOR INSERT WITH CHECK (((auth.uid() = voter_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: admin_application_votes app_votes_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_votes_select_staff ON public.admin_application_votes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_application_votes app_votes_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_votes_staff ON public.admin_application_votes USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: admin_application_votes app_votes_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_votes_update_own ON public.admin_application_votes FOR UPDATE USING ((auth.uid() = voter_id));


--
-- Name: room_messages approved_can_insert_room_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY approved_can_insert_room_messages ON public.room_messages FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.tournament_participants tp
  WHERE ((tp.user_id = auth.uid()) AND (tp.tournament_id = room_messages.tournament_id) AND (tp.status = 'approved'::text)))) OR (EXISTS ( SELECT 1
   FROM public.tournaments t
  WHERE ((t.id = room_messages.tournament_id) AND (t.created_by = auth.uid()))))));


--
-- Name: room_messages approved_can_read_room_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY approved_can_read_room_messages ON public.room_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.tournament_participants tp
  WHERE ((tp.user_id = auth.uid()) AND (tp.tournament_id = room_messages.tournament_id) AND (tp.status = 'approved'::text)))) OR (EXISTS ( SELECT 1
   FROM public.tournaments t
  WHERE ((t.id = room_messages.tournament_id) AND (t.created_by = auth.uid()))))));


--
-- Name: season_audit_log audit_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert_any ON public.season_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: season_audit_log audit_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_read_admin ON public.season_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: avatars avatars_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avatars_admin_all ON public.avatars USING (public.is_admin());


--
-- Name: avatars avatars_read_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avatars_read_public ON public.avatars FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: backup_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_logs backup_logs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_logs_admin ON public.backup_logs USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: blocked_users block_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY block_delete_self ON public.blocked_users FOR DELETE USING ((auth.uid() = blocker_id));


--
-- Name: blocked_users block_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY block_insert_self ON public.blocked_users FOR INSERT WITH CHECK ((auth.uid() = blocker_id));


--
-- Name: blocked_users block_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY block_select_self ON public.blocked_users FOR SELECT USING ((auth.uid() = blocker_id));


--
-- Name: blocked_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

--
-- Name: bug_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: bug_reports bug_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bug_reports_select_own ON public.bug_reports FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: bug_reports bug_reports_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bug_reports_self ON public.bug_reports USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: bug_reports bug_reports_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bug_reports_update_admin ON public.bug_reports FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: admin_candidate_scores candidate_scores_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY candidate_scores_select ON public.admin_candidate_scores FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: chat_messages chat_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_insert_self ON public.chat_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages chat_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_read_all ON public.chat_messages FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: user_daily_claims claims_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY claims_read_self ON public.user_daily_claims FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: clan_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clan_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_applications clan_applications_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_applications_self ON public.clan_applications USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: clan_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_members clan_members_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_members_insert_self ON public.clan_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clan_members clan_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_members_read ON public.clan_members FOR SELECT USING (true);


--
-- Name: clan_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clan_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_messages clan_messages_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_admin ON public.clan_messages USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_messages clan_messages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_delete ON public.clan_messages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clan_messages clan_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_insert ON public.clan_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clan_messages clan_messages_insert_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_insert_members ON public.clan_messages FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.clan_members cm
  WHERE ((cm.clan_id = clan_messages.clan_id) AND (cm.user_id = auth.uid()))))));


--
-- Name: clan_messages clan_messages_read_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_read_members ON public.clan_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.clan_members cm
  WHERE ((cm.clan_id = clan_messages.clan_id) AND (cm.user_id = auth.uid())))) OR public.is_admin()));


--
-- Name: clan_messages clan_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clan_messages_select ON public.clan_messages FOR SELECT USING (true);


--
-- Name: clan_war_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clan_war_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_wars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clan_wars ENABLE ROW LEVEL SECURITY;

--
-- Name: clans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;

--
-- Name: clans clans_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_admin_all ON public.clans USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: clans clans_delete_leader; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_delete_leader ON public.clans FOR DELETE USING ((auth.uid() = leader_id));


--
-- Name: clans clans_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_insert ON public.clans FOR INSERT WITH CHECK ((auth.uid() = leader_id));


--
-- Name: clans clans_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_insert_self ON public.clans FOR INSERT WITH CHECK ((auth.uid() = leader_id));


--
-- Name: clans clans_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_read ON public.clans FOR SELECT USING (true);


--
-- Name: clans clans_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_select ON public.clans FOR SELECT USING (true);


--
-- Name: clans clans_update_leader; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clans_update_leader ON public.clans FOR UPDATE USING (((auth.uid() = leader_id) OR public.is_admin()));


--
-- Name: conversation_members cmem_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cmem_delete_self ON public.conversation_members FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: conversation_members cmem_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cmem_insert_self ON public.conversation_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_members cmem_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cmem_select_self ON public.conversation_members FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversation_members cmem_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cmem_update_self ON public.conversation_members FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: community_idea_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_idea_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: community_idea_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_idea_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: community_ideas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_ideas ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations conv_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_insert_any ON public.conversations FOR INSERT WITH CHECK (true);


--
-- Name: conversations conv_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_select_member ON public.conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = auth.uid())))));


--
-- Name: conversations conv_update_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conv_update_member ON public.conversations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = auth.uid())))));


--
-- Name: conversation_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_wars cw_manage_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cw_manage_admin ON public.clan_wars USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_wars cw_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cw_read_all ON public.clan_wars FOR SELECT USING (true);


--
-- Name: clan_wars cw_write_leader; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cw_write_leader ON public.clan_wars FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clan_members
  WHERE ((clan_members.user_id = auth.uid()) AND (clan_members.clan_id = clan_wars.clan_a_id) AND (clan_members.role = ANY (ARRAY['leader'::text, 'co-leader'::text]))))));


--
-- Name: clan_war_contributions cwc_manage_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cwc_manage_admin ON public.clan_war_contributions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_war_contributions cwc_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cwc_read_all ON public.clan_war_contributions FOR SELECT USING (true);


--
-- Name: clan_war_contributions cwc_write_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cwc_write_self ON public.clan_war_contributions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_rewards daily_rewards_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_rewards_admin_all ON public.daily_rewards USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: daily_rewards daily_rewards_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_rewards_read ON public.daily_rewards FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: daily_rewards daily_rewards_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_rewards_read_all ON public.daily_rewards FOR SELECT USING (true);


--
-- Name: daily_store; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_store ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_store daily_store_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_store_admin_all ON public.daily_store USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: daily_store daily_store_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_store_read ON public.daily_store FOR SELECT USING (true);


--
-- Name: daily_store daily_store_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_store_read_all ON public.daily_store FOR SELECT USING (true);


--
-- Name: daily_store daily_store_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_store_select ON public.daily_store FOR SELECT TO authenticated USING (true);


--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_messages dm_delete_sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_delete_sender ON public.direct_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: direct_messages dm_insert_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_insert_member ON public.direct_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.conversation_members cm
  WHERE ((cm.conversation_id = direct_messages.conversation_id) AND (cm.user_id = auth.uid()))))));


--
-- Name: direct_messages dm_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_select_member ON public.direct_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversation_members cm
  WHERE ((cm.conversation_id = direct_messages.conversation_id) AND (cm.user_id = auth.uid())))));


--
-- Name: direct_messages dm_update_sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_update_sender ON public.direct_messages FOR UPDATE USING ((auth.uid() = sender_id));


--
-- Name: email_campaign_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: email_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: email_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: email_unsubscribes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_actions emergency_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emergency_read ON public.emergency_actions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: emergency_actions emergency_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emergency_write ON public.emergency_actions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: error_logs error_logs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY error_logs_admin ON public.error_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: error_logs error_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY error_logs_insert ON public.error_logs FOR INSERT WITH CHECK (true);


--
-- Name: fair_play_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fair_play_events ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_comments feature_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_comments_insert ON public.feature_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feature_comments feature_comments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_comments_read ON public.feature_comments FOR SELECT USING (true);


--
-- Name: system_feature_logs feature_logs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_logs_read ON public.system_feature_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text]))))));


--
-- Name: feature_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests feature_requests_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_requests_delete_admin ON public.feature_requests FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: feature_requests feature_requests_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_requests_insert ON public.feature_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: feature_requests feature_requests_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_requests_read ON public.feature_requests FOR SELECT USING (true);


--
-- Name: feature_requests feature_requests_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_requests_update_admin ON public.feature_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: feature_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_votes feature_votes_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY feature_votes_self ON public.feature_votes USING ((auth.uid() = user_id));


--
-- Name: fair_play_events fpe_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fpe_read_admin ON public.fair_play_events USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: fair_play_events fpe_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fpe_read_self ON public.fair_play_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: friend_requests freq_delete_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freq_delete_parties ON public.friend_requests FOR DELETE USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: friend_requests freq_insert_sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freq_insert_sender ON public.friend_requests FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: friend_requests freq_select_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freq_select_parties ON public.friend_requests FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: friend_requests freq_update_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freq_update_parties ON public.friend_requests FOR UPDATE USING (((auth.uid() = receiver_id) OR (auth.uid() = sender_id)));


--
-- Name: friend_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

--
-- Name: friends friends_delete_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friends_delete_parties ON public.friends FOR DELETE USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));


--
-- Name: friends friends_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friends_insert_self ON public.friends FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: friends friends_select_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friends_select_parties ON public.friends FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));


--
-- Name: friends friends_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friends_update_self ON public.friends FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships friendships_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friendships_delete ON public.friendships FOR DELETE USING (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));


--
-- Name: friendships friendships_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friendships_insert ON public.friendships FOR INSERT WITH CHECK ((auth.uid() = requester_id));


--
-- Name: friendships friendships_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friendships_read ON public.friendships FOR SELECT USING (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));


--
-- Name: friendships friendships_update_addressee; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY friendships_update_addressee ON public.friendships FOR UPDATE USING ((auth.uid() = addressee_id)) WITH CHECK ((status = ANY (ARRAY['accepted'::text, 'rejected'::text])));


--
-- Name: gift_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_transactions gifts_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gifts_insert_self ON public.gift_transactions FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: gift_transactions gifts_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gifts_read_self ON public.gift_transactions FOR SELECT USING ((((auth.uid() = sender_id) OR (auth.uid() = receiver_id)) OR public.is_admin()));


--
-- Name: gift_transactions gt_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gt_admin ON public.gift_transactions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: gift_transactions gt_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gt_insert_self ON public.gift_transactions FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: gift_transactions gt_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gt_read_self ON public.gift_transactions FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: health_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: health_checks health_checks_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY health_checks_admin ON public.health_checks USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: community_idea_comments idea_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY idea_comments_insert ON public.community_idea_comments FOR INSERT WITH CHECK ((auth.uid() = author_id));


--
-- Name: community_idea_comments idea_comments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY idea_comments_read ON public.community_idea_comments FOR SELECT USING (true);


--
-- Name: community_idea_votes idea_votes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY idea_votes_insert ON public.community_idea_votes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: community_idea_votes idea_votes_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY idea_votes_read ON public.community_idea_votes FOR SELECT USING (true);


--
-- Name: community_ideas ideas_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ideas_admin ON public.community_ideas USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: community_ideas ideas_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ideas_insert_auth ON public.community_ideas FOR INSERT WITH CHECK ((auth.uid() = author_id));


--
-- Name: community_ideas ideas_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ideas_read_all ON public.community_ideas FOR SELECT USING (true);


--
-- Name: inapp_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inapp_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: inapp_notifications inapp_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inapp_self ON public.inapp_notifications USING ((auth.uid() = user_id));


--
-- Name: invitations inv_delete_sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_delete_sender ON public.invitations FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: invitations inv_insert_sender; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_insert_sender ON public.invitations FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: invitations inv_select_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_select_parties ON public.invitations FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


--
-- Name: invitations inv_update_receiver; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inv_update_receiver ON public.invitations FOR UPDATE USING (((auth.uid() = receiver_id) OR (auth.uid() = sender_id)));


--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_bans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_schedules maintenance_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_read ON public.maintenance_schedules FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text, 'moderator'::text]))))));


--
-- Name: maintenance_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_schedules maintenance_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_write ON public.maintenance_schedules TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: match_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results match_results_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_insert_self ON public.match_results FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: match_results match_results_manage_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_manage_staff ON public.match_results USING (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: match_results match_results_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_results_read_all ON public.match_results FOR SELECT USING (true);


--
-- Name: match_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: match_verifications match_verifications_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_verifications_admin ON public.match_verifications USING (public.is_admin());


--
-- Name: match_verifications match_verifications_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY match_verifications_read ON public.match_verifications FOR SELECT USING (true);


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: clan_members members_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_admin_all ON public.clan_members USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: clan_members members_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_delete_self ON public.clan_members FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: clan_members members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_insert ON public.clan_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: clan_members members_leader_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_leader_manage ON public.clan_members USING ((EXISTS ( SELECT 1
   FROM public.clans
  WHERE ((clans.id = clan_members.clan_id) AND (clans.leader_id = auth.uid())))));


--
-- Name: clan_members members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY members_select ON public.clan_members FOR SELECT USING (true);


--
-- Name: support_messages messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert ON public.support_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: support_messages messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND ((support_tickets.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))))));


--
-- Name: schema_migrations migrations_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY migrations_read_admin ON public.schema_migrations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

--
-- Name: missions missions_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY missions_admin_all ON public.missions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: missions missions_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY missions_read ON public.missions FOR SELECT USING (((is_active = true) OR public.is_admin()));


--
-- Name: missions missions_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY missions_read_active ON public.missions FOR SELECT USING ((is_active = true));


--
-- Name: moderation_reviews mod_reviews_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mod_reviews_admin ON public.moderation_reviews USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: moderation_reviews mod_reviews_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mod_reviews_select ON public.moderation_reviews USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: moderation_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.moderation_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: match_results mr_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_delete ON public.match_results FOR DELETE USING (public.is_admin());


--
-- Name: match_results mr_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_insert ON public.match_results FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: match_results mr_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_select ON public.match_results FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: match_results mr_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mr_update ON public.match_results FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: user_mutes mutes_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mutes_policy ON public.user_mutes USING (public.is_super_admin(auth.uid()));


--
-- Name: news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

--
-- Name: news news_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY news_admin_write ON public.news USING (public.is_admin());


--
-- Name: news news_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY news_delete ON public.news FOR DELETE USING (public.is_admin());


--
-- Name: news news_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY news_insert ON public.news FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: news news_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY news_select ON public.news FOR SELECT USING (true);


--
-- Name: news news_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY news_update ON public.news FOR UPDATE USING (public.is_admin());


--
-- Name: notifications notif_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_delete_self ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_events notif_events_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_events_admin ON public.notification_events USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: notifications notif_insert_any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_insert_any ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: notification_jobs notif_jobs_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_jobs_admin ON public.notification_jobs USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: user_notification_preferences notif_prefs_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_prefs_self ON public.user_notification_preferences USING ((auth.uid() = user_id));


--
-- Name: notification_recipients notif_recip_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_recip_admin ON public.notification_recipients USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: notifications notif_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_select_self ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_templates notif_tmpl_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_tmpl_admin ON public.notification_templates USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: notifications notif_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_update_self ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_admin ON public.notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: notifications notifications_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_self ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications notifications_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_staff ON public.notifications FOR INSERT WITH CHECK (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: notifications notifications_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_read ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_read_self ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications notifications_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_self ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: room_messages organizer_can_delete_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizer_can_delete_messages ON public.room_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.tournaments t
  WHERE ((t.id = room_messages.tournament_id) AND (t.created_by = auth.uid())))));


--
-- Name: user_achievements own_achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_achievements ON public.user_achievements USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_daily_claims own_claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_claims ON public.user_daily_claims USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_missions own_missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY own_missions ON public.user_missions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: performance_metrics perf_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perf_admin ON public.performance_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: performance_metrics perf_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perf_insert ON public.performance_metrics FOR INSERT WITH CHECK (true);


--
-- Name: performance_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: player_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: player_stats player_stats_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_stats_admin ON public.player_stats USING (public.is_admin());


--
-- Name: player_stats player_stats_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY player_stats_read ON public.player_stats FOR SELECT USING (true);


--
-- Name: user_presence presence_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presence_delete_self ON public.user_presence FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_presence presence_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presence_select_all ON public.user_presence FOR SELECT USING (true);


--
-- Name: user_presence presence_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presence_update_self ON public.user_presence FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_presence presence_upsert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presence_upsert_self ON public.user_presence FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_all ON public.profiles USING (public.is_admin());


--
-- Name: profiles profiles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (((auth.uid() = id) OR (auth.uid() IS NULL)));


--
-- Name: profiles profiles_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read_all ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: player_stats ps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_insert ON public.player_stats FOR INSERT WITH CHECK (true);


--
-- Name: player_stats ps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_select ON public.player_stats FOR SELECT USING (true);


--
-- Name: player_stats ps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ps_update ON public.player_stats FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: news public_content_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_content_read ON public.news FOR SELECT USING (((published = true) OR public.is_admin()));


--
-- Name: achievements public_read_achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_achievements ON public.achievements FOR SELECT USING (true);


--
-- Name: daily_rewards public_read_daily; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_daily ON public.daily_rewards FOR SELECT USING (true);


--
-- Name: missions public_read_missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_missions ON public.missions FOR SELECT USING (true);


--
-- Name: site_schedule public_read_schedule; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_schedule ON public.site_schedule FOR SELECT USING (true);


--
-- Name: rate_limit_violations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

--
-- Name: rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes ref_codes_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ref_codes_self ON public.referral_codes USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: referral_uses ref_uses_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ref_uses_self ON public.referral_uses FOR SELECT USING ((((auth.uid() = referrer_id) OR (auth.uid() = referred_id)) OR public.is_admin()));


--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_reminders reminders_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_self ON public.tournament_reminders USING ((auth.uid() = user_id));


--
-- Name: user_reputation_events rep_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rep_admin ON public.user_reputation_events USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: user_reputation_events rep_events_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rep_events_admin ON public.user_reputation_events USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: user_reputation_events rep_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rep_read_self ON public.user_reputation_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: report_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: report_actions report_actions_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_actions_insert_staff ON public.report_actions FOR INSERT WITH CHECK (((auth.uid() = actor_id) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: report_actions report_actions_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_actions_select_staff ON public.report_actions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: report_actions report_actions_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_actions_staff ON public.report_actions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_admin_update ON public.reports FOR UPDATE USING (public.is_admin());


--
-- Name: reports reports_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_insert_self ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: reports reports_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_policy ON public.reports USING (public.is_super_admin(auth.uid()));


--
-- Name: reports reports_read_self_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_read_self_or_admin ON public.reports FOR SELECT USING (((auth.uid() = reporter_id) OR public.is_admin()));


--
-- Name: rate_limit_violations rl_violations_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rl_violations_admin ON public.rate_limit_violations USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: room_members rm_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rm_delete ON public.room_members FOR DELETE USING (public.is_admin());


--
-- Name: room_members rm_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rm_insert ON public.room_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: room_members rm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rm_select ON public.room_members FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: room_members rm_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rm_update ON public.room_members FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: room_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

--
-- Name: room_members room_members_read_participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY room_members_read_participants ON public.room_members FOR SELECT USING (true);


--
-- Name: room_members room_members_staff_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY room_members_staff_write ON public.room_members USING (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: room_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: room_messages room_messages_insert_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY room_messages_insert_participant ON public.room_messages FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: room_messages room_messages_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY room_messages_read_all ON public.room_messages FOR SELECT USING (true);


--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_candidate_scores scores_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scores_staff ON public.admin_candidate_scores USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: season_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: season_pass_missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_pass_missions ENABLE ROW LEVEL SECURITY;

--
-- Name: season_pass_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_pass_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: season_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons seasons_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_admin_all ON public.seasons USING (public.is_admin());


--
-- Name: seasons seasons_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_read_all ON public.seasons FOR SELECT USING (true);


--
-- Name: seasons seasons_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY seasons_write_admin ON public.seasons USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: security_audit_log sec_audit_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sec_audit_admin ON public.security_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: security_audit_log sec_audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sec_audit_insert ON public.security_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: security_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions select_own_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_transactions ON public.wallet_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications service_insert_notifs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_insert_notifs ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: site_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: site_schedule site_schedule_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY site_schedule_admin_all ON public.site_schedule USING (public.is_admin());


--
-- Name: support_messages sm_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sm_insert ON public.support_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: support_messages sm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sm_select ON public.support_messages FOR SELECT USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND (support_tickets.user_id = auth.uid()))))));


--
-- Name: season_snapshots snapshots_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_read_self ON public.season_snapshots FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: season_snapshots snapshots_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_write_admin ON public.season_snapshots USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: season_pass_missions spm_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spm_read_all ON public.season_pass_missions FOR SELECT USING ((is_active = true));


--
-- Name: season_pass_missions spm_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spm_write_admin ON public.season_pass_missions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: season_pass_tiers spt_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spt_read_all ON public.season_pass_tiers FOR SELECT USING (true);


--
-- Name: season_pass_tiers spt_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY spt_write_admin ON public.season_pass_tiers USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: story_reactions sreact_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sreact_delete_self ON public.story_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: story_reactions sreact_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sreact_insert_self ON public.story_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: story_reactions sreact_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sreact_select_all ON public.story_reactions FOR SELECT USING (true);


--
-- Name: story_reactions sreact_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sreact_update_self ON public.story_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: support_tickets st_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY st_insert ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets st_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY st_select ON public.support_tickets FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: support_tickets st_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY st_update ON public.support_tickets FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: store_items store_designer_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_designer_write ON public.store_items USING (public.is_role(ARRAY['designer'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: store_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

--
-- Name: store_items store_items_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_items_admin_all ON public.store_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: store_items store_items_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_items_public_read ON public.store_items FOR SELECT TO authenticated USING (((active = true) AND (approved = true)));


--
-- Name: store_items store_items_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_items_read_active ON public.store_items FOR SELECT USING (((active = true) AND (approved = true)));


--
-- Name: store_items store_items_staff_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_items_staff_all ON public.store_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['designer'::text, 'admin'::text, 'super_admin'::text]))))));


--
-- Name: store_items store_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_read_active ON public.store_items FOR SELECT USING (((active = true) OR public.is_role(ARRAY['designer'::text, 'admin'::text, 'super_admin'::text])));


--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: stories stories_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_delete_self ON public.stories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: stories stories_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_insert_self ON public.stories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: stories stories_select_visible; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_select_visible ON public.stories FOR SELECT USING (((expires_at > now()) AND ((user_id = auth.uid()) OR (privacy = 'public'::text) OR ((privacy = 'friends'::text) AND (EXISTS ( SELECT 1
   FROM public.friends f
  WHERE ((f.user_id = stories.user_id) AND (f.friend_id = auth.uid()))))))));


--
-- Name: stories stories_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_update_self ON public.stories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: story_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: story_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

--
-- Name: system_config super admin config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "super admin config" ON public.system_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: email_campaigns super_admin_all_campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_campaigns ON public.email_campaigns TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: email_events super_admin_all_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_events ON public.email_events TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: email_campaign_recipients super_admin_all_recipients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_recipients ON public.email_campaign_recipients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: email_templates super_admin_all_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_templates ON public.email_templates TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: email_unsubscribes super_admin_all_unsubscribes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_unsubscribes ON public.email_unsubscribes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: admin_logs super_admin_insert_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_insert_logs ON public.admin_logs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: reports super_admin_manage_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_manage_reports ON public.reports TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: admin_logs super_admin_select_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_select_logs ON public.admin_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_messages support_messages_insert_ticket; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_messages_insert_ticket ON public.support_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_messages.ticket_id) AND ((t.user_id = auth.uid()) OR public.is_admin()))))));


--
-- Name: support_messages support_messages_read_ticket; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_messages_read_ticket ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_messages.ticket_id) AND ((t.user_id = auth.uid()) OR public.is_admin())))));


--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets support_tickets_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_admin_update ON public.support_tickets FOR UPDATE USING (public.is_admin());


--
-- Name: support_tickets support_tickets_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_insert_self ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets support_tickets_read_owner_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_read_owner_admin ON public.support_tickets FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: story_views sview_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sview_insert_self ON public.story_views FOR INSERT WITH CHECK ((auth.uid() = viewer_id));


--
-- Name: story_views sview_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sview_select ON public.story_views FOR SELECT USING (((auth.uid() = viewer_id) OR (EXISTS ( SELECT 1
   FROM public.stories s
  WHERE ((s.id = story_views.story_id) AND (s.user_id = auth.uid()))))));


--
-- Name: system_config sysconfig_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sysconfig_read_all ON public.system_config FOR SELECT USING (true);


--
-- Name: system_config sysconfig_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sysconfig_super_admin_write ON public.system_config USING (public.is_role(ARRAY['super_admin'::text]));


--
-- Name: system_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

--
-- Name: system_feature_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_feature_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings system_settings_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_settings_read ON public.system_settings FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text, 'admin'::text, 'moderator'::text]))))));


--
-- Name: system_settings system_settings_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_settings_write ON public.system_settings FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: tournaments t_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY t_delete ON public.tournaments FOR DELETE USING (public.is_admin());


--
-- Name: tournaments t_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY t_insert ON public.tournaments FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: tournaments t_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY t_select ON public.tournaments FOR SELECT USING (true);


--
-- Name: tournaments t_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY t_update ON public.tournaments FOR UPDATE USING (public.is_admin());


--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites team_invites_insert_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_invites_insert_captain ON public.team_invites FOR INSERT WITH CHECK ((auth.uid() = invited_by));


--
-- Name: team_invites team_invites_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_invites_read_self ON public.team_invites FOR SELECT USING ((((auth.uid() = invited_by) OR (auth.uid() = invited_user)) OR public.is_admin()));


--
-- Name: team_invites team_invites_update_invited; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_invites_update_invited ON public.team_invites FOR UPDATE USING (((auth.uid() = invited_user) OR public.is_admin()));


--
-- Name: team_join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_read ON public.team_members FOR SELECT USING (true);


--
-- Name: team_members team_members_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_staff ON public.team_members USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_members.team_id) AND (t.captain_id = auth.uid()))))));


--
-- Name: team_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: team_messages team_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_messages_insert ON public.team_messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid())))));


--
-- Name: team_messages team_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_messages_select ON public.team_messages FOR SELECT USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid()))));


--
-- Name: team_tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: team_tournaments team_tournaments_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_tournaments_read ON public.team_tournaments FOR SELECT USING (true);


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_delete ON public.teams FOR DELETE USING (((captain_id = auth.uid()) OR public.is_admin()));


--
-- Name: teams teams_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_insert ON public.teams FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: teams teams_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_insert_self ON public.teams FOR INSERT WITH CHECK ((auth.uid() = captain_id));


--
-- Name: teams teams_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_read_active ON public.teams FOR SELECT USING ((((status)::text = 'active'::text) OR public.is_admin()));


--
-- Name: teams teams_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_select ON public.teams FOR SELECT USING (((hidden = false) OR public.is_admin() OR (captain_id = auth.uid()) OR public.is_team_member(id)));


--
-- Name: teams teams_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_update ON public.teams FOR UPDATE USING (((captain_id = auth.uid()) OR public.is_admin()));


--
-- Name: teams teams_update_captain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teams_update_captain ON public.teams FOR UPDATE USING (((auth.uid() = captain_id) OR public.is_admin()));


--
-- Name: team_invites ti_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ti_insert ON public.team_invites FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: team_invites ti_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ti_select ON public.team_invites FOR SELECT USING (((invited_user = auth.uid()) OR (invited_by = auth.uid()) OR public.is_team_member(team_id) OR public.is_admin()));


--
-- Name: team_invites ti_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ti_update ON public.team_invites FOR UPDATE USING (((invited_user = auth.uid()) OR public.is_admin()));


--
-- Name: support_tickets tickets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets tickets_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_select_admin ON public.support_tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: support_tickets tickets_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_select_own ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets tickets_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_update_admin ON public.support_tickets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: team_join_requests tjr_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tjr_insert ON public.team_join_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: team_join_requests tjr_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tjr_select ON public.team_join_requests FOR SELECT USING (((user_id = auth.uid()) OR (team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['captain'::character varying, 'co_captain'::character varying])::text[])))))));


--
-- Name: team_join_requests tjr_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tjr_update ON public.team_join_requests FOR UPDATE USING ((team_id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND ((team_members.role)::text = ANY ((ARRAY['captain'::character varying, 'co_captain'::character varying])::text[]))))));


--
-- Name: team_messages tm_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tm_delete ON public.team_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: team_messages tm_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tm_insert ON public.team_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND public.check_team_membership(team_id, auth.uid())));


--
-- Name: team_messages tm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tm_select ON public.team_messages FOR SELECT USING (public.check_team_membership(team_id, auth.uid()));


--
-- Name: team_members tmbr_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tmbr_delete ON public.team_members FOR DELETE USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: team_members tmbr_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tmbr_insert ON public.team_members FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: team_members tmbr_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tmbr_select ON public.team_members FOR SELECT USING (true);


--
-- Name: team_members tmbr_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tmbr_update ON public.team_members FOR UPDATE USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: tournament_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments tournaments_manage_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournaments_manage_staff ON public.tournaments USING (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: tournaments tournaments_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tournaments_read_all ON public.tournaments FOR SELECT USING (true);


--
-- Name: tournament_participants tp_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tp_insert_self ON public.tournament_participants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tournament_participants tp_manage_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tp_manage_staff ON public.tournament_participants USING (public.is_role(ARRAY['founder'::text, 'fondateur'::text, 'admin'::text, 'super_admin'::text]));


--
-- Name: tournament_participants tp_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tp_read_all ON public.tournament_participants FOR SELECT USING (true);


--
-- Name: tournament_participants tpar_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpar_delete ON public.tournament_participants FOR DELETE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: tournament_participants tpar_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpar_insert ON public.tournament_participants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tournament_participants tpar_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpar_select ON public.tournament_participants FOR SELECT USING (true);


--
-- Name: tournament_participants tpar_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tpar_update ON public.tournament_participants FOR UPDATE USING (public.is_admin());


--
-- Name: user_daily_claims udc_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY udc_admin_all ON public.user_daily_claims USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: user_daily_claims udc_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY udc_read_self ON public.user_daily_claims FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_missions um_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY um_admin_all ON public.user_missions USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: user_missions um_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY um_self ON public.user_missions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_mission_progress ump_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ump_self ON public.user_mission_progress USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements user_achievements_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_achievements_read_self ON public.user_achievements FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: user_daily_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_daily_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: user_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

--
-- Name: user_items user_items_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_admin_all ON public.user_items USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: user_items user_items_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_own_insert ON public.user_items FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_items user_items_own_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_own_select ON public.user_items FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_items user_items_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_own_update ON public.user_items FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_items user_items_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_read_self ON public.user_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_items user_items_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_update_self ON public.user_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_items user_items_write_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_items_write_self ON public.user_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_mission_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_missions user_missions_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_missions_self ON public.user_missions USING ((auth.uid() = user_id));


--
-- Name: user_mutes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: email_unsubscribes user_own_unsubscribe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_own_unsubscribe ON public.email_unsubscribes FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: user_reputation_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_reputation_events ENABLE ROW LEVEL SECURITY;

--
-- Name: user_season_pass; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_season_pass ENABLE ROW LEVEL SECURITY;

--
-- Name: user_warnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: clan_applications users insert own app; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users insert own app" ON public.clan_applications FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: clan_applications users read own app; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own app" ON public.clan_applications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: clan_tests users read own test; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users read own test" ON public.clan_tests FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_items users_insert_own_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_items ON public.user_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reports users_insert_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_reports ON public.reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: notification_preferences users_manage_own_prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_manage_own_prefs ON public.notification_preferences USING ((user_id = auth.uid()));


--
-- Name: user_items users_see_own_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_see_own_items ON public.user_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications users_see_own_notifs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_see_own_notifs ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_items users_update_own_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_items ON public.user_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications users_update_own_notifs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_notifs ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: admin_messages users_view_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_messages ON public.admin_messages FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (is_global = true)));


--
-- Name: user_season_pass usp_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usp_read_admin ON public.user_season_pass FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- Name: user_season_pass usp_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usp_read_self ON public.user_season_pass FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: teams verified users create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "verified users create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (((captain_id = auth.uid()) AND ( SELECT ((profiles.verification_status = 'verified'::text) OR (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text, 'designer'::text])))
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: team_members verified users join teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "verified users join teams" ON public.team_members FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND ( SELECT ((profiles.verification_status = 'verified'::text) OR (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text, 'designer'::text])))
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: tournament_participants verified users join tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "verified users join tournaments" ON public.tournament_participants FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND ( SELECT ((profiles.verification_status = 'verified'::text) OR (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text, 'designer'::text])))
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions wallet_transactions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_transactions_insert ON public.wallet_transactions FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'fondateur'::text, 'super_admin'::text, 'founder'::text])))))));


--
-- Name: wallet_transactions wallet_tx_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_tx_admin_insert ON public.wallet_transactions FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: wallet_transactions wallet_tx_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_tx_read_self ON public.wallet_transactions FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets wallets_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_admin_write ON public.wallets USING (public.is_admin());


--
-- Name: wallets wallets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_insert ON public.wallets FOR INSERT WITH CHECK (true);


--
-- Name: wallets wallets_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_read_self ON public.wallets FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: wallets wallets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_select ON public.wallets FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: wallets wallets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallets_update ON public.wallets FOR UPDATE USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- Name: user_warnings warnings_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY warnings_admin ON public.user_warnings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'founder'::text, 'fondateur'::text]))))));


--
-- Name: user_warnings warnings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY warnings_select ON public.user_warnings FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))));


--
-- Name: wallet_transactions wt_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wt_insert ON public.wallet_transactions FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: wallet_transactions wt_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wt_select_own ON public.wallet_transactions FOR SELECT USING (((auth.uid() = user_id) OR public.is_admin()));


--
-- PostgreSQL database dump complete
--

\unrestrict gbqRswrUVfaUKctOTd3Y8nFosVPhELGvpizqAZrQPdYA2edskWip6i5mb01McSj

