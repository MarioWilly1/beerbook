import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  PlusCircleIcon, BookIcon, RssIcon, PersonIcon, PlusIcon,
} from "@primer/octicons-react";
import { useTotalUnread } from "../hooks/useTotalUnread";
import NativeTabSlide from "./NativeTabSlide";
import QuickRegisterModal from "./QuickRegisterModal";

const FAB_CSS = `
  .native-fab { transition: transform 0.15s ease; }
  .native-fab:active { transform: scale(0.92); }
`;

// Envoltorio de navegación exclusivo de la app nativa (Capacitor) — hermano
// de Layout.js, NUNCA usado en web. Barra inferior de 4 secciones fijas;
// todo lo secundario (Tienda, Noticias, Historia, Configuración, Logros,
// Ligas, Retos) vive dentro del menú de "Perfil" (ver PerfilHub.js), no acá.
// Reutiliza las mismas rutas/páginas que ya existen — cero lógica de negocio
// duplicada, solo cambia el "envoltorio" de navegación.
const TABS = [
  { to: "/",         label: "Registrar", Icon: PlusCircleIcon, end: true },
  { to: "/cuaderno", label: "Colección", Icon: BookIcon },
  { to: "/feed",      label: "Social",   Icon: RssIcon, badge: "social" },
  { to: "/perfil-app", label: "Perfil",  Icon: PersonIcon },
];
const TAB_PATHS = TABS.map((tb) => tb.to);

const NativeShell = ({ children }) => {
  const totalUnread = useTotalUnread();
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  return (
    <div style={wrapStyle}>
      <style>{FAB_CSS}</style>

      <header style={headerStyle}>
        <span style={brandStyle}>🍺 RiBeer's</span>
      </header>

      <main style={mainStyle}>
        {/* Fase E — reutiliza el mismo deslizamiento liviano de la Fase B
            (NativeTabSlide), ahora con tabKey=pathname para animar entre las
            4 secciones principales. Si el pathname (actual o el anterior) no
            está en TAB_PATHS — pantallas secundarias abiertas desde el menú
            de Perfil, ej. /logros, /configuracion — no anima, ver el guard
            agregado en NativeTabSlide.jsx. */}
        <NativeTabSlide tabKey={location.pathname} tabOrder={TAB_PATHS} onSwipe={navigate}>
          {children}
        </NativeTabSlide>
      </main>

      {/* FAB v2 — reemplaza el atajo simple a Registrar (v1) por el flujo de
          Registro Rápido: abre la cámara directo, identifica la cerveza por
          código de barras o buscador, y guarda la primera cata en el
          mismo toque (ver QuickRegisterModal.jsx). Se oculta en la propia
          pantalla de Registrar — no tiene sentido ofrecer un atajo hacia
          donde ya estás. */}
      {location.pathname !== "/" && (
        <button
          className="native-fab"
          onClick={() => setShowQuickRegister(true)}
          aria-label="Registro rápido"
          style={fabStyle}
        >
          <PlusIcon size={26} />
        </button>
      )}
      {showQuickRegister && (
        <QuickRegisterModal onClose={() => setShowQuickRegister(false)} />
      )}

      <nav style={tabBarStyle}>
        {TABS.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              ...tabBtnStyle,
              color: isActive ? "#d4af37" : "#9a7d62",
            })}
          >
            <span style={{ position: "relative", display: "flex" }}>
              <Icon size={22} />
              {badge === "social" && totalUnread > 0 && (
                <span style={badgeStyle}>{totalUnread > 99 ? "99+" : totalUnread}</span>
              )}
            </span>
            <span style={tabLabelStyle}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

const wrapStyle = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  background: "#0d0a06",
};
const fabStyle = {
  position: "absolute",
  // Justo arriba de la barra inferior (altura aprox. de tabBarStyle) + la
  // zona segura de gestos, con un margen propio.
  bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 14px)",
  right: 16,
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "none",
  background: "#d4af37",
  color: "#0d0a06",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 6px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(212,175,55,0.35)",
  cursor: "pointer",
  zIndex: 10,
};
const headerStyle = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 44,
  backgroundImage: "linear-gradient(rgba(13,10,6,0.97), rgba(13,10,6,0.97)), url('/wood.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  borderBottom: "1px solid #2e2215",
  // Con StatusBar.setOverlaysWebView (App.js) la barra de estado del sistema
  // se superpone al WebView — sin este padding el reloj/batería tapan el
  // logo. Mismo criterio que paddingBottom en tabBarStyle, para la zona
  // segura de arriba.
  paddingTop: "env(safe-area-inset-top, 0px)",
};
const brandStyle = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 17,
  fontWeight: 700,
  color: "#d4af37",
};
const mainStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 16px 20px",
};
const tabBarStyle = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "stretch",
  flexShrink: 0,
  background: "#1c1409",
  borderTop: "1px solid #2e2215",
  // env(safe-area-inset-bottom) respeta la barra de gestos de Android en
  // pantalla completa (StatusBar.setOverlaysWebView, ver App.js) — sin esto
  // la barra queda pegada debajo de la zona de gestos del sistema.
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};
const tabBtnStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "8px 4px 6px",
  textDecoration: "none",
  fontSize: 10.5,
  fontWeight: 700,
};
const tabLabelStyle = {
  whiteSpace: "nowrap",
};
const badgeStyle = {
  position: "absolute", top: -4, right: -8,
  background: "#c0392b", color: "#fff", borderRadius: 999,
  minWidth: 15, height: 15, padding: "0 3px",
  fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1, border: "2px solid #1c1409",
};

export default NativeShell;
