-- ============================================================
-- Umbral de Prestigio escalonado: cada Prestigio siguiente pide más
-- nivel que el anterior, en vez de repetir siempre el mismo umbral.
--
-- factor(prestigio_actual) = 1 + 0.2 * MIN(prestigio_actual, 5)
-- umbral_nivel = ROUND(umbral_base_del_catálogo * factor)
--
-- Con el catálogo actual (147 cervezas → umbral_base = nivel 10):
--   prestige 0→1: factor 1.0 → nivel 10
--   prestige 1→2: factor 1.2 → nivel 12
--   prestige 2→3: factor 1.4 → nivel 14
--   prestige 3→4: factor 1.6 → nivel 16
--   prestige 4→5: factor 1.8 → nivel 18
--   prestige 5→6 (y 6→7, 7→8...): factor 2.0 → nivel 20
--
-- El factor se congela en 2.0 a partir de prestige_actual=5, igual que
-- el sistema de ligas ya trata el prestige 6 como el tramo terminal que
-- se repite (ver 20260719020000_ranking_leagues_seven.sql) — no tiene
-- sentido seguir subiendo el umbral indefinidamente para el 7°, 8°...
-- Prestigio, cuando ya no hay una tier visual nueva que mostrar.
--
-- Nivel 20 (tope del factor) está deliberadamente al límite del XP
-- total alcanzable completando el 100% del catálogo actual (~20.650 XP
-- máximo teórico vs. 22.240 XP que pide nivel 20) — el Prestigio más
-- alto debe ser casi-inalcanzable salvo para quien completó
-- prácticamente todo. Si el catálogo crece, este techo sube solo (el
-- umbral base ya se recalcula por tamaño de beers_new).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_prestige_threshold(p_current_prestige int DEFAULT 0)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT ROUND(
    public.level_for_xp(floor((SELECT COUNT(*) FROM beers_new) * 55 * 0.85)::bigint)
    * (1 + 0.2 * LEAST(GREATEST(p_current_prestige, 0), 5))
  )::int;
$$;
GRANT EXECUTE ON FUNCTION public.get_prestige_threshold(int) TO anon, authenticated;

-- do_prestige(): valida contra el umbral correspondiente al prestige
-- ACTUAL del usuario (antes de incrementar), no siempre el mismo fijo.
CREATE OR REPLACE FUNCTION public.do_prestige()
RETURNS TABLE(new_prestige int, new_baseline bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me          uuid := auth.uid();
  v_total_xp  bigint;
  v_baseline  bigint;
  v_prestige  int;
  v_level     int;
  v_threshold int;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT
    COALESCE((SELECT SUM("XP")         FROM user_beers        WHERE user_id = me), 0) +
    COALESCE((SELECT SUM(xp_awarded)   FROM user_achievements WHERE user_id = me), 0) +
    COALESCE((SELECT SUM(xp_awarded)   FROM user_badges       WHERE user_id = me), 0)
  INTO v_total_xp;

  SELECT prestige, prestige_xp_baseline INTO v_prestige, v_baseline FROM profiles WHERE id = me;
  v_level     := public.level_for_xp(v_total_xp - COALESCE(v_baseline, 0));
  v_threshold := public.get_prestige_threshold(COALESCE(v_prestige, 0));

  IF v_level < v_threshold THEN
    RAISE EXCEPTION 'Todavía no llegaste al nivel % (estás en nivel %)', v_threshold, v_level;
  END IF;

  UPDATE profiles
  SET prestige = prestige + 1,
      prestige_xp_baseline = v_total_xp
  WHERE id = me
  RETURNING prestige, prestige_xp_baseline INTO new_prestige, new_baseline;

  RETURN NEXT;
END;
$$;
