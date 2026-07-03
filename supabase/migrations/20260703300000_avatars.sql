-- Avatar system: storage bucket, column, updated functions

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars','avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_delete"  ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_own_insert"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "avatars_own_update"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "avatars_own_delete"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);

DROP FUNCTION IF EXISTS public.get_friend_feed(int);
DROP FUNCTION IF EXISTS public.get_ranking_global(int);
DROP FUNCTION IF EXISTS public.get_ranking_semanal(int);
DROP FUNCTION IF EXISTS public.get_ranking_amigos(int);
DROP FUNCTION IF EXISTS public.search_users(text);

CREATE FUNCTION public.get_friend_feed(lim int DEFAULT 50)
RETURNS TABLE(user_id uuid,nombre text,avatar_url text,beer_id bigint,beer_nombre text,beer_foto_url text,action text,rating numeric,comment text,user_photo_url text,created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT al.user_id,p.nombre,p.avatar_url,al.beer_id,bn.nombre,bn.foto_url,al.action,ub."Rating",ub.comment,ub.user_photo_url,al.created_at
  FROM activity_log al JOIN profiles p ON p.id=al.user_id JOIN beers_new bn ON bn.id=al.beer_id JOIN user_beers ub ON ub.user_id=al.user_id AND ub.beer_id=al.beer_id
  WHERE al.user_id IN(SELECT friend_id FROM friendships WHERE user_id=auth.uid()) ORDER BY al.created_at DESC LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_friend_feed(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_friend_feed(int) TO authenticated;

CREATE FUNCTION public.get_ranking_global(lim int DEFAULT 50)
RETURNS TABLE(id uuid,nombre text,avatar_url text,total_xp bigint,total_beers bigint,rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH beer_xp AS(SELECT user_id,COALESCE(SUM("XP"),0)::bigint AS xp,COUNT(*)::bigint AS beers FROM user_beers GROUP BY user_id),
  ach_xp AS(SELECT user_id,COALESCE(SUM(xp_awarded),0)::bigint AS xp FROM user_achievements GROUP BY user_id)
  SELECT p.id,p.nombre,p.avatar_url,(COALESCE(bx.xp,0)+COALESCE(ax.xp,0)) AS total_xp,COALESCE(bx.beers,0) AS total_beers,RANK() OVER(ORDER BY(COALESCE(bx.xp,0)+COALESCE(ax.xp,0))DESC) AS rank_pos
  FROM profiles p LEFT JOIN beer_xp bx ON bx.user_id=p.id LEFT JOIN ach_xp ax ON ax.user_id=p.id ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global(int) TO authenticated;

CREATE FUNCTION public.get_ranking_semanal(lim int DEFAULT 50)
RETURNS TABLE(id uuid,nombre text,avatar_url text,total_xp bigint,total_beers bigint,rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH weekly AS(SELECT user_id,COALESCE(SUM("XP"),0)::bigint AS xp,COUNT(*)::bigint AS beers FROM user_beers WHERE created_at>=now()-interval'7 days' GROUP BY user_id)
  SELECT p.id,p.nombre,p.avatar_url,w.xp AS total_xp,w.beers AS total_beers,RANK() OVER(ORDER BY w.xp DESC)::bigint AS rank_pos
  FROM profiles p INNER JOIN weekly w ON w.user_id=p.id ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_semanal(int) TO authenticated;

CREATE FUNCTION public.get_ranking_amigos(lim int DEFAULT 50)
RETURNS TABLE(id uuid,nombre text,avatar_url text,total_xp bigint,total_beers bigint,rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH my_circle AS(SELECT friend_id AS uid FROM friendships WHERE user_id=auth.uid() UNION ALL SELECT auth.uid() AS uid),
  beer_xp AS(SELECT user_id,COALESCE(SUM("XP"),0)::bigint AS xp,COUNT(*)::bigint AS beers FROM user_beers WHERE user_id IN(SELECT uid FROM my_circle) GROUP BY user_id),
  ach_xp AS(SELECT user_id,COALESCE(SUM(xp_awarded),0)::bigint AS xp FROM user_achievements WHERE user_id IN(SELECT uid FROM my_circle) GROUP BY user_id)
  SELECT p.id,p.nombre,p.avatar_url,(COALESCE(bx.xp,0)+COALESCE(ax.xp,0)) AS total_xp,COALESCE(bx.beers,0) AS total_beers,RANK() OVER(ORDER BY(COALESCE(bx.xp,0)+COALESCE(ax.xp,0))DESC) AS rank_pos
  FROM profiles p JOIN my_circle mc ON mc.uid=p.id LEFT JOIN beer_xp bx ON bx.user_id=p.id LEFT JOIN ach_xp ax ON ax.user_id=p.id ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos(int) TO authenticated;

CREATE FUNCTION public.search_users(search_term text)
RETURNS TABLE(id uuid,nombre text,avatar_url text)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT id,nombre,avatar_url FROM profiles WHERE nombre ILIKE'%'||search_term||'%' AND id<>auth.uid() LIMIT 20;
$$;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_users(text) TO authenticated;
