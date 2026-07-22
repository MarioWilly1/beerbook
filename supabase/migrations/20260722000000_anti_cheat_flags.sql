-- ============================================================
-- Anti-trampa en entradas "verificadas" (con foto): 3 capas de
-- detección/prevención, ninguna bloquea automáticamente — todo cae
-- en entry_flags para revisión de un admin.
--
--  1) Foto duplicada: mismo usuario reutilizando la misma imagen (o
--     una casi idéntica) en cervezas distintas — hash perceptual
--     (dHash de 64 bits) calculado client-side, comparado server-side
--     solo contra las propias entradas del usuario.
--  2) Velocidad sospechosa: más de 10 entradas verificadas propias
--     en la última hora.
--  3) Reporte comunitario: cualquier usuario autenticado puede
--     marcar una entrada ajena con un motivo breve.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Hash perceptual por entrada
-- ────────────────────────────────────────────────────────────
-- dHash de 64 bits calculado en el navegador sobre el mismo canvas
-- que ya redimensiona/comprime la foto en MiCuaderno.js — no agrega
-- costo de red ni de decodificación. Se guarda como bigint (patrón de
-- 64 bits en complemento a dos); la comparación entre dos hashes es
-- bit_count(a # b) = distancia de Hamming, nativo en PG14+.
ALTER TABLE public.user_beers ADD COLUMN IF NOT EXISTS photo_hash bigint;

-- ────────────────────────────────────────────────────────────
-- 2. entry_flags — tabla unificada para las 3 fuentes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entry_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  beer_id     bigint NOT NULL REFERENCES public.beers_new(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('duplicate_photo', 'velocity', 'community_report')),
  reason      text,
  reporter_id uuid REFERENCES public.profiles(id),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'confirmed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  -- community_report siempre trae reportante + motivo (1-300 chars);
  -- los flags automáticos (duplicate_photo/velocity) nunca tienen reportante.
  CONSTRAINT entry_flags_community_report_shape CHECK (
    (source = 'community_report' AND reporter_id IS NOT NULL
       AND reason IS NOT NULL AND char_length(trim(reason)) BETWEEN 1 AND 300)
    OR (source <> 'community_report' AND reporter_id IS NULL)
  ),
  CONSTRAINT entry_flags_no_self_report CHECK (reporter_id IS NULL OR reporter_id <> user_id)
);

-- Los checks automáticos no deben duplicar fila en cada re-chequeo —
-- se actualiza la existente (ver check_photo_flags() más abajo).
CREATE UNIQUE INDEX IF NOT EXISTS entry_flags_auto_unique
  ON public.entry_flags (user_id, beer_id, source)
  WHERE source IN ('duplicate_photo', 'velocity');

-- Un mismo reportante no puede reportar la misma entrada dos veces,
-- pero SÍ pueden reportarla varios usuarios distintos (cada uno su fila).
CREATE UNIQUE INDEX IF NOT EXISTS entry_flags_report_unique
  ON public.entry_flags (user_id, beer_id, reporter_id)
  WHERE source = 'community_report';

CREATE INDEX IF NOT EXISTS entry_flags_status_idx ON public.entry_flags (status, created_at DESC);

ALTER TABLE public.entry_flags ENABLE ROW LEVEL SECURITY;

-- Reportar: cualquier autenticado inserta SU PROPIO reporte, nunca
-- sobre su propia entrada. El resto de la validación (motivo
-- 1-300 chars) queda en el CHECK constraint de arriba.
CREATE POLICY "entry_flags_report_insert" ON public.entry_flags
  FOR INSERT TO authenticated WITH CHECK (
    source = 'community_report'
    AND reporter_id = auth.uid()
    AND user_id <> auth.uid()
  );

-- Lectura: el dueño de la entrada ve sus propios flags (transparencia),
-- el reportante ve lo que reportó, y el admin ve todo.
CREATE POLICY "entry_flags_select" ON public.entry_flags
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR reporter_id = auth.uid() OR is_admin()
  );

