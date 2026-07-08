import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BeerInfoModal from "../components/BeerInfoModal";
import CollectionCard from "../components/CollectionCard";
import { useMyBeers } from "../hooks/useMyBeers";
import { useCollectibleBeers } from "../hooks/useCollectibleBeers";
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

const RAREZA_ORDER  = ["mitica", "legendaria", "epica", "rara", "poco_comun", "comun"];
const RAREZA_LABEL  = {
  comun: "⚪ Común", poco_comun: "🟢 Poco común", rara: "🔵 Rara",
  epica: "🟣 Épica", legendaria: "🟡 Legendaria", mitica: "🌈 Mítica",
};
const RAREZA_BADGE = {
  comun:      { color: "#7a6a55", bg: "rgba(122,106,85,0.1)",   border: "rgba(122,106,85,0.25)"  },
  poco_comun: { color: "#4a9e6a", bg: "rgba(74,158,106,0.12)",  border: "rgba(74,158,106,0.3)"   },
  rara:       { color: "#4a90d9", bg: "rgba(74,144,217,0.12)",  border: "rgba(74,144,217,0.3)"   },
  epica:      { color: "#a366e8", bg: "rgba(163,102,232,0.12)", border: "rgba(163,102,232,0.25)" },
  legendaria: { color: "#d4af37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.3)"   },
  mitica:     { color: "#e040fb", bg: "rgba(224,64,251,0.1)",   border: "rgba(224,64,251,0.25)"  },
};
// Rarity border/glow for locked cards
const RAREZA_STYLE = {
  comun:      { border: "1px solid #2e2215",      glow: "none" },
  poco_comun: { border: "1.5px solid #2d6645",    glow: "none" },
  rara:       { border: "2px solid #1a6fa8",       glow: "0 0 8px 2px rgba(26,111,168,0.25)" },
  epica:      { border: "2px solid #7c3aed",       glow: "0 0 8px 2px rgba(124,58,237,0.3)" },
  legendaria: { border: "2px solid #b8940a",       glow: "0 0 12px 4px rgba(212,175,55,0.3)" },
  mitica:     { border: "2px solid #9020d0",       glow: "0 0 12px 4px rgba(144,32,208,0.4)" },
};

