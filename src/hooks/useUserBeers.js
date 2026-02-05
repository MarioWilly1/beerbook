import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useUserBeers = () => {
  const [userBeers, setUserBeers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserBeers = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setUserBeers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_beers")
      .select("beer_id")
      .eq("user_id", session.user.id);

    if (!error) {
      setUserBeers(data.map((b) => b.beer_id));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUserBeers();
  }, []);

  return { userBeers, loading, refetch: fetchUserBeers };
};
