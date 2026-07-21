-- ============================================================
-- FIX MEDIO (audit de seguridad 2026-07-21): places abierta a
-- cualquiera, y sin límite de longitud en comment/content.
--
-- 1) places_insert_policy / places_update_policy tenían
--    WITH CHECK (true) / USING (true) sin ninguna restricción de rol
--    ni de dueño — cualquiera (ni siquiera logueado, la tabla no
--    excluía anon) podía insertar o pisar cualquier lugar existente.
--
--    El alta legítima de lugares NUNCA pasa por un INSERT directo del
--    cliente: ocurre exclusivamente vía el trigger
--    assign_place_id() (BEFORE INSERT/UPDATE en user_beers,
--    SECURITY DEFINER, dueño postgres) cuando alguien guarda una
--    ubicación en una entrada de su cuaderno. Como ese trigger corre
--    como postgres, ya bypassea RLS igual que do_prestige() —
--    endurecer estas policies no rompe ese flujo. Lo que cierra es
--    el acceso directo a la tabla desde PostgREST.
--
--    places no tenía columna para trackear quién lo creó. Se agrega
--    created_by (poblada automáticamente por trigger, igual que
--    auth.uid() adentro de assign_place_id() sigue resolviendo al
--    usuario real — no se ve afectado por el cambio de current_user
--    de SECURITY DEFINER) y se usa para el UPDATE.
--
-- 2) user_beers.comment y messages.content no tenían tope de
--    longitud (a diferencia de otros campos del proyecto: bio,
--    subject/message de support_tickets, etc. que sí lo tienen).
--    Se agrega CHECK además del maxLength ya puesto en el frontend,
--    porque el frontend no protege contra un POST directo a
--    PostgREST.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. places: dueño + RLS de INSERT/UPDATE
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.set_place_created_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by; -- inmutable una vez creado
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_place_created_by ON public.places;
CREATE TRIGGER trg_set_place_created_by
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.set_place_created_by();

DROP POLICY IF EXISTS "places_insert_policy" ON public.places;
CREATE POLICY "places_insert_policy" ON public.places
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "places_update_policy" ON public.places;
CREATE POLICY "places_update_policy" ON public.places
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR is_admin());

-- ────────────────────────────────────────────────────────────
-- 2. Límite de longitud: user_beers.comment / messages.content
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.user_beers
  DROP CONSTRAINT IF EXISTS user_beers_comment_length,
  ADD CONSTRAINT user_beers_comment_length CHECK (comment IS NULL OR length(comment) <= 500);

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_length,
  ADD CONSTRAINT messages_content_length CHECK (content IS NULL OR length(content) <= 1000);
