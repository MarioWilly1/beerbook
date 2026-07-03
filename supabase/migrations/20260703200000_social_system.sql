-- ========================
-- SOCIAL SYSTEM MIGRATION
-- ========================

-- 1. Allow all authenticated users to read any profile (needed for friend search/display)
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 2. friendship_requests
CREATE TABLE IF NOT EXISTS public.friendship_requests (
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendship_requests_pkey PRIMARY KEY (sender_id, receiver_id),
  CONSTRAINT friendship_requests_no_self CHECK (sender_id <> receiver_id)
);

ALTER TABLE public.friendship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fr_select" ON public.friendship_requests;
CREATE POLICY "fr_select" ON public.friendship_requests
  FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "fr_insert" ON public.friendship_requests;
CREATE POLICY "fr_insert" ON public.friendship_requests
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND sender_id <> receiver_id);

DROP POLICY IF EXISTS "fr_delete" ON public.friendship_requests;
CREATE POLICY "fr_delete" ON public.friendship_requests
  FOR DELETE TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

-- 3. friendships (two-row symmetric model for O(1) lookups)
CREATE TABLE IF NOT EXISTS public.friendships (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (user_id, friend_id),
  CONSTRAINT friendships_no_self CHECK (user_id <> friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_select_own" ON public.friendships;
CREATE POLICY "fs_select_own" ON public.friendships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON public.friendships (user_id);

-- 4. activity_log (one entry per user×beer, upserted on each save)
CREATE TABLE IF NOT EXISTS public.activity_log (
  user_id    uuid   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  beer_id    bigint NOT NULL REFERENCES public.beers_new(id) ON DELETE CASCADE,
  action     text   NOT NULL CHECK (action IN ('register', 'rate', 'comment', 'photo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (user_id, beer_id)
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "al_select_own" ON public.activity_log;
CREATE POLICY "al_select_own" ON public.activity_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "al_insert_own" ON public.activity_log;
CREATE POLICY "al_insert_own" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "al_update_own" ON public.activity_log;
CREATE POLICY "al_update_own" ON public.activity_log
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS activity_log_created_idx
  ON public.activity_log (user_id, created_at DESC);

-- 5. accept_friend_request (atomic: delete request + insert both friendship rows)
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_sender_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM friendship_requests
  WHERE sender_id = p_sender_id AND receiver_id = auth.uid();

  INSERT INTO friendships (user_id, friend_id)
  VALUES (auth.uid(), p_sender_id), (p_sender_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- 6. reject_friend_request
CREATE OR REPLACE FUNCTION public.reject_friend_request(p_sender_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM friendship_requests
  WHERE sender_id = p_sender_id AND receiver_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_friend_request(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reject_friend_request(uuid) TO authenticated;

-- 7. remove_friend (deletes both rows atomically)
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM friendships
  WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_friend(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

-- 8. get_friend_feed (reads friends' activity bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_friend_feed(lim int DEFAULT 50)
RETURNS TABLE(
  user_id        uuid,
  nombre         text,
  beer_id        bigint,
  beer_nombre    text,
  beer_foto_url  text,
  action         text,
  rating         numeric,
  comment        text,
  user_photo_url text,
  created_at     timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    al.user_id,
    p.nombre,
    al.beer_id,
    bn.nombre        AS beer_nombre,
    bn.foto_url      AS beer_foto_url,
    al.action,
    ub."Rating"      AS rating,
    ub.comment,
    ub.user_photo_url,
    al.created_at
  FROM activity_log al
  JOIN profiles   p  ON p.id       = al.user_id
  JOIN beers_new  bn ON bn.id      = al.beer_id
  JOIN user_beers ub ON ub.user_id = al.user_id AND ub.beer_id = al.beer_id
  WHERE al.user_id IN (
    SELECT friend_id FROM friendships WHERE user_id = auth.uid()
  )
  ORDER BY al.created_at DESC
  LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_friend_feed(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_friend_feed(int) TO authenticated;

-- 9. search_users (bypasses RLS to find users by name)
CREATE OR REPLACE FUNCTION public.search_users(search_term text)
RETURNS TABLE(id uuid, nombre text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, nombre FROM profiles
  WHERE nombre ILIKE '%' || search_term || '%'
    AND id <> auth.uid()
  LIMIT 20;
$$;

REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_users(text) TO authenticated;

-- 10. get_ranking_amigos (friends + self ranking)
CREATE OR REPLACE FUNCTION public.get_ranking_amigos(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH my_circle AS (
    SELECT friend_id AS uid FROM friendships WHERE user_id = auth.uid()
    UNION ALL
    SELECT auth.uid() AS uid
  ),
  beer_xp AS (
    SELECT user_id,
           COALESCE(SUM("XP"), 0)::bigint AS xp,
           COUNT(*)::bigint               AS beers
    FROM user_beers
    WHERE user_id IN (SELECT uid FROM my_circle)
    GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_achievements
    WHERE user_id IN (SELECT uid FROM my_circle)
    GROUP BY user_id
  )
  SELECT
    p.id,
    p.nombre,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0)                       AS total_beers,
    RANK() OVER (
      ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0)) DESC
    ) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  LEFT JOIN beer_xp bx ON bx.user_id = p.id
  LEFT JOIN ach_xp  ax ON ax.user_id  = p.id
  ORDER BY rank_pos
  LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos(int) TO authenticated;
