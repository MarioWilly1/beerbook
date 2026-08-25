import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

// Sin "nombre" — desde que existe el apodo público (username), nombre
// (el nombre real) ya no se lee en ningún flujo que use este hook, y la
// columna está restringida a nivel de Postgres (solo el propio dueño
// puede leerla, vía la función get_my_nombre(), no con un SELECT
// directo — ver 20260826000000_restrict_profiles_nombre_column.sql).
// Pedirla acá directo haría fallar la query entera con 403.
const PROFILE_SELECT = "id, username, avatar_url, bio, pais_origen, featured_badges, perfil_publico, aparecer_en_ranking, ranking_consent_shown, current_streak, longest_streak, preferred_language, prestige, prestige_xp_baseline, onboarding_visto, equipped_tag_slug, equipped_frame_slug";

export const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async (retry = true) => {
      const [profileRes, adminRes] = await Promise.all([
        supabase.from("profiles").select(PROFILE_SELECT).eq("id", userId).single(),
        // is_admin ya no es una columna legible directo de profiles (ver
        // migración 20260721020000): se consulta vía la función
        // is_admin(), que solo puede resolver el estado del propio
        // auth.uid() actual.
        supabase.rpc("is_admin"),
      ]);

      // PGRST116 = "0 rows" vía .single(): el usuario genuinamente todavía
      // no tiene fila en profiles (recién verificado su edad / cuenta
      // nueva) — profile=null es el resultado correcto, pasa a
      // AgeVerificationPage. Cualquier OTRO error (red, columna no
      // encontrada por caché de esquema de PostgREST recién desplegada,
      // 5xx transitorio) NO significa "no tiene perfil": tratarlo así
      // desloguea de hecho a usuarios ya registrados justo después de un
      // deploy. Se reintenta una vez tras una pausa breve antes de
      // resignarse a mostrarlo como sin perfil.
      const isMissingRow = profileRes.error?.code === "PGRST116";
      if (profileRes.error && !isMissingRow) {
        if (retry) {
          await new Promise((r) => setTimeout(r, 1200));
          if (!cancelled) await fetchProfile(false);
          return;
        }
        if (!cancelled) { setError(true); setLoading(false); }
        return;
      }

      if (cancelled) return;
      const data = profileRes.data;
      setError(false);
      setProfile(data ? { ...data, is_admin: adminRes.data || false } : null);
      setLoading(false);
    };

    setLoading(true);
    setError(false);
    fetchProfile();

    return () => { cancelled = true; };
  }, [userId]);

  return { profile, loading, error, setProfile };
};
