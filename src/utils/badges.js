import { supabase } from "../services/supabase";

export const TIERS = ["bronce", "plata", "oro", "platino"];

export const TIER_META = {
  bronce:  { label: "Bronce",  color: "#cd7f32", bg: "#fdf0e3", xp: 25  },
  plata:   { label: "Plata",   color: "#a0a0a0", bg: "#f4f4f4", xp: 75  },
  oro:     { label: "Oro",     color: "#d4af37", bg: "#fffbee", xp: 150 },
  platino: { label: "Platino", color: "#7c3aed", bg: "linear-gradient(135deg, #f5f0ff 0%, #ede9fe 60%, #fdf4ff 100%)", xp: 300 },
};

export const BADGE_DEFS = [
  {
    slug: "catador",
    icon: "🍺",
    nombre: "Catador",
    descripcion: "Cervezas registradas",
    stat: "totalBeers",
    thresholds: { bronce: 10, plata: 50, oro: 100, platino: 250 },
  },
  {
    slug: "viajero",
    icon: "🌍",
    nombre: "Viajero",
    descripcion: "Países distintos probados",
    stat: "distinctCountries",
    thresholds: { bronce: 3, plata: 8, oro: 15, platino: 25 },
  },
  {
    slug: "explorador",
    icon: "🎨",
    nombre: "Explorador",
    descripcion: "Estilos distintos probados",
    stat: "distinctStyles",
    thresholds: { bronce: 5, plata: 12, oro: 20, platino: 35 },
  },
  {
    slug: "fotografo",
    icon: "📸",
    nombre: "Fotógrafo",
    descripcion: "Fotos subidas",
    stat: "beersWithPhotos",
    thresholds: { bronce: 5, plata: 20, oro: 50, platino: 100 },
  },
  {
    slug: "critico",
    icon: "✍️",
    nombre: "Crítico",
    descripcion: "Comentarios escritos",
    stat: "beersWithComments",
    thresholds: { bronce: 5, plata: 20, oro: 50, platino: 100 },
  },
];

// Checks which badge tiers are newly unlocked and inserts them.
// Returns array of newly unlocked { badge, tier, xp, tierLabel } objects.
export async function checkAndAwardBadges(userId, stats) {
  const { data: existing } = await supabase
    .from("user_badges")
    .select("badge_slug, tier")
    .eq("user_id", userId);

  const unlocked = new Set((existing || []).map((r) => `${r.badge_slug}:${r.tier}`));
  const toInsert = [];
  const newBadges = [];

  for (const badge of BADGE_DEFS) {
    const value = stats[badge.stat] || 0;
    for (const tier of TIERS) {
      if (unlocked.has(`${badge.slug}:${tier}`)) continue;
      if (value >= badge.thresholds[tier]) {
        const xp = TIER_META[tier].xp;
        toInsert.push({ user_id: userId, badge_slug: badge.slug, tier, xp_awarded: xp });
        newBadges.push({ ...badge, tier, xp, tierLabel: TIER_META[tier].label });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("user_badges").insert(toInsert);
  }

  return newBadges;
}
