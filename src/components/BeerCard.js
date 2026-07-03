import React, { useState } from "react";
import { supabase } from "../services/supabase";
import { computeEntryXP, XP_VALUES } from "../utils/xp";
import { updateStreak } from "../utils/streak";
import { fetchAchievementStats, checkAndAwardAchievements } from "../utils/achievements";
import { logActivity } from "../utils/activity";
import { checkAndAwardBadges } from "../utils/badges";
import Lightbox from "./Lightbox";

const RATING_OPTIONS = ["", 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const BeerCard = ({ beer, myBeerData, onSaved, isInMyBeers }) => {
  const [times, setTimes]     = useState(myBeerData?.times || 0);
  const [comment, setComment] = useState(myBeerData?.comment || "");
  const [rating, setRating]   = useState(myBeerData?.Rating ?? "");
  const [photoUrl, setPhotoUrl] = useState(myBeerData?.user_photo_url || "");
  const [saving, setSaving]   = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const xpPreview = computeEntryXP({ rating, comment, photo: photoUrl });
  const isComplete =
    rating !== "" && Number(rating) > 0 &&
    comment.trim().length > 0 &&
    photoUrl.trim().length > 0;

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    const xp = computeEntryXP({ rating, comment, photo: photoUrl });

    const { error } = await supabase.from("user_beers").upsert({
      user_id: session.user.id,
      beer_id: beer.id,
      times,
      comment,
      Rating: rating !== "" ? Number(rating) : null,
      user_photo_url: photoUrl || null,
      XP: xp,
    });

    if (error) { setSaving(false); return; }

    await logActivity(session.user.id, beer.id, { rating, comment, photo: photoUrl });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(session.user.id),
      fetchAchievementStats(session.user.id),
    ]);

    const [newAchievements, newBadges] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
    ]);

    setSaving(false);
    onSaved && onSaved();

    let msg = `🍺 Guardado · +${xp} XP`;
    if (isComplete) msg += " 🎯 ¡Entrada completa!";
    if (newAchievements.length > 0) {
      msg += "\n\n🏅 ¡Logro desbloqueado!";
      newAchievements.forEach((a) => { msg += `\n${a.emoji} ${a.nombre} (+${a.xpBonus} XP)`; });
    }
    if (newBadges.length > 0) {
      msg += "\n\n🏷️ ¡Insignia desbloqueada!";
      newBadges.forEach((b) => { msg += `\n${b.icon} ${b.nombre} ${b.tierLabel} (+${b.xp} XP)`; });
    }
    alert(msg);
  };

  return (
    <div style={cardStyle}>
      <img
        src={beer.foto_url}
        alt={beer.nombre}
        onClick={() => beer.foto_url && setLightboxSrc(beer.foto_url)}
        style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "10px", cursor: beer.foto_url ? "zoom-in" : "default" }}
      />
      <Lightbox src={lightboxSrc} alt={beer.nombre} onClose={() => setLightboxSrc(null)} />

      <div style={{ padding: "10px 4px 0" }}>
        <h3 style={{ margin: "0 0 2px", fontSize: "15px" }}>{beer.nombre}</h3>
        <p style={metaStyle}>{beer.estilo} · {beer.pais} · {beer.alcohol}%</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>Veces probada</label>
          <input
            type="number"
            value={times}
            min="0"
            onChange={(e) => setTimes(Math.max(0, parseInt(e.target.value) || 0))}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Puntuación ⭐ <XpBadge xp={XP_VALUES.RATING} />
          </label>
          <select value={rating} onChange={(e) => setRating(e.target.value)} style={inputStyle}>
            {RATING_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v === "" ? "— Sin puntuación —" : `${v} / 5`}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Comentario <XpBadge xp={XP_VALUES.COMMENT} />
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="¿Qué te pareció?"
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            URL foto tuya <XpBadge xp={XP_VALUES.PHOTO} />
          </label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {isComplete && (
          <div style={bonusBannerStyle}>
            🎯 +{XP_VALUES.COMPLETE_BONUS} XP bonus por entrada completa
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...saveBtn, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Guardando..." : `💾 Guardar · +${xpPreview} XP`}
        </button>

        {isInMyBeers && (
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#888", textAlign: "center" }}>
            ✅ En tu cuaderno
          </p>
        )}
      </div>
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>
    +{xp} XP
  </span>
);

const cardStyle   = { border: "1px solid #e8e0d0", borderRadius: "12px", padding: "12px", background: "#fff", display: "flex", flexDirection: "column" };
const metaStyle   = { margin: "0 0 10px", fontSize: "12px", color: "#888" };
const fieldStyle  = { marginBottom: "8px" };
const labelStyle  = { display: "block", fontSize: "11px", fontWeight: "600", color: "#555", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" };
const inputStyle  = { width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" };
const bonusBannerStyle = { background: "#fffbee", border: "1px solid #f0d060", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", color: "#856404", fontWeight: "600", marginBottom: "8px" };
const saveBtn     = { width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#d4af37", color: "#111", fontWeight: "700", fontSize: "13px", cursor: "pointer", marginTop: "4px" };

export default BeerCard;
