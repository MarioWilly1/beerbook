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
    supabase
      .from("profiles")
      .select("id, nombre, avatar_url, bio, pais_origen, featured_badges, perfil_publico, aparecer_en_ranking, ranking_consent_shown, current_streak, longest_streak")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data || null);
        setLoading(false);
      });
  }, [userId]);

  return { profile, loading, setProfile };
};
