import { supabase } from "../services/supabase";

export const ACHIEVEMENTS = [
  {
    slug: "primera-ronda",
    emoji: "🍺",
    nombre: "Primera Ronda",
    descripcion: "Registra tu primera cerveza",
    xpBonus: 10,
    check: (s) => s.totalBeers >= 1,
  },
  {
    slug: "seis-pack",
    emoji: "🎯",
    nombre: "Seis Pack",
    descripcion: "6 cervezas verificadas (con foto)",
    xpBonus: 20,
    check: (s) => s.verifiedBeers >= 6,
  },
  {
    slug: "caja-completa",
    emoji: "📦",
    nombre: "Caja Completa",
    descripcion: "24 cervezas verificadas (con foto)",
    xpBonus: 50,
    check: (s) => s.verifiedBeers >= 24,
  },
  {
    slug: "barril",
    emoji: "🛢️",
    nombre: "Barril",
    descripcion: "50 cervezas verificadas (con foto)",
    xpBonus: 100,
    check: (s) => s.verifiedBeers >= 50,
  },
  {
    slug: "coleccionista",
    emoji: "🏆",
    nombre: "Coleccionista",
    descripcion: "100 cervezas verificadas (con foto)",
    xpBonus: 200,
    check: (s) => s.verifiedBeers >= 100,
  },
  {
    slug: "viajero",
    emoji: "🌍",
    nombre: "Viajero",
    descripcion: "Cervezas verificadas de 5 países distintos",
    xpBonus: 30,
    check: (s) => s.verifiedDistinctCountries >= 5,
  },
  {
    slug: "ciudadano-del-mundo",
    emoji: "✈️",
    nombre: "Ciudadano del Mundo",
    descripcion: "Cervezas verificadas de 10 países distintos",
    xpBonus: 80,
    check: (s) => s.verifiedDistinctCountries >= 10,
  },
  {
    slug: "explorador-de-estilos",
    emoji: "🎨",
    nombre: "Explorador de Estilos",
    descripcion: "5 estilos distintos (entradas verificadas)",
    xpBonus: 25,
    check: (s) => s.verifiedDistinctStyles >= 5,
  },
  {
    slug: "polyglota-cervecero",
    emoji: "🔬",
    nombre: "Políglota Cervecero",
    descripcion: "10 estilos distintos (entradas verificadas)",
    xpBonus: 60,
    check: (s) => s.verifiedDistinctStyles >= 10,
  },
  {
    slug: "fotografo",
    emoji: "📸",
    nombre: "Fotógrafo Cervecero",
    descripcion: "Primera foto subida",
    xpBonus: 15,
    check: (s) => s.beersWithPhotos >= 1,
  },
  {
    slug: "cronista",
    emoji: "✍️",
    nombre: "Cronista",
    descripcion: "Primer comentario escrito",
    xpBonus: 10,
    check: (s) => s.beersWithComments >= 1,
  },
  {
    slug: "critico",
    emoji: "⭐",
    nombre: "Crítico",
    descripcion: "10 entradas con puntuación",
    xpBonus: 35,
    check: (s) => s.verifiedWithRatings >= 10,
  },
  {
    slug: "perfeccionista",
    emoji: "💎",
    nombre: "Perfeccionista",
    descripcion: "5 entradas con todos los campos completos",
    xpBonus: 50,
    check: (s) => s.completeEntries >= 5,
  },
  {
    slug: "constante",
    emoji: "🔥",
    nombre: "Constante",
    descripcion: "Racha de 7 días seguidos",
    xpBonus: 40,
    check: (s) => s.currentStreak >= 7,
  },
  {
    slug: "leyenda-activa",
    emoji: "🌋",
    nombre: "Leyenda Activa",
    descripcion: "Racha de 30 días seguidos",
    xpBonus: 150,
    check: (s) => s.currentStreak >= 30,
  },
  {
    slug: "primer-contacto",
    emoji: "👥",
    nombre: "Primer Contacto",
    descripcion: "Sigue a tu primer amigo",
    xpBonus: 15,
    check: (s) => (s.friendCount || 0) >= 1,
  },
  {
    slug: "companeros-de-cata",
    emoji: "🍻",
    nombre: "Compañeros de Cata",
    descripcion: "5 amigos en la app",
    xpBonus: 40,
    check: (s) => (s.friendCount || 0) >= 5,
  },
];

// Fetches all data needed to evaluate achievements for a user
export async function fetchAchievementStats(userId) {
  const { data, error } = await supabase
    .from("user_beers")
    .select('"XP", "Rating", comment, user_photo_url, beers_new(pais, estilo)')
    .eq("user_id", userId);

  if (error || !data) return null;

  const verified = data.filter((d) => d.user_photo_url?.trim());

  return {
    totalBeers: data.length,
    distinctStyles: new Set(data.map((d) => d.beers_new?.estilo).filter(Boolean)).size,
    distinctCountries: new Set(data.map((d) => d.beers_new?.pais).filter(Boolean)).size,
    beersWithPhotos: verified.length,
    beersWithComments: data.filter((d) => d.comment?.trim()).length,
    beersWithRatings: data.filter((d) => d.Rating != null && Number(d.Rating) > 0).length,
    completeEntries: data.filter(
      (d) => Number(d.Rating) > 0 && d.comment?.trim() && d.user_photo_url?.trim()
    ).length,
    verifiedBeers: verified.length,
    verifiedDistinctCountries: new Set(verified.map((d) => d.beers_new?.pais).filter(Boolean)).size,
    verifiedDistinctStyles: new Set(verified.map((d) => d.beers_new?.estilo).filter(Boolean)).size,
    verifiedWithComments: verified.filter((d) => d.comment?.trim()).length,
    verifiedWithRatings: verified.filter((d) => d.Rating != null && Number(d.Rating) > 0).length,
  };
}

// Checks social achievements after accepting a friend request
// Returns array of newly unlocked achievement definitions
export async function checkSocialAchievements(userId) {
  const { data: friendships } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("user_id", userId);

  const friendCount = (friendships || []).length;

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("slug")
    .eq("user_id", userId);

  const unlockedSlugs = new Set((existing || []).map((a) => a.slug));
  const socialSlugs   = ["primer-contacto", "companeros-de-cata"];
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => socialSlugs.includes(a.slug) && !unlockedSlugs.has(a.slug) && a.check({ friendCount })
  );

  if (newlyUnlocked.length === 0) return [];

  await supabase.from("user_achievements").insert(
    newlyUnlocked.map((a) => ({
      user_id: userId,
      slug: a.slug,
      xp_awarded: a.xpBonus,
    }))
  );

  return newlyUnlocked;
}

// Checks which achievements are newly unlocked and inserts them
// Returns array of newly unlocked achievement definitions
export async function checkAndAwardAchievements(userId, stats, currentStreak) {
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("slug")
    .eq("user_id", userId);

  const unlockedSlugs = new Set((existing || []).map((a) => a.slug));
  const fullStats = { ...stats, currentStreak };

  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !unlockedSlugs.has(a.slug) && a.check(fullStats)
  );

  if (newlyUnlocked.length === 0) return [];

  await supabase.from("user_achievements").insert(
    newlyUnlocked.map((a) => ({
      user_id: userId,
      slug: a.slug,
      xp_awarded: a.xpBonus,
    }))
  );

  return newlyUnlocked;
}
