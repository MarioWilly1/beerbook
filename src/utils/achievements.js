import { supabase } from "../services/supabase";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── 8 categories, ~45 achievements total ──────────────────────────────────────

export const ACHIEVEMENTS = [

  // ── DEGUSTACIÓN ──────────────────────────────────────────────────────────────
  {
    slug: "primera-ronda",
    emoji: "🍺", nombre: "Primera Ronda",
    descripcion: "Registra tu primera cerveza",
    categoria: "Degustación", xpBonus: 10,
    check: (s) => s.totalBeers >= 1,
  },
  {
    slug: "primera-decena",
    emoji: "🍻", nombre: "Primera Decena",
    descripcion: "10 cervezas en tu cuaderno",
    categoria: "Degustación", xpBonus: 25,
    check: (s) => s.totalBeers >= 10,
  },
  {
    slug: "seis-pack",
    emoji: "🎯", nombre: "Seis Pack",
    descripcion: "6 cervezas verificadas (con foto)",
    categoria: "Degustación", xpBonus: 20,
    check: (s) => s.verifiedBeers >= 6,
  },
  {
    slug: "caja-completa",
    emoji: "📦", nombre: "Caja Completa",
    descripcion: "24 cervezas verificadas",
    categoria: "Degustación", xpBonus: 50,
    check: (s) => s.verifiedBeers >= 24,
  },
  {
    slug: "bebedor-aplicado",
    emoji: "🎖️", nombre: "Bebedor Aplicado",
    descripcion: "50 cervezas en tu cuaderno",
    categoria: "Degustación", xpBonus: 75,
    check: (s) => s.totalBeers >= 50,
  },
  {
    slug: "barril",
    emoji: "🛢️", nombre: "Barril",
    descripcion: "50 cervezas verificadas",
    categoria: "Degustación", xpBonus: 100,
    check: (s) => s.verifiedBeers >= 50,
  },
  {
    slug: "fotografo-master",
    emoji: "📷", nombre: "Fotógrafo Master",
    descripcion: "30 cervezas con foto propia",
    categoria: "Degustación", xpBonus: 45,
    check: (s) => s.beersWithPhotos >= 30,
  },
  {
    slug: "coleccionista",
    emoji: "🏆", nombre: "Coleccionista",
    descripcion: "100 cervezas verificadas",
    categoria: "Degustación", xpBonus: 200,
    check: (s) => s.verifiedBeers >= 100,
  },
  {
    slug: "maestro-catador",
    emoji: "🏅", nombre: "Maestro Catador",
    descripcion: "200 cervezas verificadas",
    categoria: "Degustación", xpBonus: 500,
    check: (s) => s.verifiedBeers >= 200,
  },

  // ── ESCRITURA ─────────────────────────────────────────────────────────────────
  {
    slug: "fotografo",
    emoji: "📸", nombre: "Fotógrafo Cervecero",
    descripcion: "Primera foto subida",
    categoria: "Escritura", xpBonus: 15,
    check: (s) => s.beersWithPhotos >= 1,
  },
  {
    slug: "cronista",
    emoji: "✍️", nombre: "Cronista",
    descripcion: "Primer comentario escrito",
    categoria: "Escritura", xpBonus: 10,
    check: (s) => s.beersWithComments >= 1,
  },
  {
    slug: "cronista-mayor",
    emoji: "📖", nombre: "Cronista Mayor",
    descripcion: "20 comentarios escritos",
    categoria: "Escritura", xpBonus: 30,
    check: (s) => s.beersWithComments >= 20,
  },
  {
    slug: "critico",
    emoji: "⭐", nombre: "Crítico",
    descripcion: "10 entradas con puntuación",
    categoria: "Escritura", xpBonus: 35,
    check: (s) => s.verifiedWithRatings >= 10,
  },
  {
    slug: "maestro-critico",
    emoji: "🌟", nombre: "Maestro Crítico",
    descripcion: "25 entradas con puntuación",
    categoria: "Escritura", xpBonus: 60,
    check: (s) => s.verifiedWithRatings >= 25,
  },
  {
    slug: "perfeccionista",
    emoji: "💎", nombre: "Perfeccionista",
    descripcion: "5 entradas completamente rellenas",
    categoria: "Escritura", xpBonus: 50,
    check: (s) => s.completeEntries >= 5,
  },
  {
    slug: "entradas-de-oro",
    emoji: "🥇", nombre: "Entradas de Oro",
    descripcion: "20 entradas completamente rellenas",
    categoria: "Escritura", xpBonus: 80,
    check: (s) => s.completeEntries >= 20,
  },

  // ── EXPLORACIÓN GEOGRÁFICA ────────────────────────────────────────────────────
  {
    slug: "primer-viaje",
    emoji: "🗺️", nombre: "Primer Viaje",
    descripcion: "Cerveza verificada de un país extranjero",
    categoria: "Geografía", xpBonus: 10,
    check: (s) => s.verifiedDistinctCountries >= 1,
  },
  {
    slug: "viajero",
    emoji: "🌍", nombre: "Viajero",
    descripcion: "Cervezas verificadas de 5 países",
    categoria: "Geografía", xpBonus: 30,
    check: (s) => s.verifiedDistinctCountries >= 5,
  },
  {
    slug: "ciudadano-del-mundo",
    emoji: "✈️", nombre: "Ciudadano del Mundo",
    descripcion: "Cervezas verificadas de 10 países",
    categoria: "Geografía", xpBonus: 80,
    check: (s) => s.verifiedDistinctCountries >= 10,
  },
  {
    slug: "embajador",
    emoji: "🌐", nombre: "Embajador",
    descripcion: "Cervezas verificadas de 15 países",
    categoria: "Geografía", xpBonus: 100,
    check: (s) => s.verifiedDistinctCountries >= 15,
  },
  {
    slug: "atlas-cervecero",
    emoji: "🗾", nombre: "Atlas Cervecero",
    descripcion: "Cervezas verificadas de 20 países",
    categoria: "Geografía", xpBonus: 200,
    check: (s) => s.verifiedDistinctCountries >= 20,
  },

  // ── ESTILOS ───────────────────────────────────────────────────────────────────
  {
    slug: "estudiante-cervecero",
    emoji: "🎓", nombre: "Estudiante Cervecero",
    descripcion: "3 estilos distintos probados",
    categoria: "Estilos", xpBonus: 15,
    check: (s) => s.verifiedDistinctStyles >= 3,
  },
  {
    slug: "explorador-de-estilos",
    emoji: "🎨", nombre: "Explorador de Estilos",
    descripcion: "5 estilos distintos (entradas verificadas)",
    categoria: "Estilos", xpBonus: 25,
    check: (s) => s.verifiedDistinctStyles >= 5,
  },
  {
    slug: "polyglota-cervecero",
    emoji: "🔬", nombre: "Políglota Cervecero",
    descripcion: "10 estilos distintos (entradas verificadas)",
    categoria: "Estilos", xpBonus: 60,
    check: (s) => s.verifiedDistinctStyles >= 10,
  },
  {
    slug: "maestro-de-estilos",
    emoji: "🔭", nombre: "Maestro de Estilos",
    descripcion: "15 estilos distintos explorados",
    categoria: "Estilos", xpBonus: 100,
    check: (s) => s.verifiedDistinctStyles >= 15,
  },

  // ── CERVECERÍAS / LOCALES ─────────────────────────────────────────────────────
  {
    slug: "nomada",
    emoji: "📍", nombre: "Nómada",
    descripcion: "Registra una cerveza en un local o lugar",
    categoria: "Cervecerías", xpBonus: 10,
    check: (s) => s.beersWithLocation >= 1,
  },
  {
    slug: "bar-hopper",
    emoji: "🍻", nombre: "Bar Hopper",
    descripcion: "5 cervezas registradas en locales",
    categoria: "Cervecerías", xpBonus: 30,
    check: (s) => s.beersWithLocation >= 5,
  },
  {
    slug: "explorador-local",
    emoji: "🏙️", nombre: "Explorador Local",
    descripcion: "10 cervezas registradas en locales",
    categoria: "Cervecerías", xpBonus: 60,
    check: (s) => s.beersWithLocation >= 10,
  },

  // ── COLECCIONISMO ─────────────────────────────────────────────────────────────
  {
    slug: "primer-tesoro",
    emoji: "💎", nombre: "Primer Tesoro",
    descripcion: "Añade tu primera cerveza a la colección",
    categoria: "Coleccionismo", xpBonus: 15,
    check: (s) => s.coleccionCount >= 1,
  },
  {
    slug: "vitrina-inicial",
    emoji: "🗃️", nombre: "Vitrina Inicial",
    descripcion: "5 cervezas en tu colección",
    categoria: "Coleccionismo", xpBonus: 40,
    check: (s) => s.coleccionCount >= 5,
  },
  {
    slug: "bodega-propia",
    emoji: "🏛️", nombre: "Bodega Propia",
    descripcion: "10 cervezas en tu colección",
    categoria: "Coleccionismo", xpBonus: 80,
    check: (s) => s.coleccionCount >= 10,
  },
  {
    slug: "coleccion-selecta",
    emoji: "🎭", nombre: "Colección Selecta",
    descripcion: "25 cervezas en tu colección",
    categoria: "Coleccionismo", xpBonus: 200,
    check: (s) => s.coleccionCount >= 25,
  },
  {
    slug: "primer-epica",
    emoji: "🟣", nombre: "Primera Épica",
    descripcion: "Consigue una cerveza épica en tu colección",
    categoria: "Coleccionismo", xpBonus: 20,
    check: (s) => s.coleccionEpica >= 1,
  },
  {
    slug: "primer-legendaria",
    emoji: "🟡", nombre: "Primera Legendaria",
    descripcion: "Consigue una cerveza legendaria en tu colección",
    categoria: "Coleccionismo", xpBonus: 35,
    check: (s) => s.coleccionLegendaria >= 1,
  },
  {
    slug: "primer-mitica",
    emoji: "🌈", nombre: "Primera Mítica",
    descripcion: "Consigue una cerveza mítica en tu colección",
    categoria: "Coleccionismo", xpBonus: 100,
    check: (s) => s.coleccionMitica >= 1,
  },
  {
    slug: "edicion-especial",
    emoji: "✨", nombre: "Edición Especial",
    descripcion: "Una cerveza de edición especial en tu colección",
    categoria: "Coleccionismo", xpBonus: 25,
    check: (s) => s.coleccionEdicionEspecial >= 1,
  },

  // ── XP / NIVEL ────────────────────────────────────────────────────────────────
  {
    slug: "iniciado",
    emoji: "💫", nombre: "Iniciado",
    descripcion: "Alcanza 100 XP",
    categoria: "XP", xpBonus: 10,
    check: (s) => s.totalXP >= 100,
  },
  {
    slug: "experto",
    emoji: "⚡", nombre: "Experto",
    descripcion: "Alcanza 500 XP",
    categoria: "XP", xpBonus: 25,
    check: (s) => s.totalXP >= 500,
  },
  {
    slug: "maestro-xp",
    emoji: "🌟", nombre: "Maestro",
    descripcion: "Alcanza 1500 XP",
    categoria: "XP", xpBonus: 50,
    check: (s) => s.totalXP >= 1500,
  },
  {
    slug: "gran-maestro",
    emoji: "👑", nombre: "Gran Maestro",
    descripcion: "Alcanza 5000 XP",
    categoria: "XP", xpBonus: 100,
    check: (s) => s.totalXP >= 5000,
  },

  // ── RACHA / CONSISTENCIA ──────────────────────────────────────────────────────
  {
    slug: "primer-habito",
    emoji: "🌱", nombre: "Primer Hábito",
    descripcion: "3 días de actividad consecutivos",
    categoria: "Racha", xpBonus: 10,
    check: (s) => s.currentStreak >= 3,
  },
  {
    slug: "constante",
    emoji: "🔥", nombre: "Constante",
    descripcion: "7 días de actividad consecutivos",
    categoria: "Racha", xpBonus: 40,
    check: (s) => s.currentStreak >= 7,
  },
  {
    slug: "ritmo-constante",
    emoji: "📅", nombre: "Ritmo Constante",
    descripcion: "14 días de actividad consecutivos",
    categoria: "Racha", xpBonus: 60,
    check: (s) => s.currentStreak >= 14,
  },
  {
    slug: "leyenda-activa",
    emoji: "🌋", nombre: "Leyenda Activa",
    descripcion: "30 días de actividad consecutivos",
    categoria: "Racha", xpBonus: 150,
    check: (s) => s.currentStreak >= 30,
  },
  {
    slug: "obsesionado",
    emoji: "♾️", nombre: "Obsesionado",
    descripcion: "60 días de actividad consecutivos",
    categoria: "Racha", xpBonus: 250,
    check: (s) => s.currentStreak >= 60,
  },

  // ── SOCIAL ────────────────────────────────────────────────────────────────────
  {
    slug: "primer-contacto",
    emoji: "👥", nombre: "Primer Contacto",
    descripcion: "Sigue a tu primer amigo",
    categoria: "Social", xpBonus: 15,
    check: (s) => (s.friendCount || 0) >= 1,
  },
  {
    slug: "companeros-de-cata",
    emoji: "🍻", nombre: "Compañeros de Cata",
    descripcion: "5 amigos en la app",
    categoria: "Social", xpBonus: 40,
    check: (s) => (s.friendCount || 0) >= 5,
  },
  {
    slug: "clan-cervecero",
    emoji: "🎪", nombre: "Clan Cervecero",
    descripcion: "10 amigos en la app",
    categoria: "Social", xpBonus: 80,
    check: (s) => (s.friendCount || 0) >= 10,
  },
];

