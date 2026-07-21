import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import UserLevelCard from "./UserLevelCard";
import Avatar from "./Avatar";
import PrestigeBadge from "./PrestigeBadge";
import AvatarSelector from "./AvatarSelector";
import { useBadges } from "../hooks/useBadges";
import { TIER_META } from "../utils/badges";
import { useTotalUnread } from "../hooks/useTotalUnread";
import { useIsMobile } from "../hooks/useIsMobile";
import { useUserStats } from "../hooks/useUserStats";

const Layout = ({ children, session, profile, onAvatarChange }) => {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { badges } = useBadges();
  const totalUnread = useTotalUnread();
  const isMobile = useIsMobile();
  const { stats, refetch: refetchStats } = useUserStats();

  const username =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Usuario";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* ── Mobile: fixed top header ─────────────────────────────────────────── */}
      {isMobile && (
        <header style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 52,
          backgroundImage: "linear-gradient(rgba(13,10,6,0.97), rgba(13,10,6,0.97)), url('/wood.jpg')",
          backgroundSize: "cover", backgroundPosition: "center",
          borderBottom: "1px solid #2e2215",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", zIndex: 1200,
        }}>
          <button
            onClick={() => setDrawerOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#d4af37", fontSize: 22, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
          >
            ☰
          </button>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#d4af37", fontWeight: 700 }}>
            🍺 BeerBook
          </span>
          {totalUnread > 0 ? (
            <span style={{ background: "#c0392b", color: "#fff", borderRadius: 999, minWidth: 20, height: 20, padding: "0 5px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : (
            <span style={{ width: 36 }} />
          )}
        </header>
      )}

      {/* ── Mobile: drawer backdrop ──────────────────────────────────────────── */}
      {isMobile && drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1099 }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
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
          ...(isMobile ? {
            position: "fixed",
            top: 52,
            left: 0,
            bottom: 0,
            width: "280px",
            padding: "16px 16px 24px",
            zIndex: 1100,
            overflowY: "auto",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
          } : {}),
        }}
      >
        <div>
          {/* Title only on desktop — header has branding on mobile */}
          {!isMobile && (
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
          )}

          {/* Avatar + username — tocar la foto o el nombre va al perfil propio;
              el lápiz ✏️ es la única acción que abre el selector de avatar. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
            <div
              onClick={() => { navigate(`/perfil/${session?.user?.id}`); closeDrawer(); }}
              title={t("sidebar.viewProfile")}
              style={{ position: "relative", cursor: "pointer" }}
            >
              <Avatar avatarUrl={profile?.avatar_url} nombre={username} size={60} />
              <span
                onClick={(e) => { e.stopPropagation(); setShowAvatarSelector(true); closeDrawer(); }}
                title={t("sidebar.changeAvatar")}
                style={{
                  position: "absolute", top: -2, right: -2,
                  background: "#d4af37", borderRadius: "50%",
                  width: 18, height: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, lineHeight: 1, cursor: "pointer",
                }}
              >
                ✏️
              </span>
              {stats.currentStreak > 0 && (
                <span style={{
                  position: "absolute", bottom: -3, right: -3,
                  background: "#c07a3f", border: "2px solid #1c1409", borderRadius: "50%",
                  minWidth: 22, height: 22, padding: "0 3px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color: "#fff8ec", lineHeight: 1,
                  pointerEvents: "none",
                }}>
                  🔥{stats.currentStreak}
                </span>
              )}
            </div>
            <p
              onClick={() => { navigate(`/perfil/${session?.user?.id}`); closeDrawer(); }}
              title={t("sidebar.viewProfile")}
              style={{ textAlign: "center", fontSize: "13px", opacity: 0.85, margin: "8px 0 0", color: "#f0e4cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {username}
            </p>
          </div>

          {stats.prestige > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <PrestigeBadge prestige={stats.prestige} size="row" cupSize={36} />
            </div>
          )}

          <UserLevelCard stats={stats} refetch={refetchStats} />

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
            <SidebarLink to="/" label={t("nav.catalog")} onClick={closeDrawer} />
            <SidebarLink to="/cuaderno" label={t("nav.notebook")} onClick={closeDrawer} />
            <SidebarLink to="/feed" label={`📡 ${t("nav.feed")}`} onClick={closeDrawer} />
            <SidebarLink to="/amigos" label={`👥 ${t("nav.friends")}`} onClick={closeDrawer} />
            <SidebarLink to="/chats" label={`💬 ${t("nav.messages")}`} badge={totalUnread} onClick={closeDrawer} />
            <SidebarLink to="/logros" label={t("nav.achievements")} onClick={closeDrawer} />
            <SidebarLink to="/ranking" label={t("nav.ranking")} onClick={closeDrawer} />
            <SidebarLink to="/sobre-nosotros" label={t("nav.about")} onClick={closeDrawer} />
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SidebarLink to="/configuracion" label={`⚙️ ${t("nav.settings")}`} onClick={closeDrawer} />
          {profile?.is_admin && <SidebarLink to="/admin" label={`🔧 ${t("nav.admin")}`} onClick={closeDrawer} />}
          <SidebarButton label={`🚪 ${t("nav.logout")}`} onClick={handleLogout} />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main
        key={location.pathname}
        className="page-enter"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? "68px 16px 16px" : "28px",
          background: "#0d0a06",
        }}
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

const SidebarLink = ({ to, label, badge, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const hasBadge = badge > 0;
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
