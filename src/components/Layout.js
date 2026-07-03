import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../services/supabase";
import UserLevelCard from "./UserLevelCard";
import Avatar from "./Avatar";
import AvatarSelector from "./AvatarSelector";

const Layout = ({ children, session, profile, onAvatarChange }) => {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const username =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Usuario";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: "260px",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('/wood.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", marginBottom: "16px", textAlign: "center", letterSpacing: "1px" }}>
            🍺 BeerBook
          </h1>

          {/* Avatar + username — clickable to open selector */}
          <div
            onClick={() => setShowAvatarSelector(true)}
            title="Cambiar avatar"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              marginBottom: 16, cursor: "pointer",
            }}
          >
            <div style={{ position: "relative" }}>
              <Avatar avatarUrl={profile?.avatar_url} nombre={username} size={60} />
              <span style={{
                position: "absolute", bottom: 0, right: 0,
                background: "#d4af37", borderRadius: "50%",
                width: 18, height: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, lineHeight: 1,
              }}>
                ✏️
              </span>
            </div>
            <p style={{ textAlign: "center", fontSize: "13px", opacity: 0.85, margin: "8px 0 0" }}>
              {username}
            </p>
          </div>

          <UserLevelCard />

          <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <SidebarLink to="/" label="Catálogo" />
            <SidebarLink to="/cuaderno" label="Mi Cuaderno" />
            <SidebarLink to="/feed" label="📡 Feed" />
            <SidebarLink to="/amigos" label="👥 Amigos" />
            <SidebarLink to="/logros" label="Logros" />
            <SidebarLink to="/ranking" label="Ranking" />
            <SidebarLink to="/sobre-nosotros" label="Sobre nosotros" />
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <SidebarButton label="⚙️ Configuración" onClick={() => alert("Sección de configuración")} />
          <SidebarButton label="🚪 Cerrar sesión" onClick={handleLogout} />
        </div>
      </aside>

      {/* CONTENIDO */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px", background: "#faf8f4" }}>
        {children}
      </main>

      {/* Avatar selector modal */}
      {showAvatarSelector && (
        <AvatarSelector
          profile={profile}
          session={session}
          onSave={onAvatarChange}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </div>
  );
};

const SidebarLink = ({ to, label }) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      padding: "14px 16px",
      borderRadius: "10px",
      textDecoration: "none",
      color:      isActive ? "#1e8449" : "#f5f5f5",
      background: isActive ? "#d5f5e3" : "rgba(255,255,255,0.08)",
      fontSize: "16px",
      fontWeight: "600",
      transition: "all 0.2s",
    })}
  >
    {label}
  </NavLink>
);

const SidebarButton = ({ label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: "12px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.08)",
      color: "#f5f5f5",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

export default Layout;
