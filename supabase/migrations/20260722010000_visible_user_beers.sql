-- ============================================================
-- ProfilePage.js necesita mostrar las entradas verificadas (con
-- foto) de OTRO usuario para poder reportarlas — pero user_beers
-- solo tiene policies de SELECT para user_id = auth.uid()
-- ("Users can read their own beers" / select_own_beers), así que
-- ver el perfil de otra persona nunca trae sus filas de user_beers
-- (confirmado en vivo: 0 filas al impersonar a un usuario distinto
-- del dueño). Esto ya afectaba silenciosamente a stats.totalBeers/
-- verifiedBeers de otros perfiles antes de este cambio.
--
-- SECURITY DEFINER que replica server-side la misma regla de
-- visibilidad que ya usa ProfilePage.js client-side (canSeeStats):
-- el propio dueño, o perfil público, o amigos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_visible_user_beers(p_user_id uuid)
RETURNS TABLE(beer_id bigint, user_photo_url text, beer_nombre text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT ub.beer_id, ub.user_photo_url, bn.nombre, ub.created_at
  FROM public.user_beers ub
  JOIN public.beers_new bn ON bn.id = ub.beer_id
  WHERE ub.user_id = p_user_id
    AND ub.user_photo_url IS NOT NULL
    AND (
      auth.uid() = p_user_id
      OR COALESCE((SELECT perfil_publico FROM public.profiles WHERE id = p_user_id), true) IS TRUE
      OR EXISTS (
        SELECT 1 FROM public.friendships
        WHERE user_id = auth.uid() AND friend_id = p_user_id
      )
    )
  ORDER BY ub.created_at DESC
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.get_visible_user_beers(uuid) TO authenticated;
