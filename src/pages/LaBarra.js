import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import Dashboard from "./Dashboard";
import NativeTabSlide from "../components/NativeTabSlide";

const TAB_ORDER = ["catalogo", "comunidad"];

// Wrapper con tabs internas — el Catálogo (Dashboard.js) sigue intacto,
// se le suma "Comunidad" como pestaña hermana. Mismo patrón que
// Social.js: no toca el componente envuelto, solo decide cuál mostrar.
//
// En la app nativa las pestañas se muestran DEBAJO del buscador/filtros de
// Dashboard, no arriba — por eso ahí se le pasan como `tabsSlot` en vez de
// renderizarse acá arriba. En web el comportamiento queda exactamente
// igual que siempre (tabs arriba, Dashboard sin el prop).
const LaBarra = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState("catalogo");
  const isNative = Capacitor.isNativePlatform();

  const tabBar = (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <button
        onClick={() => setTab("catalogo")}
        style={{ ...tabBtnStyle, ...(tab === "catalogo" ? tabBtnActive : {}) }}
      >
        {t("nav.tabCatalog")}
      </button>
      <button
        onClick={() => setTab("comunidad")}
        style={{ ...tabBtnStyle, ...(tab === "comunidad" ? tabBtnActive : {}) }}
      >
        {t("nav.tabCommunity")}
      </button>
    </div>
  );

  if (isNative) {
    return (
      <div>
        <NativeTabSlide tabKey={tab} tabOrder={TAB_ORDER}>
          {tab === "catalogo"
            ? <Dashboard tabsSlot={tabBar} />
            : <>{tabBar}<ComunidadPlaceholder /></>}
        </NativeTabSlide>
      </div>
    );
  }

  return (
    <div>
      {tabBar}
      {tab === "catalogo" ? <Dashboard /> : <ComunidadPlaceholder />}
    </div>
  );
};

// Placeholder — el contenido real (copas originales subidas por la
// comunidad, aprobadas antes de sumarse a la Colección) queda para más
// adelante, a pedido explícito.
const ComunidadPlaceholder = () => {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12 }}>
      <p style={{ fontSize: 40, margin: "0 0 12px" }}>🍻</p>
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#f0e4cc" }}>{t("community.comingSoonTitle")}</p>
      <p style={{ margin: "0 auto", maxWidth: 360, fontSize: 13, color: "#9a7d62", lineHeight: 1.5 }}>
        {t("community.comingSoonBody")}
      </p>
    </div>
  );
};

const tabBtnStyle = {
  padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: "1px solid #2e2215", background: "#1c1409", color: "#9a7d62",
};
const tabBtnActive = { border: "1px solid #d4af37", background: "rgba(212,175,55,0.12)", color: "#d4af37" };

export default LaBarra;
