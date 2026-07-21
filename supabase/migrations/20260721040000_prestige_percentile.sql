-- ============================================================
-- Modal de "vista de cerca" del Prestigio: porcentaje de la comunidad
-- que alcanzó esa liga o una superior.
--
-- Adaptado al sistema de 7 ligas (get_active_prestige_leagues):
-- cada liga N (0-6) es "prestige = N", donde la liga 6 es abierta
-- (agrupa 6, 7, 8... — ver 20260719020000_ranking_leagues_seven.sql).
-- Por eso "esta liga o superior" es simplemente prestige >= p_prestige,
-- sin necesidad de tratar la liga 6 como caso especial: ya es la que
-- queda más arriba de cualquier valor real.
--
-- Mismo criterio de visibilidad que el resto del ranking:
-- aparecer_en_ranking IS NOT FALSE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_prestige_percentile(p_prestige int)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN total.n = 0 THEN 0
    ELSE ROUND(100.0 * ge.n / total.n, 1)
  END
  FROM
    (SELECT COUNT(*) AS n FROM profiles WHERE aparecer_en_ranking IS NOT FALSE) total,
    (SELECT COUNT(*) AS n FROM profiles WHERE aparecer_en_ranking IS NOT FALSE AND prestige >= p_prestige) ge;
$$;

GRANT EXECUTE ON FUNCTION public.get_prestige_percentile(int) TO authenticated;
