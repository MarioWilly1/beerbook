-- friendships.SELECT está restringido a user_id = auth.uid() (ver
-- 20260703200000_social_system.sql), así que un usuario no puede leer
-- las filas de OTRO usuario para armar un contador "Amigos: N" estilo
-- redes sociales en el Perfil. Esta RPC expone solo el conteo (no la
-- lista) para cualquier perfil, igual que un contador de seguidores
-- público en cualquier red social.

CREATE OR REPLACE FUNCTION public.get_friends_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.friendships WHERE user_id = p_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_friends_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_friends_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_friends_count(uuid) TO authenticated;
