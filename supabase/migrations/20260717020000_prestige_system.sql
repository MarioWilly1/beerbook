-- ============================================================
-- SISTEMA DE PRESTIGIO (estilo Call of Duty)
--
-- - profiles.prestige: contador permanente, +1 cada vez que se prestigia.
-- - profiles.prestige_xp_baseline: "foto" del XP total en el momento de
--   prestigiar. El nivel mostrado se calcula como
--   level_for_xp(total_xp - prestige_xp_baseline), o sea vuelve a 1 sin
--   borrar ni tocar user_beers / user_achievements / user_badges. El XP
--   histórico y el ranking por XP total quedan intactos.
-- - El nivel de activación NO es un número fijo: get_prestige_threshold()
--   lo recalcula en base al tamaño real del catálogo, así que si
--   beers_new crece, el umbral sube solo, sin tocar código.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prestige integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_xp_baseline bigint NOT NULL DEFAULT 0;

-- Espejo SQL de xpForLevel() en src/utils/xp.js — MISMA fórmula, para que
-- el umbral de prestigio calculado en el server coincida siempre con lo
-- que el frontend muestra.
CREATE OR REPLACE FUNCTION public.xp_for_level(n int)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN n <= 1 THEN 0 ELSE floor(200 * power(n - 1, 1.6))::bigint END;
$$;

-- Espejo SQL de getLevelInfo().level
CREATE OR REPLACE FUNCTION public.level_for_xp(xp bigint)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  lvl int := 1;
BEGIN
  WHILE xp >= public.xp_for_level(lvl + 1) AND lvl < 100 LOOP
    lvl := lvl + 1;
  END LOOP;
  RETURN lvl;
END;
$$;

-- Nivel necesario para poder prestigiar. Fórmula: XP objetivo = tamaño del
-- catálogo × 55 XP promedio realista por cerveza × 0.85 (≈85% del catálogo
-- bien completado, no el 100% literal) → nivel que corresponde a ese XP.
-- Con el catálogo actual (144 cervezas) da nivel 10.
CREATE OR REPLACE FUNCTION public.get_prestige_threshold()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.level_for_xp(
    floor((SELECT COUNT(*) FROM beers_new) * 55 * 0.85)::bigint
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_prestige_threshold() TO anon, authenticated;

-- Ejecuta el prestigio: valida server-side (no confiar en el cliente) que
-- el usuario ya alcanzó el umbral vigente, y recién ahí incrementa
-- prestige y fija el nuevo baseline. SECURITY DEFINER porque
-- allow_update_own_profile permitiría a cualquiera pisar profiles.prestige
-- a mano si esto fuera un UPDATE directo desde el cliente.
CREATE OR REPLACE FUNCTION public.do_prestige()
RETURNS TABLE(new_prestige int, new_baseline bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me         uuid := auth.uid();
  v_total_xp bigint;
  v_baseline bigint;
  v_level    int;
  v_threshold int;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT
    COALESCE((SELECT SUM("XP")         FROM user_beers        WHERE user_id = me), 0) +
    COALESCE((SELECT SUM(xp_awarded)   FROM user_achievements WHERE user_id = me), 0) +
    COALESCE((SELECT SUM(xp_awarded)   FROM user_badges       WHERE user_id = me), 0)
  INTO v_total_xp;

  SELECT prestige_xp_baseline INTO v_baseline FROM profiles WHERE id = me;
  v_level     := public.level_for_xp(v_total_xp - COALESCE(v_baseline, 0));
  v_threshold := public.get_prestige_threshold();

  IF v_level < v_threshold THEN
    RAISE EXCEPTION 'Todavía no llegaste al nivel % (estás en nivel %)', v_threshold, v_level;
  END IF;

  UPDATE profiles
  SET prestige = prestige + 1,
      prestige_xp_baseline = v_total_xp
  WHERE id = me
  RETURNING prestige, prestige_xp_baseline INTO new_prestige, new_baseline;

  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.do_prestige() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.do_prestige() TO authenticated;


-- ────────────────────────────────────────────────────────────
-- Exponer profiles.prestige en feed y rankings (sidebar/perfil ya
-- leen profiles directo, no necesitan cambios de RPC).
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_friend_feed(int);
CREATE FUNCTION public.get_friend_feed(lim integer DEFAULT 50)
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
  ORDER BY al.created_at DESC LIMIT lim;
$$;
REVOKE ALL ON FUNCTION public.get_friend_feed(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_feed(int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global(int);
CREATE FUNCTION public.get_ranking_global(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
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
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  LEFT JOIN beer_xp  bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp   ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp bdx ON bdx.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global(int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_semanal(int);
CREATE FUNCTION public.get_ranking_semanal(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH weekly AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, w.xp AS total_xp, w.beers AS total_beers,
    RANK() OVER (ORDER BY w.xp DESC)::bigint AS rank_pos
  FROM profiles p
  INNER JOIN weekly w ON w.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_semanal(int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos(int);
CREATE FUNCTION public.get_ranking_amigos(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
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
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) AS total_xp,
    COALESCE(bx.beers, 0) AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0) + COALESCE(bdx.xp, 0)) DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  LEFT JOIN beer_xp  bx  ON bx.user_id  = p.id
  LEFT JOIN ach_xp   ax  ON ax.user_id  = p.id
  LEFT JOIN badge_xp bdx ON bdx.user_id = p.id
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos(int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_global_beers(int);
CREATE FUNCTION public.get_ranking_global_beers(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global_beers(int) TO authenticated;

DROP FUNCTION IF EXISTS public.get_ranking_amigos_beers(int);
CREATE FUNCTION public.get_ranking_amigos_beers(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, prestige int, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
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
  SELECT p.id, p.nombre, p.avatar_url, p.prestige, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN beer_counts bc ON bc.user_id = p.id
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int) TO authenticated;
