import React from "react";
import { useTranslation } from "react-i18next";

// Etiqueta de texto equipada, mostrada bajo el nombre en sidebar/feed/
// ranking/perfil (y como preview en la Tienda). slug null => no renderiza.
const EquippedTag = ({ slug, size = "sm" }) => {
  const { t } = useTranslation();
  if (!slug) return null;
  const compact = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: compact ? "1px 8px" : "3px 12px",
      borderRadius: 999, fontSize: compact ? 10 : 12, fontWeight: 700,
      color: "#d4af37", background: "rgba(212,175,55,0.12)",
      border: "1px solid rgba(212,175,55,0.35)",
      whiteSpace: "nowrap",
    }}>
      {t(`shop.item.${slug}.label`)}
    </span>
  );
};

export default EquippedTag;
