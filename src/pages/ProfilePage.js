import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { BADGE_DEFS, TIER_META, TIERS } from "../utils/badges";
import { ACHIEVEMENTS } from "../utils/achievements";
import { getLevelInfo } from "../utils/xp";
import Avatar from "../components/Avatar";
import PrestigeBadge from "../components/PrestigeBadge";
import PrestigeAscensionModal from "../components/PrestigeAscensionModal";

const ACH_BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

const ProfilePage = () => {
  const { t } = useTranslation();
  const { userId }   = useParams();
  const navigate     = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileData, setProfileData]     = useState(null);
  const [isFriend, setIsFriend]           = useState(false);
  const [hasSentReq, setHasSentReq]       = useState(false);
  const [stats, setStats]                 = useState(null);
  const [featuredDetails, setFeaturedDetails] = useState([]);
  const [achievements, setAchievements]   = useState({ total: 0, recent: [] });
  const [loading, setLoading]             = useState(true);
  const [reqLoading, setReqLoading]       = useState(false);
  const [ascension, setAscension]         = useState(null); // número de prestigio a repetir en el modal, o null

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const viewerId = session?.user?.id || null;
      setCurrentUserId(viewerId);
      const isSelf = viewerId === userId;

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, nombre, avatar_url, bio, pais_origen, featured_badges, perfil_publico, current_streak, longest_streak, prestige, prestige_xp_baseline")
        .eq("id", userId)
        .single();

      if (!prof) { setLoading(false); return; }
      setProfileData(prof);

      let friendStatus = false;
      let sentStatus   = false;

      if (viewerId && !isSelf) {
        const [fsRes, sentRes] = await Promise.all([
          supabase.from("friendships")
            .select("friend_id")
            .eq("user_id", viewerId)
            .eq("friend_id", userId)
            .maybeSingle(),
          supabase.from("friendship_requests")
            .select("receiver_id")
            .eq("sender_id", viewerId)
            .eq("receiver_id", userId)
            .maybeSingle(),
        ]);
        friendStatus = !!fsRes.data;
        sentStatus   = !!sentRes.data;
      }

      setIsFriend(friendStatus);
      setHasSentReq(sentStatus);

      const canSeeStats = isSelf || (prof.perfil_publico ?? true) || friendStatus;

      if (canSeeStats) {
        const [beersRes, achRes, badgesRes] = await Promise.all([
          supabase.from("user_beers").select('"XP", user_photo_url').eq("user_id", userId),
          supabase.from("user_achievements")
            .select("slug, nombre, unlocked_at, xp_awarded")
            .eq("user_id", userId)
            .order("unlocked_at", { ascending: false }),
          supabase.from("user_badges").select("badge_slug, tier, xp_awarded").eq("user_id", userId),
        ]);

        const beerData     = beersRes.data || [];
        const achData      = achRes.data || [];
        const beerXP       = beerData.reduce((s, b) => s + (b.XP || 0), 0);
        const achXP        = achData.reduce((s, a) => s + (a.xp_awarded || 0), 0);
        const badgeXP      = (badgesRes.data || []).reduce((s, b) => s + (b.xp_awarded || 0), 0);
        const lifetimeXP  = beerXP + achXP + badgeXP;
        const cycleXP      = Math.max(0, lifetimeXP - (prof.prestige_xp_baseline || 0));
        const totalBeers   = beerData.length;
        const verifiedBeers = beerData.filter((b) => b.user_photo_url?.trim()).length;

        setStats({ totalXP: lifetimeXP, totalBeers, verifiedBeers, ...getLevelInfo(cycleXP) });

        setAchievements({
          total: achData.length,
          recent: achData.slice(0, 5).map((row) => {
            const def = ACH_BY_SLUG.get(row.slug);
            return {
              slug: row.slug,
              emoji: def?.emoji || "🎖️",
              nombre: def?.nombre || row.nombre || row.slug,
              unlockedAt: row.unlocked_at,
            };
          }),
        });

        const slugs = prof.featured_badges || [];
        if (slugs.length > 0) {
          const tierMap = {};
          for (const row of badgesRes.data || []) {
            if (!tierMap[row.badge_slug]) tierMap[row.badge_slug] = new Set();
            tierMap[row.badge_slug].add(row.tier);
          }
          const details = slugs.map((slug) => {
            const def     = BADGE_DEFS.find((b) => b.slug === slug);
            const unlocked = tierMap[slug] || new Set();
            let currentTier = null;
            for (let i = TIERS.length - 1; i >= 0; i--) {
              if (unlocked.has(TIERS[i])) { currentTier = TIERS[i]; break; }
            }
            return def && currentTier ? { ...def, currentTier } : null;
          }).filter(Boolean);
          setFeaturedDetails(details);
        }
      }

      setLoading(false);
    };

    load();
  }, [userId]);

  const handleSendRequest = async () => {
    if (!currentUserId) return;
    setReqLoading(true);
    await supabase.from("friendship_requests").insert({
      sender_id: currentUserId,
      receiver_id: userId,
    });
    setHasSentReq(true);
    setReqLoading(false);
  };

  if (loading) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("profile.loading")}</p>;
  if (!profileData) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("profile.notFound")}</p>;

  const isSelf       = currentUserId === userId;
  const canSeeStats  = isSelf || (profileData.perfil_publico ?? true) || isFriend;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 20, padding: 24, background: "#1c1409", borderRadius: 16, border: "1px solid #2e2215" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Avatar avatarUrl={profileData.avatar_url} nombre={profileData.nombre} size={72} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 22 }}>{profileData.nombre}</h2>
            {profileData.pais_origen && (
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#9a7d62" }}>
                📍 {profileData.pais_origen}
              </p>
            )}
            {profileData.bio && (
              <p style={{ margin: 0, fontSize: 14, color: "#9a7d62", lineHeight: 1.5 }}>
                {profileData.bio}
              </p>
            )}
          </div>
        </div>

        {profileData.prestige > 0 && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #2e2215" }}>
            <PrestigeBadge prestige={profileData.prestige} size="hero" cupSize={128} />
            {isSelf && (
              <button onClick={() => setAscension(profileData.prestige)} style={replayBtnStyle}>
                {t("prestige.replay")}
              </button>
            )}
          </div>
        )}
      </div>

      {ascension != null && (
        <PrestigeAscensionModal toPrestige={ascension} onClose={() => setAscension(null)} />
      )}

      {/* Nivel + barra de XP — vive solo acá, no en el uso general de la app */}
      {canSeeStats && stats && (
        <div style={{ marginBottom: 20, padding: "16px 20px", background: "#1c1409", borderRadius: 14, border: "1px solid #2e2215" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#d4af37" }}>
              Nv. {stats.level} · {stats.levelName}
            </span>
            <span style={{ fontSize: 13, color: "#9a7d62" }}>⭐ {stats.totalXP.toLocaleString()} XP</span>
          </div>
          <div style={{ height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", margin: "8px 0 6px" }}>
            <div style={{
              width: `${stats.progressPct}%`, height: "100%",
              background: "linear-gradient(90deg, #8b6b2e, #d4af37)",
              borderRadius: 10, transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 12, color: "#5a4535", textAlign: "right" }}>
            {t("profile.xpToNextLevel", { current: stats.xpIntoLevel, needed: stats.xpNeeded, next: stats.level + 1 })}
          </div>
        </div>
      )}

      {/* Stats */}
      {canSeeStats && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard label={t("profile.statBeers")} value={`🍺 ${stats.totalBeers}`} sub={t("profile.statVerified", { count: stats.verifiedBeers })} />
            <StatCard
              label={t("profile.statStreak")}
              value={`🔥 ${profileData.longest_streak ?? 0}`}
              sub={profileData.current_streak > 0 ? t("profile.statStreakActive", { count: profileData.current_streak }) : t("profile.statStreakSub")}
            />
            <StatCard label={t("profile.statAchievements")} value={`🏆 ${achievements.total}`} sub={t("profile.statAchievementsSub")} />
          </div>

          {featuredDetails.length > 0 && (
            <div style={{ background: "#1c1409", borderRadius: 14, border: "1px solid #2e2215", padding: "18px 20px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {t("profile.featuredBadgesLabel")}
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {featuredDetails.map((b) => {
                  const meta = TIER_META[b.currentTier];
                  return (
                    <div
                      key={b.slug}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 16px", borderRadius: 20,
                        border: `2px solid ${meta.color}`,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{t(`badge.${b.slug}.name`)}</div>
                        <div style={{ fontSize: 11, color: "#5a4535" }}>{t(`badge.tier.${b.currentTier}`)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: "#1c1409", borderRadius: 14, border: "1px solid #2e2215", padding: "18px 20px", marginBottom: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              {t("profile.recentAchievementsLabel")}
            </p>
            {achievements.recent.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#5a4535" }}>{t("profile.noAchievementsYet")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {achievements.recent.map((a) => (
                  <div key={a.slug} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{a.emoji}</span>
                    <span style={{ fontSize: 13, color: "#f0e4cc", flex: 1 }}>{a.nombre}</span>
                    <span style={{ fontSize: 11, color: "#5a4535", flexShrink: 0 }}>
                      {new Date(a.unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Private profile */}
      {!canSeeStats && (
        <div style={{ textAlign: "center", padding: "32px 24px", background: "#1c1409", borderRadius: 14, border: "1px solid #2e2215", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ fontWeight: 700, color: "#f0e4cc", margin: "0 0 8px" }}>{t("profile.privateTitle")}</p>
          <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
            {t("profile.privateBody", { nombre: profileData.nombre })}
          </p>
          {currentUserId && !isSelf && (
            hasSentReq ? (
              <span style={{ fontSize: 13, color: "#9a7d62", background: "#2a1e0f", padding: "8px 18px", borderRadius: 20 }}>
                {t("profile.requestSentPending")}
              </span>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={reqLoading}
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: reqLoading ? "not-allowed" : "pointer", opacity: reqLoading ? 0.6 : 1 }}
              >
                {reqLoading ? t("profile.sending") : t("profile.addFriend")}
              </button>
            )
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {isSelf && (
          <button
            onClick={() => navigate("/configuracion")}
            style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #2e2215", background: "#2a1e0f", color: "#9a7d62", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            ⚙️ {t("profile.editProfile")}
          </button>
        )}
        {!isSelf && canSeeStats && !isFriend && currentUserId && (
          hasSentReq ? (
            <span style={{ fontSize: 13, color: "#9a7d62", background: "#2a1e0f", padding: "10px 18px", borderRadius: 20 }}>
              {t("profile.requestSentPending")}
            </span>
          ) : (
            <button
              onClick={handleSendRequest}
              disabled={reqLoading}
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 13, cursor: reqLoading ? "not-allowed" : "pointer" }}
            >
              {reqLoading ? t("profile.sending") : t("profile.addFriend")}
            </button>
          )
        )}
        {isFriend && (
          <span style={{ fontSize: 13, color: "#2a6b3a", background: "#0f2a18", padding: "10px 18px", borderRadius: 20, fontWeight: 600 }}>
            ✓ {t("profile.areFriends")}
          </span>
        )}
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #2e2215", background: "none", color: "#9a7d62", fontSize: 13, cursor: "pointer" }}
        >
          {t("profile.back")}
        </button>
      </div>
    </div>
  );
};

const replayBtnStyle = {
  display: "block",
  margin: "14px auto 0",
  padding: "6px 16px",
  borderRadius: 999,
  border: "1px solid #2e2215",
  background: "transparent",
  color: "#5a4535",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const StatCard = ({ label, value, sub }) => (
  <div style={{ background: "#1c1409", border: "1px solid #2e2215", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 17, fontWeight: 700, color: "#f0e4cc" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#9a7d62", marginTop: 3 }}>{sub}</div>}
  </div>
);

export default ProfilePage;
