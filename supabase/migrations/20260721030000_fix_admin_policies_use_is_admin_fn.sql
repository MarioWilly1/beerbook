-- ============================================================
-- FIX: políticas de admin rotas por el REVOKE SELECT sobre
-- profiles.is_admin (20260721020000_restrict_profiles_is_admin_column.sql)
--
-- 5 políticas seguían usando la subconsulta directa
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
-- en vez de la función is_admin() ya existente. Esa subconsulta corre
-- con los privilegios del rol que ejecuta la query (authenticated),
-- que ya no tiene SELECT sobre la columna is_admin — entonces
-- cualquier operación que dependiera de esa policy (insertar/editar
-- cervezas del catálogo, subir fotos al bucket "Cervezas") fallaba
-- con "permission denied for table profiles", incluso siendo admin
-- real.
--
-- is_admin() es SECURITY DEFINER (dueño postgres), así que sí puede
-- leer profiles.is_admin sin depender del grant de columna del rol
-- que llama — es exactamente el mecanismo pensado para esto.
-- ============================================================

-- beers_new
DROP POLICY IF EXISTS "beers_new_admin_insert" ON public.beers_new;
CREATE POLICY "beers_new_admin_insert" ON public.beers_new
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "beers_new_admin_update" ON public.beers_new;
CREATE POLICY "beers_new_admin_update" ON public.beers_new
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- storage.objects (bucket "Cervezas")
DROP POLICY IF EXISTS "cervezas_admin_insert" ON storage.objects;
CREATE POLICY "cervezas_admin_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'Cervezas' AND is_admin()
);
DROP POLICY IF EXISTS "cervezas_admin_update" ON storage.objects;
CREATE POLICY "cervezas_admin_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'Cervezas' AND is_admin()
);
DROP POLICY IF EXISTS "cervezas_admin_delete" ON storage.objects;
CREATE POLICY "cervezas_admin_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'Cervezas' AND is_admin()
);
