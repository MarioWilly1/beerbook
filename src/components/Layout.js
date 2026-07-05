import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import UserLevelCard from "./UserLevelCard";
import Avatar from "./Avatar";
import AvatarSelector from "./AvatarSelector";
import { useBadges } from "../hooks/useBadges";
import { TIER_META } from "../utils/badges";
import { useTotalUnread } from "../hooks/useTotalUnread";

const Layout = ({ children, session, profile, onAvatarChange }) => {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { badges } = useBadges();
  const totalUnread = useTotalUnread();

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
            "linear-gradient(rgba(13,10,6,0.82), rgba(13,10,6,0.82)), url('/wood.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#f0e4cc",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 16px",
          borderRight: "1px solid #2e2215",
        }}
      >
        <div>
          <h1 style={{
            fontSize: "22px",
            marginBottom: "16px",
            textAlign: "center",
            letterSpacing: "1px",
            fontFamily: "'Playfair Display', serif",
            color: "#d4af37",
          }}>
            🍺 BeerBook
          </h1>

          {/* Avatar + username */}
          <div
            onClick={() => setShowAvatarSelector(true)}
            title={t("sidebar.changeAvatar")}
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
            <p style={{ textAlign: "center", fontSize: "13px", opacity: 0.75, margin: "8px 0 0", color: "#f0e4cc" }}>
              {username}
            </p>
          </div>

          <UserLevelCard />

          {/* Badge strip */}
          {badges.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {badges.map((b) => (
                <div
                  key={b.slug}
                  title={`${t(`badge.${b.slug}.name`)}: ${b.currentTier ? t(`badge.tier.${b.currentTier}`) : t("badge.locked")}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      filter: !b.currentTier ? "grayscale(1)" : "none",
                      opacity: b.currentTier ? 1 : 0.25,
                    }}
                  >
                    {b.icon}
                  </span>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: b.currentTier
                        ? TIER_META[b.currentTier].color
                        : "rgba(255,255,255,0.12)",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <SidebarLink to="/" label={t("nav.catalog")} />
            <SidebarLink to="/cuaderno" label={t("nav.notebook")} />
            <SidebarLink to="/feed" label={`📡 ${t("nav.feed")}`} />
            <SidebarLink to="/amigos" label={`👥 ${t("nav.friends")}`} />
            <SidebarLink to="/chats" label={`💬 ${t("nav.messages")}`} badge={totalUnread} />
            <SidebarLink to="/logros" label={t("nav.achievements")} />
            <SidebarLink to="/ranking" label={t("nav.ranking")} />
            <SidebarLink to="/sobre-nosotros" label={t("nav.about")} />
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SidebarLink to="/configuracion" label={`⚙️ ${t("nav.settings")}`} />
          {profile?.is_admin && <SidebarLink to="/admin" label={`🔧 ${t("nav.admin")}`} />}
          <SidebarButton label={`🚪 ${t("nav.logout")}`} onClick={handleLogout} />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        key={location.pathname}
        className="page-enter"
        style={{ flex: 1, overflowY: "auto", padding: "28px", background: "#0d0a06" }}
      >
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

const SidebarLink = ({ to, label, badge }) => {
  const [hovered, setHovered] = useState(false);
  const hasBadge = badge > 0;
  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        padding: "12px 16px",
        borderRadius: "10px",
        textDecoration: "none",
        color:      isActive ? "#0d0a06" : "#f0e4cc",
        background: isActive
          ? "#d4af37"
          : hovered
          ? "rgba(212,175,55,0.12)"
          : "rgba(255,255,255,0.04)",
        fontSize: "15px",
        fontWeight: isActive ? "700" : "500",
        transition: "background 0.18s ease, transform 0.12s ease",
        transform: hovered && !isActive ? "translateX(2px)" : "none",
        display: hasBadge ? "flex" : "block",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      {hasBadge ? (
        <>
          <span>{label}</span>
          <span style={{
            background: "#c0392b",
            color: "#fff",
            borderRadius: 999,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            flexShrink: 0,
          }}>
            {badge > 99 ? "99+" : badge}
          </span>
        </>
      ) : label}
    </NavLink>
  );
};

const SidebarButton = ({ label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: "12px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.04)",
      color: "#9a7d62",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

export default Layout;
