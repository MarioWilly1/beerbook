// Solo el glyph — el texto de cada rareza viene de t(`rareza.${slug}`)
// (claves ya traducidas a es/en/de), nunca hardcodeado.
export const RAREZA_EMOJI = {
  comun: "⚪", poco_comun: "🟢", rara: "🔵",
  epica: "🟣", legendaria: "🟡", mitica: "🌈",
};

export const RAREZA_BADGE = {
  comun:      { color: "#7a6a55", bg: "rgba(122,106,85,0.1)",   border: "rgba(122,106,85,0.2)"   },
  poco_comun: { color: "#4a9e6a", bg: "rgba(74,158,106,0.12)",  border: "rgba(74,158,106,0.3)"   },
  rara:       { color: "#4a90d9", bg: "rgba(74,144,217,0.12)",  border: "rgba(74,144,217,0.3)"   },
  epica:      { color: "#a366e8", bg: "rgba(163,102,232,0.12)", border: "rgba(163,102,232,0.3)"  },
  legendaria: { color: "#d4af37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.3)"   },
  mitica:     { color: "#e040fb", bg: "rgba(224,64,251,0.1)",   border: "rgba(224,64,251,0.25)"  },
};
