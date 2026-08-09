import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import AvatarFrame from "../components/AvatarFrame";
import PrestigeBadge from "../components/PrestigeBadge";
import ChallengesModal from "../components/ChallengesModal";
import ConfirmModal from "../components/ConfirmModal";
import { useUserStats } from "../hooks/useUserStats";
import { NATIVE_CARD_SHADOW } from "../utils/nativeElevation";
import {
  TrophyIcon, ShieldIcon, TagIcon, MegaphoneIcon, InfoIcon,
  GearIcon, GiftIcon, SignOutIcon, ChevronRightIcon, PersonIcon,
} from "@primer/octicons-react";

// Pestaña "Perfil" de la app nativa (ver NativeShell.js) — todo lo que en
// web vive suelto en el sidebar (Logros, Ligas, Tienda, Noticias, Historia,
// Configuración, Retos) se agrupa acá como un menú. No duplica lógica: cada
// ítem navega a la misma ruta/página que ya existe, o abre el mismo modal.
const PerfilHub = ({ session, profile }) => {
  const navigate = useNavigate();
  const { stats } = useUserStats();
  const [showChallenges, setShowChallenges] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const username = profile?.nombre || session?.user?.email || "Usuario";

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await supabase.auth.signOut();
  };

  return (
    <div style={pageStyle}>
      <div
        onClick={() => navigate(`/perfil/${session?.user?.id}`)}
        style={headerStyle}
      >
        <AvatarFrame
          frameSlug={profile?.equipped_frame_slug}
          avatarUrl={profile?.avatar_url}
          nombre={username}
          size={56}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={nameStyle}>{username}</p>
          <p style={levelStyle}>Nivel {stats.level}</p>
        </div>
        {stats.prestige > 0 && <PrestigeBadge prestige={stats.prestige} size="row" cupSize={32} />}
        <ChevronRightIcon size={16} />
      </div>

      <div style={menuStyle}>
        <MenuRow Icon={PersonIcon} label="Ver mi perfil" onClick={() => navigate(`/perfil/${session?.user?.id}`)} />
        <MenuRow Icon={TrophyIcon} label="El Palmarés" onClick={() => navigate("/logros")} />
        <MenuRow Icon={ShieldIcon} label="Ligas" onClick={() => navigate("/ranking")} />
        <MenuRow Icon={TagIcon} label="La Trastienda" onClick={() => navigate("/tienda")} />
        <MenuRow Icon={MegaphoneIcon} label="Noticias" onClick={() => navigate("/noticias")} />
        <MenuRow Icon={GiftIcon} label="Retos" onClick={() => setShowChallenges(true)} />
        <MenuRow Icon={InfoIcon} label="Historia" onClick={() => navigate("/sobre-nosotros")} />
        <MenuRow Icon={GearIcon} label="Configuración" onClick={() => navigate("/configuracion")} />
      </div>

      <div style={menuStyle}>
        <MenuRow Icon={SignOutIcon} label="Cerrar sesión" danger onClick={() => setShowLogoutConfirm(true)} />
      </div>

      {showChallenges && <ChallengesModal onClose={() => setShowChallenges(false)} />}

      {showLogoutConfirm && (
        <ConfirmModal
          title="Cerrar sesión"
          message="¿Seguro que querés cerrar sesión?"
          confirmLabel="Cerrar sesión"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
};

const MenuRow = ({ Icon, label, onClick, danger }) => (
  <button onClick={onClick} style={{ ...rowStyle, color: danger ? "#e5654f" : "#f0e4cc" }}>
    <Icon size={16} />
    <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
    <ChevronRightIcon size={14} style={{ opacity: 0.4 }} />
  </button>
);

const pageStyle = {
  maxWidth: 520,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};
const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "#1c1409",
  border: "1px solid #2e2215",
  borderRadius: 14,
  cursor: "pointer",
  color: "#9a7d62",
  boxShadow: NATIVE_CARD_SHADOW,
};
const nameStyle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: "#f0e4cc",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const levelStyle = {
  margin: "2px 0 0",
  fontSize: 12,
  color: "#9a7d62",
};
const menuStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  background: "#1c1409",
  border: "1px solid #2e2215",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: NATIVE_CARD_SHADOW,
};
const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "none",
  border: "none",
  borderBottom: "1px solid #2e2215",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
};

export default PerfilHub;
