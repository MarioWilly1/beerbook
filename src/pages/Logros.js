import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { ACHIEVEMENTS, getTrackableFamilies } from "../utils/achievements";
import { useBadges } from "../hooks/useBadges";
import BadgeCard from "../components/BadgeCard";
import { useIsMobile } from "../hooks/useIsMobile";

const Logros = () => {
  const { t, i18n } = useTranslation();
  const [unlocked, setUnlocked]       = useState(new Set());
  const [unlockedData, setUnlockedData] = useState({});
  const [families, setFamilies]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const { badges, totalBadgeXP, loading: badgesLoading } = useBadges();
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const [{ data }, familyList] = await Promise.all([
        supabase
          .from("user_achievements")
          .select("slug, unlocked_at, xp_awarded")
          .eq("user_id", session.user.id),
        getTrackableFamilies(),
      ]);

      const slugSet = new Set((data || []).map((a) => a.slug));
      const bySlug  = Object.fromEntries((data || []).map((a) => [a.slug, a]));
      setUnlocked(slugSet);
      setUnlockedData(bySlug);
      setFamilies(familyList);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || badgesLoading) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("logros.loading")}</p>;

  // Las series ("serie-*") se cuentan aparte de los 48 logros estáticos —
  // son dinámicas (una por familia del catálogo) y no forman parte de ACHIEVEMENTS.
  const totalAchXP = ACHIEVEMENTS.reduce((s, a) => unlocked.has(a.slug) ? s + (unlockedData[a.slug]?.xp_awarded || 0) : s, 0);
  const unlockedAchCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.slug)).length;
  const totalSeriesXP = families.reduce((s, f) => unlocked.has(f.slug) ? s + (unlockedData[f.slug]?.xp_awarded || 0) : s, 0);
  const unlockedSeriesCount = families.filter((f) => unlocked.has(f.slug)).length;
  const unlockedBadgeCount = badges.filter((b) => b.currentTier).length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* ── INSIGNIAS DE PROGRESIÓN ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px" }}>🏷️ {t("logros.badgesTitle")}</h2>
          <p style={{ color: "#9a7d62", margin: 0, fontSize: 14 }}>
            {t("logros.badgesSummary", { unlocked: unlockedBadgeCount, total: badges.length })}
            {totalBadgeXP > 0 && ` ${t("logros.xpEarned", { xp: totalBadgeXP })}`}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          {badges.map((badge) => (
            <BadgeCard key={badge.slug} badge={badge} />
          ))}
        </div>
      </div>

      {/* ── LOGROS ── */}
      <div style={{ marginBottom: families.length > 0 ? 36 : 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px" }}>🏅 {t("logros.achievementsTitle")}</h2>
          <p style={{ color: "#9a7d62", margin: 0, fontSize: 14 }}>
            {t("logros.achievementsSummary", { unlocked: unlockedAchCount, total: ACHIEVEMENTS.length })}
            {totalAchXP > 0 && ` ${t("logros.xpEarned", { xp: totalAchXP })}`}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(155px, 1fr))",
            gap: 10,
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
                  borderRadius: 10,
                  padding: "12px 10px",
                  background: "#1c1409",
                  border: isUnlocked ? "2px solid #d4af37" : "2px solid #2e2215",
                  opacity: isUnlocked ? 1 : 0.6,
                  position: "relative",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    marginBottom: 6,
                    filter: isUnlocked ? "none" : "grayscale(1)",
                    lineHeight: 1,
                  }}
                >
                  {ach.emoji}
                </div>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#f0e4cc", marginBottom: 3, overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3 }}>
                  {t(`achievement.${ach.slug}.name`)}
                </div>
                <div style={{ fontSize: 10, color: "#9a7d62", lineHeight: 1.4, marginBottom: 6, overflowWrap: "break-word", wordBreak: "break-word" }}>
                  {t(`achievement.${ach.slug}.desc`)}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    color: isUnlocked ? "#d4af37" : "#5a4535",
                    background: isUnlocked ? "rgba(212,175,55,0.12)" : "#2a1e0f",
                    border: `1px solid ${isUnlocked ? "rgba(212,175,55,0.35)" : "#2e2215"}`,
                    borderRadius: 5,
                    padding: "1px 6px",
                  }}
                >
                  +{ach.xpBonus} XP
                </div>
                {isUnlocked && date && (
                  <div style={{ fontSize: 9, color: "#5a4535", marginTop: 4 }}>✓ {date}</div>
                )}
                {!isUnlocked && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 12,
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

      {/* ── SERIES — dinámicas (una por familia del catálogo), por eso llevan
          un tratamiento visual distinto: borde discontinuo cobre + etiqueta
          "SERIE" en la esquina, en vez del borde sólido dorado de los 48
          logros fijos. Se muestran todas las familias rastreables (≥2
          cervezas), no solo las desbloqueadas, igual que arriba. ── */}
      {families.length > 0 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 4px" }}>🎖️ {t("logros.seriesTitle")}</h2>
            <p style={{ color: "#9a7d62", margin: 0, fontSize: 14 }}>
              {t("logros.seriesSummary", { unlocked: unlockedSeriesCount, total: families.length })}
              {totalSeriesXP > 0 && ` ${t("logros.xpEarned", { xp: totalSeriesXP })}`}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(155px, 1fr))",
              gap: 10,
            }}
          >
            {families.map((f) => {
              const isUnlocked = unlocked.has(f.slug);
              const data = unlockedData[f.slug];
              const date = data?.unlocked_at
                ? new Date(data.unlocked_at).toLocaleDateString(i18n.language, {
                    day: "2-digit", month: "short", year: "numeric",
                  })
                : null;

              return (
                <div
                  key={f.slug}
                  style={{
                    borderRadius: 10,
                    padding: "12px 10px",
                    background: "#1c1409",
                    border: isUnlocked ? "2px dashed #c97b3d" : "2px dashed #2e2215",
                    opacity: isUnlocked ? 1 : 0.6,
                    position: "relative",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      color: isUnlocked ? "#c97b3d" : "#5a4535",
                      background: isUnlocked ? "rgba(201,123,61,0.15)" : "#2a1e0f",
                      border: `1px solid ${isUnlocked ? "rgba(201,123,61,0.4)" : "#2e2215"}`,
                      borderRadius: 4,
                      padding: "1px 4px",
                    }}
                  >
                    {t("logros.seriesTag")}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      marginTop: 12,
                      marginBottom: 6,
                      filter: isUnlocked ? "none" : "grayscale(1)",
                      lineHeight: 1,
                    }}
                  >
                    🎖️
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#f0e4cc", marginBottom: 3, overflowWrap: "break-word", wordBreak: "break-word", lineHeight: 1.3 }}>
                    {f.familia}
                  </div>
                  <div style={{ fontSize: 10, color: "#9a7d62", lineHeight: 1.4, marginBottom: 6, overflowWrap: "break-word", wordBreak: "break-word" }}>
                    {t("logros.seriesDesc", { familia: f.familia })}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      fontWeight: 700,
                      color: isUnlocked ? "#c97b3d" : "#5a4535",
                      background: isUnlocked ? "rgba(201,123,61,0.15)" : "#2a1e0f",
                      border: `1px solid ${isUnlocked ? "rgba(201,123,61,0.4)" : "#2e2215"}`,
                      borderRadius: 5,
                      padding: "1px 6px",
                    }}
                  >
                    +{f.xpBonus} XP
                  </div>
                  {isUnlocked && date && (
                    <div style={{ fontSize: 9, color: "#5a4535", marginTop: 4 }}>✓ {date}</div>
                  )}
                  {!isUnlocked && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        fontSize: 12,
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
      )}
    </div>
  );
};

export default Logros;
