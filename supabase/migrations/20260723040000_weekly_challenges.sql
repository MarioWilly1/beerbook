-- ============================================================
-- Retos Semanales orgánicos: un solo reto activo por semana, igual
-- para todos los usuarios, con la misma condición "métrica >= umbral"
-- que ya usan los logros — pero acotada a una ventana de fechas.
--
-- Reutiliza las mismas fuentes de verdad ya blindadas (user_beers con
-- XP recalculado server-side, beers_new de solo-admin, friendships
-- creadas solo vía RPC) — no se reimplementa ninguna noción nueva de
-- "verificada"/"XP"/"amigo". compute_metric_for_user() es el mismo
-- cálculo que ya vive adentro de validate_user_achievement()
-- (20260723020000/20260723030000), con una ventana de fechas agregada
-- a cada FILTER — así el trigger de validación Y la RPC de progreso
-- comparten una sola implementación, sin duplicar la lógica.
--
-- Racha queda afuera del set de métricas elegibles para retos: es por
-- definición continua entre semanas, no tiene sentido acotarla a una
-- ventana.
--
-- Criterio de ventana: created_at de la fila, no la fecha en que se
-- edita. Editar una entrada vieja (ej. agregarle una foto después)
-- NO cuenta para el reto de esta semana — solo entradas nuevas
-- creadas dentro de [fecha_inicio, fecha_fin].
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ────────────────────────────────────────────────────────────
-- 1. weekly_challenges — historial completo, no solo "el activo"
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL CHECK (char_length(trim(nombre)) BETWEEN 1 AND 100),
  descripcion  text CHECK (descripcion IS NULL OR char_length(descripcion) <= 300),
  metric       text NOT NULL CHECK (metric IN (
                 'totalBeers', 'verifiedBeers', 'beersWithComments', 'verifiedWithRatings',
                 'completeEntries', 'verifiedDistinctCountries', 'verifiedDistinctStyles',
                 'beersWithLocation', 'coleccionCount', 'coleccionEpica', 'coleccionLegendaria',
                 'coleccionMitica', 'coleccionEdicionEspecial', 'totalXP', 'friendCount'
               )),
  threshold    int  NOT NULL CHECK (threshold > 0),
  xp_bonus     int  NOT NULL CHECK (xp_bonus > 0),
  fecha_inicio date NOT NULL,
  fecha_fin    date NOT NULL CHECK (fecha_fin >= fecha_inicio),
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES public.profiles(id),
  -- Un solo reto activo por semana: rechaza en la base cualquier reto
  -- nuevo cuyo rango de fechas se solape con uno existente, en vez de
  -- confiar en que el form del admin lo valide bien.
  EXCLUDE USING gist (daterange(fecha_inicio, fecha_fin, '[]') WITH &&)
);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_challenges_read" ON public.weekly_challenges;
CREATE POLICY "weekly_challenges_read" ON public.weekly_challenges
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "weekly_challenges_admin_insert" ON public.weekly_challenges;
CREATE POLICY "weekly_challenges_admin_insert" ON public.weekly_challenges
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "weekly_challenges_admin_update" ON public.weekly_challenges;
CREATE POLICY "weekly_challenges_admin_update" ON public.weekly_challenges
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "weekly_challenges_admin_delete" ON public.weekly_challenges;
CREATE POLICY "weekly_challenges_admin_delete" ON public.weekly_challenges
  FOR DELETE TO authenticated USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 2. user_challenge_completions — una sola vez por usuario por reto
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_challenge_completions (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id),
  xp_awarded   int  NOT NULL CHECK (xp_awarded > 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);

ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_challenge_completions_select" ON public.user_challenge_completions;
CREATE POLICY "user_challenge_completions_select" ON public.user_challenge_completions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

