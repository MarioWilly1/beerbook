-- ============================================================
-- Misiones de prestigio escalonadas: además del umbral de XP/nivel
-- que do_prestige() ya exige, cada transición de prestigio (tier =
-- prestigio al que se está ascendiendo, ej. tier 1 = pasar de
-- prestigio 0 a 1) exige cumplir requisitos de diversidad — evita que
-- alguien suba de prestigio solo tomando la misma cerveza una y otra
-- vez (que ahora da XP, aunque poco, vía beer_tastings).
--
-- El XP nunca se pierde: prestige_xp_baseline solo se resetea en un
-- ascenso EXITOSO (ya era así, sin cambios) — mientras la misión esté
-- incompleta, el XP sigue acumulando para cuando se complete.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Nueva métrica: suggestedApprovedCount (Tier 5). beers_new solo
-- contiene cervezas YA aprobadas en el catálogo, así que contar las
-- que tienen sugerida_por_user_id = usuario ya es exactamente
-- "sugerencias aprobadas" — no hace falta un estado separado.
-- Sin ventana de tiempo (igual que friendCount): es un logro de una
-- vez, no algo que tenga sentido acotar a un rango de fechas.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_metric_for_user(p_user_id uuid, p_metric text, p_since date, p_until date, p_scope text DEFAULT 'discovery'::text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_result int;
BEGIN
  IF p_scope NOT IN ('discovery', 'activity') THEN
    RAISE EXCEPTION 'Scope desconocido: %', p_scope;
  END IF;

  IF p_metric = 'friendCount' THEN
    SELECT count(*) INTO v_result
    FROM public.friendships
    WHERE user_id = p_user_id
      AND created_at::date BETWEEN p_since AND p_until;
    RETURN coalesce(v_result, 0);
  END IF;

  IF p_metric = 'suggestedApprovedCount' THEN
    SELECT count(*) INTO v_result
    FROM public.beers_new
    WHERE sugerida_por_user_id = p_user_id;
    RETURN coalesce(v_result, 0);
  END IF;

  IF p_scope = 'activity' THEN
    SELECT
      CASE p_metric
        WHEN 'totalBeers'          THEN count(*)
        WHEN 'verifiedBeers'       THEN count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
        WHEN 'beersWithComments'   THEN count(*) FILTER (WHERE ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0)
        WHEN 'verifiedWithRatings' THEN count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0
                                                             AND ub."Rating" IS NOT NULL AND ub."Rating" > 0)
        WHEN 'completeEntries'     THEN count(*) FILTER (WHERE ub."Rating" IS NOT NULL AND ub."Rating" > 0
                                                             AND ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0
                                                             AND ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
        WHEN 'beersWithLocation'   THEN count(*) FILTER (WHERE ub.location_lat IS NOT NULL)
        ELSE NULL
      END
    INTO v_result
    FROM public.user_beers ub
    JOIN public.activity_log al ON al.user_id = ub.user_id AND al.beer_id = ub.beer_id
    WHERE ub.user_id = p_user_id
      AND al.created_at::date BETWEEN p_since AND p_until;

    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Métrica desconocida o no disponible en scope activity: %', p_metric;
    END IF;

    RETURN v_result;
  END IF;

  -- p_scope = 'discovery' — comportamiento original, sin cambios.
  SELECT
    CASE p_metric
      WHEN 'totalBeers'                THEN count(*)
      WHEN 'verifiedBeers'             THEN count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
      WHEN 'beersWithComments'         THEN count(*) FILTER (WHERE ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0)
      WHEN 'completeEntries'           THEN count(*) FILTER (WHERE ub."Rating" IS NOT NULL AND ub."Rating" > 0
                                                                 AND ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0
                                                                 AND ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
      WHEN 'verifiedWithRatings'       THEN count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0
                                                                 AND ub."Rating" IS NOT NULL AND ub."Rating" > 0)
      WHEN 'verifiedDistinctCountries' THEN count(DISTINCT bn.pais)   FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
      WHEN 'verifiedDistinctStyles'    THEN count(DISTINCT bn.estilo) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
      WHEN 'beersWithLocation'         THEN count(*) FILTER (WHERE ub.location_lat IS NOT NULL)
      WHEN 'coleccionCount'            THEN count(*) FILTER (WHERE bn.rareza IN ('rara', 'epica', 'legendaria', 'mitica') OR bn.es_edicion_especial IS TRUE)
      WHEN 'coleccionEpica'            THEN count(*) FILTER (WHERE bn.rareza = 'epica')
      WHEN 'coleccionLegendaria'       THEN count(*) FILTER (WHERE bn.rareza = 'legendaria')
      WHEN 'coleccionMitica'           THEN count(*) FILTER (WHERE bn.rareza = 'mitica')
      WHEN 'coleccionEdicionEspecial'  THEN count(*) FILTER (WHERE bn.es_edicion_especial IS TRUE)
      WHEN 'totalXP'                   THEN coalesce(sum(ub."XP"), 0)::int
      ELSE NULL
    END
  INTO v_result
  FROM public.user_beers ub
  JOIN public.beers_new bn ON bn.id = ub.beer_id
  WHERE ub.user_id = p_user_id
    AND ub.created_at::date BETWEEN p_since AND p_until;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Métrica desconocida: %', p_metric;
  END IF;

  RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. Catálogo de misiones por tier. tier = prestigio de destino
-- (tier 1 gatea 0→1, tier 2 gatea 1→2, etc). Requisitos verbatim del
-- usuario, con p_scope='discovery' y ventana amplia (todo el
-- historial de la cuenta) al evaluarlos en do_prestige().
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.prestige_missions (
  tier         smallint NOT NULL CHECK (tier BETWEEN 1 AND 5),
  metric       text NOT NULL,
  min_required int NOT NULL CHECK (min_required > 0),
  PRIMARY KEY (tier, metric)
);

ALTER TABLE public.prestige_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prestige_missions_read" ON public.prestige_missions
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.prestige_missions (tier, metric, min_required) VALUES
  (1, 'verifiedDistinctStyles', 5),
  (2, 'verifiedDistinctStyles', 8),
  (2, 'verifiedDistinctCountries', 5),
  (3, 'verifiedDistinctStyles', 12),
  (3, 'coleccionCount', 3),
  (4, 'verifiedDistinctCountries', 10),
  (4, 'friendCount', 3),
  (5, 'verifiedDistinctStyles', 15),
  (5, 'verifiedDistinctCountries', 15),
  (5, 'coleccionCount', 5),
  (5, 'friendCount', 5),
  (5, 'suggestedApprovedCount', 1);

-- ────────────────────────────────────────────────────────────
-- 3. do_prestige(): mismo umbral de XP/nivel de siempre, MÁS el gate
-- de misiones del tier de destino (si existe uno definido — tiers sin
-- misión configurada quedan solo con el gate de XP/nivel, como hasta
-- ahora). prestige_xp_baseline sigue sin tocarse hasta un ascenso
-- realmente exitoso, así que el XP ganado con misión incompleta no se
-- pierde.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.do_prestige()
RETURNS TABLE(new_prestige integer, new_baseline bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me          uuid := auth.uid();
  v_total_xp  bigint;
  v_baseline  bigint;
  v_prestige  int;
  v_level     int;
  v_threshold int;
  v_target    int;
  req         record;
  v_current   int;
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

  v_target := COALESCE(v_prestige, 0) + 1;

  FOR req IN SELECT metric, min_required FROM public.prestige_missions WHERE tier = v_target LOOP
    v_current := public.compute_metric_for_user(me, req.metric, '1900-01-01', current_date, 'discovery');
    IF v_current < req.min_required THEN
      RAISE EXCEPTION 'Todavía no completaste la misión de prestigio %: % (tenés %, necesitás %)',
        v_target, req.metric, v_current, req.min_required;
    END IF;
  END LOOP;

  UPDATE profiles
  SET prestige = prestige + 1,
      prestige_xp_baseline = v_total_xp
  WHERE id = me
  RETURNING prestige, prestige_xp_baseline INTO new_prestige, new_baseline;

  RETURN NEXT;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Lectura de progreso: para mostrar en el modal de prestigio qué
-- misión falta antes de intentar el ascenso. Alcance: solo el propio
-- usuario (no se expone el detalle de misiones de otra cuenta).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_prestige_mission_progress(p_user_id uuid)
RETURNS TABLE (
  tier          smallint,
  metric        text,
  min_required  int,
  current_value int,
  met           boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT COALESCE(prestige, 0) + 1 INTO v_target FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY
  SELECT pm.tier, pm.metric, pm.min_required,
    public.compute_metric_for_user(p_user_id, pm.metric, '1900-01-01', current_date, 'discovery') AS current_value,
    public.compute_metric_for_user(p_user_id, pm.metric, '1900-01-01', current_date, 'discovery') >= pm.min_required AS met
  FROM public.prestige_missions pm
  WHERE pm.tier = v_target
  ORDER BY pm.metric;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_prestige_mission_progress(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_prestige_mission_progress(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_prestige_mission_progress(uuid) TO authenticated;
