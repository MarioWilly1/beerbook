-- ============================================================
-- Retos diarios además del semanal: mismo motor
-- (compute_metric_for_user / validate_challenge_completion, ver
-- 20260723040000_weekly_challenges.sql), particionado por
-- duration_type en vez de duplicar lógica.
--
-- compute_metric_for_user() y validate_challenge_completion() NO se
-- tocan: ya operan de forma genérica sobre [fecha_inicio, fecha_fin]
-- sin asumir cuánto dura ese rango — un reto de 1 día pasa por
-- exactamente el mismo código que uno de 7.
--
-- El EXCLUDE que garantizaba "un solo reto activo" pasa a estar
-- particionado por duration_type: dos retos se siguen rechazando por
-- solaparse en fechas SOLO si son del mismo tipo. Un diario y un
-- semanal con fechas superpuestas ahora conviven sin problema.
-- ============================================================

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'semanal';

ALTER TABLE public.weekly_challenges
  DROP CONSTRAINT IF EXISTS weekly_challenges_duration_type_check,
  ADD CONSTRAINT weekly_challenges_duration_type_check
    CHECK (duration_type IN ('diario', 'semanal'));

ALTER TABLE public.weekly_challenges
  DROP CONSTRAINT IF EXISTS weekly_challenges_daterange_excl;

ALTER TABLE public.weekly_challenges
  ADD CONSTRAINT weekly_challenges_no_overlap_per_type
  EXCLUDE USING gist (duration_type WITH =, daterange(fecha_inicio, fecha_fin, '[]') WITH &&);

-- ────────────────────────────────────────────────────────────
-- get_weekly_challenge_progress(): de "elegir el único activo" a
-- "recorrer todos los activos" — con el EXCLUDE de arriba, nunca hay
-- más de uno por duration_type vigente al mismo tiempo, así que como
-- máximo devuelve 2 filas.
-- ────────────────────────────────────────────────────────────
-- CREATE OR REPLACE no permite cambiar las columnas de salida de una
-- función existente (agrega duration_type) — hay que dropearla antes.
DROP FUNCTION IF EXISTS public.get_weekly_challenge_progress();

CREATE FUNCTION public.get_weekly_challenge_progress()
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
      public.compute_metric_for_user(auth.uid(), v_challenge.metric, v_challenge.fecha_inicio, v_challenge.fecha_fin),
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

-- DROP FUNCTION borra los grants junto con la función — hay que
-- reponerlos (por default Postgres otorga EXECUTE a PUBLIC en
-- funciones nuevas).
REVOKE EXECUTE ON FUNCTION public.get_weekly_challenge_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_challenge_progress() TO authenticated;
