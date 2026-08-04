-- ============================================================
-- FIX URGENTE: mismo bug que 20260805010000 (columnas nuevas de la
-- migración de Chapas nunca sumadas a la lista explícita de GRANT
-- SELECT de 20260721020000_restrict_profiles_is_admin_column.sql).
-- Esta vez es "chapas": TiendaPage.js hace
--   select("chapas, prestige, equipped_tag_slug, equipped_frame_slug, avatar_url, nombre")
-- y al no tener permiso de columna sobre "chapas", PostgREST rechaza
-- la query ENTERA con 403 — profile queda null, Avatar.jsx cae al
-- fallback (inicial "?" sin nombre → color morado por hash del char).
-- Confirmado con has_column_privilege('authenticated','profiles','chapas','SELECT') = false.
--
-- Se suma también chapas_synced_level (columna hermana, mismo gap,
-- aunque hoy no se selecciona desde el cliente) para no repetir este
-- mismo bug si se llega a necesitar más adelante.
-- ============================================================

GRANT SELECT (chapas, chapas_synced_level) ON public.profiles TO authenticated, anon;
