-- ============================================================
-- Revalidación server-side de la CONDICIÓN REAL de los logros
-- estáticos (Fase 1: 43 de 48 — todo excepto Racha).
--
-- validate_user_achievement() (20260721000000_lock_gamification_tables.sql)
-- solo confirmaba que el slug exista en achievement_catalog y que
-- xp_awarded sea el correcto — nunca que la condición (ej. "6
-- cervezas verificadas") se haya cumplido de verdad. Un usuario podía
-- insertar { slug: 'seis-pack', xp_awarded: 20 } sin tener ninguna
-- cerveza verificada.
--
-- Los 48 logros de src/utils/achievements.js son, sin excepción,
-- "métrica >= umbral" sobre solo 16 métricas distintas — por eso en
-- vez de 48 bloques de validación a mano se extiende
-- achievement_catalog con metric/threshold y el trigger calcula esas
-- 16 métricas en una sola pasada (un scan de user_beers+beers_new del
-- usuario) y despacha por nombre de métrica.
--
-- Racha (primer-habito, constante, ritmo-constante, leyenda-activa,
-- obsesionado) queda FUERA a propósito: profiles.current_streak se
-- actualiza hoy con un UPDATE directo del cliente (updateStreak() en
-- src/utils/streak.js), sin protección de trigger — validar contra
-- esa columna sería cosmético hasta blindar esa escritura (Fase 2).
-- Sus filas quedan con metric/threshold en NULL; el trigger las sigue
-- validando solo por slug/xp, como hasta ahora.
--
-- Series ("serie-%") no se tocan: esa rama ya recalcula la condición
-- real (todas las cervezas de la familia en user_beers), no solo
-- slug/xp — se confirmó al auditar esta fase.
-- ============================================================

ALTER TABLE public.achievement_catalog
  ADD COLUMN IF NOT EXISTS metric    text,
  ADD COLUMN IF NOT EXISTS threshold int;

ALTER TABLE public.achievement_catalog
  DROP CONSTRAINT IF EXISTS achievement_catalog_metric_threshold_pair,
  ADD CONSTRAINT achievement_catalog_metric_threshold_pair
    CHECK ((metric IS NULL) = (threshold IS NULL));

ALTER TABLE public.achievement_catalog
  DROP CONSTRAINT IF EXISTS achievement_catalog_threshold_positive,
  ADD CONSTRAINT achievement_catalog_threshold_positive
    CHECK (threshold IS NULL OR threshold > 0);

-- ── Degustación ──────────────────────────────────────────────────
UPDATE public.achievement_catalog SET metric = 'totalBeers', threshold = 1  WHERE slug = 'primera-ronda';
UPDATE public.achievement_catalog SET metric = 'totalBeers', threshold = 10 WHERE slug = 'primera-decena';
UPDATE public.achievement_catalog SET metric = 'totalBeers', threshold = 50 WHERE slug = 'bebedor-aplicado';

UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 6   WHERE slug = 'seis-pack';
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 24  WHERE slug = 'caja-completa';
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 50  WHERE slug = 'barril';
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 100 WHERE slug = 'coleccionista';
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 200 WHERE slug = 'maestro-catador';

-- Escritura
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 1  WHERE slug = 'fotografo';
UPDATE public.achievement_catalog SET metric = 'verifiedBeers', threshold = 30 WHERE slug = 'fotografo-master';

UPDATE public.achievement_catalog SET metric = 'beersWithComments', threshold = 1  WHERE slug = 'cronista';
UPDATE public.achievement_catalog SET metric = 'beersWithComments', threshold = 20 WHERE slug = 'cronista-mayor';

UPDATE public.achievement_catalog SET metric = 'verifiedWithRatings', threshold = 10 WHERE slug = 'critico';
UPDATE public.achievement_catalog SET metric = 'verifiedWithRatings', threshold = 25 WHERE slug = 'maestro-critico';

UPDATE public.achievement_catalog SET metric = 'completeEntries', threshold = 5  WHERE slug = 'perfeccionista';
UPDATE public.achievement_catalog SET metric = 'completeEntries', threshold = 20 WHERE slug = 'entradas-de-oro';

-- Geografía
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctCountries', threshold = 1  WHERE slug = 'primer-viaje';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctCountries', threshold = 5  WHERE slug = 'viajero';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctCountries', threshold = 10 WHERE slug = 'ciudadano-del-mundo';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctCountries', threshold = 15 WHERE slug = 'embajador';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctCountries', threshold = 20 WHERE slug = 'atlas-cervecero';

-- Estilos
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctStyles', threshold = 3  WHERE slug = 'estudiante-cervecero';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctStyles', threshold = 5  WHERE slug = 'explorador-de-estilos';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctStyles', threshold = 10 WHERE slug = 'polyglota-cervecero';
UPDATE public.achievement_catalog SET metric = 'verifiedDistinctStyles', threshold = 15 WHERE slug = 'maestro-de-estilos';

-- Cervecerías / locales
UPDATE public.achievement_catalog SET metric = 'beersWithLocation', threshold = 1  WHERE slug = 'nomada';
UPDATE public.achievement_catalog SET metric = 'beersWithLocation', threshold = 5  WHERE slug = 'bar-hopper';
UPDATE public.achievement_catalog SET metric = 'beersWithLocation', threshold = 10 WHERE slug = 'explorador-local';

-- Coleccionismo
UPDATE public.achievement_catalog SET metric = 'coleccionCount', threshold = 1  WHERE slug = 'primer-tesoro';
UPDATE public.achievement_catalog SET metric = 'coleccionCount', threshold = 5  WHERE slug = 'vitrina-inicial';
UPDATE public.achievement_catalog SET metric = 'coleccionCount', threshold = 10 WHERE slug = 'bodega-propia';
UPDATE public.achievement_catalog SET metric = 'coleccionCount', threshold = 25 WHERE slug = 'coleccion-selecta';

UPDATE public.achievement_catalog SET metric = 'coleccionEpica',           threshold = 1 WHERE slug = 'primer-epica';
UPDATE public.achievement_catalog SET metric = 'coleccionLegendaria',      threshold = 1 WHERE slug = 'primer-legendaria';
UPDATE public.achievement_catalog SET metric = 'coleccionMitica',          threshold = 1 WHERE slug = 'primer-mitica';
UPDATE public.achievement_catalog SET metric = 'coleccionEdicionEspecial', threshold = 1 WHERE slug = 'edicion-especial';

-- XP
UPDATE public.achievement_catalog SET metric = 'totalXP', threshold = 100  WHERE slug = 'iniciado';
UPDATE public.achievement_catalog SET metric = 'totalXP', threshold = 500  WHERE slug = 'experto';
UPDATE public.achievement_catalog SET metric = 'totalXP', threshold = 1500 WHERE slug = 'maestro-xp';
UPDATE public.achievement_catalog SET metric = 'totalXP', threshold = 5000 WHERE slug = 'gran-maestro';

-- Social
UPDATE public.achievement_catalog SET metric = 'friendCount', threshold = 1  WHERE slug = 'primer-contacto';
UPDATE public.achievement_catalog SET metric = 'friendCount', threshold = 5  WHERE slug = 'companeros-de-cata';
UPDATE public.achievement_catalog SET metric = 'friendCount', threshold = 10 WHERE slug = 'clan-cervecero';

-- Racha (primer-habito, constante, ritmo-constante, leyenda-activa,
-- obsesionado) queda sin metric/threshold — Fase 2, ver comentario arriba.

-- Sanity check: si algún slug no-Racha quedó sin metric/threshold, la
-- migración se aborta en vez de dejar un logro sin ninguna validación
-- de condición (falla cerrado, no abierto).
DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(slug, ', ') INTO v_missing
  FROM public.achievement_catalog
  WHERE metric IS NULL
    AND slug NOT IN ('primer-habito', 'constante', 'ritmo-constante', 'leyenda-activa', 'obsesionado');
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Logros sin metric/threshold asignado: %', v_missing;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- Trigger: calcula las 16 métricas en una sola pasada y despacha
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_user_achievement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  expected_xp    int;
  family_name    text;
  family_count   int;
  missing_count  int;

  v_metric        text;
  v_threshold     int;
  v_metric_value  int;

  v_total_beers           int;
  v_verified_beers        int;
  v_with_comments         int;
  v_verified_with_ratings int;
  v_complete_entries      int;
  v_verified_countries    int;
  v_verified_styles       int;
  v_with_location         int;
  v_coleccion_count       int;
  v_coleccion_epica       int;
  v_coleccion_legendaria  int;
  v_coleccion_mitica      int;
  v_coleccion_especial    int;
  v_total_xp              int;
  v_friend_count          int;
BEGIN
  IF NEW.slug LIKE 'serie-%' THEN
    SELECT familia, count(*) INTO family_name, family_count
    FROM public.beers_new
    WHERE familia IS NOT NULL
      AND public.slugify_family(familia) = substring(NEW.slug FROM 7)
    GROUP BY familia;

    IF family_name IS NULL OR family_count < 2 THEN
      RAISE EXCEPTION 'Logro inválido: % no corresponde a ninguna familia completable', NEW.slug;
    END IF;

    SELECT count(*) INTO missing_count
    FROM public.beers_new b
    WHERE b.familia = family_name
      AND NOT EXISTS (
        SELECT 1 FROM public.user_beers ub
        WHERE ub.user_id = NEW.user_id AND ub.beer_id = b.id
      );

    IF missing_count > 0 THEN
      RAISE EXCEPTION 'Logro inválido: todavía no completaste la familia "%"', family_name;
    END IF;

    expected_xp := 50 * family_count;
  ELSE
    SELECT xp_awarded, metric, threshold INTO expected_xp, v_metric, v_threshold
    FROM public.achievement_catalog WHERE slug = NEW.slug;

    IF expected_xp IS NULL THEN
      RAISE EXCEPTION 'Logro inválido: % no existe en el catálogo', NEW.slug;
    END IF;

    -- Fase 1: si el logro tiene metric asignada, se valida la condición
    -- real además de slug/xp. Racha (metric NULL) queda para Fase 2.
    IF v_metric IS NOT NULL THEN
      SELECT
        count(*),
        count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0),
        count(*) FILTER (WHERE ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0),
        count(*) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0
                            AND ub."Rating" IS NOT NULL AND ub."Rating" > 0),
        count(*) FILTER (WHERE ub."Rating" IS NOT NULL AND ub."Rating" > 0
                            AND ub.comment IS NOT NULL AND length(trim(ub.comment)) > 0
                            AND ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0),
        count(DISTINCT bn.pais)   FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0),
        count(DISTINCT bn.estilo) FILTER (WHERE ub.user_photo_url IS NOT NULL AND length(trim(ub.user_photo_url)) > 0),
        count(*) FILTER (WHERE ub.location_lat IS NOT NULL),
        count(*) FILTER (WHERE bn.rareza IN ('rara', 'epica', 'legendaria', 'mitica') OR bn.es_edicion_especial IS TRUE),
        count(*) FILTER (WHERE bn.rareza = 'epica'),
        count(*) FILTER (WHERE bn.rareza = 'legendaria'),
        count(*) FILTER (WHERE bn.rareza = 'mitica'),
        count(*) FILTER (WHERE bn.es_edicion_especial IS TRUE),
        coalesce(sum(ub."XP"), 0)
      INTO
        v_total_beers, v_verified_beers, v_with_comments, v_verified_with_ratings, v_complete_entries,
        v_verified_countries, v_verified_styles, v_with_location, v_coleccion_count,
        v_coleccion_epica, v_coleccion_legendaria, v_coleccion_mitica, v_coleccion_especial, v_total_xp
      FROM public.user_beers ub
      JOIN public.beers_new bn ON bn.id = ub.beer_id
      WHERE ub.user_id = NEW.user_id;

      SELECT count(*) INTO v_friend_count
      FROM public.friendships WHERE user_id = NEW.user_id;

      v_metric_value := CASE v_metric
        WHEN 'totalBeers'                THEN v_total_beers
        WHEN 'verifiedBeers'             THEN v_verified_beers
        WHEN 'beersWithComments'         THEN v_with_comments
        WHEN 'verifiedWithRatings'       THEN v_verified_with_ratings
        WHEN 'completeEntries'           THEN v_complete_entries
        WHEN 'verifiedDistinctCountries' THEN v_verified_countries
        WHEN 'verifiedDistinctStyles'    THEN v_verified_styles
        WHEN 'beersWithLocation'         THEN v_with_location
        WHEN 'coleccionCount'            THEN v_coleccion_count
        WHEN 'coleccionEpica'            THEN v_coleccion_epica
        WHEN 'coleccionLegendaria'       THEN v_coleccion_legendaria
        WHEN 'coleccionMitica'           THEN v_coleccion_mitica
        WHEN 'coleccionEdicionEspecial'  THEN v_coleccion_especial
        WHEN 'totalXP'                   THEN v_total_xp
        WHEN 'friendCount'               THEN v_friend_count
        ELSE NULL
      END;

      IF v_metric_value IS NULL THEN
        RAISE EXCEPTION 'Métrica desconocida para %: %', NEW.slug, v_metric;
      END IF;

      IF v_metric_value < v_threshold THEN
        RAISE EXCEPTION 'Logro inválido: % todavía no cumple la condición (% = %, requiere >= %)',
          NEW.slug, v_metric, v_metric_value, v_threshold;
      END IF;
    END IF;
  END IF;

  IF NEW.xp_awarded IS DISTINCT FROM expected_xp THEN
    RAISE EXCEPTION 'XP inválido para %: esperado %, recibido %', NEW.slug, expected_xp, NEW.xp_awarded;
  END IF;

  RETURN NEW;
END;
$$;
