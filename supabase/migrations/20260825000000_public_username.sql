-- ============================================================
-- Separa "nombre real" (profiles.nombre, ya no se muestra en ningún
-- lado público) de un "apodo público" nuevo (profiles.username, tipo
-- @handle). nombre se sigue guardando (documento legal/facturación si
-- corresponde) pero deja de viajar en cualquier función/consulta usada
-- para mostrar identidad a otros usuarios.
--
-- username queda NULLABLE a nivel de base a propósito — agregar NOT
-- NULL acá rompería con las filas ya existentes. La obligatoriedad la
-- impone la app: mientras profiles.username sea NULL, App.js bloquea
-- la entrada con un gate ("Elegí tu apodo"), mismo patrón que ya usan
-- AgeVerificationPage/Onboarding para otros pasos obligatorios.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9_]{3,15}$');

-- Único case-insensitive: "Mario" y "mario" no pueden coexistir. Un
-- índice único (no una constraint UNIQUE simple) porque necesita
-- aplicarse sobre lower(username), no sobre la columna literal.
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

-- ────────────────────────────────────────────────────────────
-- Chequeo de disponibilidad — necesita funcionar ANTES de que exista
-- sesión (en el formulario de registro, previo a auth.signUp), así que
-- es la única función de todo el proyecto que se deja abierta a
-- `anon` a propósito (contrario al criterio general de
-- 20260801000000_harden_anon_execute_grants.sql, que documenta
-- justamente esta categoría: funciones legítimamente públicas).
-- p_exclude_user_id evita que alguien se rechace a sí mismo al
-- reguardar su perfil sin cambiar el apodo.
-- ────────────────────────────────────────────────────────────

