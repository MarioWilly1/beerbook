-- ============================================================
-- FIX URGENTE: mismo bug que 20260805010000/20260806010000 (columna
-- nueva nunca sumada a la lista explícita de GRANT SELECT de
-- 20260721020000_restrict_profiles_is_admin_column.sql). Esta vez es
-- "username" (20260825000000_public_username.sql): useProfile.js pide
--   select("id, username, avatar_url, ...")
-- y al no tener permiso de columna sobre "username", PostgREST rechaza
-- la query ENTERA con 403 — profile queda null, la app no arranca.
--
-- Los GRANT a nivel de columna son aditivos (mismo patrón ya usado en
-- 20260723010000_onboarding_visto.sql, 20260805010000 y 20260806010000):
-- no hace falta REVOKE + repetir toda la lista, solo sumar la columna
-- faltante.
-- ============================================================

GRANT SELECT (username) ON public.profiles TO authenticated, anon;
