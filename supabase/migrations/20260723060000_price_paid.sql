-- ============================================================
-- Precio pagado (opcional) por entrada, ligado a la ubicación donde se
-- registró la cerveza. Se muestra como promedio real por lugar en
-- LugarPage.js.
--
-- El CHECK (0, 200] es el filtro anti-trampa/anti-error principal:
-- rechaza en el insert valores negativos, cero, o errores de tipeo
-- obvios (ej. "2000" en vez de "20"). Mismo patrón que
-- user_beers_comment_length (CHECK (col IS NULL OR condición) para
-- columnas opcionales).
--
-- get_lugar_price_stats(): con 5 muestras o más aplica una media
-- recortada (descarta el 10% superior/inferior vía percentile_cont)
-- para que un valor real-pero-alto no distorsione el promedio en
-- lugares con pocos datos; con menos de 5 muestras usa promedio
-- simple, porque recortar percentiles con tan pocos datos no tiene
-- sentido estadístico. Mismo patrón STABLE SECURITY DEFINER que
-- get_lugar_beers/get_lugar_visitors, mismo filtro de privacidad
-- (place_id + location_public = true).
-- ============================================================

ALTER TABLE public.user_beers ADD COLUMN IF NOT EXISTS price_paid numeric;

ALTER TABLE public.user_beers
  DROP CONSTRAINT IF EXISTS user_beers_price_paid_range,
  ADD CONSTRAINT user_beers_price_paid_range
    CHECK (price_paid IS NULL OR (price_paid > 0 AND price_paid <= 200));

CREATE OR REPLACE FUNCTION public.get_lugar_price_stats(p_place_id uuid)
RETURNS TABLE(avg_price numeric, sample_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH prices AS (
    SELECT price_paid
    FROM user_beers
    WHERE place_id = p_place_id
      AND location_public = true
      AND price_paid IS NOT NULL
  ),
  stats AS (
    SELECT
      count(*) AS n,
      percentile_cont(0.1) WITHIN GROUP (ORDER BY price_paid) AS p10,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY price_paid) AS p90
    FROM prices
  )
  SELECT
    ROUND(
      AVG(pr.price_paid) FILTER (
        WHERE s.n < 5 OR (pr.price_paid BETWEEN s.p10 AND s.p90)
      ),
      2
    ) AS avg_price,
    s.n AS sample_count
  FROM stats s
  LEFT JOIN prices pr ON true
  GROUP BY s.n;
$$;

REVOKE EXECUTE ON FUNCTION public.get_lugar_price_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lugar_price_stats(uuid) TO anon, authenticated;
