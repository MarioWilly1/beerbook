// Maps Spanish country names (as stored in DB) → ISO 3166-1 alpha-2 codes
const ES_NAME_TO_CODE = {
  "argentina":           "AR",
  "españa":              "ES",
  "alemania":            "DE",
  "estados unidos":      "US",
  "usa":                 "US",
  "eeuu":                "US",
  "bélgica":             "BE",
  "belgica":             "BE",
  "francia":             "FR",
  "méxico":              "MX",
  "mexico":              "MX",
  "brasil":              "BR",
  "chile":               "CL",
  "colombia":            "CO",
  "japón":               "JP",
  "japon":               "JP",
  "irlanda":             "IE",
  "reino unido":         "GB",
  "gran bretaña":        "GB",
  "gran bretana":        "GB",
  "república checa":     "CZ",
  "republica checa":     "CZ",
  "chequia":             "CZ",
  "austria":             "AT",
  "australia":           "AU",
  "países bajos":        "NL",
  "paises bajos":        "NL",
  "holanda":             "NL",
  "italia":              "IT",
  "dinamarca":           "DK",
  "suiza":               "CH",
  "noruega":             "NO",
  "suecia":              "SE",
  "perú":                "PE",
  "peru":                "PE",
  "uruguay":             "UY",
  "venezuela":           "VE",
  "ecuador":             "EC",
  "bolivia":             "BO",
  "paraguay":            "PY",
  "canadá":              "CA",
  "canada":              "CA",
  "rusia":               "RU",
  "china":               "CN",
  "india":               "IN",
  "sudáfrica":           "ZA",
  "sudafrica":           "ZA",
  "eslovenia":           "SI",
  "polonia":             "PL",
  "portugal":            "PT",
  "grecia":              "GR",
  "hungría":             "HU",
  "hungria":             "HU",
  "eslovaquia":          "SK",
  "croacia":             "HR",
  "finlandia":           "FI",
  "nueva zelanda":       "NZ",
  "nueva zelandia":      "NZ",
  "corea del sur":       "KR",
  "israel":              "IL",
  "cuba":                "CU",
  "costa rica":          "CR",
  "panamá":              "PA",
  "panama":              "PA",
  "filipinas":           "PH",
  "turquía":             "TR",
  "turquia":             "TR",
  "tailandia":           "TH",
  "taiwán":              "TW",
  "taiwan":              "TW",
  "vietnam":             "VN",
  "luxemburgo":          "LU",
  "rumania":             "RO",
  "rumanía":             "RO",
  "bulgaria":            "BG",
  "estonia":             "EE",
  "letonia":             "LV",
  "lituania":            "LT",
  "ucrania":             "UA",
  "serbia":              "RS",
  "islandia":            "IS",
  "singapur":            "SG",
  "malasia":             "MY",
  "indonesia":           "ID",
  "marruecos":           "MA",
  "nigeria":             "NG",
  "ghana":               "GH",
  "kenya":               "KE",
  "kenia":               "KE",
  "namibia":             "NA",
  "malta":               "MT",
  "chipre":              "CY",
  "escocia":             "GB",
  "gales":               "GB",
};

// Únicos idiomas que la app realmente soporta (ver src/i18n.js resources).
// i18n.language puede traer cualquier otra cosa: i18next-browser-languagedetector
// cae a navigator.language (idioma del navegador/SO) hasta que el perfil del
// usuario termina de cargar y corrige el idioma vía changeLanguage(). Mientras
// tanto, t() ya muestra todo en español gracias a fallbackLng: "es" — pero
// i18n.language en sí puede seguir siendo, por ejemplo, "ar", y pasarlo tal
// cual a Intl.DisplayNames devuelve el nombre del país en árabe. Por eso acá
// se recorta SIEMPRE a uno de los 3 idiomas soportados antes de usarlo.
const SUPPORTED_LOCALES = ["es", "en", "de"];

export function resolveSupportedLocale(locale) {
  const base = (locale || "").slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(base) ? base : "es";
}

// Intl.DisplayNames instances keyed by locale (reused across calls)
const _cache = {};

/**
 * Returns the localized display name for a country stored in Spanish.
 * Falls back to the original string if no ISO mapping is found. The
 * display language is always clamped to es/en/de (never the country's
 * own native language), regardless of what i18n.language reports.
 */
export function getCountryName(spanishName, locale) {
  if (!spanishName) return spanishName;

  const code = ES_NAME_TO_CODE[spanishName.toLowerCase().trim()];
  if (!code) return spanishName;

  const safeLocale = resolveSupportedLocale(locale);

  try {
    if (!_cache[safeLocale]) {
      _cache[safeLocale] = new Intl.DisplayNames([safeLocale], { type: "region" });
    }
    return _cache[safeLocale].of(code) || spanishName;
  } catch {
    return spanishName;
  }
}
