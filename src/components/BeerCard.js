import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getCountryName } from "../utils/countryDisplay";
import { supabase } from "../services/supabase";
import { computeEntryXP, getLevelInfo, XP_VALUES } from "../utils/xp";
import { updateStreak } from "../utils/streak";
import { fetchAchievementStats, checkAndAwardAchievements } from "../utils/achievements";
import { logActivity } from "../utils/activity";
import { checkAndAwardBadges } from "../utils/badges";
import Lightbox from "./Lightbox";
import BeerInfoModal from "./BeerInfoModal";
import LocationPicker from "./LocationPicker";
import { toastSave, toastAchievements, toastBadges, toastLevelUp } from "../utils/toast";
import { celebrateLevel, celebrateAchievement } from "../utils/celebrate";
import { soundClink, soundLevelUp, soundAchievement } from "../utils/sounds";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { hashToString } from "../utils/perceptualHash";

const RATING_OPTIONS = ["", 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const RAREZA_LABEL = {
  comun: "⚪ Común", poco_comun: "🟢 Poco común", rara: "🔵 Rara",
  epica: "🟣 Épica", legendaria: "🟡 Legendaria", mitica: "🌈 Mítica",
};
const RAREZA_COLECCIONABLE = new Set(["rara", "epica", "legendaria", "mitica"]);
const RAREZA_BADGE = {
  comun:      { color: "#7a6a55", bg: "rgba(122,106,85,0.1)",   border: "rgba(122,106,85,0.2)"   },
  poco_comun: { color: "#4a9e6a", bg: "rgba(74,158,106,0.12)",  border: "rgba(74,158,106,0.3)"   },
  rara:       { color: "#4a90d9", bg: "rgba(74,144,217,0.12)",  border: "rgba(74,144,217,0.3)"   },
  epica:      { color: "#a366e8", bg: "rgba(163,102,232,0.12)", border: "rgba(163,102,232,0.3)"  },
  legendaria: { color: "#d4af37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.3)"   },
  mitica:     { color: "#e040fb", bg: "rgba(224,64,251,0.1)",   border: "rgba(224,64,251,0.25)"  },
};

const BeerCard = ({ beer, myBeerData, onSaved, isInMyBeers, onVerMapa, isTrending }) => {
  const { t, i18n } = useTranslation();
  const [expanded,  setExpanded]  = useState(false);
  const [times,     setTimes]     = useState(myBeerData?.times || 0);
  const [comment,   setComment]   = useState(myBeerData?.comment || "");
  const [rating,    setRating]    = useState(myBeerData?.Rating ?? "");
  const [photoUrl,  setPhotoUrl]  = useState(myBeerData?.user_photo_url || "");
  const [photoHash, setPhotoHash] = useState(undefined); // undefined = sin cambios esta sesión (ver nota en handleSave)
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef(null);
  const [location,  setLocation]  = useState(
    myBeerData?.location_lat
      ? { lat: myBeerData.location_lat, lng: myBeerData.location_lng, name: myBeerData.location_name, isPublic: myBeerData.location_public ?? true }
      : null
  );
  const [saving,     setSaving]    = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [infoOpen,   setInfoOpen]  = useState(false);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const { blob, hash } = await compressImage(file);
      const publicUrl = await uploadUserBeerPhoto(supabase, session.user.id, beer.nombre, beer.id, blob);
      setPhotoUrl(publicUrl);
      setPhotoHash(hashToString(hash));
    } catch {
      setUploadErr(t("beerform.uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    setPhotoHash(null);
  };

  const isColeccionable = beer.es_edicion_especial || RAREZA_COLECCIONABLE.has(beer.rareza);
  const collectionBonus = (!isInMyBeers && isColeccionable) ? 20 : 0;
  const xpPreview  = computeEntryXP({ rating, comment, photo: photoUrl }) + collectionBonus;
  const isComplete =
    rating !== "" && Number(rating) > 0 &&
    comment.trim().length > 0 &&
    photoUrl.trim().length > 0;

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    const xp = computeEntryXP({ rating, comment, photo: photoUrl }) + collectionBonus;

    const { data: xpRows } = await supabase
      .from("user_beers").select('"XP"').eq("user_id", session.user.id);
    const prevTotal  = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
    const newTotal   = prevTotal - (myBeerData?.XP || 0) + xp;
    const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
    const newLevel = getLevelInfo(newTotal).level;

    // photo_hash es un bigint de 64 bits — nunca se lee de vuelta desde la
    // base (perdería precisión al pasar por JSON/Number en JS). Solo se
    // manda cuando esta sesión lo calculó (subida nueva) o lo limpió
    // (quitar foto); si no cambió, se omite y Postgres deja intacto el
    // valor ya guardado (mismo criterio que MiCuaderno.js).
    const payload = {
      user_id:         session.user.id,
      beer_id:         beer.id,
      times,
      comment,
      Rating:          rating !== "" ? Number(rating) : null,
      user_photo_url:  photoUrl || null,
      XP:              xp,
      location_lat:    location?.lat    ?? null,
      location_lng:    location?.lng    ?? null,
      location_name:   location?.name   ?? null,
      location_public: location?.isPublic ?? true,
    };
    if (photoHash !== undefined) payload.photo_hash = photoHash;

    const { error } = await supabase.from("user_beers").upsert(payload);

    if (error) { setSaving(false); return; }

    await logActivity(session.user.id, beer.id, { rating, comment, photo: photoUrl });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(),
      fetchAchievementStats(session.user.id),
    ]);
    const [newAchievements, newBadges] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
    ]);

    setSaving(false);
    onSaved && onSaved();

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
  };

  const rb = beer.rareza ? (RAREZA_BADGE[beer.rareza] || RAREZA_BADGE.comun) : null;

  return (
    <div style={cardStyle}>
      {/* ── Sección siempre visible — click para expandir ── */}
      <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer" }}>
        {/* Foto */}
        <div style={{ position: "relative" }}>
          <img
            src={beer.foto_url}
            alt={beer.nombre}
            onClick={(e) => { e.stopPropagation(); beer.foto_url && setLightboxSrc(beer.foto_url); }}
            style={{
              width: "100%", height: "110px", objectFit: "cover",
              borderRadius: "8px", cursor: beer.foto_url ? "zoom-in" : "default", display: "block",
            }}
          />
          {isTrending && (
            <span style={{
              position: "absolute", top: 6, left: 6,
              background: "rgba(0,0,0,0.7)", color: "#ff8a3d",
              fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5,
              pointerEvents: "none",
            }}>
              🔥 {t("filters.trending")}
            </span>
          )}
          {photoUrl?.trim() && (
            <span style={{
              position: "absolute", bottom: 6, right: 6,
              background: "rgba(0,0,0,0.7)", color: "#d4af37",
              fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5,
              pointerEvents: "none",
            }}>
              📸 {t("beerform.verified")}
            </span>
          )}
          <Lightbox src={lightboxSrc} alt={beer.nombre} onClose={() => setLightboxSrc(null)} />
        </div>

        {/* Nombre + meta + fila de íconos */}
        <div style={{ padding: "6px 0 2px" }}>
          {/* Nombre — ancho completo, puede wrappear */}
          <p style={{
            margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#f0e4cc",
            lineHeight: 1.3, overflowWrap: "break-word", wordBreak: "break-word",
          }}>
            {beer.nombre}
          </p>

          {/* Meta: estilo · país · % */}
          <p style={metaStyle}>
            {beer.estilo} · {getCountryName(beer.pais, i18n.language)} · {beer.alcohol}%
          </p>

          {/* Fila inferior: badge rareza + spacer + íconos + ▼ */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
            {rb && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: rb.color,
                background: rb.bg, borderRadius: 4, padding: "1px 5px",
                border: `1px solid ${rb.border}`, flexShrink: 0,
                maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {RAREZA_LABEL[beer.rareza] || beer.rareza}
              </span>
            )}
            <span style={{ flex: 1 }} />
            {onVerMapa && (
              <button
                onClick={(e) => { e.stopPropagation(); onVerMapa(); }}
                title="Ver en el mapa de origen"
                style={infoBtnStyle}
              >
                🗺️
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }}
              title={t("beerInfo.btnTitle")}
              style={infoBtnStyle}
            >
              ⓘ
            </button>
            <span style={{ fontSize: 9, color: "#5a4535", flexShrink: 0 }}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>

          {isInMyBeers && (
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#9a7d62" }}>
              ✅ {t("beerform.inNotebook")}
            </p>
          )}
          {beer.sugerida_por_nombre && (
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#8b6b2e", fontStyle: "italic" }}>
              💡 {t("beercard.suggestedBy", { nombre: beer.sugerida_por_nombre })}
            </p>
          )}
        </div>
      </div>

      {/* ── Acordeón: visible solo al expandir ── */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #2e2215", marginTop: 2, paddingTop: 12,
          padding: "12px 4px 4px",
        }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t("beerform.timesLabel")}</label>
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
              {t("beerform.ratingLabel")} ⭐ <XpBadge xp={XP_VALUES.RATING} />
            </label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} style={inputStyle}>
              {RATING_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v === "" ? t("beerform.noRating") : `${v} / 5`}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              {t("beerform.commentLabel")} <XpBadge xp={XP_VALUES.COMMENT} />
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t("beerform.commentPlaceholder")}
              style={{ ...inputStyle, resize: "none" }}
              spellCheck="true"
              autoCorrect="on"
              autoCapitalize="sentences"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              {t("beerform.photoLabel")} <XpBadge xp={XP_VALUES.PHOTO} />
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
            />
            {uploadErr && (
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#c07a3f" }}>{uploadErr}</p>
            )}
            {photoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src={photoUrl} alt="Tu foto"
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", cursor: "pointer", flexShrink: 0 }}
                  onClick={() => setLightboxSrc(photoUrl)}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ ...photoBtnStyle, opacity: uploading ? 0.6 : 1 }}
                  >
                    {uploading ? t("beerform.uploading") : t("beerform.changePhotoBtn")}
                  </button>
                  <button type="button" onClick={handleRemovePhoto} style={clearPhotoBtnStyle}>
                    {t("beerform.removePhotoBtn")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ ...photoBtnStyle, width: "100%", opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? t("beerform.uploading") : t("beerform.uploadPhotoBtn")}
              </button>
            )}
          </div>

          <LocationPicker value={location} onChange={setLocation} />

          {isComplete && (
            <div style={bonusBannerStyle}>
              🎯 {t("beerform.bonusComplete", { xp: XP_VALUES.COMPLETE_BONUS })}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...saveBtn, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? t("beerform.saving") : `💾 ${t("beerform.saveBtn", { xp: xpPreview })}`}
          </button>
        </div>
      )}

      {infoOpen && <BeerInfoModal beer={beer} onClose={() => setInfoOpen(false)} onVerMapa={onVerMapa} />}
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>
    +{xp} XP
  </span>
);

