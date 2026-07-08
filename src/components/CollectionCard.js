import React from "react";

// ── Keyframe CSS injected once ────────────────────────────────────────────────
const STYLES = `
@keyframes cc-pulse {
  0%,100% { box-shadow: 0 0 8px 2px rgba(26,111,168,0.4); }
  50%      { box-shadow: 0 0 18px 6px rgba(26,111,168,0.75); }
}
@keyframes cc-shimmer-epic {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes cc-shimmer-leg {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes cc-glow-leg {
  0%,100% { box-shadow: 0 0 12px 4px rgba(212,175,55,0.5), inset 0 0 6px rgba(212,175,55,0.1); }
  50%     { box-shadow: 0 0 28px 10px rgba(212,175,55,0.8), inset 0 0 12px rgba(212,175,55,0.2); }
}
@keyframes cc-holo {
  0%   { filter: hue-rotate(0deg)   brightness(1.1) saturate(1.4); }
  50%  { filter: hue-rotate(180deg) brightness(1.35) saturate(1.8); }
  100% { filter: hue-rotate(360deg) brightness(1.1) saturate(1.4); }
}
@keyframes cc-border-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes cc-glow-myth {
  0%,100% { box-shadow: 0 0 16px 6px rgba(180,80,255,0.5), 0 0 32px 10px rgba(80,180,255,0.3); }
  33%     { box-shadow: 0 0 20px 8px rgba(255,80,160,0.55), 0 0 36px 12px rgba(80,255,180,0.3); }
  66%     { box-shadow: 0 0 18px 7px rgba(80,255,180,0.5), 0 0 30px 10px rgba(255,180,80,0.3); }
}
`;

let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.textContent = STYLES;
  document.head.appendChild(tag);
  stylesInjected = true;
};

// ── Rarity config ─────────────────────────────────────────────────────────────
const RARITY = {
  comun: {
    label: "Común", color: "#7a6a55", glyph: "⚪",
    card: { border: "1px solid #3a2e20", background: "#1c1409" },
    badge: { background: "rgba(122,106,85,0.2)", color: "#7a6a55", border: "1px solid rgba(122,106,85,0.35)" },
    animation: null,
  },
  poco_comun: {
    label: "Poco común", color: "#4a9e6a", glyph: "🟢",
    card: { border: "1.5px solid #2d6645", background: "#111d16" },
    badge: { background: "rgba(74,158,106,0.15)", color: "#4a9e6a", border: "1px solid rgba(74,158,106,0.4)" },
    animation: null,
  },
  rara: {
    label: "Rara", color: "#4a90d9", glyph: "🔵",
    card: { border: "2px solid #1a6fa8", background: "#0e1520",
            animation: "cc-pulse 3s ease-in-out infinite" },
    badge: { background: "rgba(74,144,217,0.15)", color: "#4a90d9", border: "1px solid rgba(74,144,217,0.4)" },
    animation: "cc-pulse 3s ease-in-out infinite",
  },
  epica: {
    label: "Épica", color: "#a366e8", glyph: "🟣",
    card: { border: "2px solid #7c3aed", background: "#130d1e" },
    badge: { background: "rgba(163,102,232,0.15)", color: "#a366e8", border: "1px solid rgba(163,102,232,0.4)" },
    shimmer: {
      background: "linear-gradient(105deg, transparent 30%, rgba(163,102,232,0.35) 50%, transparent 70%)",
      backgroundSize: "300% 100%",
      animation: "cc-shimmer-epic 3.5s linear infinite",
    },
  },
  legendaria: {
    label: "Legendaria", color: "#d4af37", glyph: "🟡",
    card: { border: "2px solid #c09a20", background: "#1a1405",
            animation: "cc-glow-leg 2.5s ease-in-out infinite" },
    badge: { background: "rgba(212,175,55,0.15)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.5)" },
    shimmer: {
      background: "linear-gradient(105deg, transparent 25%, rgba(255,220,80,0.4) 50%, transparent 75%)",
      backgroundSize: "300% 100%",
      animation: "cc-shimmer-leg 2.5s linear infinite",
    },
  },
  mitica: {
    label: "Mítica", color: "#e040fb", glyph: "🌈",
    card: { border: "2px solid transparent", background: "#0d0a12",
            animation: "cc-glow-myth 4s ease-in-out infinite" },
    badge: { background: "rgba(224,64,251,0.15)", color: "#e040fb", border: "1px solid rgba(224,64,251,0.5)" },
    holo: true,
  },
};

// ── CollectionCard ─────────────────────────────────────────────────────────────
const CollectionCard = ({ beer }) => {
  injectStyles();

  const rarity = RARITY[beer.rareza] || RARITY.comun;
  const isMitica = beer.rareza === "mitica";
  const hasShimmer = !!rarity.shimmer;

  const cardStyle = {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "default",
    userSelect: "none",
    transition: "transform 0.2s",
    ...rarity.card,
  };

  // Mythic: extra wrapper for animated border gradient
  const innerContent = (
    <div style={{ position: "relative", borderRadius: isMitica ? 13 : 0, overflow: "hidden" }}>
      {/* Shimmer overlay (épica / legendaria) */}
      {hasShimmer && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", borderRadius: "inherit", ...rarity.shimmer }} />
      )}
      {/* Holo overlay (mítica) */}
      {isMitica && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", borderRadius: "inherit",
          background: "linear-gradient(125deg, rgba(255,80,160,0.18) 0%, rgba(80,200,255,0.18) 33%, rgba(80,255,160,0.18) 66%, rgba(255,180,80,0.18) 100%)",
          animation: "cc-holo 5s linear infinite",
        }} />
      )}

      {/* Foto */}
      <div style={{ position: "relative", aspectRatio: "3/4", background: "#0a080e", overflow: "hidden" }}>
        {beer.foto_url ? (
          <img src={beer.foto_url} alt={beer.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
                     filter: isMitica ? "saturate(1.2) brightness(1.05)" : "none" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 48 }}>🍺</div>
        )}

        {/* Edición especial badge (top-left) */}
        {beer.es_edicion_especial && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#f0d060",
            border: "1px solid rgba(240,208,96,0.5)", zIndex: 3 }}>
            ✨ {beer.motivo_edicion || "Ed. Especial"}
          </div>
        )}

        {/* Rareza badge (top-right) */}
        <div style={{ position: "absolute", top: 8, right: 8, padding: "3px 9px", borderRadius: 20,
          fontSize: 10, fontWeight: 800, zIndex: 3, backdropFilter: "blur(4px)",
          background: "rgba(0,0,0,0.65)", ...rarity.badge }}>
          {rarity.glyph} {rarity.label}
        </div>

        {/* Badge "conseguida" */}
        <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.7)",
          padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#d4af37",
          border: "1px solid rgba(212,175,55,0.4)", zIndex: 3 }}>
          ✓ Conseguida
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px", background: rarity.card.background }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#f0e4cc",
          fontFamily: "'Playfair Display', serif", lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {beer.nombre}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#9a7d62",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[beer.estilo, beer.pais].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );

  // Mítica: wrap in spinning border container
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

export default CollectionCard;
