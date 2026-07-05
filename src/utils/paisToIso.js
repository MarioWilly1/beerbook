// Normalizes accent characters and lowercases
function norm(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Maps normalized substrings → ISO 3166-1 alpha-2
// ORDER MATTERS: more specific / country-level keys must come before city/region keys
// to avoid "Guadalajara (México)" matching "guadalajara" → ES before "mexico" → MX
const LOOKUP = [
  ["espana",         "ES"],
  ["spain",          "ES"],
  ["alemania",       "DE"],
  ["germany",        "DE"],
  ["belgica",        "BE"],
  ["belgium",        "BE"],
  ["portugal",       "PT"],
  ["azores",         "PT"],
  ["argentina",      "AR"],
  ["estados unidos", "US"],
  ["united states",  "US"],
  ["irlanda",        "IE"],
  ["ireland",        "IE"],
  ["escocia",        "GB"],
  ["scotland",       "GB"],
  ["reino unido",    "GB"],
  ["japon",          "JP"],
  ["japan",          "JP"],
  ["brasil",         "BR"],
  ["brazil",         "BR"],
  ["china",          "CN"],
  ["dinamarca",      "DK"],
  ["denmark",        "DK"],
  ["italia",         "IT"],
  ["italy",          "IT"],
  ["mexico",         "MX"],
  ["paises bajos",   "NL"],
  ["netherlands",    "NL"],
  ["holanda",        "NL"],
  ["republica checa","CZ"],
  ["czech",          "CZ"],
  // Spanish cities/provinces — after all country keys so "Guadalajara (México)"
  // matches "mexico" first and correctly returns MX
  ["madrid",         "ES"],
  ["segovia",        "ES"],
  ["guadalajara",    "ES"],
  ["galicia",        "ES"],
  ["wisconsin",      "US"],
  ["michigan",       "US"],
  ["milwaukee",      "US"],
];

export function paisToIso(pais) {
  if (!pais) return null;
  const n = norm(pais);
  for (const [key, iso] of LOOKUP) {
    if (n.includes(key)) return iso;
  }
  return null;
}

// ISO alpha-2 → ISO 3166-1 numeric ID used in world-atlas TopoJSON
export const ISO_TO_ID = {
  ES: "724", DE: "276", BE: "056", PT: "620", AR: "032",
  US: "840", IE: "372", GB: "826", JP: "392", BR: "076",
  CN: "156", DK: "208", IT: "380", MX: "484", NL: "528", CZ: "203",
};

// Display names (in Spanish)
export const ISO_DISPLAY = {
  ES: "España",     DE: "Alemania",     BE: "Bélgica",
  PT: "Portugal",   AR: "Argentina",    US: "Estados Unidos",
  IE: "Irlanda",    GB: "Reino Unido",  JP: "Japón",
  BR: "Brasil",     CN: "China",        DK: "Dinamarca",
  IT: "Italia",     MX: "México",       NL: "Países Bajos",
  CZ: "República Checa",
};
