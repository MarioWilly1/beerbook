import React from "react";
import Avatar from "./Avatar";

// Anillo de historia alrededor de un avatar.
// variant: "unseen" | "seen" | "own" | "add"
const StoryRing = ({ avatarUrl, nombre, size = 56, variant = "unseen", onClick, label }) => {
  const ringSize  = size + 6;
  const ringStyle = RING_STYLES[variant] || RING_STYLES.unseen;

  return (
    <button
      onClick={onClick}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            6,
        background:     "none",
        border:         "none",
        cursor:         "pointer",
        padding:        0,
        flexShrink:     0,
      }}
    >
      {/* Contenedor del anillo */}
      <div
        style={{
          width:        ringSize,
          height:       ringSize,
          borderRadius: "50%",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          background:   ringStyle.gradient,
          padding:      3,
          position:     "relative",
        }}
      >
        {/* Separador blanco-oscuro entre anillo y avatar */}
        <div
          style={{
            width:        size,
            height:       size,
            borderRadius: "50%",
            background:   "#0d0a06",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            padding:      2,
          }}
        >
          <Avatar avatarUrl={avatarUrl} nombre={nombre} size={size - 4} />
        </div>

        {/* Badge "+" para el anillo propio sin historias */}
        {variant === "add" && (
          <div
            style={{
              position:     "absolute",
              bottom:       -2,
              right:        -2,
              width:        20,
              height:       20,
              borderRadius: "50%",
              background:   "#d4af37",
              color:        "#0d0a06",
              fontSize:     14,
              fontWeight:   700,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              lineHeight:   1,
              border:       "2px solid #0d0a06",
            }}
          >
            +
          </div>
        )}
      </div>

      {/* Nombre debajo */}
      {label !== false && (
        <span
          style={{
            fontSize:     10,
            color:        variant === "seen" ? "#5a4535" : "#9a7d62",
            maxWidth:     ringSize + 10,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            textAlign:    "center",
          }}
        >
          {label || nombre}
        </span>
      )}
    </button>
  );
};

const RING_STYLES = {
  // Historia nueva sin ver: gradiente dorado
  unseen: {
    gradient: "linear-gradient(135deg, #d4af37 0%, #c07a3f 50%, #8b6b2e 100%)",
  },
  // Historia ya vista: gris oscuro
  seen: {
    gradient: "#2e2215",
  },
  // Historia propia (con contenido): gradiente cobre
  own: {
    gradient: "linear-gradient(135deg, #c07a3f 0%, #8b6b2e 100%)",
  },
  // Sin historias propias: botón para crear
  add: {
    gradient: "#2e2215",
  },
};

export default StoryRing;
