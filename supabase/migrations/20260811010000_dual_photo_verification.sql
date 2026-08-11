BEGIN;

-- ============================================================
-- Fase F2 — "Verificación Reforzada": segunda insignia ADITIVA, no
-- redefine "Verificada" (que sigue siendo solo user_photo_url, usada
-- tal cual en achievements/ranking RPCs/stats). Selfie inmediatamente
-- después de la foto de la cerveza (estilo BeReal, secuencial), ambas
-- tomadas en el mismo flujo — ver DualPhotoVerification.jsx.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Columnas nuevas — mismo patrón que user_photo_url/photo_hash,
-- en las dos tablas que ya lo tienen (bitácora + representativa).
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.beer_tastings ADD COLUMN IF NOT EXISTS selfie_photo_url text;
ALTER TABLE public.beer_tastings ADD COLUMN IF NOT EXISTS selfie_photo_hash bigint;
ALTER TABLE public.user_beers    ADD COLUMN IF NOT EXISTS selfie_photo_url text;
ALTER TABLE public.user_beers    ADD COLUMN IF NOT EXISTS selfie_photo_hash bigint;

-- ────────────────────────────────────────────────────────────
-- 2. Cascada beer_tastings → user_beers: agrega selfie_photo_url/hash
-- al mismo mecanismo que ya sincroniza user_photo_url/photo_hash
-- (incluye el fix de 20260810000000 — COALESCE del rating solo en
-- INSERT, la rama UPDATE queda intacta).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_user_beers_from_tasting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_beers SET
      "XP"               = "XP" + NEW.xp_earned,
      "Rating"           = COALESCE(NEW.rating, "Rating"),
      comment            = COALESCE(NEW.comment, ''),
      user_photo_url     = NEW.user_photo_url,
      photo_hash         = NEW.photo_hash,
      selfie_photo_url   = NEW.selfie_photo_url,
      selfie_photo_hash  = NEW.selfie_photo_hash,
      location_lat       = NEW.location_lat,
      location_lng       = NEW.location_lng,
      location_name      = NEW.location_name,
      location_public    = NEW.location_public,
      price_paid         = NEW.price_paid
    WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id = (
      SELECT MAX(id) FROM public.beer_tastings
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id
    ) THEN
      UPDATE public.user_beers SET
        "Rating"           = NEW.rating,
        comment            = COALESCE(NEW.comment, ''),
        user_photo_url     = NEW.user_photo_url,
        photo_hash         = NEW.photo_hash,
        selfie_photo_url   = NEW.selfie_photo_url,
        selfie_photo_hash  = NEW.selfie_photo_hash,
        location_lat       = NEW.location_lat,
        location_lng       = NEW.location_lng,
        location_name      = NEW.location_name,
        location_public    = NEW.location_public,
        price_paid         = NEW.price_paid
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. entry_flags: nueva fuente 'duplicate_selfie', distinta de
-- 'duplicate_photo' — mismo mecanismo de detección pero threshold
-- mucho más ajustado (selfies genuinas del mismo usuario ya se
-- parecen entre sí; la señal de fraude acá es reutilizar el MISMO
-- archivo, no una similitud general).
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.entry_flags DROP CONSTRAINT entry_flags_source_check;
ALTER TABLE public.entry_flags ADD CONSTRAINT entry_flags_source_check
  CHECK (source IN ('duplicate_photo', 'duplicate_selfie', 'velocity', 'community_report'));

DROP INDEX IF EXISTS public.entry_flags_auto_unique;
CREATE UNIQUE INDEX entry_flags_auto_unique
  ON public.entry_flags (tasting_id, source)
  WHERE source IN ('duplicate_photo', 'duplicate_selfie', 'velocity') AND tasting_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_photo_flags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_dup_beer_id bigint;
  v_dup_distance int;
  v_recent_count int;
