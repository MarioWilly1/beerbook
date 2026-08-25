-- ============================================================
-- Cierra el hueco de seguridad detectado al agregar el apodo público
-- (20260825000000_public_username.sql): profiles_read_all (USING true)
-- deja leer CUALQUIER columna de CUALQUIER fila a cualquier usuario
-- autenticado — nombre (el nombre real) viajaba con el resto y se
-- podía leer con un request directo a PostgREST
-- (GET /rest/v1/profiles?select=id,nombre), aunque después del cambio
-- de apodo público ningún flujo de la UI lo muestre.
--
-- RLS filtra FILAS, no columnas. Mismo mecanismo ya usado para
-- is_admin (20260721020000_restrict_profiles_is_admin_column.sql):
-- privilegios a nivel de columna. A diferencia de esa migración, acá
-- se revoca SOLO la columna nombre (REVOKE SELECT (nombre) ...) en vez
-- de revocar toda la tabla y re-otorgar una lista completa — los
-- GRANT/REVOKE de columna son aditivos/sustractivos independientes
-- (mismo criterio documentado en 20260805010000_grant_equipped_cosmetics_columns.sql
-- y 20260806010000_grant_chapas_columns.sql), así que esto no afecta
-- ninguna de las demás columnas ya otorgadas.
-- ============================================================

REVOKE SELECT (nombre) ON public.profiles FROM authenticated, anon;

-- Único flujo interno legítimo que necesita leer el PROPIO nombre real:
-- el campo privado "Nombre real" de Configuración > Perfil. Solo puede
-- resolver el auth.uid() actual — no sirve para consultar el nombre de
-- otro usuario, mismo criterio que is_admin().
CREATE FUNCTION public.get_my_nombre()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT nombre FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_nombre() TO authenticated;

-- Único otro flujo interno legítimo: moderación en AdminPanel.js
-- (tickets de soporte, sugerencias de cerveza/copa, reportes de
-- entrada) necesita identificar a la persona real detrás de una
-- cuenta. Chequea is_admin() adentro — devuelve cero filas para
-- cualquiera que no sea admin, en vez de fallar la query entera.
CREATE FUNCTION public.admin_get_nombres(p_user_ids uuid[])
RETURNS TABLE(id uuid, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.nombre FROM public.profiles p
  WHERE p.id = ANY(p_user_ids) AND is_admin();
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_nombres(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_nombres(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_nombres(uuid[]) TO authenticated;
