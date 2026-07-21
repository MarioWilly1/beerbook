-- ============================================================
-- FIX ALTO (audit de seguridad 2026-07-21): user_beers.XP/Rating y
-- filas fabricadas en user_achievements/user_badges.
--
-- Problema: los tres flujos de gamificación se escriben con
-- .upsert()/.insert() directos del cliente, sin validación
-- server-side:
--   - user_beers: XP y Rating los calcula/decide el cliente
--     (computeEntryXP() en src/utils/xp.js) y los manda tal cual en
--     el payload. update_own_beers solo tenía USING, sin WITH CHECK,
--     así que un usuario podía hacer
--       .update({ XP: 999999999, Rating: 999 })
--     sobre su propia fila.
--   - user_achievements / user_badges: ach_insert_own y
--     user_badges_insert solo validan "la fila es tuya"
--     (auth.uid() = user_id), no que el slug/tier exista ni que
--     xp_awarded corresponda a ese logro/insignia. El catálogo real
--     (ACHIEVEMENTS / BADGE_DEFS) vive solo en JS — el servidor no
--     tenía ninguna noción de qué es un logro "válido".
--
-- Mismo patrón que el fix de profiles (20260719030000): un WITH
-- CHECK de RLS no puede recalcular valores derivados ni comparar
-- contra un catálogo con lógica condicional, así que se usan
-- triggers BEFORE INSERT/UPDATE.
--
-- A diferencia del fix de profiles, acá NO hay ninguna función
-- SECURITY DEFINER que hoy escriba en estas tablas (confirmado: no
-- existe ningún INSERT/UPDATE a user_beers/user_achievements/
-- user_badges dentro de funciones SQL), así que los triggers no
-- distinguen por current_user — recalculan/validan siempre, para
-- cualquier origen del INSERT/UPDATE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. user_beers: XP recalculado server-side, Rating validado
-- ────────────────────────────────────────────────────────────
-- Replica exacta de computeEntryXP() (src/utils/xp.js) + el bonus de
-- +20 por primera vez que se registra una cerveza coleccionable
-- (rareza rara/epica/legendaria/mitica o edición especial), que en
-- el cliente vive aparte en BeerCard.js (collectionBonus). Ese bonus
-- solo aplica en el alta (TG_OP = INSERT) — en una edición
-- (TG_OP = UPDATE) el cliente nunca lo vuelve a sumar.
CREATE OR REPLACE FUNCTION public.compute_user_beers_xp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_xp   int := 10; -- REGISTER
  bonus_xp  int := 0;
  has_rating  boolean;
  has_comment boolean;
  has_photo   boolean;
  beer_rareza   text;
  beer_especial boolean;
BEGIN
  IF NEW."Rating" IS NOT NULL
     AND (NEW."Rating" < 1 OR NEW."Rating" > 5 OR (NEW."Rating" * 2) <> floor(NEW."Rating" * 2)) THEN
    RAISE EXCEPTION 'Rating inválido: debe ser NULL o un valor entre 1 y 5 en pasos de 0.5';
  END IF;

  has_rating  := NEW."Rating" IS NOT NULL AND NEW."Rating" > 0;
  has_comment := NEW.comment IS NOT NULL AND length(trim(NEW.comment)) > 0;
  has_photo   := NEW.user_photo_url IS NOT NULL AND length(trim(NEW.user_photo_url)) > 0;

  IF has_rating  THEN base_xp := base_xp + 15; END IF;
  IF has_comment THEN base_xp := base_xp + 20; END IF;
  IF has_photo   THEN base_xp := base_xp + 25; END IF;
  IF has_rating AND has_comment AND has_photo THEN base_xp := base_xp + 10; END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT rareza, es_edicion_especial INTO beer_rareza, beer_especial
    FROM public.beers_new WHERE id = NEW.beer_id;

    IF beer_especial IS TRUE OR beer_rareza IN ('rara', 'epica', 'legendaria', 'mitica') THEN
      bonus_xp := 20;
    END IF;
  END IF;

  NEW."XP" := base_xp + bonus_xp;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_user_beers_xp ON public.user_beers;
CREATE TRIGGER trg_compute_user_beers_xp
  BEFORE INSERT OR UPDATE ON public.user_beers
  FOR EACH ROW EXECUTE FUNCTION public.compute_user_beers_xp();

-- ────────────────────────────────────────────────────────────
-- 2. user_achievements: catálogo real + validación de slug/xp
-- ────────────────────────────────────────────────────────────
-- Espejo en la base del array ACHIEVEMENTS de src/utils/achievements.js
-- (48 logros estáticos). Las "series" (slug "serie-{familia}") no son
-- estáticas — se validan aparte, calculando la familia y su XP
-- esperado directamente desde beers_new.
--
-- Alcance de esta validación: confirma que el slug exista y que
-- xp_awarded sea exactamente el valor correcto para ese slug (cierra
-- el vector "XP arbitrario / logro inventado"). NO revalida las 48
-- condiciones de desbloqueo (check()) de achievements.js del lado
-- del servidor — reimplementar esas 48 condiciones en SQL es un
-- trabajo bastante más grande y no fue parte de lo pedido. Riesgo
-- residual: un usuario podría auto-otorgarse un logro real de forma
-- prematura, pero ya no con un valor de XP arbitrario.
CREATE TABLE IF NOT EXISTS public.achievement_catalog (
  slug       text PRIMARY KEY,
  xp_awarded int  NOT NULL CHECK (xp_awarded >= 0)
);

