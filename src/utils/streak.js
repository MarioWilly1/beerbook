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

// Updates streak for the current user after a qualifying action (beer save).
// Recalculado server-side vía la RPC update_streak() (SECURITY DEFINER,
// misma lógica que tenía este archivo antes) — current_streak/longest_streak/
// last_activity_date ya no aceptan un UPDATE directo del cliente
// (protect_profile_sensitive_columns(), ver migración
// 20260723030000_harden_streak_and_validate_racha.sql). Devuelve el
// current_streak resultante.
export async function updateStreak() {
  const { data, error } = await supabase.rpc("update_streak");
  if (error) return 0;
  return data ?? 0;
}