CREATE FUNCTION public.is_username_available(p_username text, p_exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(p_username)
      AND (p_exclude_user_id IS NULL OR id <> p_exclude_user_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- Las 13 funciones que hoy devuelven `nombre`/`other_nombre` de
-- profiles pasan a devolver `username`/`other_username` — cambia el
-- RETURNS TABLE, así que hace falta DROP explícito antes de recrear
-- (CREATE OR REPLACE no permite cambiar el tipo de retorno). El
-- cuerpo de cada una es idéntico al vigente, solo cambia esa columna.
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_friend_feed(integer);
CREATE FUNCTION public.get_friend_feed(lim integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid, username text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  beer_id bigint, beer_nombre text, beer_foto_url text, action text,
  rating numeric, comment text, user_photo_url text,
  location_name text, location_public boolean, place_id uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    al.user_id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
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
REVOKE EXECUTE ON FUNCTION public.get_friend_feed(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friend_feed(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_friend_feed(integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos(integer, integer);
CREATE FUNCTION public.get_ranking_amigos(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
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
  beer_xp AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE user_id IN (SELECT uid FROM my_circle)
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_achievements WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  ),
  badge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_badges WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  ),
  challenge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_challenge_completions WHERE user_id IN (SELECT uid FROM my_circle) GROUP BY user_id
  )
  SELECT p.id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  LEFT JOIN beer_xp      bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp       ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp     bdx ON bdx.user_id = p.id
  LEFT JOIN challenge_xp cx  ON cx.user_id  = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos_beers(integer, integer);
CREATE FUNCTION public.get_ranking_amigos_beers(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
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
  beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE user_id IN (SELECT uid FROM my_circle)
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global(integer, integer);
CREATE FUNCTION public.get_ranking_global(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH beer_xp AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_achievements GROUP BY user_id
  ),
  badge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_badges GROUP BY user_id
  ),
  challenge_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp FROM user_challenge_completions GROUP BY user_id
  )
  SELECT p.id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0) + COALESCE(cx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  LEFT JOIN beer_xp      bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp       ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp     bdx ON bdx.user_id = p.id
  LEFT JOIN challenge_xp cx  ON cx.user_id  = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global_beers(integer, integer);
CREATE FUNCTION public.get_ranking_global_beers(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_semanal(integer, integer);
CREATE FUNCTION public.get_ranking_semanal(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
  equipped_tag_slug text, equipped_frame_slug text,
  total_xp bigint, total_beers bigint, rank_pos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH weekly_beer AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  ),
  weekly_challenge AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_challenge_completions
    WHERE completed_at >= now() - interval '7 days'
    GROUP BY user_id
  ),
  active_this_week AS (
    SELECT user_id FROM weekly_beer
    UNION
    SELECT user_id FROM weekly_challenge
  )
  SELECT p.id, p.username, p.avatar_url, p.prestige,
    p.equipped_tag_slug, p.equipped_frame_slug,
    (COALESCE(wb.xp, 0) + COALESCE(wc.xp, 0)) AS total_xp,
    COALESCE(wb.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(wb.xp, 0) + COALESCE(wc.xp, 0)) DESC)::bigint AS rank_pos
  FROM profiles p
  JOIN active_this_week aw ON aw.user_id = p.id
  LEFT JOIN weekly_beer      wb ON wb.user_id = p.id
  LEFT JOIN weekly_challenge wc ON wc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
    AND p.prestige = p_prestige
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global_litros(integer, integer);
CREATE FUNCTION public.get_ranking_global_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
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
  SELECT p.id, p.username, p.avatar_url, p.prestige,
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

DROP FUNCTION IF EXISTS public.get_ranking_amigos_litros(integer, integer);
CREATE FUNCTION public.get_ranking_amigos_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
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
  SELECT p.id, p.username, p.avatar_url, p.prestige,
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

DROP FUNCTION IF EXISTS public.get_ranking_semanal_litros(integer, integer);
CREATE FUNCTION public.get_ranking_semanal_litros(lim integer DEFAULT 50, p_prestige integer DEFAULT 0)
RETURNS TABLE(
  id uuid, username text, avatar_url text, prestige integer,
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
  SELECT p.id, p.username, p.avatar_url, p.prestige,
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

-- search_users pasa a buscar por username en vez de nombre — buscar por
-- nombre real sería otra forma de exponerlo indirectamente.
DROP FUNCTION IF EXISTS public.search_users(text);
CREATE FUNCTION public.search_users(search_term text)
RETURNS TABLE(id uuid, username text, avatar_url text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, username, avatar_url FROM profiles
  WHERE username ILIKE '%' || search_term || '%' AND id <> auth.uid()
  LIMIT 20;
$$;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_users(text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_lugar_visitors(uuid);
CREATE FUNCTION public.get_lugar_visitors(p_place_id uuid)
RETURNS TABLE(user_id uuid, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT ub.user_id, p.username, p.avatar_url
  FROM user_beers ub
  JOIN profiles p ON ub.user_id = p.id
  WHERE ub.place_id = p_place_id AND ub.location_public = true AND p.perfil_publico = true;
$$;
GRANT EXECUTE ON FUNCTION public.get_lugar_visitors(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_beer_tried_by(bigint);
CREATE FUNCTION public.get_beer_tried_by(p_beer_id bigint)
RETURNS TABLE (
  user_id     uuid,
  username    text,
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
  SELECT ub.user_id, p.username, p.avatar_url, ub."Rating", ub.times, p.prestige
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

DROP FUNCTION IF EXISTS public.get_my_conversations();
CREATE FUNCTION public.get_my_conversations()
RETURNS TABLE(
  conversation_id uuid, type text, name text, other_user_id uuid, other_username text,
  other_avatar_url text, last_message text, last_message_type text,
  last_message_sender uuid, last_message_at timestamptz, unread_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.type, c.name,
    (SELECT cp2.user_id FROM conversation_participants cp2
     WHERE cp2.conversation_id = c.id AND cp2.user_id != me LIMIT 1),
    (SELECT p.username FROM conversation_participants cp2
     JOIN profiles p ON p.id = cp2.user_id
     WHERE cp2.conversation_id = c.id AND cp2.user_id != me LIMIT 1),
    (SELECT p.avatar_url FROM conversation_participants cp2
     JOIN profiles p ON p.id = cp2.user_id
     WHERE cp2.conversation_id = c.id AND cp2.user_id != me LIMIT 1),
    (SELECT m.content   FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.type      FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    c.last_message_at,
    (SELECT COUNT(*)::bigint FROM messages m
     WHERE m.conversation_id = c.id AND m.sender_id != me
       AND m.created_at > COALESCE(
         (SELECT cp.last_read_at FROM conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = me),
         '1970-01-01'::timestamptz))
  FROM conversations c
  WHERE c.id IN (SELECT cp_main.conversation_id FROM conversation_participants cp_main WHERE cp_main.user_id = me)
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
