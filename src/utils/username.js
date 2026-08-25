// Reglas del apodo público (@username) — letras/números/guion bajo,
// 3-15 caracteres, sin ñ/tildes/espacios (mismo criterio que Twitter/
// Instagram/Discord para sus handles: evita líos de comparación
// case-insensitive con caracteres no-ASCII). Tiene que coincidir
// exactamente con el CHECK de la base (profiles_username_format,
// migración 20260825000000_public_username.sql).
export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,15}$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 15;

// null = formato válido; si no, la clave i18n del error específico.
export function usernameFormatError(value) {
  const v = (value || "").trim();
  if (v.length === 0) return "username.errors.required";
  if (v.length < USERNAME_MIN) return "username.errors.tooShort";
  if (v.length > USERNAME_MAX) return "username.errors.tooLong";
  if (!USERNAME_REGEX.test(v)) return "username.errors.badChars";
  return null;
}

// Sanitiza mientras se escribe: saca todo lo que no sea letra/número/_,
// y corta en el máximo — así nunca se puede llegar a escribir un
// caracter inválido, en vez de dejar escribir y recién avisar después.
export function sanitizeUsernameInput(raw) {
  return raw.replace(/[^A-Za-z0-9_]/g, "").slice(0, USERNAME_MAX);
}

// Sugerencias cuando el apodo elegido ya está tomado: el mismo apodo
// (recortado a 15 si hace falta) + un número al final. No garantiza que
// estén libres — el caller las tiene que chequear una por una contra
// is_username_available antes de ofrecerlas.
export function suggestUsernames(base) {
  const trimmedBase = sanitizeUsernameInput(base).slice(0, USERNAME_MAX - 3) || "usuario";
  const suffixes = [
    Math.floor(10 + Math.random() * 90),
    Math.floor(100 + Math.random() * 900),
    Math.floor(1000 + Math.random() * 9000),
  ];
  return suffixes.map((n) => `${trimmedBase}${n}`.slice(0, USERNAME_MAX));
}
