import React from "react";
import { useTranslation } from "react-i18next";
import { RARITY, injectStyles } from "./CollectionCard";

// Espejo de CollectionCard.js (misma rareza/animaciones, reexportadas
// desde ahí) pero muestra la foto PROPIA del usuario en vez de la del
// catálogo — acá "conseguida" significa literalmente "subiste tu foto".
const GlassCollectionCard = ({ glass }) => {
  const { t } = useTranslation();
  injectStyles();

  const rarezaKey = RARITY[glass.rareza] ? glass.rareza : "comun";
  const rarity = RARITY[rarezaKey];
  const isMitica = glass.rareza === "mitica";
  const hasShimmer = !!rarity.shimmer;
  const photo = glass.userPhotoUrl || glass.foto_url;

  const cardStyle = {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "default",
    userSelect: "none",
    transition: "transform 0.2s",
    ...rarity.card,
  };

  const innerContent = (
    <div style={{ position: "relative", borderRadius: isMitica ? 13 : 0, overflow: "hidden" }}>
      {hasShimmer && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", borderRadius: "inherit", ...rarity.shimmer }} />
      )}
      {isMitica && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", borderRadius: "inherit",
          background: "linear-gradient(125deg, rgba(255,80,160,0.18) 0%, rgba(80,200,255,0.18) 33%, rgba(80,255,160,0.18) 66%, rgba(255,180,80,0.18) 100%)",
          animation: "cc-holo 5s linear infinite",
        }} />
      )}

      <div style={{ position: "relative", aspectRatio: "3/4", background: "#0a080e", overflow: "hidden" }}>
        {photo ? (
          <img src={photo} alt={glass.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                     filter: isMitica ? "saturate(1.2) brightness(1.05)" : "none" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 48 }}>🍷</div>
        )}

        <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 9px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, zIndex: 3, backdropFilter: "blur(4px)",
          background: "rgba(0,0,0,0.65)", ...rarity.badge }}>
          {rarity.glyph} {t(`rareza.${rarezaKey}`)}
        </div>

        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.7)",
          padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#d4af37",
          border: "1px solid rgba(212,175,55,0.4)", zIndex: 3 }}>
          ✓ {t("coleccion.obtainedBadge")}
        </div>
      </div>

      <div style={{ padding: "10px 12px 12px", background: rarity.card.background }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#f0e4cc",
          fontFamily: "'Playfair Display', serif", lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {glass.nombre}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#9a7d62",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {glass.marca || "—"}
        </p>
      </div>
    </div>
  );

  if (isMitica) {
    return (
      <div style={{ position: "relative", borderRadius: 15, padding: 2,
        background: "linear-gradient(135deg, #ff50a0, #50c8ff, #50ffa0, #ffb450, #ff50a0)",
        backgroundSize: "300% 300%", animation: "cc-holo 4s linear infinite",
        boxShadow: "0 0 20px 6px rgba(180,80,255,0.4)" }}>
        <div style={{ ...cardStyle, animation: "cc-glow-myth 4s ease-in-out infinite" }}>
          {innerContent}
        </div>
      </div>
    );
  }

  return <div style={cardStyle}>{innerContent}</div>;
};

export default GlassCollectionCard;