-- Supabase activa RLS automáticamente en tablas nuevas. Es un catálogo
-- público (ya vive expuesto en el bundle JS del frontend) — solo
-- necesita ser legible por el trigger/cliente; sin policies de
-- escritura, ni anon ni authenticated pueden tocarlo.
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievement_catalog_read" ON public.achievement_catalog;
CREATE POLICY "achievement_catalog_read" ON public.achievement_catalog
  FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.achievement_catalog (slug, xp_awarded) VALUES
  ('primera-ronda', 10), ('primera-decena', 25), ('seis-pack', 20),
  ('caja-completa', 50), ('bebedor-aplicado', 75), ('barril', 100),
  ('fotografo-master', 45), ('coleccionista', 200), ('maestro-catador', 500),
  ('fotografo', 15), ('cronista', 10), ('cronista-mayor', 30),
  ('critico', 35), ('maestro-critico', 60), ('perfeccionista', 50),
  ('entradas-de-oro', 80),
  ('primer-viaje', 10), ('viajero', 30), ('ciudadano-del-mundo', 80),
  ('embajador', 100), ('atlas-cervecero', 200),
  ('estudiante-cervecero', 15), ('explorador-de-estilos', 25),
  ('polyglota-cervecero', 60), ('maestro-de-estilos', 100),
  ('nomada', 10), ('bar-hopper', 30), ('explorador-local', 60),
  ('primer-tesoro', 15), ('vitrina-inicial', 40), ('bodega-propia', 80),
  ('coleccion-selecta', 200), ('primer-epica', 20), ('primer-legendaria', 35),
  ('primer-mitica', 100), ('edicion-especial', 25),
  ('iniciado', 10), ('experto', 25), ('maestro-xp', 50), ('gran-maestro', 100),
  ('primer-habito', 10), ('constante', 40), ('ritmo-constante', 60),
  ('leyenda-activa', 150), ('obsesionado', 250),
  ('primer-contacto', 15), ('companeros-de-cata', 40), ('clan-cervecero', 80)
ON CONFLICT (slug) DO UPDATE SET xp_awarded = EXCLUDED.xp_awarded;

-- Equivalente SQL de slugify() en src/utils/achievements.js, para
-- reconstruir el slug "serie-{familia}" y compararlo contra lo que
-- manda el cliente.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify_family(input text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT trim(both '-' from regexp_replace(lower(unaccent(input)), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.validate_user_achievement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  expected_xp    int;
  family_name    text;
  family_count   int;
  missing_count  int;
BEGIN
  IF NEW.slug LIKE 'serie-%' THEN
    SELECT familia, count(*) INTO family_name, family_count
    FROM public.beers_new
    WHERE familia IS NOT NULL
      AND public.slugify_family(familia) = substring(NEW.slug FROM 7)
    GROUP BY familia;

    IF family_name IS NULL OR family_count < 2 THEN
      RAISE EXCEPTION 'Logro inválido: % no corresponde a ninguna familia completable', NEW.slug;
    END IF;

    SELECT count(*) INTO missing_count
    FROM public.beers_new b
    WHERE b.familia = family_name
      AND NOT EXISTS (
        SELECT 1 FROM public.user_beers ub
        WHERE ub.user_id = NEW.user_id AND ub.beer_id = b.id
      );

    IF missing_count > 0 THEN
      RAISE EXCEPTION 'Logro inválido: todavía no completaste la familia "%"', family_name;
    END IF;

    expected_xp := 50 * family_count;
  ELSE
    SELECT xp_awarded INTO expected_xp
    FROM public.achievement_catalog WHERE slug = NEW.slug;

    IF expected_xp IS NULL THEN
      RAISE EXCEPTION 'Logro inválido: % no existe en el catálogo', NEW.slug;
    END IF;
  END IF;

  IF NEW.xp_awarded IS DISTINCT FROM expected_xp THEN
    RAISE EXCEPTION 'XP inválido para %: esperado %, recibido %', NEW.slug, expected_xp, NEW.xp_awarded;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_achievement ON public.user_achievements;
CREATE TRIGGER trg_validate_user_achievement
  BEFORE INSERT ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_achievement();

-- ────────────────────────────────────────────────────────────
-- 3. user_badges: catálogo real de badge_slug + xp por tier
-- ────────────────────────────────────────────────────────────
-- Espejo de BADGE_DEFS / TIER_META en src/utils/badges.js. El XP no
-- depende de la insignia, solo del tier (25/75/150/300).
CREATE OR REPLACE FUNCTION public.validate_user_badge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  expected_xp int;
BEGIN
  IF NEW.badge_slug NOT IN ('catador', 'viajero', 'explorador', 'fotografo', 'critico') THEN
    RAISE EXCEPTION 'Insignia inválida: % no existe en el catálogo', NEW.badge_slug;
  END IF;

  expected_xp := CASE NEW.tier
    WHEN 'bronce'  THEN 25
    WHEN 'plata'   THEN 75
    WHEN 'oro'     THEN 150
    WHEN 'platino' THEN 300
  END;

  IF NEW.xp_awarded IS DISTINCT FROM expected_xp THEN
    RAISE EXCEPTION 'XP inválido para insignia % tier %: esperado %, recibido %',
      NEW.badge_slug, NEW.tier, expected_xp, NEW.xp_awarded;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_badge ON public.user_badges;
CREATE TRIGGER trg_validate_user_badge
  BEFORE INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_badge();
