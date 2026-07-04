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

// Intl.DisplayNames instances keyed by locale (reused across calls)
const _cache = {};

/**
 * Returns the localized display name for a country stored in Spanish.
 * Falls back to the original string if no ISO mapping is found.
 */
export function getCountryName(spanishName, locale) {
  if (!spanishName) return spanishName;

  const code = ES_NAME_TO_CODE[spanishName.toLowerCase().trim()];
  if (!code) return spanishName;

  try {
    if (!_cache[locale]) {
      _cache[locale] = new Intl.DisplayNames([locale], { type: "region" });
    }
    return _cache[locale].of(code) || spanishName;
  } catch {
    return spanishName;
  }
}
