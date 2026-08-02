import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GiftIcon } from "@primer/octicons-react";
import { fetchWeeklyChallengeProgress } from "../utils/weeklyChallenge";
import ChallengesModal from "./ChallengesModal";

// Ícono chico y discreto de retos (reemplaza el banner fijo que ocupaba
// espacio en el Dashboard) — badge dorado con la cantidad de retos activos
// todavía sin completar. Al tocarlo abre el detalle completo en un modal.
// Ícono de cofre/regalo (no campana) para no confundirse con notificaciones.
const ChallengesBellButton = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWeeklyChallengeProgress().then((list) => {
      if (cancelled) return;
      setCount(list.filter((c) => !c.completed).length);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)} title={t("weeklyChallenge.modalTitle")} style={btnStyle}>
        <GiftIcon size={14} />
        {count > 0 && <span style={badgeStyle}>{count}</span>}
      </button>
      {open && <ChallengesModal onClose={() => setOpen(false)} />}
    </>
  );
};

const btnStyle = {
  position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
  border: "1px solid rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.06)",
  color: "#9a7d62", cursor: "pointer",
};
const badgeStyle = {
  position: "absolute", top: -5, right: -5,
  background: "#d4af37", color: "#0d0a06", borderRadius: 999,
  minWidth: 15, height: 15, padding: "0 3px",
  fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1, border: "2px solid #0d0a06",
};

export default ChallengesBellButton;
