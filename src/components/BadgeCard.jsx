import React from "react";
import { TIERS, TIER_META } from "../utils/badges";

const TIER_ICON = { bronce: "🥉", plata: "🥈", oro: "🥇", platino: "💎" };

const BadgeCard = ({ badge }) => {
  const { icon, nombre, descripcion, unlockedTiers, currentTier, nextTier, value, thresholds } = badge;
  const tierMeta = currentTier ? TIER_META[currentTier] : null;
  const nextMeta = nextTier    ? TIER_META[nextTier]    : null;

  // Platino has a gradient bg string, others are solid hex
  const bg          = tierMeta?.bg    || "#f8f8f8";
  const borderColor = tierMeta?.color || "#e0e0e0";

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "18px 16px",
        background: bg,
        border: `2px solid ${borderColor}`,
        opacity: currentTier ? 1 : 0.6,
        display: "flex",
        flexDirection: "column",
        minHeight: 190,
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: 40,
          textAlign: "center",
          marginBottom: 10,
          filter: !currentTier ? "grayscale(1)" : "none",
        }}
      >
        {icon}
      </div>

      {/* Name + description */}
      <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 2 }}>
        {nombre}
      </div>
      <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4, marginBottom: 12 }}>
        {descripcion}
      </div>

      {/* Tier progress bars */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {TIERS.map((tier) => (
          <div
            key={tier}
            title={TIER_META[tier].label}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: unlockedTiers.has(tier) ? TIER_META[tier].color : "#e0e0e0",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Current tier chip */}
      {currentTier ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
            fontSize: 11,
            fontWeight: 700,
            color: tierMeta.color,
            background: "rgba(255,255,255,0.75)",
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            padding: "2px 8px",
            marginBottom: 8,
          }}
        >
          {TIER_ICON[currentTier]} {tierMeta.label} · +{TIER_META[currentTier].xp} XP
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#bbb", fontWeight: 600, marginBottom: 8 }}>
          🔒 Sin desbloquear
        </div>
      )}

      {/* Progress hint */}
      <div style={{ fontSize: 11, color: "#999", marginTop: "auto" }}>
        {nextTier ? (
          `${value}/${thresholds[nextTier]} para ${nextMeta.label} (+${nextMeta.xp} XP)`
        ) : currentTier ? (
          <span style={{ color: tierMeta?.color, fontWeight: 700 }}>
            💎 Nivel máximo alcanzado
          </span>
        ) : (
          `${value}/${thresholds.bronce} para Bronce`
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
