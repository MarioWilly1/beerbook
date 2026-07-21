-- ============================================================
-- FIX BAJO (audit de seguridad 2026-07-21): profiles_read_all
-- expone is_admin a cualquier usuario autenticado.
--
-- profiles_read_all (USING true) deja leer CUALQUIER fila de
-- profiles a cualquier usuario autenticado — es intencional para
-- nombre/avatar/bio/prestige/etc, que ranking/amigos/chat/perfil
-- público necesitan mostrar de OTROS usuarios. El problema es que
-- is_admin viaja con el mismo SELECT y se puede leer con un request
-- directo a PostgREST (GET /rest/v1/profiles?select=id,is_admin),
-- aunque ningún flujo de la app lo pide para otro usuario — se
-- confirmó que is_admin solo se lee en src/hooks/useProfile.js,
-- siempre sobre la propia fila (auth.uid()).
--
-- RLS filtra FILAS, no columnas — no se puede resolver con una
-- policy ni con un WITH CHECK. Se resuelve con privilegios a nivel
-- de columna: se revoca el SELECT de tabla completa y se vuelve a
-- otorgar explícitamente para todas las columnas EXCEPTO is_admin.
-- El único lugar que necesitaba leer el propio is_admin
-- (useProfile.js) pasa a usar la función is_admin() (SECURITY
-- DEFINER, ya existía, ya tenía EXECUTE otorgado a authenticated),
-- que solo puede resolver el estado del auth.uid() actual — no sirve
-- para consultar el is_admin de otro usuario.
-- ============================================================

REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id, nombre, created_at, current_streak, longest_streak,
  last_activity_date, avatar_url, bio, pais_origen, featured_badges,
  perfil_publico, aparecer_en_ranking, ranking_consent_shown,
  preferred_language, prestige, prestige_xp_baseline
) ON public.profiles TO authenticated, anon;
