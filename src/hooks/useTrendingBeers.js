import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

// Cervezas con más actividad reciente de la comunidad (activity_log,
// últimos 7 días, mínimo 2 usuarios distintos) — ver
// get_trending_beers() en supabase/migrations/20260721060000_trending_beers.sql.
export const useTrendingBeers = () => {
  const [trending, setTrending] = useState([]); // [{beer_id, recent_count}], ordenado desc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_trending_beers").then(({ data }) => {
      if (!cancelled) {
        setTrending(data || []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const trendingIds = new Set(trending.map((t) => t.beer_id));
  const rankOf = (beerId) => trending.findIndex((t) => t.beer_id === beerId);

  return { trending, trendingIds, rankOf, loading };
};
