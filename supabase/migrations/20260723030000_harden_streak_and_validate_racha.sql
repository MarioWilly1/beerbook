-- ============================================================
-- Fase 2 (continúa a 20260723020000_validate_achievement_conditions.sql):
-- blindar profiles.current_streak/longest_streak/last_activity_date y
-- sumar los 5 logros de Racha a la validación de condición real.
--
-- Hasta ahora updateStreak() (src/utils/streak.js) hacía un
-- .update() directo del cliente sobre esas 3 columnas — sin ningún
-- trigger que lo protegiera (protect_profile_sensitive_columns() de
-- 20260719030000 solo cubre is_admin/prestige/prestige_xp_baseline).
-- Cualquier usuario podía hacer
--   supabase.from('profiles').update({ current_streak: 999 })
-- y desbloquear los 5 logros de Racha sin haber tenido esa racha real.
--
-- Mismo patrón que is_admin/prestige: la escritura se mueve a una
-- función SECURITY DEFINER (update_streak(), reemplaza exactamente la
-- lógica de updateStreak() del cliente) y protect_profile_sensitive_
-- columns() bloquea el UPDATE/INSERT directo para 'anon'/'authenticated'.
-- Como update_streak() corre como su dueño (postgres) vía SECURITY
-- DEFINER, current_user deja de ser 'authenticated' dentro del UPDATE
-- interno y el trigger no la bloquea — mismo mecanismo que do_prestige().
--
-- Blindar la escritura no alcanza por sí solo: current_streak solo se
-- recalcula "en la próxima acción calificante" (mismo comentario que
-- ya existía en isStreakActive(), src/utils/streak.js) — puede quedar
-- guardado en un valor stale-positivo días después de romperse la
-- racha real, sin que nadie lo haya forzado. Por eso
-- validate_user_achievement() no confía en el valor crudo de la
-- columna: solo lo cuenta como racha vigente si last_activity_date es
-- hoy o ayer (UTC) — igual criterio que isStreakActive() del cliente.
-- Si la racha está stale, se valida como si fuera 0.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. update_streak(): reemplaza el UPDATE directo del cliente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_streak()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today       date := (now() AT TIME ZONE 'utc')::date;
  v_yesterday   date := (now() AT TIME ZONE 'utc')::date - 1;
  v_current     int;
  v_longest     int;
  v_last        date;
  v_new_streak  int;
  v_new_longest int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT current_streak, longest_streak, last_activity_date
    INTO v_current, v_longest, v_last
  FROM public.profiles WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado';
  END IF;

  IF v_last = v_today THEN
    RETURN v_current; -- ya activo hoy, sin cambios (igual que el cliente)
  END IF;

  v_new_streak  := CASE WHEN v_last = v_yesterday THEN COALESCE(v_current, 0) + 1 ELSE 1 END;
  v_new_longest := GREATEST(v_new_streak, COALESCE(v_longest, 0));

  UPDATE public.profiles
  SET current_streak     = v_new_streak,
      longest_streak     = v_new_longest,
      last_activity_date = v_today
  WHERE id = auth.uid();

  RETURN v_new_streak;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_streak() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Bloquear la escritura directa de las 3 columnas
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_admin IS DISTINCT FROM false
         OR NEW.prestige IS DISTINCT FROM 0
         OR NEW.prestige_xp_baseline IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'No autorizado: is_admin, prestige y prestige_xp_baseline no se pueden setear al crear el perfil';
      END IF;
      IF NEW.current_streak IS DISTINCT FROM 0
         OR NEW.longest_streak IS DISTINCT FROM 0
         OR NEW.last_activity_date IS DISTINCT FROM NULL THEN
        RAISE EXCEPTION 'No autorizado: current_streak, longest_streak y last_activity_date no se pueden setear al crear el perfil';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'No autorizado: is_admin no se puede modificar directamente';
      END IF;
      IF NEW.prestige IS DISTINCT FROM OLD.prestige THEN
        RAISE EXCEPTION 'No autorizado: prestige no se puede modificar directamente — usá do_prestige()';
      END IF;
      IF NEW.prestige_xp_baseline IS DISTINCT FROM OLD.prestige_xp_baseline THEN
        RAISE EXCEPTION 'No autorizado: prestige_xp_baseline no se puede modificar directamente';
      END IF;
      IF NEW.current_streak IS DISTINCT FROM OLD.current_streak
         OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
         OR NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date THEN
        RAISE EXCEPTION 'No autorizado: current_streak, longest_streak y last_activity_date no se pueden modificar directamente — usá update_streak()';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. Racha entra al catálogo de validación (metric/threshold)
-- ────────────────────────────────────────────────────────────
UPDATE public.achievement_catalog SET metric = 'currentStreak', threshold = 3  WHERE slug = 'primer-habito';
UPDATE public.achievement_catalog SET metric = 'currentStreak', threshold = 7  WHERE slug = 'constante';
UPDATE public.achievement_catalog SET metric = 'currentStreak', threshold = 14 WHERE slug = 'ritmo-constante';
UPDATE public.achievement_catalog SET metric = 'currentStreak', threshold = 30 WHERE slug = 'leyenda-activa';
UPDATE public.achievement_catalog SET metric = 'currentStreak', threshold = 60 WHERE slug = 'obsesionado';

-- Ahora sí, los 48 logros estáticos deben tener metric/threshold —
-- si falta alguno, la migración se aborta.
DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(slug, ', ') INTO v_missing
  FROM public.achievement_catalog WHERE metric IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Logros sin metric/threshold asignado: %', v_missing;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. Trigger: suma currentStreak (con el mismo gate de vigencia que
--    isStreakActive() del cliente) al dispatch de métricas
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
  v_current_streak        int;
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

      -- Racha vigente = igual criterio que isStreakActive() (cliente):
      -- last_activity_date es hoy o ayer (UTC). Si está stale, cuenta
      -- como 0 aunque current_streak todavía guarde un número viejo.
      SELECT CASE
               WHEN last_activity_date >= (now() AT TIME ZONE 'utc')::date - 1
               THEN current_streak
               ELSE 0
             END
      INTO v_current_streak
      FROM public.profiles WHERE id = NEW.user_id;

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
        WHEN 'currentStreak'             THEN v_current_streak
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
