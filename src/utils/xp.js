export const XP_VALUES = {
  REGISTER: 10,
  RATING: 15,
  COMMENT: 20,
  PHOTO: 25,
  COMPLETE_BONUS: 10,
};

export function computeEntryXP({ rating, comment, photo }) {
  const hasRating = rating != null && rating !== '' && Number(rating) > 0;
  const hasComment = comment != null && comment.trim().length > 0;
  const hasPhoto = photo != null && photo.trim().length > 0;

  let xp = XP_VALUES.REGISTER;
  if (hasRating) xp += XP_VALUES.RATING;
  if (hasComment) xp += XP_VALUES.COMMENT;
  if (hasPhoto) xp += XP_VALUES.PHOTO;
  if (hasRating && hasComment && hasPhoto) xp += XP_VALUES.COMPLETE_BONUS;

  return xp;
}

// Cumulative XP required to reach level n (level 1 = 0 XP)
export function xpForLevel(n) {
  if (n <= 1) return 0;
  return Math.floor(200 * Math.pow(n - 1, 1.6));
}

export function getLevelInfo(totalXP) {
  let level = 1;
  while (totalXP >= xpForLevel(level + 1)) {
    level++;
    if (level >= 100) break;
  }
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const xpIntoLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPct = Math.min(Math.round((xpIntoLevel / xpNeeded) * 100), 100);
  return { level, xpIntoLevel, xpNeeded, progressPct };
}
