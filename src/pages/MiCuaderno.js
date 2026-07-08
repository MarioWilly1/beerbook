import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BeerInfoModal from "../components/BeerInfoModal";
import CollectionCard from "../components/CollectionCard";
import DateInput from "../components/DateInput";
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

const RAREZA_ORDER = ["mitica", "legendaria", "epica", "rara", "poco_comun", "comun"];
const RAREZA_LABEL = {
  comun: "⚪ Común", poco_comun: "🟢 Poco común", rara: "🔵 Rara",
  epica: "🟣 Épica", legendaria: "🟡 Legendaria", mitica: "🌈 Mítica",
};

// ── CollectionEditModal ────────────────────────────────────────────────────────
const CollectionEditModal = ({ beer, userBeer, onClose, onSaved }) => {
  const [condicion, setCondicion] = useState(userBeer?.condicion || "bebida");
  const [fechaAdq, setFechaAdq] = useState(userBeer?.fecha_adquisicion || "");
  const [notas, setNotas] = useState(userBeer?.notas_coleccion || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    await supabase.from("user_beers").update({
      en_coleccion: true,
      condicion,
      fecha_adquisicion: fechaAdq || null,
      notas_coleccion: notas || null,
    }).eq("user_id", session.user.id).eq("beer_id", beer.id);
    setSaving(false);
    onSaved({ condicion, fecha_adquisicion: fechaAdq, notas_coleccion: notas });
    onClose();
  };

  return (
    <div style={overlayS} onClick={onClose}>
      <div style={panelS} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, flex: 1, color: "#f0e4cc", fontFamily: "'Playfair Display', serif" }}>
            💎 {beer.nombre}
          </h3>
          <button onClick={onClose} style={closeBtnS}>✕</button>
        </div>

        <label style={mLabelS}>Condición</label>
        <select value={condicion} onChange={(e) => setCondicion(e.target.value)} style={mInputS}>
          <option value="bebida">🍺 Bebida / Degustada</option>
          <option value="sellada">🔒 Sellada (sin abrir)</option>
          <option value="exhibicion">🖼️ Exhibición / Decoración</option>
        </select>

        <label style={mLabelS}>Fecha de adquisición</label>
        <DateInput onChange={setFechaAdq} />

        <label style={{ ...mLabelS, marginTop: 12 }}>Notas de colección</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="Dónde la conseguí, recuerdos, valor especial…"
          style={{ ...mInputS, resize: "vertical", fontFamily: "Inter, sans-serif" }}
        />

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginTop: 18, padding: "11px 0", borderRadius: 8, border: "none",
            background: saving ? "#2a1e0f" : "#d4af37", color: saving ? "#5a4535" : "#0d0a06",
            fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Guardando…" : "💾 Guardar en colección"}
        </button>
      </div>
    </div>
  );
};

const overlayS = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 };
const panelS = { background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "24px 20px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.7)" };
const closeBtnS = { background: "none", border: "none", color: "rgba(240,228,204,0.4)", fontSize: 20, cursor: "pointer" };
const mLabelS = { display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 };
const mInputS = { width: "100%", padding: "9px 12px", marginBottom: 0, borderRadius: 8,
  background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
  fontSize: 14, outline: "none", boxSizing: "border-box" };

