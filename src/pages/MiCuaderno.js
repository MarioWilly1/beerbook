import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMyBeers } from "../hooks/useMyBeers";
import { useUserStats } from "../hooks/useUserStats";
import { supabase } from "../services/supabase";
import { computeEntryXP, getLevelInfo, XP_VALUES } from "../utils/xp";
import { updateStreak } from "../utils/streak";
import { fetchAchievementStats, checkAndAwardAchievements } from "../utils/achievements";
import { checkAndAwardBadges } from "../utils/badges";
import { logActivity } from "../utils/activity";
import Lightbox from "../components/Lightbox";
import LocationPicker from "../components/LocationPicker";
import { toastSave, toastAchievements, toastBadges, toastLevelUp } from "../utils/toast";
import { celebrateLevel, celebrateAchievement } from "../utils/celebrate";
import { soundClink, soundLevelUp, soundAchievement } from "../utils/sounds";

const RATING_OPTIONS = ["", 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const MiCuaderno = () => {
  const { t } = useTranslation();
  const { beers, loading } = useMyBeers();
  const { refetch: refetchStats } = useUserStats();
  const [editableBeers, setEditableBeers] = useState([]);
  const [showImage, setShowImage] = useState(null);

  useEffect(() => {
    setEditableBeers(
      beers.map((beer) => ({
        ...beer,
        times: beer.times || 0,
        comment: beer.comment || "",
        Rating: beer.Rating ?? "",
        XP: beer.XP || 0,
        commercialized: beer.commercialized ?? true,
        user_photo_url: beer.user_photo_url || "",
        location: beer.location_lat
          ? { lat: beer.location_lat, lng: beer.location_lng, name: beer.location_name, isPublic: beer.location_public ?? true }
          : null,
      }))
    );
  }, [beers]);

  if (loading) return <p>{t("notebook.loading")}</p>;
  if (editableBeers.length === 0)
    return <p>{t("notebook.empty")}</p>;

  const handleChange = (id, field, value) => {
    setEditableBeers((prev) =>
      prev.map((beer) => (beer.id === id ? { ...beer, [field]: value } : beer))
    );
  };

  const handleSave = async (beer) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const xp = computeEntryXP({
      rating: beer.Rating,
      comment: beer.comment,
      photo: beer.user_photo_url,
    });

    const isComplete =
      beer.Rating !== "" && Number(beer.Rating) > 0 &&
      beer.comment.trim().length > 0 &&
      beer.user_photo_url.trim().length > 0;

    // Detect level-up before writing
    const { data: xpRows } = await supabase
      .from("user_beers").select('"XP"').eq("user_id", session.user.id);
    const prevTotal = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
    const newTotal  = prevTotal - (beer.XP || 0) + xp;
    const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
    const newLevelName = getLevelInfo(newTotal).levelName;

    const { error } = await supabase
      .from("user_beers")
      .update({
        times: beer.times,
        comment: beer.comment,
        commercialized: beer.commercialized,
        user_photo_url: beer.user_photo_url || null,
        Rating: beer.Rating !== "" ? Number(beer.Rating) : null,
        XP: xp,
        location_lat:    beer.location?.lat    ?? null,
        location_lng:    beer.location?.lng    ?? null,
        location_name:   beer.location?.name   ?? null,
        location_public: beer.location?.isPublic ?? true,
      })
      .eq("user_id", session.user.id)
      .eq("beer_id", beer.id);

    if (error) return;

    await logActivity(session.user.id, beer.id, {
      rating: beer.Rating,
      comment: beer.comment,
      photo: beer.user_photo_url,
    });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(session.user.id),
      fetchAchievementStats(session.user.id),
    ]);

    const [newAchievements, newBadges] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
    ]);

    refetchStats();

    soundClink();
    toastSave(xp, isComplete);

    if (didLevelUp) {
      celebrateLevel();
      soundLevelUp();
      toastLevelUp(newLevelName);
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

  const handleDelete = async (beerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm(t("notebook.confirmDelete"))) return;

    await supabase
      .from("user_beers")
      .delete()
      .eq("user_id", session.user.id)
      .eq("beer_id", beerId);

    setEditableBeers((prev) => prev.filter((b) => b.id !== beerId));
    refetchStats();
  };

  return (
    <div>
      <h2>📘 {t("notebook.title")}</h2>

      {editableBeers.map((beer) => {
        const xpPreview = computeEntryXP({
          rating: beer.Rating,
          comment: beer.comment,
          photo: beer.user_photo_url,
        });
        const isComplete =
          beer.Rating !== "" && Number(beer.Rating) > 0 &&
          beer.comment.trim().length > 0 &&
          beer.user_photo_url.trim().length > 0;
        const intensity = Math.min(beer.times / 100, 1);

        return (
          <div
            key={beer.id}
            style={{
              display: "flex",
              gap: "16px",
              padding: "16px",
              marginBottom: "16px",
              borderRadius: "10px",
              backgroundColor: `rgba(212,175,55,${intensity * 0.3 + 0.05})`,
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <div
              onClick={() => setShowImage(beer.foto_url)}
              style={{ width: "140px", height: "140px", cursor: "pointer", overflow: "hidden", borderRadius: "8px", flexShrink: 0 }}
            >
              <img src={beer.foto_url} alt={beer.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 4px" }}>{beer.nombre}</h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {beer.user_photo_url?.trim() ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1e8449", background: "#d5f5e3", borderRadius: 5, padding: "2px 7px" }}>
                    📸 {t("beerform.verified")}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#999", background: "#f0f0f0", borderRadius: 5, padding: "2px 7px" }}>
                    {t("notebook.noPhoto")}
                  </span>
                )}
                {beer.location?.name && (
                  <span style={{ fontSize: 11, color: "#8b6b2e", background: "#fffbee", border: "1px solid #f0d060", borderRadius: 5, padding: "2px 7px" }}>
                    📍 {beer.location.name}
                    {!beer.location.isPublic && ` · ${t("location.private")}`}
                  </span>
                )}
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>{t("beerform.timesLabel")}</label>
                <input
                  type="number" min="0" value={beer.times}
                  onChange={(e) => handleChange(beer.id, "times", Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                />
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>
                  {t("beerform.ratingLabel")} ⭐ <XpBadge xp={XP_VALUES.RATING} />
                </label>
                <select
                  value={beer.Rating ?? ""}
                  onChange={(e) => handleChange(beer.id, "Rating", e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  {RATING_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v === "" ? t("beerform.noRating") : `${v} / 5`}</option>
                  ))}
                </select>
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>{t("notebook.commercializedLabel")}</label>
                <select
                  value={beer.commercialized ? "yes" : "no"}
                  onChange={(e) => handleChange(beer.id, "commercialized", e.target.value === "yes")}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  <option value="yes">{t("notebook.yes")}</option>
                  <option value="no">{t("notebook.no")}</option>
                </select>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>{t("beerform.commentLabel")} <XpBadge xp={XP_VALUES.COMMENT} /></label>
                <textarea
                  value={beer.comment}
                  onChange={(e) => handleChange(beer.id, "comment", e.target.value)}
                  rows={3} placeholder={t("notebook.commentPlaceholder")}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>{t("beerform.photoLabel")} <XpBadge xp={XP_VALUES.PHOTO} /></label>
                <input
                  type="text" placeholder="https://..."
                  value={beer.user_photo_url}
                  onChange={(e) => handleChange(beer.id, "user_photo_url", e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
                />
                {beer.user_photo_url && (
                  <img
                    src={beer.user_photo_url} alt="Prueba"
                    style={{ marginTop: "6px", width: "80px", borderRadius: "6px", cursor: "pointer" }}
                    onClick={() => setShowImage(beer.user_photo_url)}
                  />
                )}
              </div>

              <LocationPicker
                value={beer.location}
                onChange={(loc) => handleChange(beer.id, "location", loc)}
              />

              {isComplete && (
                <div style={bonusBannerStyle}>
                  🎯 {t("notebook.bonusComplete", { xp: XP_VALUES.COMPLETE_BONUS })}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => handleSave(beer)} style={saveBtnStyle}>
                  💾 {t("notebook.saveBtn", { xp: xpPreview })}
                </button>
                <button onClick={() => handleDelete(beer.id)} style={deleteBtnStyle}>
                  🗑️ {t("notebook.deleteBtn")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <Lightbox src={showImage} onClose={() => setShowImage(null)} />
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>+{xp} XP</span>
);

const rowStyle        = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" };
const labelStyle      = { fontSize: "12px", fontWeight: "600", color: "#555", minWidth: "120px", textTransform: "uppercase", letterSpacing: "0.4px" };
const bonusBannerStyle = { background: "#fffbee", border: "1px solid #f0d060", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: "#856404", fontWeight: "600", marginBottom: "8px" };
const saveBtnStyle    = { padding: "8px 14px", background: "#8b6b2e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };
const deleteBtnStyle  = { padding: "8px 14px", background: "#5a1e1e", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };

export default MiCuaderno;
