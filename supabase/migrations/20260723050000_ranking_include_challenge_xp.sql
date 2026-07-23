-- ============================================================
-- Las funciones de ranking basadas en XP (get_ranking_global,
-- get_ranking_semanal, get_ranking_amigos) sumaban beer_xp + ach_xp +
-- badge_xp pero no el XP de user_challenge_completions (retos
-- semanales, 20260723040000_weekly_challenges.sql) — completar un
-- reto subía el nivel en Dashboard/Perfil pero no movía la posición
-- en el ranking.
--
-- get_ranking_global_beers y get_ranking_amigos_beers NO se tocan:
-- pese a nombrar la columna "total_xp", en realidad rankean por
-- cantidad de cervezas registradas (bc.beers AS total_xp), no por
-- XP de ningún tipo — no siguen el patrón beer_xp+ach_xp+badge_xp que
-- sí siguen las otras tres, así que sumarles challenge_xp mezclaría
-- dos magnitudes distintas en la misma columna.
--
-- get_ranking_semanal es "esta semana": el XP de retos solo cuenta si
-- se completó en los últimos 7 días (mismo criterio que ya usa esa
-- función para el XP de cervezas), no el histórico completo. Como
-- antes solo mostraba usuarios con AL MENOS una cerveza esta semana
-- (INNER JOIN), alguien que completó un reto pero no cargó cervezas
-- nuevas no aparecía — se reemplaza por un LEFT JOIN sobre la unión
-- de "activo por cerveza esta semana" y "activo por reto esta semana".
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_ranking_global(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige integer, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql
SECURITY DEFINER
AS $function$
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
  ),
  challenge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_challenge_completions GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  LEFT JOIN beer_xp      bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp       ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp     bdx ON bdx.user_id = p.id
  LEFT JOIN challenge_xp cx  ON cx.user_id  = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$function$;

CREATE OR REPLACE FUNCTION public.get_ranking_amigos(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige integer, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql
SECURITY DEFINER
AS $function$
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
  ),
  challenge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_challenge_completions WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  LEFT JOIN beer_xp      bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp       ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp     bdx ON bdx.user_id = p.id
  LEFT JOIN challenge_xp cx  ON cx.user_id  = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$function$;

CREATE OR REPLACE FUNCTION public.get_ranking_semanal(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige integer, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  WITH weekly_beer AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  weekly_challenge AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_challenge_completions
    WHERE completed_at >= now() - interval '7 days'
    GROUP BY user_id
  ),
  active_this_week AS (
    SELECT user_id FROM weekly_beer
    UNION
    SELECT user_id FROM weekly_challenge
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(wb.xp, 0) + COALESCE(wc.xp, 0)) AS total_xp,
    COALESCE(wb.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(wb.xp, 0) + COALESCE(wc.xp, 0)) DESC)::bigint AS rank_pos
  FROM profiles p
  JOIN active_this_week aw ON aw.user_id = p.id
  LEFT JOIN weekly_beer      wb ON wb.user_id = p.id
  LEFT JOIN weekly_challenge wc ON wc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$function$;
