import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export const useLugar = (placeId) => {
  const [place,    setPlace]    = useState(null);
  const [beers,    setBeers]    = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!placeId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [
        { data: placeData, error: placeErr },
        { data: beerData,  error: beerErr  },
        { data: visitData, error: visitErr },
      ] = await Promise.all([
        supabase.from("places").select("*").eq("id", placeId).single(),
        supabase.rpc("get_lugar_beers",    { p_place_id: placeId }),
        supabase.rpc("get_lugar_visitors", { p_place_id: placeId }),
      ]);

      if (placeErr) {
        setError(placeErr.message);
      } else {
        setPlace(placeData);
        setBeers(beerData  || []);
        setVisitors(visitData || []);
        if (beerErr)  console.error("[useLugar] beers:",    beerErr.message);
        if (visitErr) console.error("[useLugar] visitors:", visitErr.message);
      }

      setLoading(false);
    };

    load();
  }, [placeId]);

  return { place, beers, visitors, loading, error };
};
