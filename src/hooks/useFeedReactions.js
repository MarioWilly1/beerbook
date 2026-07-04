import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useFeedReactions = (entries) => {
  const [reactionsMap, setReactionsMap] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!entries.length || !currentUserId) return;

    const uniqueUserIds = [...new Set(entries.map((e) => e.user_id))];

    supabase
      .from("feed_reactions")
      .select("activity_user_id, activity_beer_id, reaction, user_id, profiles(nombre)")
      .in("activity_user_id", uniqueUserIds)
      .then(({ data }) => {
        const map = {};
        for (const row of data || []) {
          const key = `${row.activity_user_id}_${row.activity_beer_id}`;
          if (!map[key]) map[key] = { counts: {}, mine: null, names: {} };
          map[key].counts[row.reaction] = (map[key].counts[row.reaction] || 0) + 1;
          if (row.user_id === currentUserId) map[key].mine = row.reaction;
          if (!map[key].names[row.reaction]) map[key].names[row.reaction] = [];
          map[key].names[row.reaction].push(row.profiles?.nombre || "?");
        }
        setReactionsMap(map);
      });
  }, [entries, currentUserId]);

  const toggleReaction = useCallback(
    async (activityUserId, activityBeerId, reactionKey) => {
      if (!currentUserId) return;

      const key = `${activityUserId}_${activityBeerId}`;
      const current = reactionsMap[key] || { counts: {}, mine: null, names: {} };
      const isSame = current.mine === reactionKey;

      // Optimistic update
      const next = {
        counts: { ...current.counts },
        mine: null,
        names: { ...current.names },
      };

      if (isSame) {
        // Toggle off
        next.counts[reactionKey] = Math.max(0, (next.counts[reactionKey] || 1) - 1);
        if (next.counts[reactionKey] === 0) delete next.counts[reactionKey];
        next.mine = null;
      } else {
        // Remove previous reaction from counts if switching
        if (current.mine) {
          next.counts[current.mine] = Math.max(0, (next.counts[current.mine] || 1) - 1);
          if (next.counts[current.mine] === 0) delete next.counts[current.mine];
        }
        next.counts[reactionKey] = (next.counts[reactionKey] || 0) + 1;
        next.mine = reactionKey;
      }

      setReactionsMap((prev) => ({ ...prev, [key]: next }));

      // DB sync
      if (isSame) {
        await supabase
          .from("feed_reactions")
          .delete()
          .eq("activity_user_id", activityUserId)
          .eq("activity_beer_id", activityBeerId)
          .eq("user_id", currentUserId);
      } else {
        await supabase.from("feed_reactions").upsert(
          {
            activity_user_id: activityUserId,
            activity_beer_id: activityBeerId,
            user_id: currentUserId,
            reaction: reactionKey,
          },
          { onConflict: "activity_user_id,activity_beer_id,user_id" }
        );
      }
    },
    [currentUserId, reactionsMap]
  );

  return { reactionsMap, toggleReaction, currentUserId };
};
