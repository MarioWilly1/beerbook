// Inserta una cata nueva (primera vez o repetida — el server decide el XP
// vía trigger según si ya existen catas previas para ese user_id/beer_id).
export async function insertTasting(supabase, userId, beerId, fields) {
  return supabase.from("beer_tastings").insert({ user_id: userId, beer_id: beerId, ...fields });
}

// Edita la cata MÁS RECIENTE sin crear una nueva entrada de historial —
// usado cuando el usuario corrige su reseña actual, no cuando registra
// que volvió a probar la cerveza. No otorga XP (inmutable server-side).
export async function updateLatestTasting(supabase, userId, beerId, fields) {
  const { data: latest } = await supabase
    .from("beer_tastings")
    .select("id")
    .eq("user_id", userId)
    .eq("beer_id", beerId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return { error: null };
  return supabase.from("beer_tastings").update(fields).eq("id", latest.id);
}

// Historial completo de catas de una cerveza (para la galería de Mi Cuaderno).
export async function fetchTastingHistory(supabase, userId, beerId) {
  return supabase
    .from("beer_tastings")
    .select("id, rating, comment, user_photo_url, location_name, price_paid, xp_earned, created_at")
    .eq("user_id", userId)
    .eq("beer_id", beerId)
    .order("id", { ascending: false });
}