-- El INSERT lo dispara el propio usuario (no hay botón "reclamar": se
-- inserta automáticamente al detectar que cumplió la condición) — la
-- condición real la valida el trigger de abajo, no esta policy.
DROP POLICY IF EXISTS "user_challenge_completions_insert_own" ON public.user_challenge_completions;
CREATE POLICY "user_challenge_completions_insert_own" ON public.user_challenge_completions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 3. compute_metric_for_user() — misma lógica de validate_user_achievement(),
--    con ventana de fechas. La comparten el trigger de abajo y la RPC
--    de progreso: una sola implementación, dos consumidores.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_metric_for_user(
  p_user_id uuid, p_metric text, p_since date, p_until date
) RETURNS int
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_result int;
BEGIN
  IF p_metric = 'friendCount' THEN
    SELECT count(*) INTO v_result
    FROM public.friendships
    WHERE user_id = p_user_id
      AND created_at::date BETWEEN p_since AND p_until;
    RETURN coalesce(v_result, 0);
  END IF;

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

-- ────────────────────────────────────────────────────────────
-- 4. Trigger: valida vigencia + XP correcto + condición real cumplida
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_challenge_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge      public.weekly_challenges%ROWTYPE;
  v_metric_value   int;
BEGIN
  SELECT * INTO v_challenge FROM public.weekly_challenges WHERE id = NEW.challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reto inválido: % no existe', NEW.challenge_id;
  END IF;

  IF (now() AT TIME ZONE 'utc')::date NOT BETWEEN v_challenge.fecha_inicio AND v_challenge.fecha_fin THEN
    RAISE EXCEPTION 'Reto "%" ya no está vigente (vigente % a %)',
      v_challenge.nombre, v_challenge.fecha_inicio, v_challenge.fecha_fin;
  END IF;

  IF NEW.xp_awarded IS DISTINCT FROM v_challenge.xp_bonus THEN
    RAISE EXCEPTION 'XP inválido para el reto "%": esperado %, recibido %',
      v_challenge.nombre, v_challenge.xp_bonus, NEW.xp_awarded;
  END IF;

  v_metric_value := public.compute_metric_for_user(
    NEW.user_id, v_challenge.metric, v_challenge.fecha_inicio, v_challenge.fecha_fin
  );

  IF v_metric_value < v_challenge.threshold THEN
    RAISE EXCEPTION 'Reto "%" todavía no cumple la condición (% = %, requiere >= %)',
      v_challenge.nombre, v_challenge.metric, v_metric_value, v_challenge.threshold;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_challenge_completion ON public.user_challenge_completions;
CREATE TRIGGER trg_validate_challenge_completion
  BEFORE INSERT ON public.user_challenge_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_challenge_completion();

-- ────────────────────────────────────────────────────────────
-- 5. RPC de progreso: el cliente nunca recalcula nada, solo pinta lo
--    que ya devuelve compute_metric_for_user()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_weekly_challenge_progress()
RETURNS TABLE (
  challenge_id uuid,
  nombre       text,
  descripcion  text,
  metric       text,
  threshold    int,
  xp_bonus     int,
  fecha_inicio date,
  fecha_fin    date,
  progress     int,
  completed    boolean
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

  SELECT wc.* INTO v_challenge
  FROM public.weekly_challenges wc
  WHERE (now() AT TIME ZONE 'utc')::date BETWEEN wc.fecha_inicio AND wc.fecha_fin
  ORDER BY wc.fecha_inicio DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN; -- sin filas: no hay reto activo esta semana
  END IF;

  RETURN QUERY SELECT
    v_challenge.id, v_challenge.nombre, v_challenge.descripcion, v_challenge.metric,
    v_challenge.threshold, v_challenge.xp_bonus, v_challenge.fecha_inicio, v_challenge.fecha_fin,
    LEAST(
      public.compute_metric_for_user(auth.uid(), v_challenge.metric, v_challenge.fecha_inicio, v_challenge.fecha_fin),
      v_challenge.threshold
    ),
    EXISTS (
      SELECT 1 FROM public.user_challenge_completions ucc
      WHERE ucc.user_id = auth.uid() AND ucc.challenge_id = v_challenge.id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_weekly_challenge_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_challenge_progress() TO authenticated;
