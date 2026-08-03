-- ============================================================
-- Complemento de la migración anterior: get_ranking_semanal() quedó
-- afuera por error (el scope "semanal" del Ranking usa una 5ta RPC
-- separada de las otras 4 que sí se actualizaron).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_ranking_semanal(integer, integer);

CREATE FUNCTION public.get_ranking_semanal(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    p.equipped_tag_slug, p.equipped_frame_slug,
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) TO authenticated;
