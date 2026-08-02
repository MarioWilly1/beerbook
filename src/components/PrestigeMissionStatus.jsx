import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { CheckCircleFillIcon, CircleIcon } from "@primer/octicons-react";

// PrestigeMissionStatus: checklist de requisitos de diversidad para el
// PRÓXIMO prestigio (además del umbral de XP/nivel que ya se muestra en
// otro lado). Notifica al padre si todos los requisitos están cumplidos
// vía onStatusChange, para poder habilitar/deshabilitar el botón de
// confirmar ascenso.
const PrestigeMissionStatus = ({ userId, onStatusChange, onVisibilityChange }) => {
  const { t } = useTranslation();
  const [requirements, setRequirements] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_prestige_mission_progress", { p_user_id: userId }).then(({ data }) => {
      if (cancelled) return;
      const rows = data || [];
      setRequirements(rows);
      onStatusChange && onStatusChange(rows.every((r) => r.met));
      onVisibilityChange && onVisibilityChange(rows.length > 0);
    });
    return () => { cancelled = true; };
  }, [userId, onStatusChange, onVisibilityChange]);

  if (requirements === null) return <p style={{ fontSize: 11, color: "#5a4535" }}>{t("prestige.missionsLoading")}</p>;
  if (requirements.length === 0) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {t("prestige.missionsLabel")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {requirements.map((req) => (
          <div key={req.metric} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {req.met
              ? <CheckCircleFillIcon size={13} fill="#4a9e6a" />
              : <CircleIcon size={13} fill="#5a4535" />}
            <span style={{ fontSize: 11, color: req.met ? "#9a7d62" : "#f0e4cc" }}>
              {t(`prestige.metric.${req.metric}`)} — {req.current_value}/{req.min_required}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrestigeMissionStatus;
