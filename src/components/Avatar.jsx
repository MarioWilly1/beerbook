import React, { useState } from "react";

const PALETTE = ["#b8941f", "#2ecc71", "#3498db", "#9b59b6", "#e07b39"];

const Avatar = ({ avatarUrl, nombre, size = 40 }) => {
  const [imgError, setImgError] = useState(false);

  const initial = (nombre || "?")[0].toUpperCase();
  const color   = PALETTE[initial.charCodeAt(0) % PALETTE.length];

  const base = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
  };

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={nombre || "avatar"}
        onError={() => setImgError(true)}
        style={{ ...base, objectFit: "cover", background: "#f0ece4" }}
      />
    );
  }

  return (
    <div style={{
      ...base,
      background: color,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: Math.round(size * 0.4),
    }}>
      {initial}
    </div>
  );
};

export default Avatar;
