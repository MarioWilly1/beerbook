import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { ACHIEVEMENTS } from "../utils/achievements";
import { useBadges } from "../hooks/useBadges";
import BadgeCard from "../components/BadgeCard";

const Logros = () => {
  const { t, i18n } = useTranslation();
  const [unlocked, setUnlocked]       = useState(new Set());
  const [unlockedData, setUnlockedData] = useState({});
  const [loading, setLoading]         = useState(true);
  const { badges, totalBadgeXP, loading: badgesLoading } = useBadges();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_achievements")
        .select("slug, unlocked_at, xp_awarded")
        .eq("user_id", session.user.id);

      const slugSet = new Set((data || []).map((a) => a.slug));
      const bySlug  = Object.fromEntries((data || []).map((a) => [a.slug, a]));
      setUnlocked(slugSet);
      setUnlockedData(bySlug);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || badgesLoading) return <p style={{ padding: 24 }}>{t("logros.loading")}</p>;

  const totalAchXP = Object.values(unlockedData).reduce((s, a) => s + (a.xp_awarded || 0), 0);
  const unlockedBadgeCount = badges.filter((b) => b.currentTier).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* ── INSIGNIAS DE PROGRESIÓN ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px" }}>🏷️ {t("logros.badgesTitle")}</h2>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
            {t("logros.badgesSummary", { unlocked: unlockedBadgeCount, total: badges.length })}
            {totalBadgeXP > 0 && ` ${t("logros.xpEarned", { xp: totalBadgeXP })}`}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 14,
          }}
        >
          {badges.map((badge) => (
            <BadgeCard key={badge.slug} badge={badge} />
          ))}
        </div>
      </div>

      {/* ── LOGROS ── */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px" }}>🏅 {t("logros.achievementsTitle")}</h2>
          <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
            {t("logros.achievementsSummary", { unlocked: unlocked.size, total: ACHIEVEMENTS.length })}
            {totalAchXP > 0 && ` ${t("logros.xpEarned", { xp: totalAchXP })}`}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlocked.has(ach.slug);
            const data = unlockedData[ach.slug];
            const date = data?.unlocked_at
              ? new Date(data.unlocked_at).toLocaleDateString(i18n.language, {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : null;

            return (
              <div
                key={ach.slug}
                style={{
                  borderRadius: 14,
                  padding: "18px 16px",
                  background: isUnlocked ? "#fff" : "#f5f5f5",
                  border: isUnlocked ? "2px solid #d4af37" : "2px solid #e0e0e0",
                  opacity: isUnlocked ? 1 : 0.6,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 34,
                    marginBottom: 8,
                    filter: isUnlocked ? "none" : "grayscale(1)",
                  }}
                >
                  {ach.emoji}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 4 }}>
                  {ach.nombre}
                </div>
                <div style={{ fontSize: 12, color: "#777", lineHeight: 1.4, marginBottom: 8 }}>
                  {ach.descripcion}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: isUnlocked ? "#b8941f" : "#aaa",
                    background: isUnlocked ? "#fffbee" : "#f0f0f0",
                    border: `1px solid ${isUnlocked ? "#f0d060" : "#ddd"}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  +{ach.xpBonus} XP
                </div>
                {isUnlocked && date && (
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 6 }}>✓ {date}</div>
                )}
                {!isUnlocked && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: 14,
                      opacity: 0.3,
                    }}
                  >
                    🔒
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Logros;
