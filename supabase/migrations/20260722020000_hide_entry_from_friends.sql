-- ============================================================
-- "Ocultar esta cerveza de..." — mismo modelo que story_hidden_from
-- (20260717010000_sync_undocumented_schema_changes.sql) pero por
-- entrada de cuaderno en vez de por historia.
--
-- La entrada sigue existiendo normal para el dueño (XP, logros,
-- colección, ranking — todo intacto). Solo cambia qué terceros
-- pueden VER el detalle (feed / perfil visible).
--
-- FK compuesta a user_beers(user_id, beer_id) — a diferencia de
-- stories, user_beers tiene PK compuesta, así que si se borra la
-- entrada del cuaderno, las filas de ocultamiento se limpian solas
-- (ON DELETE CASCADE), sin quedar huérfanas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entry_hidden_from (
  owner_id       uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  beer_id        bigint NOT NULL,
  hidden_user_id uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (owner_id, beer_id, hidden_user_id),
  FOREIGN KEY (owner_id, beer_id) REFERENCES public.user_beers (user_id, beer_id) ON DELETE CASCADE
);

ALTER TABLE public.entry_hidden_from ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entry_hidden_from_all" ON public.entry_hidden_from;
CREATE POLICY "entry_hidden_from_all" ON public.entry_hidden_from FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────
-- Integración: mismos 2 puntos que ya resuelven "dueño / público /
-- amigo" para user_beers — se les agrega el NOT EXISTS de ocultamiento,
-- igual que can_view_story() hace para stories.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_friend_feed(lim integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid, nombre text, avatar_url text, prestige int, beer_id bigint, beer_nombre text,
  beer_foto_url text, action text, rating numeric, comment text, user_photo_url text,
  location_name text, location_public boolean, place_id uuid, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    al.user_id, p.nombre, p.avatar_url, p.prestige,
    al.beer_id, bn.nombre AS beer_nombre, bn.foto_url AS beer_foto_url,
    al.action, ub."Rating" AS rating, ub.comment, ub.user_photo_url,
    ub.location_name, ub.location_public, ub.place_id,
    al.created_at
  FROM activity_log al
  JOIN profiles   p  ON p.id       = al.user_id
  JOIN beers_new  bn ON bn.id      = al.beer_id
  JOIN user_beers ub ON ub.user_id = al.user_id AND ub.beer_id = al.beer_id
  WHERE al.user_id IN (SELECT friend_id FROM friendships WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM entry_hidden_from
      WHERE owner_id = al.user_id AND beer_id = al.beer_id AND hidden_user_id = auth.uid()
    )
  ORDER BY al.created_at DESC LIMIT lim;
$$;

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
      OR (
        COALESCE((SELECT perfil_publico FROM public.profiles WHERE id = p_user_id), true) IS TRUE
        AND NOT EXISTS (
          SELECT 1 FROM entry_hidden_from
          WHERE owner_id = p_user_id AND beer_id = ub.beer_id AND hidden_user_id = auth.uid()
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.friendships
          WHERE user_id = auth.uid() AND friend_id = p_user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM entry_hidden_from
          WHERE owner_id = p_user_id AND beer_id = ub.beer_id AND hidden_user_id = auth.uid()
        )
      )
    )
  ORDER BY ub.created_at DESC
  LIMIT 20;
$$;
