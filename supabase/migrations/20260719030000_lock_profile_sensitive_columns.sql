-- ============================================================
-- FIX CRÍTICO: profiles.is_admin / prestige / prestige_xp_baseline
-- se podían pisar con un .update() directo del cliente, porque
-- allow_update_own_profile / allow_insert_own_profile solo validaban
-- "la fila es tuya" (auth.uid() = id), sin restringir qué columnas.
-- Cualquier usuario autenticado podía correr:
--   supabase.from('profiles').update({ is_admin: true }).eq('id', me)
-- y quedar admin de verdad.
--
-- Un WITH CHECK de RLS no puede comparar "valor nuevo vs. anterior" de
-- forma confiable (no hay OLD/NEW en una policy). La forma correcta es
-- un trigger BEFORE INSERT/UPDATE, que sí tiene OLD/NEW garantizados.
--
-- Cómo distingue "cliente" de "función de confianza": do_prestige() e
-- is_admin() son SECURITY DEFINER y su dueño es 'postgres' — mientras
-- corren, current_user pasa a ser 'postgres' (no 'authenticated'/'anon').
-- El trigger solo bloquea cuando current_user es 'anon' o 'authenticated'
-- (es decir, un request directo vía PostgREST/el cliente). El SQL Editor
-- y el Table Editor del dashboard conectan como postgres, así que setear
-- is_admin a mano ahí sigue funcionando exactamente igual que hasta ahora
-- — sigue siendo el proceso manual para otorgar el primer admin.
-- ============================================================

-- IMPORTANTE: esta función NO debe ser SECURITY DEFINER. Si lo fuera,
-- current_user pasaría a ser el dueño de la función (postgres) DENTRO
-- del propio trigger también, y el chequeo de abajo nunca se cumpliría
-- — quedaría deshabilitado para todo el mundo, cliente incluido. Tiene
-- que quedar SECURITY INVOKER (el default) para heredar el current_user
-- real de quien disparó el UPDATE.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_admin IS DISTINCT FROM false
         OR NEW.prestige IS DISTINCT FROM 0
         OR NEW.prestige_xp_baseline IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'No autorizado: is_admin, prestige y prestige_xp_baseline no se pueden setear al crear el perfil';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'No autorizado: is_admin no se puede modificar directamente';
      END IF;
      IF NEW.prestige IS DISTINCT FROM OLD.prestige THEN
        RAISE EXCEPTION 'No autorizado: prestige no se puede modificar directamente — usá do_prestige()';
      END IF;
      IF NEW.prestige_xp_baseline IS DISTINCT FROM OLD.prestige_xp_baseline THEN
        RAISE EXCEPTION 'No autorizado: prestige_xp_baseline no se puede modificar directamente';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();
