import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { getLevelInfo } from "../utils/xp";
import { isStreakActive } from "../utils/streak";

export const useUserStats = () => {
  const [stats, setStats] = useState({
    xp: 0, lifetimeXP: 0, level: 1, beers: 0, verifiedBeers: 0,
    currentStreak: 0, longestStreak: 0,
    prestige: 0, prestigeThreshold: null, canPrestige: false,
  });

  const fetchStats = async (session) => {
    if (!session) {
      setStats({
        xp: 0, lifetimeXP: 0, level: 1, beers: 0, verifiedBeers: 0,
        currentStreak: 0, longestStreak: 0,
        prestige: 0, prestigeThreshold: null, canPrestige: false,
      });
      return;
    }

    const uid = session.user.id;

    const [beersRes, achRes, badgesRes, profileRes] = await Promise.all([
      supabase.from("user_beers").select('"XP", user_photo_url').eq("user_id", uid),
      supabase.from("user_achievements").select("xp_awarded").eq("user_id", uid),
      supabase.from("user_badges").select("xp_awarded").eq("user_id", uid),
      supabase.from("profiles")
        .select("current_streak, longest_streak, last_activity_date, prestige, prestige_xp_baseline")
        .eq("id", uid)
        .single(),
    ]);

    // El umbral depende del prestige actual del usuario (cada Prestigio
    // siguiente pide más nivel) — necesita el valor recién resuelto arriba.
    const thresholdRes = await supabase.rpc("get_prestige_threshold", {
      p_current_prestige: profileRes.data?.prestige || 0,
    });

    const beerData     = beersRes.data || [];
    const beerXP       = beerData.reduce((s, b) => s + (b.XP || 0), 0);
    const achXP        = (achRes.data    || []).reduce((s, a) => s + (a.xp_awarded || 0), 0);
    const badgeXP      = (badgesRes.data || []).reduce((s, b) => s + (b.xp_awarded || 0), 0);
    const lifetimeXP   = beerXP + achXP + badgeXP;
    const baseline     = profileRes.data?.prestige_xp_baseline || 0;
    const cycleXP       = Math.max(0, lifetimeXP - baseline);
    const { level }    = getLevelInfo(cycleXP);
    const verifiedBeers = beerData.filter((b) => b.user_photo_url?.trim()).length;
    const prestigeThreshold = thresholdRes.data ?? null;
    const streakActive = isStreakActive(profileRes.data?.last_activity_date);

    setStats({
      xp: cycleXP,
      lifetimeXP,
      beers: beerData.length,
      verifiedBeers,
      level,
      currentStreak: streakActive ? (profileRes.data?.current_streak || 0) : 0,
      longestStreak: profileRes.data?.longest_streak || 0,
      prestige: profileRes.data?.prestige || 0,
      prestigeThreshold,
      canPrestige: prestigeThreshold != null && level >= prestigeThreshold,
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