// ── fetchAchievementStats ─────────────────────────────────────────────────────
export async function fetchAchievementStats(userId) {
  const { data, error } = await supabase
    .from("user_beers")
    .select(`
      "XP", "Rating", comment, user_photo_url, location_lat,
      en_coleccion, condicion,
      beers_new(pais, estilo, rareza, es_edicion_especial)
    `)
    .eq("user_id", userId);

  if (error || !data) return null;

  const verified  = data.filter((d) => d.user_photo_url?.trim());
  const coleccion = data.filter((d) => d.en_coleccion);

  return {
    totalBeers:               data.length,
    distinctStyles:           new Set(data.map((d) => d.beers_new?.estilo).filter(Boolean)).size,
    distinctCountries:        new Set(data.map((d) => d.beers_new?.pais).filter(Boolean)).size,
    beersWithPhotos:          verified.length,
    beersWithComments:        data.filter((d) => d.comment?.trim()).length,
    beersWithRatings:         data.filter((d) => d.Rating != null && Number(d.Rating) > 0).length,
    beersWithLocation:        data.filter((d) => d.location_lat != null).length,
    completeEntries:          data.filter(
                                (d) => Number(d.Rating) > 0 && d.comment?.trim() && d.user_photo_url?.trim()
                              ).length,
    totalXP:                  data.reduce((sum, d) => sum + (d.XP || 0), 0),
    verifiedBeers:            verified.length,
    verifiedDistinctCountries: new Set(verified.map((d) => d.beers_new?.pais).filter(Boolean)).size,
    verifiedDistinctStyles:   new Set(verified.map((d) => d.beers_new?.estilo).filter(Boolean)).size,
    verifiedWithComments:     verified.filter((d) => d.comment?.trim()).length,
    verifiedWithRatings:      verified.filter((d) => d.Rating != null && Number(d.Rating) > 0).length,
    coleccionCount:           coleccion.length,
    coleccionEpica:           coleccion.filter((d) => d.beers_new?.rareza === "epica").length,
    coleccionLegendaria:      coleccion.filter((d) => d.beers_new?.rareza === "legendaria").length,
    coleccionMitica:          coleccion.filter((d) => d.beers_new?.rareza === "mitica").length,
    coleccionEdicionEspecial: coleccion.filter((d) => d.beers_new?.es_edicion_especial === true).length,
  };
}

