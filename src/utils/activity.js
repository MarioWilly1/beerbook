import { supabase } from "../services/supabase";

function getBestAction({ rating, comment, photo }) {
  if (photo?.trim()) return "photo";
  if (comment?.trim()) return "comment";
  if (rating != null && rating !== "" && Number(rating) > 0) return "rate";
  return "register";
}

export async function logActivity(userId, beerId, { rating, comment, photo }) {
  const action = getBestAction({ rating, comment, photo });
  await supabase.from("activity_log").upsert(
    { user_id: userId, beer_id: beerId, action, created_at: new Date().toISOString() },
    { onConflict: "user_id,beer_id" }
  );
}
