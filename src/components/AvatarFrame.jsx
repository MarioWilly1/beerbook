import React from "react";
import Avatar from "./Avatar";

// Marcos decorativos comprables en la Tienda — mismo patrón de "anillo
// concéntrico" que StoryRing.jsx (fondo con gradiente + separador oscuro +
// Avatar adentro), uno por slug de cosmetic_items category='frame'.
const FRAME_STYLES = {
  frame_madera:    { gradient: "linear-gradient(135deg, #8b6b2e 0%, #5a4025 50%, #8b6b2e 100%)" },
  frame_bronce:    { gradient: "linear-gradient(135deg, #cd7f32 0%, #8b5a2b 50%, #cd7f32 100%)" },
  frame_cobre:     { gradient: "linear-gradient(135deg, #e0975a 0%, #8b4513 50%, #c07a3f 100%)" },
  frame_dorado:    { gradient: "linear-gradient(135deg, #f5e17a 0%, #d4af37 50%, #8b6b2e 100%)" },
  frame_prestigio: { gradient: "linear-gradient(135deg, #fff8e1 0%, #d4af37 35%, #8b6b2e 65%, #d4af37 100%)", glow: true },
};

// frameSlug null/desconocido => avatar sin marco, sin cambios de layout.
const AvatarFrame = ({ frameSlug, avatarUrl, nombre, size = 40 }) => {
  const style = frameSlug ? FRAME_STYLES[frameSlug] : null;

  if (!style) {
    return <Avatar avatarUrl={avatarUrl} nombre={nombre} size={size} />;
  }

  const ringSize = size + 8;

  return (
    <div style={{
      width: ringSize, height: ringSize, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: style.gradient, padding: 3,
      boxShadow: style.glow ? "0 0 10px rgba(212,175,55,0.6)" : "none",
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
