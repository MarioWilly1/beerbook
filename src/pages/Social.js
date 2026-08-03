import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RssIcon, PeopleIcon } from "@primer/octicons-react";
import Feed from "./Feed";
import Amigos from "./Amigos";

// Feed y Amigos fusionados en una sola pantalla con tabs internas — reduce
// la cantidad de links del sidebar (pedido explícito para mejorar el
// layout mobile). El tab activo es estado local (no cambia la URL): así
// el link del sidebar (siempre a /feed) se mantiene resaltado sin importar
// qué pestaña interna esté abierta. /amigos se conserva como ruta propia
// solo para no romper links existentes — decide la pestaña inicial.
const Social = ({ defaultTab }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [tab, setTab] = useState(
    defaultTab || (location.pathname === "/amigos" ? "amigos" : "feed")
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTab("feed")}
          style={{ ...tabBtnStyle, ...(tab === "feed" ? tabBtnActive : {}) }}
        >
          <RssIcon size={14} /> {t("nav.feed")}
        </button>
        <button
          onClick={() => setTab("amigos")}
          style={{ ...tabBtnStyle, ...(tab === "amigos" ? tabBtnActive : {}) }}
        >
          <PeopleIcon size={14} /> {t("nav.friends")}
        </button>
      </div>

      {tab === "feed" ? <Feed /> : <Amigos />}
    </div>
  );
};

const tabBtnStyle = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: "1px solid #2e2215", background: "#1c1409", color: "#9a7d62",
};
const tabBtnActive = { border: "1px solid #d4af37", background: "rgba(212,175,55,0.12)", color: "#d4af37" };

export default Social;
