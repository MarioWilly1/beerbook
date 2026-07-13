/**
 * Converts any string into a Storage-safe key: only [a-z0-9-].
 * Strips diacritics (ü→u, ñ→n, á→a), replaces everything else with hyphens.
 */
export function slugify(str, fallback = 'beer') {
  const result = String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return result || fallback;
}
