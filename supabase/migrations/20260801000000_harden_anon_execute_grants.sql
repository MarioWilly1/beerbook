-- ============================================================
-- Hardening explícito de anon en funciones RPC autenticadas.
--
-- El proyecto tiene default privileges que le dan EXECUTE a anon
-- directamente en cada función nueva del schema public (no vía
-- PUBLIC) — un REVOKE ... FROM PUBLIC no alcanza para sacarle el
-- acceso a anon, hace falta un REVOKE explícito por rol. Esto se
-- detectó primero en get_weekly_challenge_progress().
--
-- No es explotable en la mayoría de los casos (las funciones cortan
-- con auth.uid() IS NULL), pero es defensa en profundidad: cierra el
-- hueco por si la lógica interna cambia en el futuro y alguien se
-- olvida de mantener el auth.uid() guard.
--
-- 11 funciones dependen de auth.uid() — anon nunca podría usarlas de
-- todas formas: accept_friend_request, admin_unverify_entry,
-- do_prestige, get_friend_feed, get_ranking_amigos,
-- get_ranking_amigos_beers, get_weekly_challenge_progress,
-- reject_friend_request, remove_friend, search_users, update_streak.
--
-- Otras 4 (get_ranking_global, get_ranking_global_beers,
-- get_ranking_semanal, get_lugar_price_stats) no dependen de
-- auth.uid() pero solo exponen datos ya opt-in/anonimizados
-- (aparecer_en_ranking, location_public) y hoy el frontend solo las
-- llama desde pantallas ya autenticadas — se revocan por
-- consistencia con el resto del proyecto (todo requiere login).
--
-- get_beer_tried_by NO está en esta lista a propósito: esa función sí
-- quiere que anon pueda usarla (perfiles públicos), y ya tiene un
-- GRANT explícito a anon, authenticated.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.accept_friend_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unverify_entry(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.do_prestige() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_friend_feed(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_lugar_price_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ranking_amigos_beers(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ranking_global_beers(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ranking_semanal(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_weekly_challenge_progress() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_friend_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_friend(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_streak() FROM anon;
