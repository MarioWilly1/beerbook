import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "../hooks/useIsMobile";
import { getCountryName } from "../utils/countryDisplay";
import BeerInfoModal from "../components/BeerInfoModal";
import CollectionCard from "../components/CollectionCard";
import BeerFilters from "../components/BeerFilters";
import { useMyBeers } from "../hooks/useMyBeers";
import { useCollectibleBeers } from "../hooks/useCollectibleBeers";
import { useUserStats } from "../hooks/useUserStats";
import { supabase } from "../services/supabase";
import { getLevelInfo, XP_VALUES } from "../utils/xp";
import { updateStreak } from "../utils/streak";
import { fetchAchievementStats, checkAndAwardAchievements, checkSeriesAchievements } from "../utils/achievements";
import { checkAndAwardBadges } from "../utils/badges";
import { fetchWeeklyChallengeProgress, checkAndAwardWeeklyChallenge } from "../utils/weeklyChallenge";
import { logActivity } from "../utils/activity";
import Lightbox from "../components/Lightbox";
import LocationPicker from "../components/LocationPicker";
import { toastSave, toastAchievements, toastBadges, toastLevelUp } from "../utils/toast";
import { celebrateLevel, celebrateAchievement } from "../utils/celebrate";
import { soundClink, soundLevelUp, soundAchievement } from "../utils/sounds";
import { hashToString } from "../utils/perceptualHash";
import { compressImage, uploadUserBeerPhoto } from "../utils/photoUpload";
import { insertTasting, updateLatestTasting } from "../utils/tastings";
import HideEntryModal from "../components/HideEntryModal";
import TastingGalleryModal from "../components/TastingGalleryModal";
import QuickTastingWidget from "../components/QuickTastingWidget";
import QuickTastingModal from "../components/QuickTastingModal";
import GlassesTab from "./GlassesTab";
import DualPhotoVerification from "../components/DualPhotoVerification";
import { RAREZA_EMOJI } from "../utils/rareza";
import {
  BookIcon, DiamondIcon, DeviceCameraIcon, TrashIcon, EyeClosedIcon,
  CheckIcon, SearchIcon, XIcon, ShieldCheckIcon,
} from "@primer/octicons-react";

// Mismo helper que Dashboard.js/OriginMapPanel.js — no está extraído a un
// util compartido en este proyecto, se duplica igual que en esos dos.
function normalizeStr(str) {
  if (!str) return "";
  const nfd = str.normalize("NFD");
  let out = "";
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) out += nfd[i];
  }
  return out.toLowerCase();
}

