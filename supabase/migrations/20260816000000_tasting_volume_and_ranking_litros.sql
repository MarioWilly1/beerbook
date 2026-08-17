-- ============================================================
-- Volumen (ml) por cata + nueva dimensión "Litros" en el Ranking.
--
-- cantidad_ml queda NULL en las catas existentes — sin backfill ni
-- valor por defecto, a pedido explícito (toda la base actual es de
-- cuentas de prueba que se resetean antes del lanzamiento). El
-- selector rápido en el cliente ofrece tamaños típicos (caña, quinto,
-- botellín, tercio, lata, pinta, litro) + "Otro" con cantidad libre,
-- siempre guardado en ml.
-- ============================================================

ALTER TABLE public.beer_tastings ADD COLUMN IF NOT EXISTS cantidad_ml integer;
ALTER TABLE public.beer_tastings ADD CONSTRAINT beer_tastings_cantidad_ml_range
  CHECK (cantidad_ml IS NULL OR (cantidad_ml > 0 AND cantidad_ml <= 5000));

-- ────────────────────────────────────────────────────────────
-- Ranking "Litros" — mismas 3 variantes que ya existen para XP/Cervezas
-- (global, amigos, semanal), mismo filtro de liga de Prestigio y mismo
-- criterio de amigos/aparecer_en_ranking que sus pares. A diferencia de
-- "Cervezas" (que no tiene variante semanal), acá sí hay las 3: beer_
-- tastings ya trae created_at por fila, así que la ventana de 7 días es
-- directa.
--
-- Solo entran usuarios con al menos una cata con cantidad_ml cargado
-- (mismo criterio que "Cervezas", que solo cuenta cervezas VERIFICADAS
-- — acá el equivalente es "con volumen cargado") — así no se llena el
-- ranking de cuentas en 0 L que nunca usaron el selector.
--
-- Reutiliza la forma de fila ya existente (total_xp/total_beers) para
-- no duplicar tipos en el frontend — los litros (en ml, sin convertir;
-- la conversión a L es del cliente) van en total_beers, mismo truco que
-- ya usa la dimensión "Cervezas".
-- ────────────────────────────────────────────────────────────

CREATE FUNCTION public.get_ranking_global_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ml_totals AS (
    SELECT user_id, SUM(cantidad_ml)::bigint AS ml
    FROM beer_tastings
    WHERE cantidad_ml IS NOT NULL
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    mt.ml AS total_xp,
    mt.ml AS total_beers,
    RANK() OVER (ORDER BY mt.ml DESC) AS rank_pos
  FROM profiles p
  JOIN ml_totals mt ON mt.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_global_litros(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_litros(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_global_litros(integer, integer) TO authenticated;

CREATE FUNCTION public.get_ranking_amigos_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH my_circle AS (
    SELECT friend_id AS uid FROM friendships WHERE user_id = auth.uid()
    UNION ALL SELECT auth.uid() AS uid
  ),
  ml_totals AS (
    SELECT user_id, SUM(cantidad_ml)::bigint AS ml
    FROM beer_tastings
    WHERE cantidad_ml IS NOT NULL
      AND user_id IN (SELECT uid FROM my_circle)
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    mt.ml AS total_xp,
    mt.ml AS total_beers,
    RANK() OVER (ORDER BY mt.ml DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN ml_totals mt ON mt.user_id = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_litros(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_litros(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_amigos_litros(integer, integer) TO authenticated;

CREATE FUNCTION public.get_ranking_semanal_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, nombre text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH weekly_ml AS (
    SELECT user_id, SUM(cantidad_ml)::bigint AS ml
    FROM beer_tastings
    WHERE cantidad_ml IS NOT NULL
      AND created_at >= now() - interval '7 days'
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    wm.ml AS total_xp,
    wm.ml AS total_beers,
    RANK() OVER (ORDER BY wm.ml DESC) AS rank_pos
  FROM profiles p
  JOIN weekly_ml wm ON wm.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal_litros(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal_litros(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_semanal_litros(integer, integer) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- Dato secundario "X litros" en las stat cards de Perfil (ProfilePage.js).
-- beer_tastings solo tiene policy de SELECT para user_id = auth.uid()
-- (select_own_tastings) — ver el perfil de OTRO usuario necesita esta
-- RPC SECURITY DEFINER, que replica server-side la misma regla de
-- visibilidad que ya usa get_visible_user_beers (dueño / perfil público /
-- amigos), mismo criterio documentado en 20260722010000_visible_user_beers.sql.
-- ────────────────────────────────────────────────────────────

CREATE FUNCTION public.get_visible_tastings_liters(p_user_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT SUM(cantidad_ml)::bigint
  FROM public.beer_tastings
  WHERE user_id = p_user_id
    AND cantidad_ml IS NOT NULL
    AND (
      auth.uid() = p_user_id
      OR COALESCE((SELECT perfil_publico FROM public.profiles WHERE id = p_user_id), true) IS TRUE
      OR EXISTS (
        SELECT 1 FROM public.friendships
        WHERE user_id = auth.uid() AND friend_id = p_user_id
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_visible_tastings_liters(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_visible_tastings_liters(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_visible_tastings_liters(uuid) TO authenticated;
