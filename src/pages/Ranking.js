import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRanking, useLeagues } from "../hooks/useRanking";
import { useUserStats } from "../hooks/useUserStats";
import { supabase } from "../services/supabase";
import { getLevelInfo } from "../utils/xp";
import { prestigeTierFor } from "../utils/prestigeTiers";
import Avatar from "../components/Avatar";
import PrestigeBadge from "../components/PrestigeBadge";

const MEDAL = ["🥇", "🥈", "🥉"];

const SCOPE_TABS = [
  { key: "total",   emoji: "🏅", tKey: "ranking.scope.total"   },
  { key: "semanal", emoji: "📅", tKey: "ranking.scope.weekly"  },
  { key: "amigos",  emoji: "👥", tKey: "ranking.scope.friends" },
];

const DIM_OPTIONS = [
  { key: "xp",    emoji: "⭐", tKey: "ranking.dim.xp"    },
  { key: "beers", emoji: "🍺", tKey: "ranking.dim.beers" },
];

const leagueLabel = (t, prestige) => (prestige === 0 ? t("ranking.leagueBase") : t("ranking.leagueN", { n: prestige }));

const LeagueIcon = ({ prestige, size }) => {
  const tier = prestige > 0 ? prestigeTierFor(prestige) : null;
  return tier
    ? <img src={tier.img} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
    : <span style={{ fontSize: size * 0.8, lineHeight: 1, flexShrink: 0 }}>🔰</span>;
};

