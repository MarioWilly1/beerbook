import React from "react";
import { useTranslation } from "react-i18next";
import { TIERS, TIER_META } from "../utils/badges";

const TIER_ICON = { bronce: "🥉", plata: "🥈", oro: "🥇", platino: "💎" };

const BadgeCard = ({ badge }) => {
  const { t } = useTranslation();
  const { slug, icon, unlockedTiers, currentTier, nextTier, value, thresholds } = badge;
  const tierMeta = currentTier ? TIER_META[currentTier] : null;
  const nextMeta = nextTier    ? TIER_META[nextTier]    : null;

  const borderColor = tierMeta?.color || "#2e2215";

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "18px 16px",
        background: "#1c1409",
        border: `2px solid ${currentTier ? borderColor : "#2e2215"}`,
        opacity: currentTier ? 1 : 0.7,
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
      <div style={{ fontWeight: 700, fontSize: 14, color: "#f0e4cc", marginBottom: 2 }}>
        {t(`badge.${slug}.name`)}
      </div>
      <div style={{ fontSize: 11, color: "#9a7d62", lineHeight: 1.4, marginBottom: 12 }}>
        {t(`badge.${slug}.desc`)}
      </div>

      {/* Tier progress bars */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {TIERS.map((tier) => (
          <div
            key={tier}
            title={t(`badge.tier.${tier}`)}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: unlockedTiers.has(tier) ? TIER_META[tier].color : "#2e2215",
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
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            padding: "2px 8px",
            marginBottom: 8,
          }}
        >
          {TIER_ICON[currentTier]} {t(`badge.tier.${currentTier}`)} · +{TIER_META[currentTier].xp} XP
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#5a4535", fontWeight: 600, marginBottom: 8 }}>
          🔒 {t("badge.locked")}
        </div>
      )}

      {/* Progress hint */}
      <div style={{ fontSize: 11, color: "#9a7d62", marginTop: "auto" }}>
        {nextTier ? (
          t("badge.progress.next", {
            value,
            threshold: thresholds[nextTier],
            tier: t(`badge.tier.${nextTier}`),
            xp: nextMeta.xp,
          })
        ) : currentTier ? (
          <span style={{ color: tierMeta?.color, fontWeight: 700 }}>
            💎 {t("badge.progress.maxLevel")}
          </span>
        ) : (
          t("badge.progress.start", {
            value,
            threshold: thresholds.bronce,
            tier: t("badge.tier.bronce"),
          })
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