-- Resolver (dismiss/confirm) queda reservado a admin — igual patrón
-- que support_tickets/beer_suggestions (is_admin() en USING/WITH CHECK).
CREATE POLICY "entry_flags_admin_update" ON public.entry_flags
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ────────────────────────────────────────────────────────────
-- 3. Detección automática: trigger AFTER en user_beers
-- ────────────────────────────────────────────────────────────
-- SECURITY DEFINER porque necesita insertar en entry_flags con
-- source != 'community_report', algo que la policy de INSERT no deja
-- hacer a un usuario común (mismo motivo que assign_place_id()).
-- AFTER (no BEFORE) para no interferir con compute_user_beers_xp();
-- WHEN NEW.user_photo_url IS NOT NULL para no correr en cada guardado
-- sin foto, y para que "desverificar" (que limpia la foto) no
-- retrigger esto.
CREATE OR REPLACE FUNCTION public.check_photo_flags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_dup_beer_id bigint;
  v_dup_distance int;
  v_recent_count int;
BEGIN
  -- 1) Foto duplicada: mismo usuario, otra cerveza, distancia de
  -- Hamming <= 5 bits de 64 (prácticamente la misma imagen).
  IF NEW.photo_hash IS NOT NULL THEN
    SELECT beer_id, bit_count((photo_hash # NEW.photo_hash)::bit(64))
      INTO v_dup_beer_id, v_dup_distance
    FROM public.user_beers
    WHERE user_id = NEW.user_id
      AND beer_id <> NEW.beer_id
      AND photo_hash IS NOT NULL
      AND bit_count((photo_hash # NEW.photo_hash)::bit(64)) <= 5
    ORDER BY bit_count((photo_hash # NEW.photo_hash)::bit(64))
    LIMIT 1;

    IF v_dup_beer_id IS NOT NULL THEN
      INSERT INTO public.entry_flags (user_id, beer_id, source, reason)
      VALUES (
        NEW.user_id, NEW.beer_id, 'duplicate_photo',
        format('Foto casi idéntica (distancia %s/64) a la usada en beer_id=%s', v_dup_distance, v_dup_beer_id)
      )
      ON CONFLICT (user_id, beer_id, source) WHERE source IN ('duplicate_photo', 'velocity')
      DO UPDATE SET reason = EXCLUDED.reason, created_at = now(), status = 'pending';
    END IF;
  END IF;

  -- 2) Velocidad sospechosa: más de 10 entradas verificadas propias
  -- en la última hora (no depende del hash — cubre también el camino
  -- de URL pegada en BeerCard.js, que no calcula hash).
  SELECT count(*) INTO v_recent_count
  FROM public.user_beers
  WHERE user_id = NEW.user_id
    AND user_photo_url IS NOT NULL
    AND created_at >= now() - interval '1 hour';

  IF v_recent_count > 10 THEN
    INSERT INTO public.entry_flags (user_id, beer_id, source, reason)
    VALUES (
      NEW.user_id, NEW.beer_id, 'velocity',
      format('%s entradas verificadas en la última hora', v_recent_count)
    )
    ON CONFLICT (user_id, beer_id, source) WHERE source IN ('duplicate_photo', 'velocity')
    DO UPDATE SET reason = EXCLUDED.reason, created_at = now(), status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_photo_flags ON public.user_beers;
CREATE TRIGGER trg_check_photo_flags
  AFTER INSERT OR UPDATE OF user_photo_url, photo_hash ON public.user_beers
  FOR EACH ROW
  WHEN (NEW.user_photo_url IS NOT NULL)
  EXECUTE FUNCTION public.check_photo_flags();

-- ────────────────────────────────────────────────────────────
-- 4. Acción de admin: desverificar una entrada reportada
-- ────────────────────────────────────────────────────────────
-- SECURITY DEFINER porque el admin no tiene UPDATE directo sobre
-- user_beers de otro usuario (update_own_beers exige user_id =
-- auth.uid()). Limpia la foto y el hash; compute_user_beers_xp()
-- (trigger ya existente) recalcula el XP solo al perder el bonus de
-- foto/entrada completa.
CREATE OR REPLACE FUNCTION public.admin_unverify_entry(p_flag_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user_id uuid;
  v_beer_id bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT user_id, beer_id INTO v_user_id, v_beer_id
  FROM public.entry_flags WHERE id = p_flag_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Reporte no encontrado';
  END IF;

  UPDATE public.user_beers
  SET user_photo_url = NULL, photo_hash = NULL
  WHERE user_id = v_user_id AND beer_id = v_beer_id;

  UPDATE public.entry_flags
  SET status = 'confirmed', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_flag_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_unverify_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unverify_entry(uuid) TO authenticated;
