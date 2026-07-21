-- ============================================================
-- get_active_prestige_leagues() ahora muestra siempre las 4 ligas
-- "conceptuales" (0..3 — Base, Prestigio 1, 2, y 3 que es el tier tope
-- reutilizado por utils/prestigeTiers.js para cualquier prestigio >= 3),
-- aunque todavía no tengan usuarios reales, para mostrar hacia dónde se
-- puede llegar. Si alguien ya superó ese tope conceptual (prestige > 3),
-- su liga real también se agrega — no se oculta a nadie que ya llegó ahí.
--
-- Si el arte de prestigeTiers.js llegara a sumar más tiers distintos en
-- el futuro, el "3" de acá y el "prestige >= 3" de ese archivo deben
-- actualizarse juntos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_prestige_leagues()
RETURNS TABLE(prestige int, user_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT all_leagues.prestige, COALESCE(counts.user_count, 0)::bigint AS user_count
  FROM (
    SELECT generate_series(0, 3) AS prestige
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