const overlayS = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16,
};
const panelS = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "24px 20px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
};
// ── LockedCard ─────────────────────────────────────────────────────────────────
const LockedCard = ({ beer, onClick }) => {
  const rs = RAREZA_STYLE[beer.rareza] || RAREZA_STYLE.comun;
  const label = RAREZA_LABEL[beer.rareza] || "⚪";

  return (
    <div
      onClick={() => onClick(beer)}
      style={{
        borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: rs.border, background: "#1c1409", opacity: 0.7,
        transition: "opacity 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      {/* Foto real desaturada + 🔒 overlay */}
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
        <img
          src={beer.foto_url}
          alt={beer.nombre}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "grayscale(1) brightness(0.55)",
            display: "block",
          }}
        />

        {/* 🔒 centrado */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.25)",
        }}>
          <span style={{ fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}>🔒</span>
        </div>

        {/* Rareza badge */}
        <div style={{
          position: "absolute", top: 8, right: 8, padding: "3px 9px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, background: "rgba(0,0,0,0.65)",
          color: "#5a4535", border: "1px solid rgba(80,60,60,0.35)",
        }}>
          {label}
        </div>
      </div>

      {/* Info atenuada */}
      <div style={{ padding: "10px 12px 12px", background: "#160f07" }}>
        <p style={{
          margin: "0 0 2px", fontWeight: 700, fontSize: 12, color: "#5a4535",
          fontFamily: "'Playfair Display', serif", lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {beer.nombre}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#3a2e20" }}>
          {beer.estilo || "—"}
        </p>
      </div>
    </div>
  );
};

// ── LockedInfoModal ────────────────────────────────────────────────────────────
const LockedInfoModal = ({ beer, onClose }) => (
  <div style={overlayS} onClick={onClose}>
    <div style={{ ...panelS, textAlign: "center", padding: "36px 28px" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>🔒</div>
      <p style={{
        margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#5a4535",
        fontFamily: "'Playfair Display', serif",
      }}>
        {beer.nombre}
      </p>
      <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 20,
        fontSize: 11, fontWeight: 700, marginBottom: 20,
        background: "rgba(90,70,50,0.15)", color: "#5a4535", border: "1px solid rgba(90,70,50,0.3)",
      }}>
        {RAREZA_LABEL[beer.rareza] || "Desconocida"}
      </span>
      <p style={{ color: "#8b6b2e", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>
        Todavía no la conseguiste.
      </p>
      <p style={{ color: "#5a4535", fontSize: 12, lineHeight: 1.6, margin: "0 0 24px" }}>
        Conseguila y registrala en tu cuaderno para desbloquearla en la colección.
      </p>
      <button onClick={onClose}
        style={{
          padding: "10px 28px", borderRadius: 8, border: "none",
          background: "#2a1e0f", color: "#8b6b2e", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>
        Cerrar
      </button>
    </div>
  </div>
);

// ── ColeccionTab (Pokédex) ─────────────────────────────────────────────────────
const ColeccionTab = () => {
  const { items, loading } = useCollectibleBeers();
  const [rarezaFilter,  setRarezaFilter]  = useState("all");
  const [familiaFilter, setFamiliaFilter] = useState("all");
  const [showFilter,    setShowFilter]    = useState("all"); // all | owned | locked
  const [lockedModal,   setLockedModal]   = useState(null);  // beer

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a4535" }}>
        <p style={{ fontSize: 14 }}>Cargando Pokédex…</p>
      </div>
    );
  }

  // Unique families for filter
  const families = [...new Set(items.map((b) => b.familia).filter(Boolean))].sort();

  // Filter + sort
  const visible = items
    .filter((b) => rarezaFilter  === "all" || b.rareza  === rarezaFilter)
    .filter((b) => familiaFilter === "all" || b.familia === familiaFilter)
    .filter((b) => showFilter === "all" || (showFilter === "owned" ? b.owned : !b.owned))
    .sort((a, b) => {
      // 1. Rarest first
      const rd = RAREZA_ORDER.indexOf(a.rareza ?? "comun") - RAREZA_ORDER.indexOf(b.rareza ?? "comun");
      if (rd !== 0) return rd;
      // 2. Owned before locked
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      // 3. Alpha
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

  const ownedCount = items.filter((b) => b.owned).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* ── Header Pokédex ── */}
      <div style={{
        background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12,
        padding: "16px 18px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#d4af37", fontFamily: "'Playfair Display', serif" }}>
            🎴 Colección
          </span>
          <span style={{ fontSize: 13, color: "#9a7d62" }}>
            <strong style={{ color: "#f0e4cc" }}>{ownedCount}</strong> / {totalCount} conseguidas
          </span>
          <span style={{ fontSize: 12, color: "#5a4535", marginLeft: "auto" }}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "#2e2215", borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 10, width: `${pct}%`,
            background: pct === 100
              ? "linear-gradient(90deg, #d4af37, #c07a3f)"
              : "linear-gradient(90deg, #4a90d9, #d4af37)",
            transition: "width 0.5s ease",
          }} />
        </div>

        {/* Rareza stats */}
        {totalCount > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {RAREZA_ORDER.filter((r) => items.some((b) => b.rareza === r)).map((r) => {
              const tot = items.filter((b) => b.rareza === r).length;
              const got = items.filter((b) => b.rareza === r && b.owned).length;
              return (
                <span key={r} style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: "rgba(0,0,0,0.3)", color: got === tot ? "#d4af37" : "#5a4535",
                  border: "1px solid #2e2215",
                }}>
                  {RAREZA_LABEL[r].split(" ")[0]} {got}/{tot}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={rarezaFilter} onChange={(e) => setRarezaFilter(e.target.value)} style={ctrlS}>
          <option value="all">Todas las rarezas</option>
          {RAREZA_ORDER.filter((r) => items.some((b) => b.rareza === r)).map((r) => (
            <option key={r} value={r}>{RAREZA_LABEL[r]}</option>
          ))}
        </select>
        {families.length > 0 && (
          <select value={familiaFilter} onChange={(e) => setFamiliaFilter(e.target.value)} style={ctrlS}>
            <option value="all">Todas las familias</option>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        <select value={showFilter} onChange={(e) => setShowFilter(e.target.value)} style={ctrlS}>
          <option value="all">Ver todas</option>
          <option value="owned">✅ Conseguidas</option>
          <option value="locked">🔒 Pendientes</option>
        </select>
      </div>

      <p style={{ fontSize: 12, color: "#5a4535", margin: "0 0 14px" }}>
        {visible.length} de {totalCount} cerveza{totalCount !== 1 ? "s" : ""}
      </p>

      {/* ── Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
        gap: 14,
      }}>
        {visible.map((beer) =>
          beer.owned ? (
            <CollectionCard
              key={beer.id}
              beer={beer}
            />
          ) : (
            <LockedCard
              key={beer.id}
              beer={beer}
              onClick={(b) => setLockedModal(b)}
            />
          )
        )}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#5a4535" }}>
          <p>No hay cervezas con ese filtro.</p>
        </div>
      )}

      {lockedModal && <LockedInfoModal beer={lockedModal} onClose={() => setLockedModal(null)} />}
    </div>
  );
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
  const [showImage, setShowImage]         = useState(null);
  const [infoModal, setInfoModal]         = useState(null);
  const [activeTab, setActiveTab]         = useState("cuaderno");
  const [notebookSearch, setNotebookSearch]   = useState("");

  useEffect(() => {
    setEditableBeers(
      beers.map((beer) => ({
        ...beer,
        times:          beer.times || 0,
        comment:        beer.comment || "",
        Rating:         beer.Rating ?? "",
        XP:             beer.XP || 0,
        commercialized: beer.commercialized ?? true,
        user_photo_url: beer.user_photo_url || "",
        location: beer.location_lat
          ? { lat: beer.location_lat, lng: beer.location_lng, name: beer.location_name, isPublic: beer.location_public ?? true }
          : null,
        en_coleccion:      beer.en_coleccion ?? false,
        condicion:         beer.condicion ?? null,
        fecha_adquisicion: beer.fecha_adquisicion ?? null,
        notas_coleccion:   beer.notas_coleccion ?? null,
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
    const prevTotal  = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
    const newTotal   = prevTotal - (beer.XP || 0) + xp;
    const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
    const newLevelName = getLevelInfo(newTotal).levelName;

    const { error } = await supabase.from("user_beers").update({
      times:           beer.times,
      comment:         beer.comment,
      commercialized:  beer.commercialized,
      user_photo_url:  beer.user_photo_url || null,
      Rating:          beer.Rating !== "" ? Number(beer.Rating) : null,
      XP:              xp,
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
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
    ]);

    refetchStats();
    soundClink();
    toastSave(xp, isComplete);
    if (didLevelUp)              { celebrateLevel();      soundLevelUp();      toastLevelUp(newLevelName); }
    if (newAchievements.length)  { celebrateAchievement(); soundAchievement(); toastAchievements(newAchievements); }
    if (newBadges.length)        { toastBadges(newBadges); }
  };

  const handleDelete = async (beerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm(t("notebook.confirmDelete"))) return;
    await supabase.from("user_beers").delete().eq("user_id", session.user.id).eq("beer_id", beerId);
    setEditableBeers((prev) => prev.filter((b) => b.id !== beerId));
    refetchStats();
  };

  if (loading) return <p style={{ color: "#9a7d62" }}>{t("notebook.loading")}</p>;
  if (editableBeers.length === 0)
    return <p style={{ color: "#9a7d62" }}>{t("notebook.empty")}</p>;

  const searchQuery    = notebookSearch.trim().toLowerCase();
  const visibleBeers   = searchQuery
    ? editableBeers.filter((b) => b.nombre?.toLowerCase().includes(searchQuery))
    : editableBeers;

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #2e2215" }}>
        {[
          { id: "cuaderno",  label: `📓 ${t("notebook.title")}` },
          { id: "coleccion", label: "💎 Colección" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              borderRadius: "8px 8px 0 0",
              background:   activeTab === tab.id ? "#2a1e0f" : "none",
              color:        activeTab === tab.id ? "#d4af37" : "#5a4535",
              borderBottom: activeTab === tab.id ? "2px solid #d4af37" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CUADERNO TAB ── */}
      {activeTab === "cuaderno" && (
        <>
          {/* Buscador */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <span style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              fontSize: 14, color: "#5a4535", pointerEvents: "none",
            }}>
              🔍
            </span>
            <input
              type="text"
              value={notebookSearch}
              onChange={(e) => setNotebookSearch(e.target.value)}
              placeholder="Buscar en mi cuaderno…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 34px",
                background: "#1c1409", border: "1px solid #2e2215",
                borderRadius: 8, color: "#f0e4cc", fontSize: 14, outline: "none",
              }}
            />
            {notebookSearch && (
              <button onClick={() => setNotebookSearch("")}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#5a4535",
                  fontSize: 16, cursor: "pointer", lineHeight: 1,
                }}>
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <p style={{ fontSize: 12, color: "#5a4535", margin: "-8px 0 14px" }}>
              {visibleBeers.length} resultado{visibleBeers.length !== 1 ? "s" : ""} para &ldquo;{notebookSearch.trim()}&rdquo;
            </p>
          )}

          {/* Entries */}
          {visibleBeers.map((beer) => {
            const xpPreview  = computeEntryXP({ rating: beer.Rating, comment: beer.comment, photo: beer.user_photo_url });
            const isComplete =
              beer.Rating !== "" && Number(beer.Rating) > 0 &&
              beer.comment.trim().length > 0 &&
              beer.user_photo_url.trim().length > 0;
            const intensity    = Math.min(beer.times / 100, 1);

            return (
              <div key={beer.id} style={{
                display: "flex", gap: "16px", padding: "16px", marginBottom: "16px",
                borderRadius: "10px",
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

                    <button onClick={() => setInfoModal(beer)} title={t("beerInfo.btnTitle")} style={infoBtnStyle}>
                      ⓘ
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {beer.rareza && (() => {
                      const rb = RAREZA_BADGE[beer.rareza] || RAREZA_BADGE.comun;
                      return (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: rb.color,
                          background: rb.bg, borderRadius: 5, padding: "2px 7px",
                          border: `1px solid ${rb.border}`,
                        }}>
                          {RAREZA_LABEL[beer.rareza] || beer.rareza}
                        </span>
                      );
                    })()}
                    {beer.es_edicion_especial && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#f0d060",
                        background: "rgba(240,208,96,0.1)", borderRadius: 5, padding: "2px 7px",
                        border: "1px solid rgba(240,208,96,0.3)",
                      }}>
                        ✨ Ed. Especial
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
                        ? <Link
                            to={`/lugar/${beer.place_id}`}
                            style={{ fontSize: 11, color: "#d4af37", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 5, padding: "2px 7px", textDecoration: "none" }}
                          >
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
        </>
      )}

      {/* ── COLECCIÓN TAB (Pokédex) ── */}
      {activeTab === "coleccion" && <ColeccionTab />}

      <Lightbox src={showImage} onClose={() => setShowImage(null)} />
      {infoModal && <BeerInfoModal beer={infoModal} onClose={() => setInfoModal(null)} />}
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>+{xp} XP</span>
);

const infoBtnStyle     = { background: "none", border: "none", color: "#8b6b2e", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 };
const rowStyle         = { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" };
const labelStyle       = { fontSize: "12px", fontWeight: "600", color: "#9a7d62", minWidth: "120px", textTransform: "uppercase", letterSpacing: "0.4px" };
const bonusBannerStyle = { background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: "#d4af37", fontWeight: "600", marginBottom: "8px" };
const saveBtnStyle     = { padding: "8px 14px", background: "#d4af37", color: "#0d0a06", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };
const deleteBtnStyle   = { padding: "8px 14px", background: "#2a0a0a", color: "#c07a3f", border: "1px solid #8b2020", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "13px" };

export default MiCuaderno;