const RATING_OPTIONS = ["", 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const RAREZA_ORDER  = ["mitica", "legendaria", "epica", "rara", "poco_comun", "comun"];
const RAREZA_BADGE = {
  comun:      { color: "#7a6a55", bg: "rgba(122,106,85,0.1)",   border: "rgba(122,106,85,0.25)"  },
  poco_comun: { color: "#4a9e6a", bg: "rgba(74,158,106,0.12)",  border: "rgba(74,158,106,0.3)"   },
  rara:       { color: "#4a90d9", bg: "rgba(74,144,217,0.12)",  border: "rgba(74,144,217,0.3)"   },
  epica:      { color: "#a366e8", bg: "rgba(163,102,232,0.12)", border: "rgba(163,102,232,0.25)" },
  legendaria: { color: "#d4af37", bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.3)"   },
  mitica:     { color: "#e040fb", bg: "rgba(224,64,251,0.1)",   border: "rgba(224,64,251,0.25)"  },
};
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
  const { t } = useTranslation();
  const rs = RAREZA_STYLE[beer.rareza] || RAREZA_STYLE.comun;
  const label = RAREZA_EMOJI[beer.rareza]
    ? `${RAREZA_EMOJI[beer.rareza]} ${t(`rareza.${beer.rareza}`)}`
    : "⚪";

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
      <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
        <img
          src={beer.foto_url}
          alt={beer.nombre}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: "grayscale(1) brightness(0.55)", display: "block",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.25)",
        }}>
          <span style={{ fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}>🔒</span>
        </div>
        <div style={{
          position: "absolute", top: 8, right: 8, padding: "3px 9px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, background: "rgba(0,0,0,0.65)",
          color: "#5a4535", border: "1px solid rgba(80,60,60,0.35)",
        }}>
          {label}
        </div>
      </div>
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
const LockedInfoModal = ({ beer, onClose }) => {
  const { t } = useTranslation();
  return (
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
          {beer.rareza ? t(`rareza.${beer.rareza}`) : t("rareza.unknown")}
        </span>
        <p style={{ color: "#8b6b2e", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px" }}>
          {t("coleccion.lockedNotYet")}
        </p>
        <p style={{ color: "#5a4535", fontSize: 12, lineHeight: 1.6, margin: "0 0 24px" }}>
          {t("coleccion.lockedHint")}
        </p>
        <button onClick={onClose}
          style={{
            padding: "10px 28px", borderRadius: 8, border: "none",
            background: "#2a1e0f", color: "#8b6b2e", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
          {t("coleccion.closeBtn")}
        </button>
      </div>
    </div>
  );
};

// ── BeerColeccionTab (Pokédex de cervezas) ──────────────────────────────────────
const BeerColeccionTab = () => {
  const { t } = useTranslation();
  const { items, loading } = useCollectibleBeers();
  const [nameSearch,    setNameSearch]    = useState("");
  const [rarezaFilter,  setRarezaFilter]  = useState("all");
  const [familiaFilter, setFamiliaFilter] = useState("all");
  const [showFilter,    setShowFilter]    = useState("all");
  const [lockedModal,   setLockedModal]   = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a4535" }}>
        <p style={{ fontSize: 14 }}>{t("coleccion.loadingBeers")}</p>
      </div>
    );
  }

  const families = [...new Set(items.map((b) => b.familia).filter(Boolean))].sort();

  const visible = items
    .filter((b) => !nameSearch || normalizeStr(b.nombre).includes(normalizeStr(nameSearch)))
    .filter((b) => rarezaFilter  === "all" || b.rareza  === rarezaFilter)
    .filter((b) => familiaFilter === "all" || b.familia === familiaFilter)
    .filter((b) => showFilter === "all" || (showFilter === "owned" ? b.owned : !b.owned))
    .sort((a, b) => {
      const rd = RAREZA_ORDER.indexOf(a.rareza ?? "comun") - RAREZA_ORDER.indexOf(b.rareza ?? "comun");
      if (rd !== 0) return rd;
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

  const ownedCount = items.filter((b) => b.owned).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <div>
      <div style={{
        background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12,
        padding: "16px 18px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#d4af37", fontFamily: "'Playfair Display', serif" }}>
            🎴 {t("coleccion.titleBeers")}
          </span>
          <span style={{ fontSize: 13, color: "#9a7d62" }}>
            <strong style={{ color: "#f0e4cc" }}>{ownedCount}</strong> / {totalCount} {t("coleccion.obtainedSuffix")}
          </span>
          <span style={{ fontSize: 12, color: "#5a4535", marginLeft: "auto" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "#2e2215", borderRadius: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 10, width: `${pct}%`,
            background: pct === 100
              ? "linear-gradient(90deg, #d4af37, #c07a3f)"
              : "linear-gradient(90deg, #4a90d9, #d4af37)",
            transition: "width 0.5s ease",
          }} />
        </div>
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
                  {RAREZA_EMOJI[r]} {got}/{tot}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          color: "#5a4535", pointerEvents: "none", display: "flex",
        }}>
          <SearchIcon size={14} />
        </span>
        <input
          type="text"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          placeholder={t("coleccion.searchBeersPlaceholder")}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "9px 32px 9px 34px",
            background: "#1c1409", border: "1px solid #2e2215",
            borderRadius: 8, color: "#f0e4cc", fontSize: 14, outline: "none",
          }}
        />
        {nameSearch && (
          <button onClick={() => setNameSearch("")}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#5a4535",
              cursor: "pointer", lineHeight: 1, display: "flex",
            }}>
            <XIcon size={16} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={rarezaFilter} onChange={(e) => setRarezaFilter(e.target.value)} style={ctrlS}>
          <option value="all">{t("coleccion.filterAllRareza")}</option>
          {RAREZA_ORDER.filter((r) => items.some((b) => b.rareza === r)).map((r) => (
            <option key={r} value={r}>{t(`rareza.${r}`)}</option>
          ))}
        </select>
        {families.length > 0 && (
          <select value={familiaFilter} onChange={(e) => setFamiliaFilter(e.target.value)} style={ctrlS}>
            <option value="all">{t("coleccion.filterAllFamilia")}</option>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        <select value={showFilter} onChange={(e) => setShowFilter(e.target.value)} style={ctrlS}>
          <option value="all">{t("coleccion.filterAllShow")}</option>
          <option value="owned">{t("coleccion.filterOwned")}</option>
          <option value="locked">{t("coleccion.filterLocked")}</option>
        </select>
      </div>

      <p style={{ fontSize: 12, color: "#5a4535", margin: "0 0 14px" }}>
        {/* Conseguidas DENTRO del filtro actual, no el total del catálogo —
            antes mostraba visible.length/totalCount, que con cualquier
            filtro "vacío" (sin nada tildado) daba siempre N/N. */}
        {t("coleccion.countBeers", { got: visible.filter((b) => b.owned).length, count: visible.length })}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
        gap: 14,
      }}>
        {visible.map((beer) =>
          beer.owned ? (
            <CollectionCard key={beer.id} beer={beer} />
          ) : (
            <LockedCard key={beer.id} beer={beer} onClick={(b) => setLockedModal(b)} />
          )
        )}
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#5a4535" }}>
          <p>{t("coleccion.emptyFilterBeers")}</p>
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

// ── ColeccionTab (wrapper) — desplegable Cervezas/Copas en vez de tabs
// separadas, ambas Pokédex viven bajo la misma tab "Colección". ──────────────
const ColeccionTab = () => {
  const { t } = useTranslation();
  const [collectionType, setCollectionType] = useState("cervezas");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select
          value={collectionType}
          onChange={(e) => setCollectionType(e.target.value)}
          style={{ ...ctrlS, fontSize: 14, fontWeight: 700, padding: "9px 14px" }}
        >
          <option value="cervezas">{t("coleccion.optionBeers")}</option>
          <option value="copas">{t("coleccion.optionGlasses")}</option>
        </select>
      </div>
      {collectionType === "cervezas" ? <BeerColeccionTab /> : <GlassesTab />}
    </div>
  );
};

// ── NotebookCard — accordion card for Mi Cuaderno ─────────────────────────────
const NotebookCard = ({ beer, onChange, onSave, onQuickTasting, tastingCount, tastingPending, onDelete, onShowImage, onInfoModal, userId, hiddenCount, onHiddenChange }) => {
  const { t, i18n } = useTranslation();
  const [expanded,  setExpanded]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [showHideModal, setShowHideModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showDualVerify, setShowDualVerify] = useState(false);
  const fileInputRef = useRef(null);

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
      onChange(beer.id, "user_photo_url", publicUrl);
      onChange(beer.id, "photo_hash", hashToString(hash));
    } catch {
      setUploadErr(t("beerform.uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDualVerifyComplete = ({ photoUrl, photoHash, selfiePhotoUrl, selfiePhotoHash }) => {
    onChange(beer.id, "user_photo_url", photoUrl);
    onChange(beer.id, "photo_hash", photoHash);
    onChange(beer.id, "selfie_photo_url", selfiePhotoUrl);
    onChange(beer.id, "selfie_photo_hash", selfiePhotoHash);
    setShowDualVerify(false);
  };

  const displayPhoto = beer.user_photo_url?.trim() || beer.foto_url;
  const hasUserPhoto = !!beer.user_photo_url?.trim();
  const hasSelfie = !!beer.selfie_photo_url?.trim();
  const isComplete =
    beer.Rating !== "" && Number(beer.Rating) > 0 &&
    beer.comment.trim().length > 0 &&
    beer.user_photo_url.trim().length > 0;
  const rb = beer.rareza ? (RAREZA_BADGE[beer.rareza] || RAREZA_BADGE.comun) : null;

  return (
    <div style={nbCardStyle}>
      {/* Always-visible header — click to expand */}
      <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer" }}>
        {/* Photo: user photo if available, catalog photo as fallback */}
        <div style={{ position: "relative" }}>
          <img
            src={displayPhoto}
            alt={beer.nombre}
            onClick={(e) => {
              e.stopPropagation();
              hasUserPhoto ? setShowGallery(true) : onShowImage(displayPhoto);
            }}
            style={{
              width: "100%", height: "110px", objectFit: "cover",
              borderRadius: "8px", cursor: "zoom-in", display: "block",
            }}
          />
          {hasUserPhoto && (
            <span style={{
              position: "absolute", bottom: 6, right: 6,
              background: "rgba(0,0,0,0.7)", color: hasSelfie ? "#a366e8" : "#d4af37",
              fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5,
              pointerEvents: "none", display: "flex", alignItems: "center", gap: 3,
            }}>
              {hasSelfie ? <><ShieldCheckIcon size={11} /> {t("beerform.reinforcedVerified")}</> : <>📸 {t("beerform.verified")}</>}
            </span>
          )}
        </div>

        {/* Name + meta + bottom row */}
        <div style={{ padding: "6px 0 2px" }}>
          <p style={{
            margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#f0e4cc",
            lineHeight: 1.3, overflowWrap: "break-word", wordBreak: "break-word",
          }}>
            {beer.nombre}
          </p>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#9a7d62" }}>
            {beer.estilo} · {getCountryName(beer.pais, i18n.language)} · {beer.alcohol}%
          </p>
          <div style={{ margin: "0 0 4px" }}>
            <QuickTastingWidget count={tastingCount} pending={tastingPending} onTap={() => onQuickTasting(beer)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
            {rb && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: rb.color,
                background: rb.bg, borderRadius: 4, padding: "1px 5px",
                border: `1px solid ${rb.border}`, flexShrink: 0,
                maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {RAREZA_EMOJI[beer.rareza] ? `${RAREZA_EMOJI[beer.rareza]} ${t(`rareza.${beer.rareza}`)}` : beer.rareza}
              </span>
            )}
            <span style={{ flex: 1 }} />
            <button
              onClick={(e) => { e.stopPropagation(); onInfoModal(beer); }}
              title={t("beerInfo.btnTitle")}
              style={nbInfoBtnStyle}
            >
              ⓘ
            </button>
            <span style={{ fontSize: 9, color: "#5a4535", flexShrink: 0 }}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
      </div>

      {/* Detalle: overlay flotante, no empuja el grid (Spotify/Untappd) */}
      {expanded && ReactDOM.createPortal(
        <div style={nbOverlayStyle} onClick={() => setExpanded(false)}>
        <div style={nbModalPanelStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            {displayPhoto && (
              <img
                src={displayPhoto}
                alt={beer.nombre}
                style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#f0e4cc", lineHeight: 1.3 }}>
                {beer.nombre}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9a7d62" }}>
                {beer.estilo} · {getCountryName(beer.pais, i18n.language)} · {beer.alcohol}%
              </p>
            </div>
            <button onClick={() => setExpanded(false)} style={nbModalCloseBtnStyle}>
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ ...nbFieldStyle, display: "flex" }}>
            <QuickTastingWidget count={tastingCount} pending={tastingPending} onTap={() => onQuickTasting(beer)} />
          </div>

          <div style={nbFieldStyle}>
            <label style={nbLabelStyle}>{t("beerform.ratingLabel")} ⭐ <XpBadge xp={XP_VALUES.RATING} /></label>
            <select
              value={beer.Rating ?? ""}
              onChange={(e) => onChange(beer.id, "Rating", e.target.value)}
              style={nbInputStyle}
            >
              {RATING_OPTIONS.map((v) => (
                <option key={v} value={v}>{v === "" ? t("beerform.noRating") : `${v} / 5`}</option>
              ))}
            </select>
          </div>

          <div style={nbFieldStyle}>
            <label style={nbLabelStyle}>{t("notebook.commercializedLabel")}</label>
            <select
              value={beer.commercialized ? "yes" : "no"}
              onChange={(e) => onChange(beer.id, "commercialized", e.target.value === "yes")}
              style={nbInputStyle}
            >
              <option value="yes">{t("notebook.yes")}</option>
              <option value="no">{t("notebook.no")}</option>
            </select>
          </div>

          <div style={nbFieldStyle}>
            <label style={nbLabelStyle}>{t("beerform.commentLabel")} <XpBadge xp={XP_VALUES.COMMENT} /></label>
            <textarea
              value={beer.comment}
              onChange={(e) => onChange(beer.id, "comment", e.target.value.slice(0, 400))}
              rows={3}
              maxLength={400}
              placeholder={t("notebook.commentPlaceholder")}
              style={{ ...nbInputStyle, resize: "none" }}
              spellCheck="true"
              autoCorrect="on"
              autoCapitalize="sentences"
            />
            <div style={{ fontSize: 10, color: beer.comment.length >= 360 ? "#8b2020" : "#5a4535", textAlign: "right", marginTop: 3 }}>
              {beer.comment.length}/400
            </div>
          </div>

          <div style={nbFieldStyle}>
            <label style={nbLabelStyle}>{t("beerform.photoLabel")} <XpBadge xp={XP_VALUES.PHOTO} /></label>
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
            {beer.user_photo_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src={beer.user_photo_url} alt="Tu foto"
                  style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", cursor: "pointer", flexShrink: 0 }}
                  onClick={() => onShowImage(beer.user_photo_url)}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ ...nbPhotoBtn, opacity: uploading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {uploading ? "⏳ Subiendo…" : (<><DeviceCameraIcon size={14} /> Cambiar foto</>)}
                  </button>
                  <button
                    onClick={() => {
                      onChange(beer.id, "user_photo_url", ""); onChange(beer.id, "photo_hash", null);
                      // Sin foto de la cerveza no tiene sentido conservar la
                      // Verificación Reforzada — se limpian juntas.
                      onChange(beer.id, "selfie_photo_url", ""); onChange(beer.id, "selfie_photo_hash", null);
                    }}
                    style={{ ...nbClearPhotoBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <TrashIcon size={14} /> Quitar foto
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ ...nbPhotoBtn, width: "100%", opacity: uploading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {uploading ? "⏳ Subiendo…" : (<><DeviceCameraIcon size={14} /> Subir foto</>)}
              </button>
            )}
          </div>

          <div style={nbFieldStyle}>
            {hasSelfie ? (
              <div style={nbReinforcedBadgeStyle}>
                <ShieldCheckIcon size={14} /> {t("dualVerify.badgeActive")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDualVerify(true)}
                style={nbReinforcedBtnStyle}
              >
                <ShieldCheckIcon size={14} /> {t("dualVerify.startBtn")}
              </button>
            )}
          </div>

          {showDualVerify && (
            <DualPhotoVerification
              beerNombre={beer.nombre}
              beerId={beer.id}
              onComplete={handleDualVerifyComplete}
              onCancel={() => setShowDualVerify(false)}
            />
          )}

          <LocationPicker value={beer.location} onChange={(loc) => onChange(beer.id, "location", loc)} />

          {userId && (
            <button
              type="button"
              onClick={() => setShowHideModal(true)}
              style={{ ...nbHideFromBtn, display: "flex", alignItems: "center", gap: 6 }}
            >
              <EyeClosedIcon size={14} /> {t("hideEntry.btn")}
              {hiddenCount > 0 && (
                <span style={nbHideFromBadge}>{t("hideEntry.hiddenCount", { count: hiddenCount })}</span>
              )}
            </button>
          )}

          {showHideModal && (
            <HideEntryModal
              userId={userId}
              beerId={beer.id}
              beerNombre={beer.nombre}
              onClose={() => setShowHideModal(false)}
              onSaved={onHiddenChange}
            />
          )}

          {isComplete && (
            <div style={nbBonusBannerStyle}>
              🎯 {t("notebook.bonusComplete", { xp: XP_VALUES.COMPLETE_BONUS })}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => onSave(beer)} style={{ ...nbSaveBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <CheckIcon size={14} /> {t("notebook.saveBtn")}
            </button>
            <button onClick={() => onDelete(beer.id)} style={{ ...nbDeleteBtn, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrashIcon size={14} />
            </button>
          </div>

          {showGallery && (
            <TastingGalleryModal
              userId={userId}
              beerId={beer.id}
              beerNombre={beer.nombre}
              onClose={() => setShowGallery(false)}
            />
          )}

          {beer.location?.name && (
            <div style={{ marginTop: 8 }}>
              {beer.place_id && beer.location.isPublic ? (
                <Link
                  to={`/lugar/${beer.place_id}`}
                  style={{ fontSize: 11, color: "#d4af37", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 5, padding: "2px 7px", textDecoration: "none" }}
                >
                  📍 {beer.location.name}
                </Link>
              ) : (
                <span style={{ fontSize: 11, color: "#d4af37", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 5, padding: "2px 7px" }}>
                  📍 {beer.location.name}{!beer.location.isPublic && ` · ${t("location.private")}`}
                </span>
              )}
            </div>
          )}
        </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── MiCuaderno (main) ─────────────────────────────────────────────────────────
const MiCuaderno = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { beers, loading } = useMyBeers();
  const { refetch: refetchStats } = useUserStats();
  const [editableBeers, setEditableBeers] = useState([]);
  const [showImage, setShowImage]         = useState(null);
  const [infoModal, setInfoModal]         = useState(null);
  const [activeTab, setActiveTab]         = useState("cuaderno");
  const [search, setSearch]               = useState("");
  const [styleFilter, setStyleFilter]     = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [familiaFilter, setFamiliaFilter] = useState(null);
  const [alcoholFilter, setAlcoholFilter] = useState([0, 15]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hiddenCounts, setHiddenCounts]   = useState({}); // { beer_id: cantidad de amigos a los que se les oculta }
  const [tastingCounts, setTastingCounts] = useState({}); // { beer_id: cantidad real de catas registradas }
  const [tastingPending, setTastingPending] = useState({}); // { beer_id: true mientras hay un guardado en curso }
  const [quickTastingTarget, setQuickTastingTarget] = useState(null); // cerveza para la que está abierto QuickTastingModal

  const loadHiddenCounts = useCallback(async (uid) => {
    const { data } = await supabase.from("entry_hidden_from").select("beer_id").eq("owner_id", uid);
    const counts = {};
    (data || []).forEach((r) => { counts[r.beer_id] = (counts[r.beer_id] || 0) + 1; });
    setHiddenCounts(counts);
  }, []);

  const loadTastingCounts = useCallback(async (uid) => {
    const { data } = await supabase.from("beer_tastings").select("beer_id").eq("user_id", uid);
    const counts = {};
    (data || []).forEach((r) => { counts[r.beer_id] = (counts[r.beer_id] || 0) + 1; });
    setTastingCounts(counts);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setCurrentUserId(session.user.id);
      loadHiddenCounts(session.user.id);
      loadTastingCounts(session.user.id);
    });
  }, [loadHiddenCounts, loadTastingCounts]);

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
        selfie_photo_url: beer.selfie_photo_url || "",
        location: beer.location_lat
          ? { lat: beer.location_lat, lng: beer.location_lng, name: beer.location_name, isPublic: beer.location_public ?? true, price: beer.price_paid ?? null }
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

  // Editar la reseña actual (representativa) — NO crea una cata nueva ni
  // otorga XP, solo corrige lo que ya está guardado (mismo criterio que
  // "arreglar un typo" en cualquier otro campo).
  const handleSave = async (beer) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const isComplete =
      beer.Rating !== "" && Number(beer.Rating) > 0 &&
      beer.comment.trim().length > 0 &&
      beer.user_photo_url.trim().length > 0;

    // photo_hash es un bigint de 64 bits — nunca se lee de vuelta desde la
    // base (perdería precisión al pasar por JSON/Number en JS), así que
    // solo se manda cuando esta sesión lo acaba de calcular (subida nueva
    // vía handlePhotoSelect) o lo limpió explícitamente (botón quitar
    // foto). Si no cambió, se omite del payload y Postgres deja intacto
    // el valor ya guardado.
    const payload = {
      times:            beer.times,
      comment:          beer.comment,
      commercialized:   beer.commercialized,
      user_photo_url:   beer.user_photo_url || null,
      selfie_photo_url: beer.selfie_photo_url || null,
      Rating:           beer.Rating !== "" ? Number(beer.Rating) : null,
      location_lat:     beer.location?.lat    ?? null,
      location_lng:     beer.location?.lng    ?? null,
      location_name:    beer.location?.name   ?? null,
      location_public:  beer.location?.isPublic ?? true,
      price_paid:       beer.location?.price  ?? null,
    };
    if (beer.photo_hash !== undefined) payload.photo_hash = beer.photo_hash;
    if (beer.selfie_photo_hash !== undefined) payload.selfie_photo_hash = beer.selfie_photo_hash;

    const { error } = await supabase.from("user_beers").update(payload)
      .eq("user_id", session.user.id).eq("beer_id", beer.id);

    if (error) return;

    await updateLatestTasting(supabase, session.user.id, beer.id, {
      rating: payload.Rating, comment: payload.comment || null, user_photo_url: payload.user_photo_url,
      selfie_photo_url: payload.selfie_photo_url,
      location_lat: payload.location_lat, location_lng: payload.location_lng, location_name: payload.location_name,
      location_public: payload.location_public, price_paid: payload.price_paid,
      ...(beer.photo_hash !== undefined ? { photo_hash: beer.photo_hash } : {}),
      ...(beer.selfie_photo_hash !== undefined ? { selfie_photo_hash: beer.selfie_photo_hash } : {}),
    });

    await logActivity(session.user.id, beer.id, { rating: beer.Rating, comment: beer.comment, photo: beer.user_photo_url });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(),
      fetchAchievementStats(session.user.id),
    ]);
    const [ordinaryAchievements, newBadges, seriesAchievements] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
      checkSeriesAchievements(session.user.id),
    ]);
    const newAchievements = [...ordinaryAchievements, ...seriesAchievements];
    // fire-and-forget, el banner del Dashboard refleja el resultado — puede
    // haber hasta 2 retos activos (diario + semanal) para chequear
    fetchWeeklyChallengeProgress().then((list) => list.forEach(checkAndAwardWeeklyChallenge));

    refetchStats();
    soundClink();
    toastSave(0, isComplete);
    if (newAchievements.length) { celebrateAchievement(); soundAchievement(); toastAchievements(newAchievements); }
    if (newBadges.length)       { toastBadges(newBadges); }
  };

  // Registrar que volviste a probar esta cerveza: en vez de insertar una
  // fila en blanco, abre QuickTastingModal a pedir foto + comentario (la
  // Puntuación no se pide acá, es un campo a nivel de la cerveza — ver
  // migración 20260810000000, que blindó el trigger de sync para que la
  // cata rápida no la pise). El insert real y el resto del pipeline
  // (XP +3, streak, logros, retos) corren en handleQuickTastingSaved, una
  // vez que el modal subió la foto y confirmó.
  const handleQuickTasting = (beer) => {
    setQuickTastingTarget(beer);
  };

  const handleQuickTastingSaved = async ({ user_photo_url, photo_hash, comment }) => {
    const beer = quickTastingTarget;
    if (!beer) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setTastingPending((prev) => ({ ...prev, [beer.id]: true }));

    const { error } = await insertTasting(supabase, session.user.id, beer.id, {
      user_photo_url, photo_hash, comment,
    });

    setTastingPending((prev) => ({ ...prev, [beer.id]: false }));

    if (error) throw error;

    setQuickTastingTarget(null);
    setTastingCounts((prev) => ({ ...prev, [beer.id]: (prev[beer.id] || 0) + 1 }));

    const { data: xpRows } = await supabase
      .from("user_beers").select('"XP"').eq("user_id", session.user.id);
    const prevTotal  = xpRows?.reduce((s, b) => s + (b.XP || 0), 0) ?? 0;
    const newTotal   = prevTotal + 3;
    const didLevelUp = getLevelInfo(newTotal).level > getLevelInfo(prevTotal).level;
    const newLevel   = getLevelInfo(newTotal).level;

    await logActivity(session.user.id, beer.id, { rating: beer.Rating, comment, photo: user_photo_url });

    const [newStreak, achStats] = await Promise.all([
      updateStreak(),
      fetchAchievementStats(session.user.id),
    ]);
    const [ordinaryAchievements, newBadges, seriesAchievements] = await Promise.all([
      achStats ? checkAndAwardAchievements(session.user.id, achStats, newStreak) : Promise.resolve([]),
      achStats ? checkAndAwardBadges(session.user.id, achStats)                  : Promise.resolve([]),
      checkSeriesAchievements(session.user.id),
    ]);
    const newAchievements = [...ordinaryAchievements, ...seriesAchievements];
    fetchWeeklyChallengeProgress().then((list) => list.forEach(checkAndAwardWeeklyChallenge));

    refetchStats();
    soundClink();
    if (didLevelUp)             { celebrateLevel();       soundLevelUp();      toastLevelUp(newLevel); }
    if (newAchievements.length) { celebrateAchievement(); soundAchievement(); toastAchievements(newAchievements); }
    if (newBadges.length)       { toastBadges(newBadges); }
  };

  const handleDelete = async (beerId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    if (!window.confirm(t("notebook.confirmDelete"))) return;
    await supabase.from("user_beers").delete().eq("user_id", session.user.id).eq("beer_id", beerId);
    setEditableBeers((prev) => prev.filter((b) => b.id !== beerId));
    refetchStats();
  };

  // Mismo patrón que Dashboard.js — derivados de TUS cervezas, no de todo el
  // catálogo, para que los chips de estilo/país solo muestren lo relevante.
  const countries = useMemo(() => {
    if (!editableBeers.length) return [];
    const paises = [...new Set(editableBeers.map((b) => b.pais).filter(Boolean))];
    const roots = new Set();
    for (const p of paises) {
      const parent = paises.find((other) => other !== p && p.includes(other));
      roots.add(parent !== undefined ? parent : p.split("(")[0].trim() || p);
    }
    return [...roots].sort();
  }, [editableBeers]);

  const styles = useMemo(
    () => [...new Set(editableBeers.map((b) => b.estilo).filter(Boolean))].sort(),
    [editableBeers]
  );

  const familias = useMemo(
    () => [...new Set(editableBeers.map((b) => b.familia).filter(Boolean))].sort(),
    [editableBeers]
  );

  if (loading) return <p style={{ color: "#9a7d62" }}>{t("notebook.loading")}</p>;

  const [minAlc, maxAlc] = alcoholFilter;
  const visibleBeers = editableBeers
    .filter((b) => !search || normalizeStr(b.nombre).includes(normalizeStr(search)))
    .filter((b) => !styleFilter || normalizeStr(b.estilo).includes(normalizeStr(styleFilter)))
    .filter((b) => !countryFilter || b.pais?.includes(countryFilter))
    .filter((b) => !familiaFilter || b.familia === familiaFilter)
    .filter((b) => {
      if (minAlc === 0 && maxAlc === 15) return true;
      const alc = Number(b.alcohol) || 0;
      return alc >= minAlc && alc <= maxAlc;
    });

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #2e2215" }}>
        {[
          { id: "cuaderno",  label: t("notebook.tabCuaderno"), Icon: BookIcon },
          { id: "coleccion", label: t("coleccion.titleBeers"), Icon: DiamondIcon },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="config-tab"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              borderRadius: "8px 8px 0 0",
              background:   activeTab === tab.id ? "#2a1e0f" : "none",
              color:        activeTab === tab.id ? "#d4af37" : "#5a4535",
              borderBottom: activeTab === tab.id ? "2px solid #d4af37" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
            }}>
            <tab.Icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── CUADERNO TAB ── */}
      {activeTab === "cuaderno" && (
        editableBeers.length === 0 ? (
          <p style={{ color: "#9a7d62" }}>{t("notebook.empty")}</p>
        ) : (
        <>
          {/* Mismo buscador+filtros que el Catálogo — sin Trending, no
              aplica a "mis" cervezas (es un ranking global de actividad). */}
          <BeerFilters
            search={search}
            setSearch={setSearch}
            styleFilter={styleFilter}
            setStyleFilter={setStyleFilter}
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            familiaFilter={familiaFilter}
            setFamiliaFilter={setFamiliaFilter}
            alcoholFilter={alcoholFilter}
            setAlcoholFilter={setAlcoholFilter}
            trendingFilter={false}
            setTrendingFilter={() => {}}
            showTrending={false}
            styles={styles}
            countries={countries}
            familias={familias}
          />

          {search && (
            <p style={{ fontSize: 12, color: "#5a4535", margin: "-8px 0 14px" }}>
              {visibleBeers.length} resultado{visibleBeers.length !== 1 ? "s" : ""} para &ldquo;{search.trim()}&rdquo;
            </p>
          )}

          {/* Grilla uniforme — el detalle de NotebookCard se abre como
              overlay flotante (ver nbOverlayStyle), no empuja el layout,
              así que no hace falta multi-columna acá. */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px",
          }}>
            {visibleBeers.map((beer) => (
              <NotebookCard
                key={beer.id}
                beer={beer}
                onChange={handleChange}
                onSave={handleSave}
                onQuickTasting={handleQuickTasting}
                tastingCount={tastingCounts[beer.id] ?? 1}
                tastingPending={!!tastingPending[beer.id]}
                onDelete={handleDelete}
                onShowImage={setShowImage}
                onInfoModal={setInfoModal}
                userId={currentUserId}
                hiddenCount={hiddenCounts[beer.id] || 0}
                onHiddenChange={() => currentUserId && loadHiddenCounts(currentUserId)}
              />
            ))}
          </div>
        </>
        )
      )}

      {/* ── COLECCIÓN TAB (Pokédex de cervezas o copas, según el desplegable) ── */}
      {activeTab === "coleccion" && <ColeccionTab />}

      <Lightbox src={showImage} onClose={() => setShowImage(null)} />
      {infoModal && <BeerInfoModal beer={infoModal} onClose={() => setInfoModal(null)} />}
      {quickTastingTarget && (
        <QuickTastingModal
          beer={quickTastingTarget}
          onClose={() => setQuickTastingTarget(null)}
          onSaved={handleQuickTastingSaved}
        />
      )}
    </div>
  );
};

const XpBadge = ({ xp }) => (
  <span style={{ fontSize: "10px", color: "#d4af37", fontWeight: 700, marginLeft: "4px" }}>+{xp} XP</span>
);

const nbCardStyle       = { border: "1px solid #2e2215", borderRadius: "10px", padding: "6px", background: "#1c1409", display: "flex", flexDirection: "column", minWidth: 0 };
const nbInfoBtnStyle    = { background: "none", border: "none", color: "#8b6b2e", fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0, transition: "color 0.15s" };
const nbFieldStyle      = { marginBottom: "8px" };
const nbLabelStyle      = { display: "block", fontSize: "11px", fontWeight: "600", color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" };
const nbInputStyle      = { width: "100%", padding: "6px 8px", border: "1px solid #2e2215", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", background: "#2a1e0f", color: "#f0e4cc" };
const nbBonusBannerStyle = { background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", color: "#d4af37", fontWeight: "600", marginBottom: "8px" };
const nbSaveBtn         = { flex: 1, padding: "8px 10px", background: "#d4af37", color: "#0d0a06", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer", fontSize: "12px" };
const nbDeleteBtn       = { padding: "8px 10px", background: "#2a0a0a", color: "#c07a3f", border: "1px solid #8b2020", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "12px" };
const nbPhotoBtn        = { padding: "8px 12px", background: "#1c1409", border: "1.5px dashed #3a2e20", borderRadius: 8, fontSize: 13, color: "#9a7d62", cursor: "pointer", fontWeight: 600, textAlign: "center" };
const nbClearPhotoBtn   = { padding: "6px 10px", background: "#2a0a0a", border: "1px solid #8b2020", borderRadius: 6, color: "#c07a3f", cursor: "pointer", fontSize: 12 };
const nbReinforcedBtnStyle   = { width: "100%", padding: "9px 12px", background: "rgba(163,102,232,0.08)", border: "1.5px dashed rgba(163,102,232,0.4)", borderRadius: 8, fontSize: 12, color: "#a366e8", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const nbReinforcedBadgeStyle = { padding: "9px 12px", background: "rgba(163,102,232,0.1)", border: "1px solid rgba(163,102,232,0.3)", borderRadius: 8, fontSize: 12, color: "#a366e8", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 };
const nbHideFromBtn     = { display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 10px", marginTop: 8, background: "#1c1409", border: "1px solid #2e2215", borderRadius: 8, color: "#9a7d62", cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left" };
const nbHideFromBadge   = { marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#d4af37", background: "rgba(212,175,55,0.12)", padding: "2px 7px", borderRadius: 20 };

// Detalle como overlay flotante (portal a document.body) en vez de acordeón
// inline — mismo motivo y patrón que BeerCard.js.
const nbOverlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
  zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
};
const nbModalPanelStyle = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "20px 18px 22px", width: "100%", maxWidth: 420, maxHeight: "85dvh",
  overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
};
const nbModalCloseBtnStyle = {
  background: "none", border: "none", color: "rgba(240,228,204,0.5)",
  cursor: "pointer", padding: "2px 4px", lineHeight: 1, flexShrink: 0, display: "flex",
};

export default MiCuaderno;
