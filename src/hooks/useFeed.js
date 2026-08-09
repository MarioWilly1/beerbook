import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useFeed = () => {
  const [feed, setFeed]     = useState([]);
  const [loading, setLoading] = useState(true);

  // `silent` — usado por el pull-to-refresh nativo: refresca sin tocar
  // `loading`, así el feed actual queda visible en vez de tapado por el
  // estado de carga inicial.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const { data } = await supabase.rpc("get_friend_feed");
    setFeed(data || []);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { feed, loading, refetch: load };
};
