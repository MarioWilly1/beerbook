import React from "react";
import { useTranslation } from "react-i18next";
import { XIcon } from "@primer/octicons-react";
import WeeklyChallengeBanner from "./WeeklyChallengeBanner";

// Modal que aloja el detalle completo de los retos activos — mismo
// contenido/estilo que antes vivía fijo en el Dashboard, ahora detrás del
// ícono de campana del sidebar.
const ChallengesModal = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#f0e4cc", fontFamily: "'Playfair Display', serif" }}>
            {t("weeklyChallenge.modalTitle")}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a7d62", cursor: "pointer", display: "flex" }}>
            <XIcon size={18} />
          </button>
        </div>
        <WeeklyChallengeBanner />
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const panelStyle = {
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "20px 18px 22px", width: "100%", maxWidth: 440, maxHeight: "85dvh",
  overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
};

export default ChallengesModal;
