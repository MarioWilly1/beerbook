import React from "react";
import Avatar from "./Avatar";

// Keyframes para marcos animados — inyectadas una sola vez, mismo patrón
// que CollectionCard.js/injectStyles (no se comparte el módulo entre
// ambos porque cubren contextos distintos: sidebar/feed/perfil acá vs.
// grilla de Colección allá).
const STYLES = `
@keyframes af-foam-shimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes af-holo {
  0%   { filter: hue-rotate(0deg) saturate(1.3); }
  50%  { filter: hue-rotate(180deg) saturate(1.6); }
  100% { filter: hue-rotate(360deg) saturate(1.3); }
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

// Marcos decorativos comprables en la Tienda — mismo patrón de "anillo
// concéntrico" que StoryRing.jsx (fondo con gradiente + separador oscuro +
// Avatar adentro), uno por slug de cosmetic_items category='frame'.
const FRAME_STYLES = {
  frame_corcho:         { gradient: "linear-gradient(135deg, #c9a876 0%, #8b6f47 50%, #c9a876 100%)" },
  frame_madera:         { gradient: "linear-gradient(135deg, #8b6b2e 0%, #5a4025 50%, #8b6b2e 100%)" },
  frame_bronce:         { gradient: "linear-gradient(135deg, #cd7f32 0%, #8b5a2b 50%, #cd7f32 100%)" },
  frame_hojas_lupulo:   { gradient: "linear-gradient(135deg, #8bc24a 0%, #4a7c2a 50%, #a8d468 100%)" },
  frame_cobre:          { gradient: "linear-gradient(135deg, #e0975a 0%, #8b4513 50%, #c07a3f 100%)" },
  frame_dorado:         { gradient: "linear-gradient(135deg, #f5e17a 0%, #d4af37 50%, #8b6b2e 100%)" },
  frame_espuma_fresca:  { gradient: "linear-gradient(135deg, #fff8ec 0%, #e8dcc0 50%, #fff8ec 100%)" },
  frame_corona_espigas: { gradient: "linear-gradient(135deg, #f0c419 0%, #c9960c 45%, #f7e6a0 70%, #c9960c 100%)", glow: true, glowColor: "rgba(240,196,25,0.55)" },
  frame_espuma_animada: {
    gradient: "linear-gradient(120deg, #fff8ec 0%, #d4af37 25%, #fff8ec 50%, #d4af37 75%, #fff8ec 100%)",
    backgroundSize: "250% 250%", animation: "af-foam-shimmer 4s ease-in-out infinite",
  },
  frame_gemas:          {
    gradient: "linear-gradient(135deg, #ff6b9d 0%, #a855f7 25%, #4facfe 50%, #43e97b 75%, #ff6b9d 100%)",
    backgroundSize: "300% 300%", animation: "af-foam-shimmer 6s ease-in-out infinite, af-holo 5s linear infinite",
    glow: true, glowColor: "rgba(168,85,247,0.55)",
  },
  frame_prestigio:      { gradient: "linear-gradient(135deg, #fff8e1 0%, #d4af37 35%, #8b6b2e 65%, #d4af37 100%)", glow: true },
};

// frameSlug null/desconocido => avatar sin marco, sin cambios de layout.
const AvatarFrame = ({ frameSlug, avatarUrl, nombre, size = 40 }) => {
  const style = frameSlug ? FRAME_STYLES[frameSlug] : null;
  if (style?.animation) injectStyles();

  if (!style) {
    return <Avatar avatarUrl={avatarUrl} nombre={nombre} size={size} />;
  }

  const ringSize = size + 8;

  return (
    <div style={{
      width: ringSize, height: ringSize, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: style.gradient, backgroundSize: style.backgroundSize, padding: 3,
      animation: style.animation,
      boxShadow: style.glow ? `0 0 10px ${style.glowColor || "rgba(212,175,55,0.6)"}` : "none",
    }}>
      <div style={{
        width: size + 2, height: size + 2, borderRadius: "50%", background: "#0d0a06",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Avatar avatarUrl={avatarUrl} nombre={nombre} size={size} />
      </div>
    </div>
  );
};

export default AvatarFrame;
