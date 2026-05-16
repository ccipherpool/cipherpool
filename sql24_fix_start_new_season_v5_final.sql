-- ============================================================
-- FIX FINAL v5: start_new_season avec les vraies colonnes
-- player_stats: kills, deaths, wins, losses, rank, total_points
-- profiles: xp, experience, level
-- ============================================================

-- STEP 1: Supprimer TOUTES les versions existantes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT oid::regprocedure AS func_sig
        FROM pg_proc
        WHERE proname = 'start_new_season'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', r.func_sig;
    END LOOP;
END $$;

-- STEP 2: Créer la table season_audit_log si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.season_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    season_id   UUID,
    action      TEXT NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- STEP 3: Créer la fonction finale avec les 11 paramètres exacts du frontend
CREATE OR REPLACE FUNCTION public.start_new_season(
    p_name             TEXT,
    p_number           INTEGER DEFAULT NULL,
    p_description      TEXT    DEFAULT NULL,
    p_reset_coins      BOOLEAN DEFAULT FALSE,
    p_reset_xp         BOOLEAN DEFAULT FALSE,
    p_reset_stats      BOOLEAN DEFAULT FALSE,
    p_reset_wins       BOOLEAN DEFAULT FALSE,
    p_reset_avatars    BOOLEAN DEFAULT FALSE,
    p_reset_chat       BOOLEAN DEFAULT FALSE,
    p_reset_tournaments BOOLEAN DEFAULT FALSE,
    p_reset_clans      BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_season_id     UUID;
    v_old_season_id UUID;
    v_season_number INTEGER;
    v_result        JSONB;
BEGIN
    -- Fermer la saison active précédente
    UPDATE public.seasons
    SET status   = 'ended',
        ended_at = now()
    WHERE status = 'active'
    RETURNING id INTO v_old_season_id;

    -- Calculer le numéro de saison
    IF p_number IS NOT NULL THEN
        v_season_number := p_number;
    ELSE
        SELECT COALESCE(MAX(number), 0) + 1
        INTO v_season_number
        FROM public.seasons;
    END IF;

    -- Créer la nouvelle saison
    INSERT INTO public.seasons (
        name,
        number,
        description,
        status,
        started_at
    )
    VALUES (
        p_name,
        v_season_number,
        p_description,
        'active',
        now()
    )
    RETURNING id INTO v_season_id;

    -- Reset des coins (wallets)
    IF p_reset_coins THEN
        UPDATE public.wallets
        SET balance    = 0,
            updated_at = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Reset XP et levels
    IF p_reset_xp THEN
        UPDATE public.profiles
        SET xp         = 0,
            experience = 0,
            level      = 1,
            updated_at = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Reset des statistiques (player_stats)
    -- Colonnes réelles: kills, deaths, wins, losses, rank, total_points, kd_ratio, top3_finishes, total_earnings, best_position, mvp_count
    IF p_reset_stats THEN
        UPDATE public.player_stats
        SET kills          = 0,
            deaths         = 0,
            wins           = 0,
            losses         = 0,
            rank           = 0,
            total_points   = 0,
            kd_ratio       = 0,
            top3_finishes  = 0,
            total_earnings = 0,
            best_position  = NULL,
            mvp_count      = 0,
            updated_at     = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Reset des wins (player_stats)
    IF p_reset_wins THEN
        UPDATE public.player_stats
        SET wins       = 0,
            losses     = 0,
            updated_at = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Reset des avatars équipés
    IF p_reset_avatars THEN
        UPDATE public.profiles
        SET equipped_avatar     = NULL,
            equipped_banner     = NULL,
            equipped_badge      = NULL,
            equipped_frame      = NULL,
            equipped_name_color = NULL,
            updated_at          = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Archive des tournois actifs
    IF p_reset_tournaments THEN
        UPDATE public.tournaments
        SET status     = 'cancelled',
            updated_at = now()
        WHERE status IN ('open', 'in_progress', 'upcoming', 'active', 'published', 'live');
    END IF;

    -- Reset des stats de clans (colonnes réelles: wins)
    IF p_reset_clans THEN
        UPDATE public.clans
        SET wins       = 0,
            updated_at = now()
        WHERE id IS NOT NULL;
    END IF;

    -- Journaliser l'action
    INSERT INTO public.season_audit_log (season_id, action, details)
    VALUES (
        v_season_id,
        'season_started',
        jsonb_build_object(
            'season_name',    p_name,
            'season_number',  v_season_number,
            'previous_season', v_old_season_id,
            'resets', jsonb_build_object(
                'coins',       p_reset_coins,
                'xp',          p_reset_xp,
                'stats',       p_reset_stats,
                'wins',        p_reset_wins,
                'tournaments', p_reset_tournaments,
                'chat',        p_reset_chat,
                'avatars',     p_reset_avatars,
                'clans',       p_reset_clans
            )
        )
    );

    -- Retourner le résultat
    v_result := jsonb_build_object(
        'success',         true,
        'season_id',       v_season_id,
        'season_number',   v_season_number,
        'season_name',     p_name,
        'previous_season', v_old_season_id
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'start_new_season failed: % %', SQLERRM, SQLSTATE;
END;
$$;

-- STEP 4: Accorder les permissions
GRANT EXECUTE ON FUNCTION public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.start_new_season(text, integer, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) TO anon;

-- STEP 5: Vérifier le résultat final
SELECT proname, pronargs,
       pg_get_function_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'start_new_season'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
