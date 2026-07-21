-- ============================================================
-- LIGAS DE PRESTIGIO EN EL RANKING
--
-- Cada valor de profiles.prestige (0, 1, 2, 3...) pasa a ser una "liga"
-- separada dentro del ranking. Se agrega p_prestige a las 5 funciones de
-- ranking existentes — el RANK() ya se recalcula solo porque el WHERE
-- filtra antes de que la ventana numere posiciones, así que no hace
-- falta tocar la lógica de puntaje, solo agregar el filtro.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_ranking_global(int);
CREATE FUNCTION public.get_ranking_global(lim int DEFAULT 50, p_prestige int DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH beer_xp AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_achievements GROUP BY user_id
  ),
  badge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_badges GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  LEFT JOIN beer_xp  bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp   ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp bdx ON bdx.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global(int, int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_semanal(int);
CREATE FUNCTION public.get_ranking_semanal(lim int DEFAULT 50, p_prestige int DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH weekly AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, w.xp AS total_xp, w.beers AS total_beers,
    RANK() OVER (ORDER BY w.xp DESC)::bigint AS rank_pos
  FROM profiles p
  INNER JOIN weekly w ON w.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_semanal(int, int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos(int);
CREATE FUNCTION public.get_ranking_amigos(lim int DEFAULT 50, p_prestige int DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH my_circle AS (
    SELECT friend_id AS uid FROM friendships WHERE user_id = auth.uid()
    UNION ALL SELECT auth.uid() AS uid
  ),
  beer_xp AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE user_id IN (SELECT uid FROM my_circle)
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_achievements WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  ),
  badge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_badges WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  LEFT JOIN beer_xp  bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp   ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp bdx ON bdx.user_id = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos(int, int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global_beers(int);
CREATE FUNCTION public.get_ranking_global_beers(lim int DEFAULT 50, p_prestige int DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global_beers(int, int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos_beers(int);
CREATE FUNCTION public.get_ranking_amigos_beers(lim int DEFAULT 50, p_prestige int DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH my_circle AS (
    SELECT friend_id AS uid FROM friendships WHERE user_id = auth.uid()
    UNION ALL SELECT auth.uid() AS uid
  ),
  beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE user_id IN (SELECT uid FROM my_circle)
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int, int) TO authenticated;

-- Qué ligas existen realmente (para no ofrecer una liga vacía en el selector)
CREATE OR REPLACE FUNCTION public.get_active_prestige_leagues()
RETURNS TABLE(prestige int, user_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT prestige, COUNT(*)::bigint
  FROM profiles
  WHERE aparecer_en_ranking IS NOT FALSE
  GROUP BY prestige
  ORDER BY prestige;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_prestige_leagues() TO authenticated;
