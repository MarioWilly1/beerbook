import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RssIcon, PeopleIcon, CommentIcon } from "@primer/octicons-react";
import Feed from "./Feed";
import Amigos from "./Amigos";
import Chats from "./Chats";
import { useTotalUnread } from "../hooks/useTotalUnread";

// Feed, Amigos y Chat fusionados en una sola pantalla con tabs internas —
// reduce la cantidad de links del sidebar (pedido explícito para mejorar
// el layout mobile, ahora extendido a "La Taberna" con las 3 pestañas).
// El tab activo es estado local (no cambia la URL): así el link del
// sidebar (siempre a /feed) se mantiene resaltado sin importar qué
// pestaña interna esté abierta. /amigos y /chats se conservan como
// rutas propias solo para no romper links existentes — deciden la
// pestaña inicial. /chats/:id (conversación individual) sigue siendo
// su propia ruta a pantalla completa, no vive dentro del tab.
const Social = ({ defaultTab }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const totalUnread = useTotalUnread();
  const [tab, setTab] = useState(
    defaultTab
      || (location.pathname === "/amigos" ? "amigos" : location.pathname === "/chats" ? "chat" : "feed")
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
        <button
          onClick={() => setTab("chat")}
          style={{ ...tabBtnStyle, ...(tab === "chat" ? tabBtnActive : {}), position: "relative" }}
        >
          <CommentIcon size={14} /> {t("nav.tabChat")}
          {totalUnread > 0 && (
            <span style={unreadBadge}>{totalUnread > 99 ? "99+" : totalUnread}</span>
          )}
        </button>
      </div>

      {tab === "feed" ? <Feed /> : tab === "amigos" ? <Amigos /> : <Chats />}
    </div>
  );
};

const tabBtnStyle = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
  border: "1px solid #2e2215", background: "#1c1409", color: "#9a7d62",
};
const tabBtnActive = { border: "1px solid #d4af37", background: "rgba(212,175,55,0.12)", color: "#d4af37" };
const unreadBadge = {
  position: "absolute", top: -5, right: -5,
  background: "#c0392b", color: "#fff", borderRadius: 999, minWidth: 16, height: 16,
  fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "0 3px", lineHeight: 1,
};

export default Social;
