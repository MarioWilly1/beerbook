import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import PrestigeAscensionModal from "./PrestigeAscensionModal";
import PrestigeMissionStatus from "./PrestigeMissionStatus";

// Nivel/XP completos viven ahora únicamente en ProfilePage.js — esta card
// del sidebar es solo racha + acciones de Prestigio (nada de HUD ambiental).
// El botón de repetir la animación vive en el Perfil, no acá.
const UserLevelCard = ({ stats, refetch, userId }) => {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [prestiging, setPrestiging] = useState(false);
  const [ascension, setAscension] = useState(null); // número de prestigio a mostrar en el modal, o null
  const [missionsMet, setMissionsMet] = useState(true); // optimista hasta que llegue la respuesta del server

  const handleMissionStatusChange = useCallback((met) => setMissionsMet(met), []);

  const handlePrestige = async () => {
    setPrestiging(true);
    const { data, error } = await supabase.rpc("do_prestige");
    setPrestiging(false);
    setConfirming(false);
    if (error) return;
    const newPrestige = data?.[0]?.new_prestige;
    refetch();
    if (newPrestige != null) setAscension(newPrestige);
  };

  const hasContent = stats.canPrestige || confirming || ascension != null;
  if (!hasContent) return null;

  return (
    <div style={cardStyle}>
      {stats.canPrestige && !confirming && (
        <button onClick={() => { setMissionsMet(true); setConfirming(true); }} style={prestigeBtnStyle}>
          {t("prestige.cta")}
        </button>
      )}

      {confirming && (
        <div style={confirmBoxStyle}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#f0e4cc", lineHeight: 1.5 }}>
            {t("prestige.confirmBody", { n: stats.prestige + 1 })}
          </p>

          {userId && <PrestigeMissionStatus userId={userId} onStatusChange={handleMissionStatusChange} />}

          {!missionsMet && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#c07a3f" }}>
              {t("prestige.missionsIncomplete")}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handlePrestige} disabled={prestiging || !missionsMet} style={{ ...confirmYesStyle, opacity: (prestiging || !missionsMet) ? 0.5 : 1, cursor: (prestiging || !missionsMet) ? "not-allowed" : "pointer" }}>
              {prestiging ? "…" : t("prestige.confirmYes")}
            </button>
            <button onClick={() => setConfirming(false)} disabled={prestiging} style={confirmNoStyle}>
              {t("prestige.confirmNo")}
            </button>
          </div>
        </div>
      )}

      {ascension != null && (
        <PrestigeAscensionModal toPrestige={ascension} onClose={() => setAscension(null)} />
      )}
    </div>
  );
};

const cardStyle = {
  padding: "12px 14px",
  background: "rgba(44,30,15,0.55)",
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: "10px",
  marginBottom: "20px",
};

const prestigeBtnStyle = {
  width: "100%",
  marginTop: "10px",
  padding: "8px 0",
  borderRadius: "8px",
  border: "1px solid rgba(212,175,55,0.55)",
  background: "linear-gradient(90deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
  color: "#d4af37",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmBoxStyle = {
  marginTop: "10px",
  padding: "10px",
  borderRadius: "8px",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(212,175,55,0.3)",
};

const confirmYesStyle = {
  flex: 1,
  padding: "7px 0",
  borderRadius: "7px",
  border: "none",
  background: "#d4af37",
  color: "#0d0a06",
  fontSize: "11px",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmNoStyle = {
  flex: 1,
  padding: "7px 0",
  borderRadius: "7px",
  border: "1px solid #2e2215",
  background: "transparent",
  color: "#9a7d62",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
};

export default UserLevelCard;
