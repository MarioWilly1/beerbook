import { computeEntryXP, getLevelInfo } from "./xp";
import { updateStreak } from "./streak";
import { fetchAchievementStats, checkAndAwardAchievements, checkSeriesAchievements } from "./achievements";
import { logActivity } from "./activity";
import { checkAndAwardBadges } from "./badges";
import { fetchWeeklyChallengeProgress, checkAndAwardWeeklyChallenge } from "./weeklyChallenge";
import { toastSave, toastAchievements, toastBadges, toastLevelUp } from "./toast";
import { celebrateLevel, celebrateAchievement } from "./celebrate";
import { soundClink, soundLevelUp, soundAchievement } from "./sounds";
import { insertTasting } from "./tastings";
import { RAREZA_COLECCIONABLE } from "./rareza";

// Primera vez que una cerveza entra al cuaderno de un usuario: crea la fila
// resumen en user_beers (arranca en XP=0) y registra la primera cata, que es
// la que efectivamente suma el XP real vía trigger. Además dispara toda la
// cascada de racha/logros/insignias/retos y los toasts/celebraciones
// correspondientes — mismo comportamiento exacto que el guardado inicial de
// BeerCard.js, extraído acá para que otros flujos (ej. QuickRegisterModal)
// no dupliquen esta lógica.
export async function registerFirstTasting(supabase, beer, {
  photoUrl = "", photoHash, selfiePhotoUrl = "", selfiePhotoHash,
  comment = "", rating = "", location = null, times = 0,
} = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "no-session" };

  const isColeccionable = beer.es_edicion_especial || RAREZA_COLECCIONABLE.has(beer.rareza);
  const collectionBonus = isColeccionable ? 20 : 0;
  const xp = computeEntryXP({ rating, comment, photo: photoUrl }) + collectionBonus;
  const isComplete =
    rating !== "" && Number(rating) > 0 &&
    comment.trim().length > 0 &&
    photoUrl.trim().length > 0;

  const { data: xpRows } = await supabase
    .from("user_beers").select('"XP"').eq("user_id", session.user.id);
  const prevTotal  = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
  const newTotal   = prevTotal + xp;
  const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
  const newLevel   = getLevelInfo(newTotal).level;

  const tastingFields = {
    rating:           rating !== "" ? Number(rating) : null,
    comment:          comment || null,
    user_photo_url:   photoUrl || null,
    selfie_photo_url: selfiePhotoUrl || null,
    location_lat:     location?.lat    ?? null,
    location_lng:     location?.lng    ?? null,
    location_name:    location?.name   ?? null,
    location_public:  location?.isPublic ?? true,
    price_paid:       location?.price  ?? null,
  };
  if (photoHash !== undefined) tastingFields.photo_hash = photoHash;
  if (selfiePhotoHash !== undefined) tastingFields.selfie_photo_hash = selfiePhotoHash;

  const { error: userBeersError } = await supabase.from("user_beers").upsert({
    user_id: session.user.id, beer_id: beer.id, times,
    comment: comment || "", Rating: tastingFields.rating,
    user_photo_url: tastingFields.user_photo_url,
    selfie_photo_url: tastingFields.selfie_photo_url,
    location_lat: tastingFields.location_lat, location_lng: tastingFields.location_lng,
    location_name: tastingFields.location_name, location_public: tastingFields.location_public,
    price_paid: tastingFields.price_paid,
    ...(photoHash !== undefined ? { photo_hash: photoHash } : {}),
    ...(selfiePhotoHash !== undefined ? { selfie_photo_hash: selfiePhotoHash } : {}),
  });
  if (userBeersError) return { error: userBeersError };

  const { error: tastingError } = await insertTasting(supabase, session.user.id, beer.id, tastingFields);
  if (tastingError) return { error: tastingError };

  await logActivity(session.user.id, beer.id, { rating, comment, photo: photoUrl });

  const [newStreak, achStats] = await Promise.all([
    updateStreak(),
    fetchAchievementStats(session.user.id),
  ]);
  // fire-and-forget, el banner del Dashboard refleja el resultado — puede
  // haber hasta 2 retos activos (diario + semanal) para chequear
  fetchWeeklyChallengeProgress().then((list) => list.forEach(checkAndAwardWeeklyChallenge));
  const [ordinaryAchievements, newBadges, seriesAchievements] = await Promise.all([
    achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
    achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
    checkSeriesAchievements(session.user.id),
  ]);
  const newAchievements = [...ordinaryAchievements, ...seriesAchievements];

  soundClink();
  toastSave(xp, isComplete);
  if (collectionBonus > 0) toastAchievements([{ emoji: "💎", nombre: "¡Cerveza coleccionable!", descripcion: "Primera vez que la registrás", xpBonus: collectionBonus }]);

  if (didLevelUp) {
    celebrateLevel();
    soundLevelUp();
    toastLevelUp(newLevel);
  }
  if (newAchievements.length > 0) {
    celebrateAchievement();
    soundAchievement();
    toastAchievements(newAchievements);
  }
  if (newBadges.length > 0) {
    toastBadges(newBadges);
  }

  return { error: null, xp, didLevelUp, newLevel, newAchievements, newBadges };
}
