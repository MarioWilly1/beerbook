-- ============================================================
-- Falta política RLS de UPDATE en beers_new.
-- AdminPanel > Editar Cerveza hace .update() directo desde el
-- cliente (no vía función SECURITY DEFINER), pero beers_new solo
-- tenía SELECT (anon/authenticated) e INSERT (admin). Sin política
-- de UPDATE, RLS bloqueaba el guardado en silencio (sin error,
-- pero sin escribir ninguna fila).
-- ============================================================

DROP POLICY IF EXISTS "beers_new_admin_update" ON public.beers_new;

CREATE POLICY "beers_new_admin_update" ON public.beers_new
  FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
