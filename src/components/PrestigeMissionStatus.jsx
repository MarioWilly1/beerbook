import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gsap } from "gsap";
import { supabase } from "../services/supabase";
import {
  CheckCircleFillIcon, BeakerIcon, GlobeIcon, DiamondIcon, PeopleIcon, LightBulbIcon, PackageIcon,
} from "@primer/octicons-react";

const METRIC_ICON = {
  verifiedDistinctStyles: BeakerIcon,
  verifiedDistinctCountries: GlobeIcon,
  coleccionCount: DiamondIcon,
  friendCount: PeopleIcon,
  suggestedApprovedCount: LightBulbIcon,
  totalBeers: PackageIcon,
};

// Una fila por requisito, con su propia barra de progreso y una transición
// gris → dorado (vía GSAP) SOLO cuando pasa de no-cumplido a cumplido en
// vivo — no en el mount inicial si ya llegaba cumplido de entrada.
const MissionRow = ({ req, t }) => {
  const Icon = METRIC_ICON[req.metric] || CheckCircleFillIcon;
  const rowRef    = useRef(null);
  const iconRef   = useRef(null);
  const checkRef  = useRef(null);
  const prevMetRef = useRef(req.met);
  const pct = Math.min(100, Math.round((req.current_value / req.min_required) * 100));

  useEffect(() => {
    const wasMet = prevMetRef.current;
    prevMetRef.current = req.met;
    if (wasMet || !req.met) return; // solo animar la transición real no-cumplido -> cumplido

    const ctx = gsap.context(() => {
      gsap.fromTo(rowRef.current,
        { borderColor: "#2e2215", backgroundColor: "#241a0e" },
        { borderColor: "rgba(212,175,55,0.5)", backgroundColor: "rgba(212,175,55,0.08)", duration: 0.7, ease: "power2.out" }
      );
      gsap.fromTo(iconRef.current, { color: "#5a4535" }, { color: "#d4af37", duration: 0.7, ease: "power2.out" });
      if (checkRef.current) {
        gsap.fromTo(checkRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)" });
      }
    });
    return () => ctx.revert();
  }, [req.met]);

  return (
    <div
      ref={rowRef}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 8,
        border: `1px solid ${req.met ? "rgba(212,175,55,0.5)" : "#2e2215"}`,
        background: req.met ? "rgba(212,175,55,0.08)" : "#241a0e",
      }}
    >
      <div ref={iconRef} style={{ display: "flex", flexShrink: 0, color: req.met ? "#d4af37" : "#5a4535" }}>
        <Icon size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: req.met ? "#f0e4cc" : "#9a7d62" }}>
            {t(`prestige.metric.${req.metric}`)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: req.met ? "#d4af37" : "#5a4535", flexShrink: 0 }}>
            {req.current_value}/{req.min_required}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 10,
            background: "linear-gradient(90deg, #8b6b2e, #d4af37)",
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>

      {req.met && (
        <div ref={checkRef} style={{ display: "flex", flexShrink: 0, color: "#d4af37" }}>
          <CheckCircleFillIcon size={16} />
        </div>
      )}
    </div>
  );
};

// PrestigeMissionStatus: checklist de requisitos de diversidad para el
// PRÓXIMO prestigio (además del umbral de XP/nivel que ya se muestra en
// otro lado). Notifica al padre si todos los requisitos están cumplidos
// vía onStatusChange, para poder habilitar/deshabilitar el botón de
// confirmar ascenso. Re-consulta cuando la pestaña vuelve a tener foco,
// ya que normalmente una misión se completa en OTRA pantalla (ej. una
// cata nueva en Mi Cuaderno) — así la transición animada tiene chance
// real de dispararse al volver acá.
const PrestigeMissionStatus = ({ userId, onStatusChange, onVisibilityChange }) => {
  const { t } = useTranslation();
  const [requirements, setRequirements] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchProgress = useCallback(async () => {
    const { data } = await supabase.rpc("get_prestige_mission_progress", { p_user_id: userId });
    if (!mountedRef.current) return;
    const rows = data || [];
    setRequirements(rows);
    onStatusChange && onStatusChange(rows.every((r) => r.met));
    onVisibilityChange && onVisibilityChange(rows.length > 0);
  }, [userId, onStatusChange, onVisibilityChange]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchProgress(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProgress]);

  if (requirements === null) return <p style={{ fontSize: 11, color: "#5a4535" }}>{t("prestige.missionsLoading")}</p>;
  if (requirements.length === 0) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {t("prestige.missionsLabel")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {requirements.map((req) => (
          <MissionRow key={req.metric} req={req} t={t} />
        ))}
      </div>
    </div>
  );
};

export default PrestigeMissionStatus;
