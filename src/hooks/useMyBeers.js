import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useMyBeers = () => {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBeers = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setBeers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_beers")
        .select(`
          times,
          comment,
          beers_new (
            id,
            nombre,
            pais,
            estilo,
            alcohol,
            descripcion,
            foto_url
          )
        `)
        .eq("user_id", session.user.id);

      if (!error && data) {
        const mapped = data.map(row => ({
          ...row.beers_new,
          times: row.times,
          comment: row.comment,
        }));
        setBeers(mapped);
      }

      setLoading(false);
    };

    fetchMyBeers();
  }, []);

  return { beers, loading };
};
