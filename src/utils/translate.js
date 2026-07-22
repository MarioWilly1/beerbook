// Traducción automática de info_detallada vía MyMemory Translate
// (https://mymemory.translated.net) — API gratuita, sin API key.
//
// Límite real de la API: ~500 bytes UTF-8 por request. Con tildes/ñ cada
// carácter puede pesar 2 bytes, así que se trocea por oración antes de
// mandar cualquier texto largo, y se reconstruye uniendo los fragmentos
// traducidos. El parámetro "de" (un email, vía REACT_APP_MYMEMORY_EMAIL)
// sube el cupo gratis diario de 5.000 a 50.000 caracteres — no requiere
// registro. Si la variable no está seteada, se omite el parámetro y queda
// el cupo anónimo (5.000/día).
//
// Si CUALQUIER fragmento falla, se aborta esa traducción completa y se
// devuelve null (nunca un texto a medias, mezcla de idiomas). El
// fallback a español se resuelve en el punto donde se MUESTRA la
// descripción (BeerInfoModal), no acá.

const MYMEMORY_EMAIL = process.env.REACT_APP_MYMEMORY_EMAIL || "";
const CHUNK_MAX_BYTES = 450; // margen bajo los ~500 bytes reales del límite
const REQUEST_TIMEOUT_MS = 10000;

function utf8ByteLength(str) {
  return new TextEncoder().encode(str).length;
}

// Trocea por oración; si una sola oración ya supera el límite, corta a
// la fuerza por caracteres (caso borde, no debería pasar con texto normal).
function splitIntoChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let current = "";

  const flush = () => { if (current.trim()) chunks.push(current.trim()); current = ""; };

  for (const sentence of sentences) {
    if (utf8ByteLength(current + sentence) <= CHUNK_MAX_BYTES) {
      current += sentence;
      continue;
    }
    flush();
    if (utf8ByteLength(sentence) <= CHUNK_MAX_BYTES) {
      current = sentence;
      continue;
    }
    // oración sola > límite: cortar por caracteres
    let piece = "";
    for (const ch of sentence) {
      if (utf8ByteLength(piece + ch) > CHUNK_MAX_BYTES) {
        chunks.push(piece.trim());
        piece = ch;
      } else {
        piece += ch;
      }
    }
    current = piece;
  }
  flush();
  return chunks;
}

async function translateChunk(text, targetLang) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}` +
      `&langpair=es|${targetLang}` +
      (MYMEMORY_EMAIL ? `&de=${encodeURIComponent(MYMEMORY_EMAIL)}` : "");
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) return null;
    return data.responseData.translatedText;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Traduce un texto (posiblemente largo) a un idioma, troceando si hace
// falta. null si el texto está vacío o si falló cualquier fragmento.
export async function translateLongText(text, targetLang) {
  if (!text || !text.trim()) return null;
  const chunks = splitIntoChunks(text.trim());
  const translated = [];
  for (const chunk of chunks) {
    const result = await translateChunk(chunk, targetLang);
    if (result == null) return null;
    translated.push(result);
  }
  return translated.join(" ").replace(/\s+/g, " ").trim();
}

// Traduce a inglés y alemán en paralelo entre sí (los fragmentos DENTRO
// de cada idioma van secuenciales, para no ráfagar la API). Cualquiera
// de los dos puede venir null si esa traducción puntual falló.
export async function translateDescription(spanishText) {
  const [en, de] = await Promise.all([
    translateLongText(spanishText, "en"),
    translateLongText(spanishText, "de"),
  ]);
  return { en, de };
}