// Desplegable de liga: el botón cerrado muestra la copa + nombre de la liga
// actual; al abrirlo, lista las 7 ligas con su copa y cantidad de usuarios.
const LeagueSelect = ({ leagues, league, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const current = leagues.find((l) => l.prestige === league);

  return (
    <div ref={wrapRef} style={{ position: "relative", marginBottom: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "10px 14px", borderRadius: 10,
          border: `1.5px solid ${open ? "#d4af37" : "#2e2215"}`,
          background: "#2a1e0f", color: "#f0e4cc",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}
      >
        <LeagueIcon prestige={league} size={22} />
        <span style={{ flex: 1, textAlign: "left" }}>{leagueLabel(t, league)}</span>
        {current != null && (
          <span style={{ fontSize: 12, color: "#9a7d62", fontWeight: 600 }}>
            {t("ranking.leagueMembers", { count: current.user_count })}
          </span>
        )}
        <span style={{ color: "#5a4535" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)", overflow: "hidden",
          maxHeight: 320, overflowY: "auto",
        }}>
          {leagues.map((l) => {
            const active = l.prestige === league;
            return (
              <div
                key={l.prestige}
                onClick={() => { onChange(l.prestige); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  background: active ? "rgba(212,175,55,0.12)" : "transparent",
                  borderBottom: "1px solid #2e2215",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <LeagueIcon prestige={l.prestige} size={22} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#d4af37" : "#f0e4cc" }}>
                  {leagueLabel(t, l.prestige)}
                </span>
                <span style={{ fontSize: 12, color: "#5a4535" }}>{t("ranking.leagueMembers", { count: l.user_count })}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RankingRowXP = ({ entry, isSelf, onClick, selfLabel, verifiedLabel }) => {
  const pos = Number(entry.rank_pos);
  const { level } = getLevelInfo(Number(entry.total_xp));
  return (
    <div onClick={onClick} style={rowStyle(isSelf, pos, true)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#9a7d62" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: isSelf ? "#0d0a06" : "#f0e4cc", display: "flex", alignItems: "center", gap: 6 }}>
          <PrestigeBadge prestige={entry.prestige} size="icon" cupSize={24} />
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#8b6b2e" }}>{selfLabel}</span>}
        </div>
        <div style={{ fontSize: 12, color: isSelf ? "#3a2a10" : "#9a7d62" }}>Nivel {level}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isSelf ? "#8b6b2e" : "#d4af37" }}>
          ⭐ {Number(entry.total_xp).toLocaleString()} XP
        </div>
        <div style={{ fontSize: 11, color: isSelf ? "#5a3a10" : "#5a4535" }}>🍺 {entry.total_beers} {verifiedLabel}</div>
      </div>
    </div>
  );
};

const RankingRowBeers = ({ entry, isSelf, onClick, selfLabel, verifiedLabel }) => {
  const pos = Number(entry.rank_pos);
  return (
    <div onClick={onClick} style={rowStyle(isSelf, pos, true)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#9a7d62" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: isSelf ? "#0d0a06" : "#f0e4cc", display: "flex", alignItems: "center", gap: 6 }}>
          <PrestigeBadge prestige={entry.prestige} size="icon" cupSize={24} />
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#8b6b2e" }}>{selfLabel}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#2a6b3a" }}>🍺 {entry.total_beers}</div>
        <div style={{ fontSize: 11, color: isSelf ? "#5a3a10" : "#5a4535" }}>{verifiedLabel}</div>
      </div>
    </div>
  );
};

const Ranking = () => {
  const { t } = useTranslation();
  const { stats: myStats } = useUserStats();
  const { leagues } = useLeagues();
  const [league, setLeague] = useState(null);

  // Default: la liga del propio prestigio, una sola vez, apenas se conoce
  // (prestigeThreshold != null es la señal de "el fetch ya resolvió" — antes
  // de eso stats.prestige vale 0 por defecto y confundiría con Liga Base real).
  useEffect(() => {
    if (league === null && myStats.prestigeThreshold != null) {
      setLeague(myStats.prestige);
    }
  }, [league, myStats.prestigeThreshold, myStats.prestige]);

  const {
    rankingTotal, rankingSemanal, rankingAmigos,
    rankingTotalBeers, rankingAmigosBeers,
    loading, currentUserId,
  } = useRanking(league);

  const navigate = useNavigate();
  const [scope, setScope]           = useState("total");
  const [dim, setDim]               = useState("xp");
  const [showConsent, setShowConsent] = useState(false);
  const [consentSession, setConsentSession] = useState(null);

  useEffect(() => {
    const checkConsent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("ranking_consent_shown")
        .eq("id", session.user.id)
        .single();
      if (data && !data.ranking_consent_shown) {
        setConsentSession(session);
        setShowConsent(true);
      }
    };
    checkConsent();
  }, []);

  const handleConsent = async (aparecer) => {
    if (!consentSession) return;
    await supabase.from("profiles").update({
      aparecer_en_ranking: aparecer,
      ranking_consent_shown: true,
    }).eq("id", consentSession.user.id);
    setShowConsent(false);
  };

  const handleDimChange = (newDim) => {
    setDim(newDim);
    if (newDim === "beers" && scope === "semanal") setScope("total");
  };

  const list =
    dim === "beers"
      ? (scope === "amigos" ? rankingAmigosBeers : rankingTotalBeers)
      : scope === "total"   ? rankingTotal
      : scope === "semanal" ? rankingSemanal
      : rankingAmigos;

  const isOwnLeague    = league === myStats.prestige;
  const selfEntryXP    = rankingTotal.find((e) => e.id === currentUserId);
  const selfEntryBeers = rankingTotalBeers.find((e) => e.id === currentUserId);
  const selfEntry      = dim === "beers" ? selfEntryBeers : selfEntryXP;
  const selfInList     = list.some((e) => e.id === currentUserId);

  const subtitleKey = dim === "xp"
    ? scope === "semanal" ? "ranking.subtitles.xpWeekly"
      : scope === "amigos"  ? "ranking.subtitles.xpFriends"
      : "ranking.subtitles.xpTotal"
    : scope === "amigos" ? "ranking.subtitles.beersFriends"
    : "ranking.subtitles.beersTotal";

  const emptyKey = dim === "xp"
    ? scope === "semanal" ? "ranking.empty.xpWeekly"
      : scope === "amigos"  ? "ranking.empty.xpFriends"
      : "ranking.empty.xpTotal"
    : scope === "amigos" ? "ranking.empty.beersFriends"
    : "ranking.empty.beersTotal";

  const selfLabel     = t("ranking.self");
  const verifiedLabel = t("ranking.verifiedLabel");
  const RowComp       = dim === "beers" ? RankingRowBeers : RankingRowXP;

  if (league === null || loading) return <p style={{ padding: 24, color: "#9a7d62" }}>{t("ranking.loading")}</p>;

  return (
    <>
      {/* Consent modal */}
      {showConsent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#1c1409", border: "1px solid #2e2215", borderRadius: 18, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 20, color: "#f0e4cc" }}>{t("ranking.consent.title")}</h3>
            <p style={{ color: "#9a7d62", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
              {t("ranking.consent.body")}
              <br /><br />
              {t("ranking.consent.settingsHint")}{" "}
              <strong style={{ color: "#d4af37" }}>{t("ranking.consent.settingsLink")}</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => handleConsent(false)}
                style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #2e2215", background: "#2a1e0f", color: "#9a7d62", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {t("ranking.consent.btnPrivate")}
              </button>
              <button
                onClick={() => handleConsent(true)}
                style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {t("ranking.consent.btnPublic")} 🏅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px" }}>🏆 {t("ranking.title")}</h2>
        <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px" }}>{t(subtitleKey)}</p>

        {/* Selector de liga */}
        <LeagueSelect leagues={leagues} league={league} onChange={setLeague} />

        {/* Dimension switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {DIM_OPTIONS.map(({ key, emoji, tKey }) => (
            <button
              key={key}
              onClick={() => handleDimChange(key)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: dim === key ? "2px solid #d4af37" : "2px solid #2e2215",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: dim === key ? "rgba(212,175,55,0.15)" : "#2a1e0f",
                color:      dim === key ? "#d4af37" : "#9a7d62",
                transition: "all 0.15s",
              }}
            >
              {emoji} {t(tKey)}
            </button>
          ))}
        </div>

        {/* Scope tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {SCOPE_TABS.map(({ key, emoji, tKey }) => {
            const disabled = dim === "beers" && key === "semanal";
            const active   = scope === key;
            return (
              <button
                key={key}
                onClick={() => !disabled && setScope(key)}
                disabled={disabled}
                title={disabled ? t("ranking.disabledWeekly") : undefined}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  fontWeight: 600, fontSize: 13,
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: disabled ? "#2a1e0f" : active ? "#d4af37" : "#2a1e0f",
                  color:      disabled ? "#5a4535" : active ? "#0d0a06" : "#9a7d62",
                  opacity: disabled ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                {emoji} {t(tKey)}
              </button>
            );
          })}
        </div>

        {/* List */}
        {list.length === 0 ? (
          <p style={{ color: "#5a4535", textAlign: "center", padding: 40 }}>{t(emptyKey)}</p>
        ) : (
          <>
            {list.map((entry) => (
              <RowComp
                key={entry.id}
                entry={entry}
                isSelf={entry.id === currentUserId}
                onClick={() => navigate(`/perfil/${entry.id}`)}
                selfLabel={selfLabel}
                verifiedLabel={verifiedLabel}
              />
            ))}

            {scope === "total" && isOwnLeague && !selfInList && selfEntry && (
              <>
                <div style={{ textAlign: "center", color: "#5a4535", margin: "8px 0", fontSize: 13 }}>· · ·</div>
                <RowComp
                  entry={selfEntry}
                  isSelf
                  onClick={() => navigate(`/perfil/${selfEntry.id}`)}
                  selfLabel={selfLabel}
                  verifiedLabel={verifiedLabel}
                />
              </>
            )}

            {scope === "total" && isOwnLeague && !selfInList && !selfEntry && (
              <p style={{ textAlign: "center", color: "#5a4535", fontSize: 13, marginTop: 16 }}>
                {dim === "beers"
                  ? t("ranking.notInRankingBeers")
                  : t("ranking.notInRankingXP")}
              </p>
            )}

            {scope === "amigos" && list.length === 1 && (
              <p style={{ textAlign: "center", color: "#5a4535", fontSize: 13, marginTop: 16 }}>
                {t("ranking.onlyYou")}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
};

const rowStyle = (isSelf, pos, clickable) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  marginBottom: 8,
  borderRadius: 12,
  background: isSelf ? "#d4af37" : "#1c1409",
  border: isSelf
    ? "none"
    : pos <= 3
    ? `2px solid ${["#d4af37", "#a0a0a0", "#cd7f32"][pos - 1]}`
    : "1px solid #2e2215",
  fontWeight: isSelf ? 700 : 400,
  cursor: clickable ? "pointer" : "default",
  transition: "box-shadow 0.15s",
});

export default Ranking;
