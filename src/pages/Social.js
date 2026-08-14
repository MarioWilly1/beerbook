import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { RssIcon, PeopleIcon, CommentIcon, MegaphoneIcon } from "@primer/octicons-react";
import Feed from "./Feed";
import Amigos from "./Amigos";
import Chats from "./Chats";
import Noticias from "./Noticias";
import { useTotalUnread } from "../hooks/useTotalUnread";
import NativeSwipeTabs from "../components/NativeSwipeTabs";
import NativeSectionTitle from "../components/NativeSectionTitle";

// En nativo, Noticias no tiene botón propio (ver comentario más abajo) —
// se excluye del orden usado para el swipe, si no un deslizamiento desde
// "Chat" llevaría a una pestaña sin forma visible de volver salvo deslizar
// de nuevo.
const NATIVE_TAB_ORDER = ["feed", "amigos", "chat"];

// Feed, Amigos, Chat y Noticias fusionados en una sola pantalla con tabs
// internas — reduce la cantidad de links del sidebar (pedido explícito para
// mejorar el layout mobile, ahora extendido a "La Taberna" con 4 pestañas).
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
      {/* Título de contenido, distinto de "Taberna" (nombre de la pestaña
          en NativeShell.js) — solo nativo, mismo criterio que LaBarra.js /
          MiCuaderno.js. Tocarlo vuelve a la sub-pestaña Feed. */}
      {Capacitor.isNativePlatform() && (
        <NativeSectionTitle onClick={() => setTab("feed")}>
          {t("feed.nativeTitle")}
        </NativeSectionTitle>
      )}

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
        {/* En la app nativa, Noticias ya vive en el menú de Perfil
            (PerfilHub.js) — repetirla acá es un duplicado. Sigue completa
            en web: ahí no hay menú de Perfil, esta pestaña es la ÚNICA
            forma de llegar a Noticias, sacarla sería una regresión real. */}
        {!Capacitor.isNativePlatform() && (
          <button
            onClick={() => setTab("noticias")}
            style={{ ...tabBtnStyle, ...(tab === "noticias" ? tabBtnActive : {}) }}
          >
            <MegaphoneIcon size={14} /> {t("nav.tabNoticias")}
          </button>
        )}
      </div>

      {Capacitor.isNativePlatform() ? (
        <NativeSwipeTabs
          tabKey={tab}
          tabOrder={NATIVE_TAB_ORDER}
          onSwipe={setTab}
          renderTab={(key) =>
            key === "feed" ? <Feed />
              : key === "amigos" ? <Amigos />
              : key === "chat" ? <Chats />
              : <Noticias />
          }
        />
      ) : (
        tab === "feed" ? <Feed />
          : tab === "amigos" ? <Amigos />
          : tab === "chat" ? <Chats />
          : <Noticias />
      )}
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