const infoBtnStyle     = { background: "none", border: "none", color: "#8b6b2e", fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0, transition: "color 0.15s" };
const cardStyle        = { border: "1px solid #2e2215", borderRadius: "10px", padding: "6px", background: "#1c1409", display: "flex", flexDirection: "column" };
const metaStyle        = { margin: "0 0 4px", fontSize: "11px", color: "#9a7d62" };
const fieldStyle       = { marginBottom: "8px" };
const labelStyle       = { display: "block", fontSize: "11px", fontWeight: "600", color: "#9a7d62", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" };
const inputStyle       = { width: "100%", padding: "6px 8px", border: "1px solid #2e2215", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", background: "#2a1e0f", color: "#f0e4cc" };
const bonusBannerStyle = { background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", color: "#d4af37", fontWeight: "600", marginBottom: "8px" };
const saveBtn          = { width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#d4af37", color: "#0d0a06", fontWeight: "700", fontSize: "13px", cursor: "pointer", marginTop: "4px" };
const photoBtnStyle      = { padding: "8px 12px", background: "#1c1409", border: "1.5px dashed #3a2e20", borderRadius: 8, fontSize: 13, color: "#9a7d62", cursor: "pointer", fontWeight: 600, textAlign: "center" };
const clearPhotoBtnStyle = { padding: "6px 10px", background: "#2a0a0a", border: "1px solid #8b2020", borderRadius: 6, color: "#c07a3f", cursor: "pointer", fontSize: 12 };

export default BeerCard;
