-- ============================================================
-- Fase 3 del sistema de Chapas/cosméticos: exponer equipped_tag_slug
-- y equipped_frame_slug en las RPCs de Feed y Ranking (Perfil y
-- sidebar ya leen profiles directo, no necesitan cambios). Cambia el
-- RETURNS TABLE de las 5 funciones — DROP explícito antes de recrear
-- (CREATE OR REPLACE no permite cambiar el tipo de retorno).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_friend_feed(integer);

CREATE FUNCTION public.get_friend_feed(lim integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  beer_id bigint, beer_nombre text, beer_foto_url text, action text,
  rating numeric, comment text, user_photo_url text,
  location_name text, location_public boolean, place_id uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    al.user_id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    al.beer_id, bn.nombre AS beer_nombre, bn.foto_url AS beer_foto_url,
    al.action, ub."Rating" AS rating, ub.comment, ub.user_photo_url,
    ub.location_name, ub.location_public, ub.place_id,
    al.created_at
  FROM activity_log al
  JOIN profiles   p  ON p.id       = al.user_id
  JOIN beers_new  bn ON bn.id      = al.beer_id
  JOIN user_beers ub ON ub.user_id = al.user_id AND ub.beer_id = al.beer_id
  WHERE al.user_id IN (SELECT friend_id FROM friendships WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM entry_hidden_from
      WHERE owner_id = al.user_id AND beer_id = al.beer_id AND hidden_user_id = auth.uid()
    )
  ORDER BY al.created_at DESC LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_friend_feed(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friend_feed(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_friend_feed(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos(integer, integer);

CREATE FUNCTION public.get_ranking_amigos(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    p.equipped_tag_slug, p.equipped_frame_slug,
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos_beers(integer, integer);

CREATE FUNCTION public.get_ranking_amigos_beers(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global(integer, integer);

CREATE FUNCTION public.get_ranking_global(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    p.equipped_tag_slug, p.equipped_frame_slug,
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global_beers(integer, integer);

CREATE FUNCTION public.get_ranking_global_beers(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) TO authenticated;