BEGIN
  IF NEW.photo_hash IS NOT NULL THEN
    SELECT beer_id, bit_count((photo_hash # NEW.photo_hash)::bit(64))
      INTO v_dup_beer_id, v_dup_distance
    FROM public.beer_tastings
    WHERE user_id = NEW.user_id
      AND beer_id <> NEW.beer_id
      AND photo_hash IS NOT NULL
      AND bit_count((photo_hash # NEW.photo_hash)::bit(64)) <= 5
    ORDER BY bit_count((photo_hash # NEW.photo_hash)::bit(64))
    LIMIT 1;

    IF v_dup_beer_id IS NOT NULL THEN
      INSERT INTO public.entry_flags (user_id, beer_id, tasting_id, source, reason)
      VALUES (
        NEW.user_id, NEW.beer_id, NEW.id, 'duplicate_photo',
        format('Foto casi idéntica (distancia %s/64) a la usada en beer_id=%s', v_dup_distance, v_dup_beer_id)
      )
      ON CONFLICT (tasting_id, source) WHERE source IN ('duplicate_photo', 'duplicate_selfie', 'velocity') AND tasting_id IS NOT NULL
      DO UPDATE SET reason = EXCLUDED.reason, created_at = now(), status = 'pending';
    END IF;
  END IF;

  -- Verificación Reforzada: selfie casi idéntica reutilizada en otra
  -- cerveza — threshold <= 2 (mucho más estricto que el de la foto de
  -- la cerveza), porque una persona real sacándose selfies distintas
  -- en momentos distintos casi nunca cae tan cerca por azar.
  IF NEW.selfie_photo_hash IS NOT NULL THEN
    SELECT beer_id, bit_count((selfie_photo_hash # NEW.selfie_photo_hash)::bit(64))
      INTO v_dup_beer_id, v_dup_distance
    FROM public.beer_tastings
    WHERE user_id = NEW.user_id
      AND beer_id <> NEW.beer_id
      AND selfie_photo_hash IS NOT NULL
      AND bit_count((selfie_photo_hash # NEW.selfie_photo_hash)::bit(64)) <= 2
    ORDER BY bit_count((selfie_photo_hash # NEW.selfie_photo_hash)::bit(64))
    LIMIT 1;

    IF v_dup_beer_id IS NOT NULL THEN
      INSERT INTO public.entry_flags (user_id, beer_id, tasting_id, source, reason)
      VALUES (
        NEW.user_id, NEW.beer_id, NEW.id, 'duplicate_selfie',
        format('Selfie casi idéntica (distancia %s/64) a la usada en beer_id=%s', v_dup_distance, v_dup_beer_id)
      )
      ON CONFLICT (tasting_id, source) WHERE source IN ('duplicate_photo', 'duplicate_selfie', 'velocity') AND tasting_id IS NOT NULL
      DO UPDATE SET reason = EXCLUDED.reason, created_at = now(), status = 'pending';
    END IF;
  END IF;

  SELECT count(*) INTO v_recent_count
  FROM public.beer_tastings
  WHERE user_id = NEW.user_id
    AND user_photo_url IS NOT NULL
    AND created_at >= now() - interval '1 hour';

  IF v_recent_count > 10 THEN
    INSERT INTO public.entry_flags (user_id, beer_id, tasting_id, source, reason)
    VALUES (
      NEW.user_id, NEW.beer_id, NEW.id, 'velocity',
      format('%s entradas verificadas en la última hora', v_recent_count)
    )
    ON CONFLICT (tasting_id, source) WHERE source IN ('duplicate_photo', 'duplicate_selfie', 'velocity') AND tasting_id IS NOT NULL
    DO UPDATE SET reason = EXCLUDED.reason, created_at = now(), status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_photo_flags_tastings ON public.beer_tastings;
CREATE TRIGGER trg_check_photo_flags_tastings
  AFTER INSERT ON public.beer_tastings
  FOR EACH ROW
  WHEN (NEW.user_photo_url IS NOT NULL OR NEW.selfie_photo_url IS NOT NULL)
  EXECUTE FUNCTION public.check_photo_flags();

-- ────────────────────────────────────────────────────────────
-- 4. admin_unverify_entry: al desverificar también limpia la selfie
-- (una entrada reportada/confirmada pierde las dos fotos, no solo la
-- de la cerveza — evita que quede "Verificación Reforzada" activa
-- sobre una entrada que un admin ya invalidó).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_unverify_entry(p_flag_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user_id uuid;
  v_beer_id bigint;
  v_tasting_id bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT user_id, beer_id, tasting_id INTO v_user_id, v_beer_id, v_tasting_id
  FROM public.entry_flags WHERE id = p_flag_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reporte no encontrado';
  END IF;

  IF v_tasting_id IS NOT NULL THEN
    UPDATE public.beer_tastings
    SET user_photo_url = NULL, photo_hash = NULL, selfie_photo_url = NULL, selfie_photo_hash = NULL
    WHERE id = v_tasting_id;
  END IF;

  UPDATE public.user_beers
  SET user_photo_url = NULL, photo_hash = NULL, selfie_photo_url = NULL, selfie_photo_hash = NULL
  WHERE user_id = v_user_id AND beer_id = v_beer_id;

  UPDATE public.entry_flags
  SET status = 'confirmed', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_flag_id;
END;
$$;

COMMIT;
