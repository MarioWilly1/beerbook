import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "@primer/octicons-react";

let floatIdSeq = 0;

// Botón compacto "🍺 Veces probada: N [+]" — un toque registra una cata en
// blanco (sin foto/nota, eso queda opcional para después desde la galería)
// y suma +3 XP fijo. El conteo se actualiza optimista en el toque; el padre
// es quien confirma/revierte según la respuesta real del server.
const QuickTastingWidget = ({ count, onTap, pending }) => {
  const { t } = useTranslation();
  const [bump, setBump]   = useState(false);
  const [floats, setFloats] = useState([]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (pending) return;
    setBump(true);
    setTimeout(() => setBump(false), 260);
    const id = ++floatIdSeq;
    setFloats((prev) => [...prev, id]);
    setTimeout(() => setFloats((prev) => prev.filter((f) => f !== id)), 900);
    onTap();
  }, [pending, onTap]);

  return (
    <div style={wrapStyle} onClick={(e) => e.stopPropagation()}>
      <span style={{ fontSize: 12, color: "#9a7d62", whiteSpace: "nowrap" }}>
        🍺 {t("notebook.timesTriedLabel")}:{" "}
        <strong style={{ ...countStyle, transform: bump ? "scale(1.35)" : "scale(1)" }}>{count}</strong>
      </span>
      <button
        onClick={handleClick}
        disabled={pending}
        title={t("notebook.quickTastingBtn")}
        style={{ ...plusBtnStyle, opacity: pending ? 0.5 : 1, cursor: pending ? "not-allowed" : "pointer" }}
      >
        <PlusIcon size={12} />
      </button>
      {floats.map((id) => (
        <span key={id} className="quick-tasting-float">+3 XP</span>
      ))}
    </div>
  );
};

const wrapStyle = {
  position: "relative", display: "inline-flex", alignItems: "center", gap: 8,
  padding: "4px 8px", borderRadius: 8,
  background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
};
const countStyle = { display: "inline-block", color: "#d4af37", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" };
const plusBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
  border: "1px solid rgba(212,175,55,0.5)", background: "rgba(212,175,55,0.15)",
  color: "#d4af37", padding: 0,
};

export default QuickTastingWidget;
