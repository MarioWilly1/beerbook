// dHash (difference hash) de 64 bits — usado por el sistema anti-trampa
// para detectar fotos reutilizadas entre entradas (ver
// supabase/migrations/20260722000000_anti_cheat_flags.sql).
//
// Se calcula reescalando la imagen a una grilla de 9x8 en escala de
// grises y comparando cada píxel con el de al lado (izquierda vs
// derecha): más claro que el siguiente → bit 1, si no → bit 0. Salen
// 8 filas × 8 comparaciones = 64 bits.
//
// Pensado para reusar un canvas que YA existe (p.ej. el que
// MiCuaderno.js arma para comprimir la foto antes de subirla) — no
// decodifica la imagen de nuevo, es un drawImage + getImageData sobre
// una grilla minúscula, submilisegundos.

const HASH_W = 9;
const HASH_H = 8;

export function computeDHash(sourceCanvas) {
  const small = document.createElement("canvas");
  small.width = HASH_W;
  small.height = HASH_H;
  const ctx = small.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0, HASH_W, HASH_H);

  const { data } = ctx.getImageData(0, 0, HASH_W, HASH_H);
  const gray = new Array(HASH_W * HASH_H);
  for (let i = 0; i < HASH_W * HASH_H; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  let bits = 0n;
  let bitIndex = 0n;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      if (gray[y * HASH_W + x] > gray[y * HASH_W + x + 1]) {
        bits |= (1n << bitIndex);
      }
      bitIndex++;
    }
  }
  return toSigned64(bits);
}

// Postgres bigint es un entero de 64 bits con signo — si el bit más
// alto quedó en 1, hay que convertir el patrón a su representación
// negativa en complemento a dos para que XOR/bit_count del lado SQL
// operen sobre el mismo patrón de bits que generó este hash.
function toSigned64(u) {
  const TWO63 = 1n << 63n;
  const TWO64 = 1n << 64n;
  return u >= TWO63 ? u - TWO64 : u;
}

// bigint no es serializable a JSON — se manda como string, PostgREST
// lo acepta igual para una columna bigint.
export function hashToString(hash) {
  return hash == null ? null : hash.toString();
}
