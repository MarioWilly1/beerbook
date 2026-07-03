import { useState, useEffect } from "react";
import { useMyBeers } from "../hooks/useMyBeers";
import { useUserStats } from "../hooks/useUserStats";
import { supabase } from "../services/supabase";
import { computeEntryXP, XP_VALUES } from "../utils/xp";
import { updateStreak } from "../utils/streak";
import { fetchAchievementStats, checkAndAwardAchievements } from "../utils/achievements";
import { checkAndAwardBadges } from "../utils/badges";
import { logActivity } from "../utils/activity";
import Lightbox from "../components/Lightbox";

const RATING_OPTIONS = ["", 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const MiCuaderno = () => {
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
        commercialized: beer.commercialized ?? true,
        user_photo_url: beer.user_photo_url || "",
      }))
    );
  }, [beers]);

  if (loading) return <p>Cargando tu cuaderno...</p>;
  if (editableBeers.length === 0)
    return <p>No has guardado ninguna cerveza aún.</p>;

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

    const { error } = await supabase
      .from("user_beers")
      .update({
        times: beer.times,
        comment: beer.comment,
        commercialized: beer.commercialized,
        user_photo_url: beer.user_photo_url || null,
        Rating: beer.Rating !== "" ? Number(beer.Rating) : null,
        XP: xp,
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

    let msg = `💾 Guardado · ${xp} XP`;
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

  const handleDelete = async (beerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm("¿Seguro que quieres borrar esta cerveza?")) return;

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
      <h2>📘 Mi Cuaderno</h2>

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
              {beer.user_photo_url?.trim() ? (
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#1e8449", background: "#d5f5e3", borderRadius: 5, padding: "2px 7px", marginBottom: 8 }}>
                  📸 Verificada
                </span>
              ) : (
                <span style={{ display: "inline-block", fontSize: 11, color: "#999", background: "#f0f0f0", borderRadius: 5, padding: "2px 7px", marginBottom: 8 }}>
                  Sin foto · no verificada
                </span>
              )}

              <div style={rowStyle}>
                <label style={labelStyle}>Veces probada</label>
                <input
                  type="number" min="0" value={beer.times}
                  onChange={(e) => handleChange(beer.id, "times", Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                />
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>
                  Puntuación ⭐ <XpBadge xp={XP_VALUES.RATING} />
                </label>
                <select
                  value={beer.Rating ?? ""}
                  onChange={(e) => handleChange(beer.id, "Rating", e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  {RATING_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v === "" ? "— Sin puntuación —" : `${v} / 5`}</option>
                  ))}
                </select>
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>Comercializada</label>
                <select
                  value={beer.commercialized ? "yes" : "no"}
                  onChange={(e) => handleChange(beer.id, "commercialized", e.target.value === "yes")}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>Comentario <XpBadge xp={XP_VALUES.COMMENT} /></label>
                <textarea
                  value={beer.comment}
                  onChange={(e) => handleChange(beer.id, "comment", e.target.value)}
                  rows={3} placeholder="Comentarios o anécdotas..."
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>URL foto tuya <XpBadge xp={XP_VALUES.PHOTO} /></label>
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

              {isComplete && (
                <div style={bonusBannerStyle}>
                  🎯 +{XP_VALUES.COMPLETE_BONUS} XP bonus — entrada completa
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => handleSave(beer)} style={saveBtnStyle}>
                  💾 Guardar · {xpPreview} XP
                </button>
                <button onClick={() => handleDelete(beer.id)} style={deleteBtnStyle}>
                  🗑️ Borrar
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
