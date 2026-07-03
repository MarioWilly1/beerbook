const BASE = "https://api.dicebear.com/9.x/adventurer/svg";
const BG   = "b8941f";

export const PRESET_AVATARS = [
  { id: "clasico",    nombre: "El Clásico",          url: `${BASE}?seed=Carlos&backgroundColor=${BG}` },
  { id: "maestro",    nombre: "El Maestro",           url: `${BASE}?seed=Maestro&backgroundColor=${BG}` },
  { id: "sommelier",  nombre: "La Sommelier",         url: `${BASE}?seed=Sofia&backgroundColor=${BG}` },
  { id: "explorador", nombre: "El Explorador",        url: `${BASE}?seed=Explorer&backgroundColor=${BG}` },
  { id: "lenador",    nombre: "El Leñador",           url: `${BASE}?seed=Lumberjack&backgroundColor=${BG}` },
  { id: "aventurera", nombre: "La Aventurera",        url: `${BASE}?seed=Valentina&backgroundColor=${BG}` },
  { id: "cientifico", nombre: "El Científico",        url: `${BASE}?seed=Newton&backgroundColor=${BG}` },
  { id: "historico",  nombre: "El Histórico",         url: `${BASE}?seed=Augusto&backgroundColor=${BG}` },
  { id: "festera",    nombre: "La Festera",           url: `${BASE}?seed=Fiesta&backgroundColor=${BG}` },
  { id: "tranquilo",  nombre: "El Tranquilo",         url: `${BASE}?seed=Bruno&backgroundColor=${BG}` },
  { id: "critico",    nombre: "El Crítico",           url: `${BASE}?seed=Critico&backgroundColor=${BG}` },
  { id: "novato",     nombre: "El Novato",            url: `${BASE}?seed=Novato&backgroundColor=${BG}` },
];
