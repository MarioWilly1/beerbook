import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      supabase
        .from("profiles")
        .select("id, nombre, avatar_url, bio, pais_origen, featured_badges, perfil_publico, aparecer_en_ranking, ranking_consent_shown, current_streak, longest_streak, preferred_language, prestige, prestige_xp_baseline, onboarding_visto")
        .eq("id", userId)
        .single(),
      // is_admin ya no es una columna legible directo de profiles (ver
      // migración 20260721020000): se consulta vía la función
      // is_admin(), que solo puede resolver el estado del propio
      // auth.uid() actual.
      supabase.rpc("is_admin"),
    ]).then(([{ data }, { data: isAdmin }]) => {
      setProfile(data ? { ...data, is_admin: isAdmin || false } : null);
      setLoading(false);
    });
  }, [userId]);

  return { profile, loading, setProfile };
};
