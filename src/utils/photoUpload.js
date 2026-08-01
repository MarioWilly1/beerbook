import { computeDHash } from "./perceptualHash";
import { slugify } from "./slugify";

// Redimensiona/comprime la foto antes de subirla (max 1080px, JPEG 0.85) y
// calcula el hash perceptual sobre el MISMO canvas ya redimensionado — sin
// costo extra de red ni de decodificación (ver perceptualHash.js). Usado
// por MiCuaderno.js y BeerCard.js — ambos caminos de subida de foto de
// usuario, para que la detección de duplicados cubra los dos.
export function compressImage(file, maxDimension = 1080, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
        else                 { width  = Math.round((width  * maxDimension) / height); height = maxDimension; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const hash = computeDHash(canvas);
      canvas.toBlob((blob) => resolve({ blob, hash }), "image/jpeg", quality);
    };
    img.src = objectUrl;
  });
}

// Sube el blob comprimido al bucket "user-beers" (carpeta = userId, como
// exigen las RLS policies de storage) y devuelve la URL pública.
export async function uploadUserBeerPhoto(supabase, userId, beerNombre, beerId, blob) {
  const safeName = slugify(beerNombre, String(beerId));
  const path = `${userId}/${safeName}_${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("user-beers")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("user-beers").getPublicUrl(path);
  return publicUrl;
}

// Mismo patrón que uploadUserBeerPhoto, para el bucket "user-glasses" —
// usado tanto para la foto de verificación al coleccionar una copa como
// para la foto de referencia al sugerir una copa nueva (mismo bucket,
// distinto prefijo, ver migración 20260801010000_glass_collection.sql).
export async function uploadUserGlassPhoto(supabase, userId, glassNombre, glassId, blob) {
  const safeName = slugify(glassNombre, String(glassId));
  const path = `${userId}/${safeName}_${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("user-glasses")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("user-glasses").getPublicUrl(path);
  return publicUrl;
}

// Para la foto de referencia de una sugerencia todavía no existe un
// glassId (ni un nombre confirmado) — usa un prefijo fijo + uuid.
export async function uploadGlassSuggestionPhoto(supabase, userId, blob) {
  const path = `${userId}/suggestion_${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("user-glasses")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("user-glasses").getPublicUrl(path);
  return publicUrl;
}
