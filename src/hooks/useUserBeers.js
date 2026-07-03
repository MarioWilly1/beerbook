import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useUserBeers = () => {
  const [userBeers, setUserBeers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserBeers = async (session) => {
    if (!session) {
      setUserBeers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_beers")
      .select('beer_id, times, comment, "Rating", user_photo_url, "XP"')
      .eq("user_id", session.user.id);

    if (!error && data) {
      setUserBeers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserBeers(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserBeers(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    fetchUserBeers(session);
  };

  return { userBeers, loading, refetch };
};
