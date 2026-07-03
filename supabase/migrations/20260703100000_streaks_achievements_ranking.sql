-- ── Streak tracking ──────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

-- ── User achievements ─────────────────────────────────────────
CREATE TABLE public.user_achievements (
  user_id     uuid        NOT NULL,
  slug        text        NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  xp_awarded  int         NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, slug)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ach_select_own" ON public.user_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ach_insert_own" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Global ranking (SECURITY DEFINER — bypasses RLS) ─────────
CREATE OR REPLACE FUNCTION public.get_ranking_global(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH beer_xp AS (
    SELECT user_id,
           COALESCE(SUM("XP"), 0)::bigint AS xp,
           COUNT(*)::bigint               AS beers
    FROM user_beers GROUP BY user_id
  ),
  ach_xp AS (
    SELECT user_id, COALESCE(SUM(xp_awarded), 0)::bigint AS xp
    FROM user_achievements GROUP BY user_id
  )
  SELECT
    p.id,
    p.nombre,
    (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0))                              AS total_xp,
    COALESCE(bx.beers, 0)                                                    AS total_beers,
    RANK() OVER (ORDER BY (COALESCE(bx.xp, 0) + COALESCE(ax.xp, 0)) DESC)  AS rank_pos
  FROM profiles p
  LEFT JOIN beer_xp bx ON bx.user_id = p.id
  LEFT JOIN ach_xp  ax ON ax.user_id  = p.id
  ORDER BY rank_pos
  LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_global(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global(int) TO authenticated;

-- ── Weekly ranking (new beers in last 7 days) ─────────────────
CREATE OR REPLACE FUNCTION public.get_ranking_semanal(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  WITH weekly AS (
    SELECT user_id,
           COALESCE(SUM("XP"), 0)::bigint AS xp,
           COUNT(*)::bigint               AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
    GROUP BY user_id
  )
  SELECT
    p.id,
    p.nombre,
    w.xp                                      AS total_xp,
    w.beers                                   AS total_beers,
    RANK() OVER (ORDER BY w.xp DESC)::bigint  AS rank_pos
  FROM profiles p
  INNER JOIN weekly w ON w.user_id = p.id
  ORDER BY rank_pos
  LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_semanal(int) TO authenticated;
