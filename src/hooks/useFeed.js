import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useFeed = () => {
  const [feed, setFeed]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_friend_feed");
      setFeed(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { feed, loading };
};
