-- ============================================================
-- SINCRONIZACIÓN: captura todo lo aplicado directo por SQL Editor
-- entre 2026-07-03 y 2026-07-08 que nunca quedó como archivo de
-- migración versionado. Reconstruido a partir de:
--   1) supabase_migrations.schema_migrations (historial real que el
--      propio SQL Editor guarda con el SQL exacto que se ejecutó), y
--   2) introspección en vivo (information_schema / pg_catalog) para
--      los dos objetos que el Dashboard creó sin pasar por el SQL
--      Editor (buckets "Cervezas" y "user-beers").
--
-- Es solo documentación: todo esto ya existe en la base productiva.
-- Cada sentencia está guardada con IF NOT EXISTS / OR REPLACE / DROP
-- ... IF EXISTS para que sea un no-op si se vuelve a aplicar.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLAS NUEVAS
-- ────────────────────────────────────────────────────────────

-- 1.1 user_badges (sistema de insignias, separado de user_achievements)
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_slug  text        NOT NULL,
  tier        text        NOT NULL CHECK (tier IN ('bronce', 'plata', 'oro', 'platino')),
  xp_awarded  integer     NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_slug, tier)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_badges_insert" ON public.user_badges;
CREATE POLICY "user_badges_insert" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 1.2 places (lugares/bares vinculados a user_beers, feature "Lugar")
CREATE OR REPLACE FUNCTION public.normalize_place_name(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
$$;

CREATE TABLE IF NOT EXISTS public.places (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text NOT NULL,
  nombre_normalizado  text NOT NULL UNIQUE,
  lat                 double precision,
  lng                 double precision,
  claimed_by_business uuid REFERENCES public.profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS places_nombre_norm_idx ON public.places (nombre_normalizado);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "places_public_read" ON public.places;
CREATE POLICY "places_public_read" ON public.places FOR SELECT USING (true);
DROP POLICY IF EXISTS "places_insert_policy" ON public.places;
CREATE POLICY "places_insert_policy" ON public.places FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "places_update_policy" ON public.places;
CREATE POLICY "places_update_policy" ON public.places FOR UPDATE USING (true);
-- Nota: places_insert/update_policy son permisivas para cualquier rol (no solo el
-- dueño/admin). Documentando el estado real, no es una recomendación de diseño.
GRANT SELECT ON public.places TO anon;

-- 1.3 beer_suggestions + support_tickets (requieren is_admin(), ver sección 3)
CREATE TABLE IF NOT EXISTS public.beer_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  estilo      text,
  pais        text,
  reason      text,
  status      text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at  timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.beer_suggestions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'open',     -- 'open' | 'resolved'
  admin_note  text,
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1.4 stories + story_views + story_hidden_from
CREATE TABLE IF NOT EXISTS public.stories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('photo', 'text')),
  photo_path   text,          -- ruta en Storage (no URL); null si type='text'
  text_content text,          -- null si type='photo'
  text_bg      text NOT NULL DEFAULT '#1c1409',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stories_user_created ON public.stories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_created_at   ON public.stories (created_at DESC);

CREATE TABLE IF NOT EXISTS public.story_views (
  story_id  uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.story_hidden_from (
  owner_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (owner_id, hidden_user_id)
);

-- Reglas de visibilidad: 1) dueño siempre ve la propia; 2) perfil público y no
-- oculto para el viewer; 3) amigos (público o privado) y no oculto para el viewer.
CREATE OR REPLACE FUNCTION public.can_view_story(story_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (
    auth.uid() IS NOT NULL
    AND (
      story_owner_id = auth.uid()
      OR (
        EXISTS (SELECT 1 FROM profiles WHERE id = story_owner_id AND perfil_publico = true)
        AND NOT EXISTS (SELECT 1 FROM story_hidden_from WHERE owner_id = story_owner_id AND hidden_user_id = auth.uid())
      )
      OR (
        EXISTS (SELECT 1 FROM friendships WHERE user_id = story_owner_id AND friend_id = auth.uid())
        AND NOT EXISTS (SELECT 1 FROM story_hidden_from WHERE owner_id = story_owner_id AND hidden_user_id = auth.uid())
      )
    )
  )
$$;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stories_select" ON public.stories;
CREATE POLICY "stories_select" ON public.stories FOR SELECT USING (can_view_story(user_id));
DROP POLICY IF EXISTS "stories_insert" ON public.stories;
CREATE POLICY "stories_insert" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "stories_delete" ON public.stories;
CREATE POLICY "stories_delete" ON public.stories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_views_insert" ON public.story_views;
CREATE POLICY "story_views_insert" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
DROP POLICY IF EXISTS "story_views_select" ON public.story_views;
CREATE POLICY "story_views_select" ON public.story_views FOR SELECT USING (
  viewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);

ALTER TABLE public.story_hidden_from ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_hidden_from_all" ON public.story_hidden_from;
CREATE POLICY "story_hidden_from_all" ON public.story_hidden_from FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Limpieza automática de historias vencidas (24h) vía pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'cleanup-expired-stories',
  '0 * * * *',
  $$DELETE FROM public.stories WHERE created_at < NOW() - INTERVAL '24 hours'$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories');

-- 1.5 conversations + conversation_participants + messages (chat/DM)
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cp_user      ON public.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conv_user ON public.conversation_participants (conversation_id, user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id),
  type            text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'photo', 'beer_share', 'story_reply')),
  content         text,
  photo_url       text,
  beer_id         bigint REFERENCES public.beers_new(id),
  story_id        uuid REFERENCES public.stories(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv_created ON public.messages (conversation_id, created_at DESC);

ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;

-- is_conversation_participant: función SECURITY DEFINER para romper la
-- circularidad de RLS que se daba al referenciar conversation_participants
-- desde su propia policy (bloqueaba INSERT en messages). El alias cp2 es
-- necesario porque, al ser LANGUAGE SQL, Postgres la inlinea dentro de la
-- policy y "conversation_id" queda ambiguo si no se alias la tabla interna.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conv_id AND cp2.user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (is_conversation_participant(id));

DROP POLICY IF EXISTS "participants_select" ON public.conversation_participants;
CREATE POLICY "participants_select" ON public.conversation_participants FOR SELECT USING (is_conversation_participant(conversation_id));
DROP POLICY IF EXISTS "participants_update_own" ON public.conversation_participants;
CREATE POLICY "participants_update_own" ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (is_conversation_participant(conversation_id));
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND is_conversation_participant(conversation_id)
);

