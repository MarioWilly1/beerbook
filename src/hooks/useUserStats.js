import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useUserStats = () => {
  const [stats, setStats] = useState({
    totalBeers: 0,
    totalXP: 0,
    level: 1,
  });

  const fetchStats = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data } = await supabase
      .from("user_beers")
      .select("xp")
      .eq("user_id", session.user.id);

    const totalXP = data?.reduce((acc, b) => acc + (b.xp || 0), 0) || 0;
    const totalBeers = data?.length || 0;

    const level = Math.floor(totalXP / 100) + 1;

    setStats({
      totalBeers,
      totalXP,
      level,
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, refetch: fetchStats };
};