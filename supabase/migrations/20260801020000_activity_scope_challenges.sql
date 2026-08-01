-- ============================================================
-- Retos de "actividad" además de los de "descubrimiento".
--
-- Problema: compute_metric_for_user() filtraba TODAS las métricas de
-- cerveza por user_beers.created_at, que se fija una sola vez al
-- registrar la cerveza por primera vez. Con un catálogo finito (147
-- cervezas), un usuario avanzado se queda sin cervezas "nuevas" para
-- completar retos fáciles — nunca puede volver a contar como progreso
-- el simple hecho de agregar un comentario/foto/puntuación a una
-- cerveza que ya tenía.
--
-- activity_log (ver 20260703200000_social_system.sql) ya resuelve
-- esto: PK compuesta (user_id, beer_id), logActivity() hace upsert en
-- CADA guardado (alta o edición) y pisa created_at = ahora. O sea que
-- activity_log.created_at ya es "la última vez que tocaste esta
-- cerveza", sin importar si era nueva o vieja.
--
-- Se agrega un parámetro de scope a compute_metric_for_user(): con
-- 'discovery' (default) el comportamiento es idéntico al de antes; con
-- 'activity' se une con activity_log y se filtra por su created_at en
-- vez del de user_beers, manteniendo exactamente la misma lógica por
-- métrica (solo cambia qué ventana de tiempo decide si cuenta).
--
-- Solo 6 métricas están disponibles en scope 'activity' (las que
-- describen "qué le hiciste a una entrada", da igual si es vieja o
-- nueva): totalBeers, verifiedBeers, beersWithComments,
-- verifiedWithRatings, completeEntries, beersWithLocation. Quedan
-- afuera las de colección/países/estilos distintos/XP/amigos — esas
-- son inherentemente sobre el conjunto de cervezas que ya conocés
-- (re-tocar una rara que ya tenías no "descubre" nada), tiene sentido
-- que sigan siendo de descubrimiento.
-- ============================================================

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS metric_scope text NOT NULL DEFAULT 'discovery';

ALTER TABLE public.weekly_challenges
  DROP CONSTRAINT IF EXISTS weekly_challenges_metric_scope_check,
  ADD CONSTRAINT weekly_challenges_metric_scope_check
    CHECK (metric_scope IN ('discovery', 'activity'));

-- CREATE OR REPLACE con una lista de parámetros distinta NO reemplaza
-- la función existente, crea un overload nuevo — quedarían las dos
-- versiones (4 y 5 args) y una llamada con 4 args se vuelve ambigua.
-- Hay que dropear la firma vieja explícitamente primero.
DROP FUNCTION IF EXISTS public.compute_metric_for_user(uuid, text, date, date);

CREATE FUNCTION public.compute_metric_for_user(
  p_user_id uuid, p_metric text, p_since date, p_until date, p_scope text DEFAULT 'discovery'
)
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
      WHEN 'verifiedWithRatings'       THEN count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0
                                                                 AND ub."Rating" IS NOT NULL AND ub."Rating" > 0)
      WHEN 'completeEntries'           THEN count(*) FILTER (WHERE ub."Rating" IS NOT NULL AND ub."Rating" > 0
                                                                 AND ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0
                                                                 AND ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0)
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

-- get_weekly_challenge_progress(): pasar el scope de cada reto a
-- compute_metric_for_user(). Mismas columnas de salida que antes —
-- CREATE OR REPLACE alcanza, no hace falta DROP FUNCTION.
CREATE OR REPLACE FUNCTION public.get_weekly_challenge_progress()
RETURNS TABLE (
  challenge_id  uuid,
  duration_type text,
  nombre        text,
  descripcion   text,
  metric        text,
  threshold     int,
  xp_bonus      int,
  fecha_inicio  date,
  fecha_fin     date,
  progress      int,
  completed     boolean
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge public.weekly_challenges%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  FOR v_challenge IN
    SELECT wc.* FROM public.weekly_challenges wc
    WHERE (now() AT TIME ZONE 'utc')::date BETWEEN wc.fecha_inicio AND wc.fecha_fin
    ORDER BY wc.duration_type
  LOOP
    challenge_id  := v_challenge.id;
    duration_type := v_challenge.duration_type;
    nombre        := v_challenge.nombre;
    descripcion   := v_challenge.descripcion;
    metric        := v_challenge.metric;
    threshold     := v_challenge.threshold;
    xp_bonus      := v_challenge.xp_bonus;
    fecha_inicio  := v_challenge.fecha_inicio;
    fecha_fin     := v_challenge.fecha_fin;
    progress      := LEAST(
      public.compute_metric_for_user(auth.uid(), v_challenge.metric, v_challenge.fecha_inicio, v_challenge.fecha_fin, v_challenge.metric_scope),
      v_challenge.threshold
    );
    completed     := EXISTS (
      SELECT 1 FROM public.user_challenge_completions ucc
      WHERE ucc.user_id = auth.uid() AND ucc.challenge_id = v_challenge.id
    );
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;