// ── checkSocialAchievements ───────────────────────────────────────────────────
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
  const socialSlugs   = ["primer-contacto", "companeros-de-cata", "clan-cervecero"];
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

// ── checkSeriesAchievements ───────────────────────────────────────────────────
// Dynamically awards "serie completa" achievements — no pre-registration needed.
// Slug pattern: "serie-{slugified-familia}", stored directly in user_achievements.
export async function checkSeriesAchievements(userId) {
  const { data: famBeers } = await supabase
    .from("beers_new")
    .select("id, familia")
    .not("familia", "is", null);

  if (!famBeers?.length) return [];

  // Group by familia
  const families = {};
  for (const b of famBeers) {
    if (!families[b.familia]) families[b.familia] = [];
    families[b.familia].push(b.id);
  }

  // Only families with ≥2 beers can be "completed"
  const trackable = Object.entries(families).filter(([, ids]) => ids.length >= 2);
  if (!trackable.length) return [];

  const { data: userCol } = await supabase
    .from("user_beers")
    .select("beer_id")
    .eq("user_id", userId)
    .eq("en_coleccion", true);

  const collectedIds = new Set((userCol || []).map((r) => r.beer_id));

  const completed = trackable.filter(([, ids]) => ids.every((id) => collectedIds.has(id)));
  if (!completed.length) return [];

  const slugs = completed.map(([fam]) => `serie-${slugify(fam)}`);
  const { data: existing } = await supabase
    .from("user_achievements")
    .select("slug")
    .eq("user_id", userId)
    .in("slug", slugs);

  const existingSlugs = new Set((existing || []).map((a) => a.slug));
  const toAward = completed.filter(([fam]) => !existingSlugs.has(`serie-${slugify(fam)}`));
  if (!toAward.length) return [];

  await supabase.from("user_achievements").insert(
    toAward.map(([fam, ids]) => ({
      user_id:     userId,
      slug:        `serie-${slugify(fam)}`,
      xp_awarded:  50 * ids.length,
      nombre:      `Serie "${fam}" completa`,
    }))
  );

  return toAward.map(([fam, ids]) => ({
    slug:        `serie-${slugify(fam)}`,
    emoji:       "🎖️",
    nombre:      `Serie "${fam}" completa`,
    descripcion: `Conseguiste todas las cervezas de la familia ${fam}`,
    xpBonus:     50 * ids.length,
  }));
}

// ── checkAndAwardAchievements ─────────────────────────────────────────────────
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
