-- ============================================================
-- Onboarding animado de bienvenida (5 slides, GSAP): trackea si
-- el usuario ya lo vio para mostrarlo una única vez tras el
-- registro, con opción de volver a verlo desde Configuración.
-- ============================================================

-- DEFAULT true al agregar la columna: así los perfiles YA existentes
-- quedan marcados como "ya visto" (Postgres aplica el default también
-- a las filas existentes) y no les aparece el onboarding retroactivamente.
-- El SET DEFAULT false de abajo aplica solo a partir de acá: los
-- perfiles nuevos (creados después de esta migración) sí arrancan
-- en false y ven el onboarding una vez, tras completar el registro.
ALTER TABLE public.profiles
  ADD COLUMN onboarding_visto boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_visto SET DEFAULT false;

-- profiles_read_all revocó el SELECT de tabla completa (ver
-- 20260721020000) y otorga una lista explícita de columnas — hay
-- que sumar la nueva acá o el cliente no puede leerla.
GRANT SELECT (onboarding_visto) ON public.profiles TO authenticated, anon;
