-- ============================================================
-- Filtro "🔥 Trending" en el catálogo: cervezas con más actividad
-- reciente de la comunidad (activity_log), últimos N días.
--
-- activity_log tiene PK compuesta (user_id, beer_id) y logActivity()
-- hace upsert en cada guardado (alta o edición) — cada usuario aporta
-- como mucho UNA fila por cerveza, con created_at = último toque. Por
-- eso COUNT(*) agrupado por beer_id ya equivale a "cuántos usuarios
-- distintos interactuaron con esta cerveza", sin necesidad de
-- deduplicar.
--
-- RLS en activity_log solo deja ver la propia actividad
-- (al_select_own: user_id = auth.uid()) — agregar across-usuarios
-- necesita SECURITY DEFINER, igual que get_ranking_global() y
-- get_prestige_percentile(). Solo se expone beer_id + un conteo,
-- nunca qué usuario hizo qué.
--
-- Umbral: mínimo 2 usuarios distintos en la ventana para calificar
-- como trending (filtra el ruido de una sola interacción aislada),
-- top p_limit entre las que superan el piso.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at);

CREATE OR REPLACE FUNCTION public.get_trending_beers(
  p_days int DEFAULT 7,
  p_limit int DEFAULT 10,
  p_min_users int DEFAULT 2
)
RETURNS TABLE(beer_id bigint, recent_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT beer_id, COUNT(*)::bigint AS recent_count
  FROM activity_log
  WHERE created_at >= now() - (p_days || ' days')::interval
  GROUP BY beer_id
  HAVING COUNT(*) >= p_min_users
  ORDER BY recent_count DESC, beer_id
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_trending_beers(int, int, int) TO authenticated;
