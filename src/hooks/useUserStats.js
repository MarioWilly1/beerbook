import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { getLevelInfo } from "../utils/xp";

export const useUserStats = () => {
  const [stats, setStats] = useState({
    xp: 0, level: 1, beers: 0,
    currentStreak: 0, longestStreak: 0,
  });

  const fetchStats = async (session) => {
    if (!session) {
      setStats({ xp: 0, level: 1, beers: 0, currentStreak: 0, longestStreak: 0 });
      return;
    }

    const uid = session.user.id;

    const [beersRes, achRes, badgesRes, profileRes] = await Promise.all([
      supabase.from("user_beers").select('"XP"').eq("user_id", uid),
      supabase.from("user_achievements").select("xp_awarded").eq("user_id", uid),
      supabase.from("user_badges").select("xp_awarded").eq("user_id", uid),
      supabase.from("profiles")
        .select("current_streak, longest_streak")
        .eq("id", uid)
        .single(),
    ]);

    const beerXP   = (beersRes.data   || []).reduce((s, b) => s + (b.XP         || 0), 0);
    const achXP    = (achRes.data     || []).reduce((s, a) => s + (a.xp_awarded  || 0), 0);
    const badgeXP  = (badgesRes.data  || []).reduce((s, b) => s + (b.xp_awarded  || 0), 0);
    const totalXP  = beerXP + achXP + badgeXP;
    const { level } = getLevelInfo(totalXP);

    setStats({
      xp: totalXP,
      beers: (beersRes.data || []).length,
      level,
      currentStreak: profileRes.data?.current_streak  || 0,
      longestStreak: profileRes.data?.longest_streak  || 0,
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => fetchStats(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      fetchStats(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    fetchStats(session);
  };

  return { stats, refetch };
};
