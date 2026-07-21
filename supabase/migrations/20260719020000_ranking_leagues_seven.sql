-- ============================================================
-- get_active_prestige_leagues() pasa de 4 ligas conceptuales (0-3, con
-- tramos agrupados) a 7 ligas conceptuales (0-6): Liga Base + una liga
-- por cada una de las 6 copas reales, sin reutilización hasta Prestigio 6
-- (que es la única que se repite, para 6, 7, 8...). Coincide 1 a 1 con el
-- mapeo de utils/prestigeTiers.js — si ese archivo cambia el punto de
-- reutilización, este "6" debe actualizarse junto con él.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_prestige_leagues()
RETURNS TABLE(prestige int, user_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT all_leagues.prestige, COALESCE(counts.user_count, 0)::bigint AS user_count
  FROM (
    SELECT generate_series(0, 6) AS prestige
    UNION
    SELECT DISTINCT prestige FROM profiles WHERE aparecer_en_ranking IS NOT FALSE
  ) all_leagues
  LEFT JOIN (
    SELECT prestige, COUNT(*) AS user_count
    FROM profiles
    WHERE aparecer_en_ranking IS NOT FALSE
    GROUP BY prestige
  ) counts ON counts.prestige = all_leagues.prestige
  ORDER BY all_leagues.prestige;
$$;
