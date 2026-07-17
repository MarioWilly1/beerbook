import React from "react";

// Mismos colores que la escala de rareza de cervezas (CollectionCard.js),
// para que el sistema de Prestigio se sienta parte del mismo lenguaje visual.
// TODO: reemplazar el glyph ⭐ por ilustraciones propias de jarras/copas
// con progresión temática — placeholder mientras el sistema funciona.
const TIERS = [
  { max: 4,  color: "#7a6a55" }, // 1-4   (como "común")
  { max: 9,  color: "#4a9e6a" }, // 5-9   (como "poco común")
  { max: 14, color: "#4a90d9" }, // 10-14 (como "rara")
  { max: 19, color: "#a366e8" }, // 15-19 (como "épica")
  { max: 24, color: "#d4af37" }, // 20-24 (como "legendaria")
];
const MYTHIC_COLOR = "#e040fb"; // 25+ (como "mítica") — tier tope, animado

let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.textContent = `
    @keyframes prestige-holo {
      0%   { background-position: 0% 50%; }
      100% { background-position: 300% 50%; }
    }
  `;
  document.head.appendChild(tag);
  stylesInjected = true;
};

const tierColorFor = (prestige) => {
  const tier = TIERS.find((t) => prestige <= t.max);
  return tier ? tier.color : MYTHIC_COLOR;
};

const SIZES = {
  sm: { fontSize: 10, padding: "1px 6px", gap: 2 },
  md: { fontSize: 12, padding: "2px 8px", gap: 3 },
  lg: { fontSize: 15, padding: "4px 12px", gap: 4 },
};

const PrestigeBadge = ({ prestige, size = "sm", title }) => {
  if (!prestige || prestige < 1) return null;
  injectStyles();

  const color = tierColorFor(prestige);
  const isMythic = prestige >= 25;
  const dims = SIZES[size] || SIZES.sm;

  return (
    <span
      title={title ?? `Prestigio ${prestige}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dims.gap,
        padding: dims.padding,
        borderRadius: 999,
        fontSize: dims.fontSize,
        fontWeight: 800,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...(isMythic
          ? {
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.55)",
              background: "linear-gradient(90deg, #e040fb, #4a90d9, #d4af37, #a366e8, #e040fb)",
              backgroundSize: "300% 100%",
              animation: "prestige-holo 3s linear infinite",
            }
          : {
              color,
              background: `${color}22`,
              border: `1px solid ${color}88`,
            }),
      }}
    >
      ⭐{prestige}
    </span>
  );
};

export default PrestigeBadge;
