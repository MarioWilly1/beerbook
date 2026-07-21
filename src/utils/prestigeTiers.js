import tier1 from "../assets/prestige/tier-1-barro.png";
import tier2 from "../assets/prestige/tier-2-vidrio.png";
import tier3 from "../assets/prestige/tier-3-peltre.png";
import tier4 from "../assets/prestige/tier-4-cristal.png";
import tier5 from "../assets/prestige/tier-5-dorada.png";
import tier6 from "../assets/prestige/tier-6-gemas.png";

// Mapeo 1 a 1 entre número de Prestigio y copa — cada prestigio 1-5 tiene
// SU PROPIA imagen única, sin agrupar tramos. Prestigio 0 (antes del primer
// Prestigio) no tiene copa. Prestigio 6 en adelante es la única
// reutilización real: siempre gemas, para 6, 7, 8...
const PRESTIGE_TIERS = {
  1: { img: tier1, color: "#7a6a55" }, // barro
  2: { img: tier2, color: "#4a9e6a" }, // vidrio
  3: { img: tier3, color: "#4a90d9" }, // peltre
  4: { img: tier4, color: "#c07a3f" }, // cristal
  5: { img: tier5, color: "#d4af37" }, // dorada
};
const PRESTIGE_TOP_TIER = { img: tier6, color: "#f2c94c" }; // gemas, prestige >= 6

export function prestigeTierFor(prestige) {
  if (!prestige || prestige < 1) return null;
  if (prestige >= 6) return PRESTIGE_TOP_TIER;
  return PRESTIGE_TIERS[prestige] || null;
}

export function isMythic(prestige) {
  return prestige >= 6;
}
