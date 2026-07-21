import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { prestigeTierFor, isMythic } from "../utils/prestigeTiers";
import { PrestigeCup } from "./PrestigeBadge";
import { supabase } from "../services/supabase";

// Vista de cerca del Prestigio: se abre al tocar el emblema en el sidebar
// o en el perfil. Puramente informativa (sin animación de ascenso) — copa
// grande con tilt potenciado, nombre del tier, frase de lore, y qué
// porcentaje de la comunidad llegó a esta liga (profiles.prestige) o una
// superior, vía get_prestige_percentile().
const PrestigeCloseupModal = ({ prestige, onClose }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(null);

  const tier   = prestigeTierFor(prestige);
  const mythic = isMythic(prestige);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setVisible(true));

    supabase
      .rpc("get_prestige_percentile", { p_prestige: prestige })
      .then(({ data }) => setPct(data));

    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
    };
  }, [prestige]);

  if (!tier) return null;

  const pctDisplay = pct != null
    ? (Number.isInteger(Number(pct)) ? Number(pct) : Number(pct).toFixed(1))
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(5,4,3,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 340,
          background: "radial-gradient(ellipse at 50% 0%, #1c1409 0%, #0d0a06 70%)",
          border: `1px solid ${tier.color}55`,
          borderRadius: 20,
          padding: "28px 24px 22px",
          textAlign: "center",
          transform: visible ? "scale(1)" : "scale(0.92)",
          transition: "transform 0.25s ease-out",
          boxShadow: `0 0 40px ${tier.color}33`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <PrestigeCup tier={tier} dims={140} intensity={2.4} />
        </div>

        <div style={{
          fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
          color: `${tier.color}d0`,
        }}>
          {t("prestige.label")} {prestige}
        </div>

        <div style={{
          fontSize: 26, fontWeight: 900, marginTop: 2,
          color: mythic ? "#fff" : tier.color,
          textShadow: `0 0 18px ${tier.color}aa`,
          fontFamily: "'Playfair Display', serif",
        }}>
          {t(`prestige.tierNames.${Math.min(prestige, 6)}`)}
        </div>

        <p style={{
          margin: "14px 0 0", fontSize: 13.5, fontStyle: "italic", lineHeight: 1.5,
          color: "#c9b28f",
        }}>
          "{t(`prestige.tierLore.${Math.min(prestige, 6)}`)}"
        </p>

        <div style={{
          marginTop: 18, paddingTop: 16, borderTop: "1px solid #2e2215",
          fontSize: 13, color: "#9a7d62",
        }}>
          {pctDisplay != null
            ? t("prestige.closeup.percentile", { pct: pctDisplay })
            : "…"}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20, padding: "9px 26px", borderRadius: 999,
            border: `1px solid ${tier.color}88`, background: `${tier.color}1e`,
            color: "#f0e4cc", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          {t("prestige.closeup.close")}
        </button>
      </div>
    </div>
  );
};

export default PrestigeCloseupModal;