-- Mantiene conversations.last_message_at sincronizado con el último mensaje
CREATE OR REPLACE FUNCTION public.update_conv_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_conv_last_message ON public.messages;
CREATE TRIGGER trg_conv_last_message
  AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conv_last_message();

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  me      uuid := auth.uid();
  conv_id uuid;
BEGIN
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = me)
    AND EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = other_user_id)
    AND (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, me), (conv_id, other_user_id);
  END IF;

  RETURN conv_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;

-- Nota histórica: get_my_conversations() usa auth.uid() (lee un GUC de sesión).
-- Al quedar marcada STABLE, PostgREST podía evaluarla en plan-time antes de que
-- el GUC estuviera seteado → auth.uid() = NULL → 0 filas. Se corrigió dejándola
-- VOLATILE (default, sin STABLE) — así queda documentado abajo.
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE(
  conversation_id uuid, type text, name text, other_user_id uuid, other_nombre text,
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
    (SELECT p.nombre FROM conversation_participants cp2
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
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- Realtime: chat necesita estas 3 tablas en la publicación
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;

-- 1.6 feed_reactions (reacciones 🍺🔥😒🎓 sobre actividad del feed)
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_user_id uuid        NOT NULL,
  activity_beer_id bigint      NOT NULL,
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction         text        NOT NULL CHECK (reaction IN ('salud', 'fuego', 'envidia', 'maestro')),
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT fk_activity FOREIGN KEY (activity_user_id, activity_beer_id)
    REFERENCES public.activity_log(user_id, beer_id) ON DELETE CASCADE,
  CONSTRAINT uq_one_reaction_per_user UNIQUE (activity_user_id, activity_beer_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_activity ON public.feed_reactions (activity_user_id, activity_beer_id);

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reactions_read" ON public.feed_reactions;
CREATE POLICY "reactions_read" ON public.feed_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reactions_insert" ON public.feed_reactions;
CREATE POLICY "reactions_insert" ON public.feed_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "reactions_update" ON public.feed_reactions;
CREATE POLICY "reactions_update" ON public.feed_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "reactions_delete" ON public.feed_reactions;
CREATE POLICY "reactions_delete" ON public.feed_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 2. COLUMNAS NUEVAS EN TABLAS YA EXISTENTES
-- ────────────────────────────────────────────────────────────

-- 2.1 profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio                   text,
  ADD COLUMN IF NOT EXISTS pais_origen           text,
  ADD COLUMN IF NOT EXISTS featured_badges       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perfil_publico        boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS aparecer_en_ranking   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ranking_consent_shown boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_language    text    DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS is_admin              boolean DEFAULT false;

-- 2.2 beers_new
ALTER TABLE public.beers_new ADD COLUMN IF NOT EXISTS info_detallada text;
ALTER TABLE public.beers_new ADD COLUMN IF NOT EXISTS sugerida_por_user_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.beers_new ADD COLUMN IF NOT EXISTS sugerida_por_nombre text;
ALTER TABLE public.beers_new
  ADD COLUMN IF NOT EXISTS origen_lat double precision,
  ADD COLUMN IF NOT EXISTS origen_lng double precision;
ALTER TABLE public.beers_new
  ADD COLUMN IF NOT EXISTS rareza text NOT NULL DEFAULT 'comun'
    CHECK (rareza IN ('comun', 'poco_comun', 'rara', 'epica', 'legendaria', 'mitica')),
  ADD COLUMN IF NOT EXISTS es_edicion_especial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_edicion text;
ALTER TABLE public.beers_new ADD COLUMN IF NOT EXISTS familia text;
CREATE INDEX IF NOT EXISTS idx_beers_new_familia ON public.beers_new (familia) WHERE familia IS NOT NULL;

-- 2.3 user_beers (requiere que public.places ya exista, ver sección 1.2)
ALTER TABLE public.user_beers
  ADD COLUMN IF NOT EXISTS location_lat    double precision,
  ADD COLUMN IF NOT EXISTS location_lng    double precision,
  ADD COLUMN IF NOT EXISTS location_name   text,
  ADD COLUMN IF NOT EXISTS location_public boolean DEFAULT true;
ALTER TABLE public.user_beers ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.places(id);
CREATE INDEX IF NOT EXISTS user_beers_place_id_idx ON public.user_beers (place_id);
ALTER TABLE public.user_beers
  ADD COLUMN IF NOT EXISTS en_coleccion      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condicion         text    CHECK (condicion IN ('abierta', 'sellada')),
  ADD COLUMN IF NOT EXISTS fecha_adquisicion date,
  ADD COLUMN IF NOT EXISTS notas_coleccion   text;
CREATE INDEX IF NOT EXISTS idx_user_beers_coleccion ON public.user_beers (user_id, en_coleccion) WHERE en_coleccion = true;

-- 2.4 user_achievements
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS nombre text;


-- ────────────────────────────────────────────────────────────
-- 3. ADMIN: is_admin(), beers_new_admin_insert, beer_suggestions / support_tickets RPCs
--    (la política de UPDATE en beers_new ya se documentó en
--    20260717000000_beers_new_admin_update_policy.sql)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS "bs_insert" ON public.beer_suggestions;
CREATE POLICY "bs_insert" ON public.beer_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "bs_select" ON public.beer_suggestions;
CREATE POLICY "bs_select" ON public.beer_suggestions FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "bs_update" ON public.beer_suggestions;
CREATE POLICY "bs_update" ON public.beer_suggestions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "st_insert" ON public.support_tickets;
CREATE POLICY "st_insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "st_select" ON public.support_tickets;
CREATE POLICY "st_select" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "st_update" ON public.support_tickets;
CREATE POLICY "st_update" ON public.support_tickets FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "beers_new_admin_insert" ON public.beers_new;
CREATE POLICY "beers_new_admin_insert" ON public.beers_new FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE OR REPLACE FUNCTION public.approve_beer_suggestion(p_suggestion_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_s    beer_suggestions%ROWTYPE;
  v_name text;
  v_id   uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_s FROM beer_suggestions WHERE id = p_suggestion_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sugerencia no encontrada o ya revisada'; END IF;

  SELECT nombre INTO v_name FROM profiles WHERE id = v_s.user_id;

  INSERT INTO beers_new (nombre, estilo, pais, sugerida_por_user_id, sugerida_por_nombre)
  VALUES (v_s.nombre, v_s.estilo, v_s.pais, v_s.user_id, v_name)
  RETURNING id INTO v_id;

  UPDATE beer_suggestions SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_suggestion_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_beer_suggestion(p_suggestion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE beer_suggestions SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_suggestion_id AND status = 'pending';
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. "LUGAR": RPCs públicas de get_lugar_beers / get_lugar_visitors,
--    trigger que autocompleta user_beers.place_id
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assign_place_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_norm text;
  v_pid  uuid;
BEGIN
  IF NEW.location_name IS NOT NULL AND trim(NEW.location_name) != '' THEN
    v_norm := normalize_place_name(NEW.location_name);
    INSERT INTO places (nombre, nombre_normalizado, lat, lng)
    VALUES (NEW.location_name, v_norm, NEW.location_lat, NEW.location_lng)
    ON CONFLICT (nombre_normalizado) DO NOTHING;
    SELECT id INTO v_pid FROM places WHERE nombre_normalizado = v_norm;
    NEW.place_id := v_pid;
  ELSE
    NEW.place_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assign_place_id ON public.user_beers;
CREATE TRIGGER trg_assign_place_id
  BEFORE INSERT OR UPDATE OF location_name, location_lat, location_lng
  ON public.user_beers FOR EACH ROW EXECUTE FUNCTION assign_place_id();

CREATE OR REPLACE FUNCTION public.get_lugar_beers(p_place_id uuid)
RETURNS TABLE(beer_id bigint, nombre text, estilo text, foto_url text, veces bigint, rating_promedio numeric, usuarios bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id, b.nombre, b.estilo, b.foto_url,
    COUNT(*)::bigint,
    ROUND(AVG(ub."Rating")::numeric, 2),
    COUNT(DISTINCT ub.user_id)::bigint
  FROM user_beers ub
  JOIN beers_new b ON ub.beer_id = b.id
  WHERE ub.place_id = p_place_id AND ub.location_public = true
  GROUP BY b.id, b.nombre, b.estilo, b.foto_url
  ORDER BY COUNT(*) DESC, AVG(ub."Rating") DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_lugar_visitors(p_place_id uuid)
RETURNS TABLE(user_id uuid, nombre text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT DISTINCT ub.user_id, p.nombre, p.avatar_url
  FROM user_beers ub
  JOIN profiles p ON ub.user_id = p.id
  WHERE ub.place_id = p_place_id AND ub.location_public = true AND p.perfil_publico = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_lugar_beers(uuid)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_lugar_visitors(uuid) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 5. FUNCIONES EXISTENTES REEMPLAZADAS (get_friend_feed / get_ranking_*)
--    Cambio de RETURNS TABLE ⇒ requieren DROP FUNCTION antes de recrear.
-- ────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_friend_feed(int);
CREATE FUNCTION public.get_friend_feed(lim integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid, nombre text, avatar_url text, beer_id bigint, beer_nombre text,
  beer_foto_url text, action text, rating numeric, comment text, user_photo_url text,
  location_name text, location_public boolean, place_id uuid, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    al.user_id, p.nombre, p.avatar_url,
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

-- Ranking: desde "verified_entries_ranking" solo cuentan cervezas con foto
-- (user_photo_url), y suman XP de user_badges además de user_achievements.
-- Desde "profile_settings_and_privacy" también filtran por aparecer_en_ranking.
DROP FUNCTION IF EXISTS public.get_ranking_global(int);
CREATE FUNCTION public.get_ranking_global(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, total_xp bigint, total_beers bigint, rank_pos bigint)
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
  SELECT p.id, p.nombre, p.avatar_url,
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
RETURNS TABLE(id uuid, nombre text, avatar_url text, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH weekly AS (
    SELECT user_id, COALESCE(SUM("XP"), 0)::bigint AS xp, COUNT(*)::bigint AS beers
    FROM user_beers
    WHERE created_at >= now() - interval '7 days'
      AND user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, w.xp AS total_xp, w.beers AS total_beers,
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
RETURNS TABLE(id uuid, nombre text, avatar_url text, total_xp bigint, total_beers bigint, rank_pos bigint)
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
  SELECT p.id, p.nombre, p.avatar_url,
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

-- Variantes de ranking por cantidad de cervezas verificadas (mismo shape de retorno
-- que las de XP para reusar el mismo componente de frontend)
CREATE OR REPLACE FUNCTION public.get_ranking_global_beers(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, total_xp bigint, total_beers bigint, rank_pos bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH beer_counts AS (
    SELECT user_id, COUNT(*)::bigint AS beers
    FROM user_beers WHERE user_photo_url IS NOT NULL AND user_photo_url <> ''
    GROUP BY user_id
  )
  SELECT p.id, p.nombre, p.avatar_url, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN beer_counts bc ON bc.user_id = p.id
  WHERE p.aparecer_en_ranking IS NOT FALSE
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_global_beers(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ranking_amigos_beers(lim int DEFAULT 50)
RETURNS TABLE(id uuid, nombre text, avatar_url text, total_xp bigint, total_beers bigint, rank_pos bigint)
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
  SELECT p.id, p.nombre, p.avatar_url, bc.beers AS total_xp, bc.beers AS total_beers,
    RANK() OVER (ORDER BY bc.beers DESC) AS rank_pos
  FROM profiles p
  JOIN my_circle mc ON mc.uid = p.id
  JOIN beer_counts bc ON bc.user_id = p.id
  ORDER BY rank_pos LIMIT lim;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_ranking_amigos_beers(int) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 6. STORAGE: buckets faltantes + políticas de storage.objects
-- ────────────────────────────────────────────────────────────

-- 6.1 Buckets creados desde el Dashboard (no dejan rastro en SQL Editor) —
-- reconstruidos desde el estado real de storage.buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('Cervezas', 'Cervezas', true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-beers', 'user-beers', true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stories', 'stories', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 6.2 Cervezas (fotos del catálogo, sube el admin desde AdminPanel)
DROP POLICY IF EXISTS "cervezas_public_read" ON storage.objects;
CREATE POLICY "cervezas_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'Cervezas');

DROP POLICY IF EXISTS "cervezas_admin_insert" ON storage.objects;
CREATE POLICY "cervezas_admin_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'Cervezas' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "cervezas_admin_update" ON storage.objects;
CREATE POLICY "cervezas_admin_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'Cervezas' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "cervezas_admin_delete" ON storage.objects;
CREATE POLICY "cervezas_admin_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'Cervezas' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 6.3 user-beers (foto que cada usuario sube de su propia cerveza)
DROP POLICY IF EXISTS "user_beers_public_read" ON storage.objects;
CREATE POLICY "user_beers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'user-beers');
DROP POLICY IF EXISTS "user_beers_own_insert" ON storage.objects;
CREATE POLICY "user_beers_own_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'user-beers' AND (storage.foldername(name))[1] = (auth.uid())::text
);
DROP POLICY IF EXISTS "user_beers_own_update" ON storage.objects;
CREATE POLICY "user_beers_own_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'user-beers' AND (storage.foldername(name))[1] = (auth.uid())::text
);
DROP POLICY IF EXISTS "user_beers_own_delete" ON storage.objects;
CREATE POLICY "user_beers_own_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'user-beers' AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 6.4 chat-media (fotos e imágenes compartidas en el chat)
DROP POLICY IF EXISTS "chat_media_upload" ON storage.objects;
CREATE POLICY "chat_media_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "chat_media_read" ON storage.objects;
CREATE POLICY "chat_media_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6.5 stories (bucket privado, requiere signed URLs; path: {user_id}/{story_id}.jpg)
DROP POLICY IF EXISTS "stories_storage_select" ON storage.objects;
CREATE POLICY "stories_storage_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'stories' AND can_view_story((storage.foldername(name))[1]::uuid)
);
DROP POLICY IF EXISTS "stories_storage_insert" ON storage.objects;
CREATE POLICY "stories_storage_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "stories_storage_delete" ON storage.objects;
CREATE POLICY "stories_storage_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]
);
