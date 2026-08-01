-- ============================================================
-- Fix de regresión: "quién probó esta cerveza" en el mapa de origen
-- (OriginMapPanel.js y MapaMundial.js, ambos con el mismo código
-- duplicado) no mostraba a nadie, ni siquiera amigos que sabíamos que
-- la habían registrado.
--
-- Causa: ambos hacían un SELECT directo del cliente contra
-- user_beers ("... .from('user_beers').select('user_id, ...,
-- profiles(...)').eq('beer_id', beer.id)"), pero user_beers solo
-- tiene policies de SELECT para user_id = auth.uid() — nunca hubo una
-- policy que permitiera leer filas de otros usuarios. El filtro de
-- "perfil público o amigo" se aplicaba después, en JS, pero para ese
-- momento la query ya volvía vacía de terceros por RLS: el filtro
-- nunca llegaba a tener nada de otros usuarios para filtrar.
--
-- Mismo patrón ya usado para este problema en get_lugar_visitors()/
-- get_visible_user_beers() (20260717010000/20260722010000): una RPC
-- SECURITY DEFINER que aplica la regla de visibilidad server-side.
--
-- De paso resuelve el pedido de "Top 15 ordenado por prestigio": con
-- potencialmente miles de entradas, se corta en el servidor en vez de
-- mandar todo al cliente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_beer_tried_by(p_beer_id bigint)
RETURNS TABLE (
  user_id     uuid,
  nombre      text,
  avatar_url  text,
  rating      numeric,
  times       int,
  prestige    int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ub.user_id, p.nombre, p.avatar_url, ub."Rating", ub.times, p.prestige
  FROM public.user_beers ub
  JOIN public.profiles p ON p.id = ub.user_id
  WHERE ub.beer_id = p_beer_id
    AND (
      p.perfil_publico
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.user_id = auth.uid() AND f.friend_id = ub.user_id
        )
      )
    )
  ORDER BY p.prestige DESC NULLS LAST, ub.times DESC
  LIMIT 15;
$$;

REVOKE EXECUTE ON FUNCTION public.get_beer_tried_by(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_beer_tried_by(bigint) TO anon, authenticated;