// ── ColeccionTab ───────────────────────────────────────────────────────────────
const ColeccionTab = ({ beers, onToggle, onEdit }) => {
  const [rarezaFilter, setRarezaFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rareza");

  const coleccion = beers.filter((b) => b.en_coleccion);

  const filtered = coleccion
    .filter((b) => rarezaFilter === "all" || b.rareza === rarezaFilter)
    .sort((a, b) => {
      if (sortBy === "rareza") return RAREZA_ORDER.indexOf(a.rareza) - RAREZA_ORDER.indexOf(b.rareza);
      if (sortBy === "nombre") return (a.nombre || "").localeCompare(b.nombre || "");
      if (sortBy === "fecha") {
        const da = a.fecha_adquisicion || "";
        const db = b.fecha_adquisicion || "";
        return db.localeCompare(da);
      }
      return 0;
    });

  // Stats by rareza
  const stats = RAREZA_ORDER.reduce((acc, r) => {
    acc[r] = coleccion.filter((b) => b.rareza === r).length;
    return acc;
  }, {});

  if (coleccion.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a4535" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💎</div>
        <p style={{ fontSize: 16, color: "#8b6b2e", marginBottom: 8 }}>Tu colección está vacía</p>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          En la pestaña <strong style={{ color: "#d4af37" }}>📓 Mi Cuaderno</strong> podés marcar
          cervezas como parte de tu colección con el botón <strong style={{ color: "#d4af37" }}>💎</strong>.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats header */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={statBoxS}>
          <span style={{ fontSize: 22, display: "block" }}>💎</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>{coleccion.length}</span>
          <span style={{ fontSize: 10, color: "#5a4535", textTransform: "uppercase" }}>Total</span>
        </div>
        {RAREZA_ORDER.filter((r) => stats[r] > 0).map((r) => (
          <div key={r} style={statBoxS}>
            <span style={{ fontSize: 16, display: "block" }}>{RAREZA_LABEL[r].split(" ")[0]}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#f0e4cc" }}>{stats[r]}</span>
            <span style={{ fontSize: 10, color: "#5a4535", textTransform: "uppercase" }}>
              {RAREZA_LABEL[r].split(" ").slice(1).join(" ")}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={rarezaFilter} onChange={(e) => setRarezaFilter(e.target.value)} style={ctrlS}>
          <option value="all">Todas las rarezas</option>
          {RAREZA_ORDER.map((r) => (
            <option key={r} value={r}>{RAREZA_LABEL[r]}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={ctrlS}>
          <option value="rareza">Ordenar: por rareza</option>
          <option value="nombre">Ordenar: A–Z</option>
          <option value="fecha">Ordenar: más reciente</option>
        </select>
      </div>

      <p style={{ fontSize: 12, color: "#5a4535", margin: "0 0 14px" }}>
        {filtered.length} de {coleccion.length} cerveza{coleccion.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 14,
      }}>
        {filtered.map((beer) => (
          <CollectionCard
            key={beer.id}
            beer={beer}
            userBeer={{ condicion: beer.condicion, fecha_adquisicion: beer.fecha_adquisicion, notas_coleccion: beer.notas_coleccion }}
            onToggleColeccion={onToggle}
            onEditColeccion={onEdit}
          />
        ))}
      </div>
    </div>
  );
};

const statBoxS = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10,
  padding: "10px 14px", textAlign: "center", minWidth: 60,
};
const ctrlS = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid #2e2215",
  background: "#1c1409", color: "#f0e4cc", fontSize: 12, cursor: "pointer",
};

// ── MiCuaderno (main) ─────────────────────────────────────────────────────────
const MiCuaderno = () => {
  const { t } = useTranslation();
  const { beers, loading } = useMyBeers();
  const { refetch: refetchStats } = useUserStats();
  const [editableBeers, setEditableBeers] = useState([]);
  const [showImage, setShowImage] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [activeTab, setActiveTab] = useState("cuaderno");
  const [collectionModal, setCollectionModal] = useState(null); // { beer, userBeer }

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
        en_coleccion: beer.en_coleccion ?? false,
        condicion: beer.condicion ?? null,
        fecha_adquisicion: beer.fecha_adquisicion ?? null,
        notas_coleccion: beer.notas_coleccion ?? null,
      }))
    );
  }, [beers]);

  const handleChange = (id, field, value) => {
    setEditableBeers((prev) =>
      prev.map((beer) => (beer.id === id ? { ...beer, [field]: value } : beer))
    );
  };

  const handleSave = async (beer) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const xp = computeEntryXP({ rating: beer.Rating, comment: beer.comment, photo: beer.user_photo_url });
    const isComplete =
      beer.Rating !== "" && Number(beer.Rating) > 0 &&
      beer.comment.trim().length > 0 &&
      beer.user_photo_url.trim().length > 0;

    const { data: xpRows } = await supabase
      .from("user_beers").select('"XP"').eq("user_id", session.user.id);
    const prevTotal = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
    const newTotal  = prevTotal - (beer.XP || 0) + xp;
    const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
    const newLevelName = getLevelInfo(newTotal).levelName;

    const { error } = await supabase.from("user_beers").update({
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
    }).eq("user_id", session.user.id).eq("beer_id", beer.id);

    if (error) return;

    await logActivity(session.user.id, beer.id, { rating: beer.Rating, comment: beer.comment, photo: beer.user_photo_url });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(session.user.id),
      fetchAchievementStats(session.user.id),
    ]);
    const [newAchievements, newBadges] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats) : Promise.resolve([]),
    ]);

    refetchStats();
    soundClink();
    toastSave(xp, isComplete);
    if (didLevelUp) { celebrateLevel(); soundLevelUp(); toastLevelUp(newLevelName); }
    if (newAchievements.length > 0) { celebrateAchievement(); soundAchievement(); toastAchievements(newAchievements); }
    if (newBadges.length > 0) { toastBadges(newBadges); }
  };

  const handleDelete = async (beerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm(t("notebook.confirmDelete"))) return;
    await supabase.from("user_beers").delete().eq("user_id", session.user.id).eq("beer_id", beerId);
    setEditableBeers((prev) => prev.filter((b) => b.id !== beerId));
    refetchStats();
  };

  const handleToggleColeccion = useCallback(async (beer, addToCollection) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (addToCollection) {
      setCollectionModal({ beer, userBeer: { condicion: beer.condicion, fecha_adquisicion: beer.fecha_adquisicion, notas_coleccion: beer.notas_coleccion } });
    } else {
      await supabase.from("user_beers").update({ en_coleccion: false }).eq("user_id", session.user.id).eq("beer_id", beer.id);
      setEditableBeers((prev) => prev.map((b) => b.id === beer.id ? { ...b, en_coleccion: false } : b));
    }
  }, []);

  const handleEditColeccion = useCallback((beer, userBeer) => {
    setCollectionModal({ beer, userBeer });
  }, []);

  const handleCollectionSaved = useCallback((beerData, updates) => {
    setEditableBeers((prev) => prev.map((b) =>
      b.id === beerData.id ? { ...b, en_coleccion: true, ...updates } : b
    ));
  }, []);

  if (loading) return <p style={{ color: "#9a7d62" }}>{t("notebook.loading")}</p>;
  if (editableBeers.length === 0)
    return <p style={{ color: "#9a7d62" }}>{t("notebook.empty")}</p>;

  const coleccionCount = editableBeers.filter((b) => b.en_coleccion).length;

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #2e2215", paddingBottom: 0 }}>
        {[
          { id: "cuaderno", label: `📓 ${t("notebook.title")}` },
          { id: "coleccion", label: `💎 Colección${coleccionCount > 0 ? ` (${coleccionCount})` : ""}` },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              borderRadius: "8px 8px 0 0",
              background: activeTab === tab.id ? "#2a1e0f" : "none",
              color: activeTab === tab.id ? "#d4af37" : "#5a4535",
              borderBottom: activeTab === tab.id ? "2px solid #d4af37" : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.15s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CUADERNO TAB ── */}
      {activeTab === "cuaderno" && editableBeers.map((beer) => {
        const xpPreview = computeEntryXP({ rating: beer.Rating, comment: beer.comment, photo: beer.user_photo_url });
        const isComplete =
          beer.Rating !== "" && Number(beer.Rating) > 0 &&
          beer.comment.trim().length > 0 &&
          beer.user_photo_url.trim().length > 0;
        const intensity = Math.min(beer.times / 100, 1);

        return (
          <div key={beer.id} style={{
            display: "flex", gap: "16px", padding: "16px", marginBottom: "16px", borderRadius: "10px",
            backgroundColor: `rgba(212,175,55,${intensity * 0.12 + 0.04})`,
            border: "1px solid rgba(212,175,55,0.2)",
          }}>
            <div
              onClick={() => setShowImage(beer.foto_url)}
              style={{ width: "140px", height: "140px", cursor: "pointer", overflow: "hidden", borderRadius: "8px", flexShrink: 0 }}
            >
              <img src={beer.foto_url} alt={beer.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 4px" }}>
                <h3 style={{ margin: 0, color: "#f0e4cc", flex: 1 }}>{beer.nombre}</h3>
                {/* Colección toggle */}
                <button
                  onClick={() => handleToggleColeccion(beer, !beer.en_coleccion)}
                  title={beer.en_coleccion ? "En tu colección — click para quitar" : "Añadir a colección"}
                  style={{
                    background: beer.en_coleccion ? "rgba(212,175,55,0.15)" : "none",
                    border: beer.en_coleccion ? "1px solid rgba(212,175,55,0.4)" : "none",
                    color: beer.en_coleccion ? "#d4af37" : "#3a2e20",
                    fontSize: 15, cursor: "pointer", padding: "2px 6px",
                    borderRadius: 6, lineHeight: 1, flexShrink: 0,
                    transition: "all 0.15s",
                  }}>
                  💎
                </button>
                <button onClick={() => setInfoModal(beer)} title={t("beerInfo.btnTitle")} style={infoBtnStyle}>ⓘ</button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {beer.rareza && beer.rareza !== "comun" && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#a366e8", background: "rgba(163,102,232,0.12)", borderRadius: 5, padding: "2px 7px", border: "1px solid rgba(163,102,232,0.25)" }}>
                    {RAREZA_LABEL[beer.rareza] || beer.rareza}
                  </span>
                )}
                {beer.user_photo_url?.trim() ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2a6b3a", background: "#0f2a18", borderRadius: 5, padding: "2px 7px" }}>
                    📸 {t("beerform.verified")}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#5a4535", background: "#2a1e0f", borderRadius: 5, padding: "2px 7px" }}>
                    {t("notebook.noPhoto")}
                  </span>
                )}
                {beer.location?.name && (
                  beer.place_id && beer.location.isPublic
                    ? <Link to={`/lugar/${beer.place_id}`} style={{ fontSize: 11, color: "#d4af37", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 5, padding: "2px 7px", textDecoration: "none" }}>
                        📍 {beer.location.name}
                      </Link>
                    : <span style={{ fontSize: 11, color: "#d4af37", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 5, padding: "2px 7px" }}>
                        📍 {beer.location.name}{!beer.location.isPublic && ` · ${t("location.private")}`}
                      </span>
                )}
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>{t("beerform.timesLabel")}</label>
                <input type="number" min="0" value={beer.times}
                  onChange={(e) => handleChange(beer.id, "times", Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #2e2215", background: "#2a1e0f", color: "#f0e4cc" }}
                />
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>{t("beerform.ratingLabel")} ⭐ <XpBadge xp={XP_VALUES.RATING} /></label>
                <select value={beer.Rating ?? ""} onChange={(e) => handleChange(beer.id, "Rating", e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #2e2215", background: "#2a1e0f", color: "#f0e4cc" }}>
                  {RATING_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v === "" ? t("beerform.noRating") : `${v} / 5`}</option>
                  ))}
                </select>
              </div>

              <div style={rowStyle}>
                <label style={labelStyle}>{t("notebook.commercializedLabel")}</label>
                <select value={beer.commercialized ? "yes" : "no"}
                  onChange={(e) => handleChange(beer.id, "commercialized", e.target.value === "yes")}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #2e2215", background: "#2a1e0f", color: "#f0e4cc" }}>
                  <option value="yes">{t("notebook.yes")}</option>
                  <option value="no">{t("notebook.no")}</option>
                </select>
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>{t("beerform.commentLabel")} <XpBadge xp={XP_VALUES.COMMENT} /></label>
                <textarea value={beer.comment} onChange={(e) => handleChange(beer.id, "comment", e.target.value)}
                  rows={3} placeholder={t("notebook.commentPlaceholder")}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #2e2215", background: "#2a1e0f", color: "#f0e4cc", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "8px" }}>
                <label style={labelStyle}>{t("beerform.photoLabel")} <XpBadge xp={XP_VALUES.PHOTO} /></label>
                <input type="text" placeholder="https://..." value={beer.user_photo_url}
                  onChange={(e) => handleChange(beer.id, "user_photo_url", e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #2e2215", background: "#2a1e0f", color: "#f0e4cc", boxSizing: "border-box" }}
                />
                {beer.user_photo_url && (
                  <img src={beer.user_photo_url} alt="Prueba"
                    style={{ marginTop: "6px", width: "80px", borderRadius: "6px", cursor: "pointer" }}
                    onClick={() => setShowImage(beer.user_photo_url)}
                  />
                )}
              </div>

              <LocationPicker value={beer.location} onChange={(loc) => handleChange(beer.id, "location", loc)} />

              {isComplete && (
                <div style={bonusBannerStyle}>🎯 {t("notebook.bonusComplete", { xp: XP_VALUES.COMPLETE_BONUS })}</div>
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

      {/* ── COLECCIÓN TAB ── */}
      {activeTab === "coleccion" && (
        <ColeccionTab
          beers={editableBeers}
          onToggle={handleToggleColeccion}
          onEdit={handleEditColeccion}
        />
      )}

      <Lightbox src={showImage} onClose={() => setShowImage(null)} />
      {infoModal && <BeerInfoModal beer={infoModal} onClose={() => setInfoModal(null)} />}
      {collectionModal && (
        <CollectionEditModal
          beer={collectionModal.beer}
          userBeer={collectionModal.userBeer}
          onClose={() => setCollectionModal(null)}
          onSaved={(updates) => handleCollectionSaved(collectionModal.beer, updates)}
        />
      )}
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>+{xp} XP</span>
);

const infoBtnStyle    = { background: "none", border: "none", color: "#8b6b2e", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 };
const rowStyle        = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" };
const labelStyle      = { fontSize: "12px", fontWeight: "600", color: "#9a7d62", minWidth: "120px", textTransform: "uppercase", letterSpacing: "0.4px" };
const bonusBannerStyle = { background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: "#d4af37", fontWeight: "600", marginBottom: "8px" };
const saveBtnStyle    = { padding: "8px 14px", background: "#d4af37", color: "#0d0a06", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };
const deleteBtnStyle  = { padding: "8px 14px", background: "#2a0a0a", color: "#c07a3f", border: "1px solid #8b2020", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };

export default MiCuaderno;
