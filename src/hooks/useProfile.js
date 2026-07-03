import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("profiles")
      .select("id, nombre")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data || null);
        setLoading(false);
      });
  }, [session?.user?.id]);

  return { profile, loading, setProfile };
};
