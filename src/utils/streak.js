import { supabase } from "../services/supabase";

// Whether a streak is still alive right now (activity today or yesterday,
// no gap). current_streak in the DB only gets recalculated on the next
// qualifying action (see updateStreak below) — it does NOT auto-reset the
// moment a day is missed, so a broken streak can sit stored as a stale
// positive number for days. Anything that DISPLAYS the streak must gate
// through this check instead of trusting current_streak > 0 on its own.
export function isStreakActive(lastActivityDate) {
  if (!lastActivityDate) return false;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  return lastActivityDate === today || lastActivityDate === yesterday;
}

// Updates streak for userId after a qualifying action (beer save).
// Returns the new current_streak value.
export async function updateStreak(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("id", userId)
    .single();

  if (error || !profile) return 0;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  if (profile.last_activity_date === today) {
    return profile.current_streak; // already active today
  }

  const newStreak =
    profile.last_activity_date === yesterday
      ? (profile.current_streak || 0) + 1
      : 1;

  const newLongest = Math.max(newStreak, profile.longest_streak || 0);

  await supabase
    .from("profiles")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })
    .eq("id", userId);

  return newStreak;
}
