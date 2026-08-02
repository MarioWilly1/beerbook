export const STYLE_KEYWORDS = ["IPA", "Lager", "Stout", "Ale", "Porter", "Saison", "Sour", "Dubbel", "Tripel"];

export function normalizeStr(str) {
  if (!str) return "";
  const nfd = str.normalize("NFD");
  let out = "";
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) out += nfd[i];
  }
  return out.toLowerCase();
}
