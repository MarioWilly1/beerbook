-- ============================================================
-- FIX URGENTE: 20260721020000_restrict_profiles_is_admin_column.sql
-- reemplazó el SELECT de tabla completa sobre profiles por una lista
-- explícita de columnas (para esconder is_admin). Esa lista nunca se
-- actualizó al agregar equipped_tag_slug/equipped_frame_slug en
-- 20260804000000_chapas_cosmetics.sql — PostgREST rechaza con 403
-- CUALQUIER select que las incluya (permiso de columna, no de fila:
-- falla la query entera, no solo omite la columna), lo que rompe
-- useProfile.js en cada carga de la app.
--
-- Los GRANT a nivel de columna son aditivos (mismo patrón ya usado en
-- 20260723010000_onboarding_visto.sql): no hace falta REVOKE + repetir
-- toda la lista, solo sumar las columnas faltantes.
-- ============================================================

GRANT SELECT (equipped_tag_slug, equipped_frame_slug) ON public.profiles TO authenticated, anon;
