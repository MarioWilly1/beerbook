import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { BADGE_DEFS, TIER_META, TIERS } from "../utils/badges";
import { fetchAchievementStats } from "../utils/achievements";

export const useBadges = () => {
  const [badges, setBadges]         = useState([]);
  const [totalBadgeXP, setTotalBadgeXP] = useState(0);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const uid = session.user.id;

      const [badgesRes, stats] = await Promise.all([
        supabase
          .from("user_badges")
          .select("badge_slug, tier, xp_awarded, unlocked_at")
          .eq("user_id", uid),
        fetchAchievementStats(uid),
      ]);

      // Build tier map: slug → Set of unlocked tier strings
      const tierMap = {};
      let xpTotal = 0;
      for (const row of badgesRes.data || []) {
        if (!tierMap[row.badge_slug]) tierMap[row.badge_slug] = new Set();
        tierMap[row.badge_slug].add(row.tier);
        xpTotal += row.xp_awarded || 0;
      }

      const enriched = BADGE_DEFS.map((badge) => {
        const unlockedTiers = tierMap[badge.slug] || new Set();

        // Find highest unlocked tier index
        let currentIdx = -1;
        for (let i = TIERS.length - 1; i >= 0; i--) {
          if (unlockedTiers.has(TIERS[i])) { currentIdx = i; break; }
        }

        const currentTier = currentIdx >= 0 ? TIERS[currentIdx] : null;
        const nextTier    = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
        const value       = stats ? (stats[badge.stat] || 0) : 0;

        return { ...badge, unlockedTiers, currentTier, nextTier, value };
      });

      setBadges(enriched);
      setTotalBadgeXP(xpTotal);
      setLoading(false);
    };

    load();
  }, []);

  return { badges, totalBadgeXP, loading };
};
