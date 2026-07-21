import { resolveSupportedLocale } from "./countryDisplay";

// Lista completa ISO 3166-1 alpha-2 (249 códigos, estándar oficial —
// incluye territorios/dependencias además de los estados soberanos).
const ISO_COUNTRY_CODES = [
  "AF","AX","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT",
  "AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW",
  "BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL",
  "CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ",
  "DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FK","FO","FJ",
  "FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP",
  "GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID",
  "IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR",
  "KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY",
  "MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS",
  "MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK",
  "MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR",
  "QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST",
  "SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES",
  "LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO",
  "TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US","UM","UY","UZ","VU",
  "VE","VN","VG","VI","WF","EH","YE","ZM","ZW",
];

// Intl.DisplayNames + listas ya resueltas, cacheadas por locale (son 249
// llamadas a .of() cada vez — no vale la pena recalcularlas en cada render).
const _displayNamesCache = {};
const _countryListCache  = {};

function getDisplayNames(locale) {
  if (!_displayNamesCache[locale]) {
    _displayNamesCache[locale] = new Intl.DisplayNames([locale], { type: "region" });
  }
  return _displayNamesCache[locale];
}

// Devuelve [{ code, name }] ordenado alfabéticamente según el idioma
// pedido, recortado siempre a es/en/de (mismo criterio que getCountryName).
export function getWorldCountries(locale) {
  const safeLocale = resolveSupportedLocale(locale);
  if (_countryListCache[safeLocale]) return _countryListCache[safeLocale];

  const dn = getDisplayNames(safeLocale);
  const list = ISO_COUNTRY_CODES
    .map((code) => ({ code, name: dn.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, safeLocale));

  _countryListCache[safeLocale] = list;
  return list;
}

function normalize(s) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Busca si rawValue (texto libre ya guardado) coincide con el nombre de
// algún país de la lista en ESE idioma. No cruza idiomas — si el usuario
// guardó "España" y ahora ve la app en inglés, no matchea "Spain" acá:
// simplemente cae en el fallback de "opción actual" hasta que la
// vuelva a elegir, tal como se pidió.
export function findCountryByName(rawValue, locale) {
  if (!rawValue) return null;
  const norm = normalize(rawValue);
  return getWorldCountries(locale).find((c) => normalize(c.name) === norm) || null;
}
