import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRanking } from "../hooks/useRanking";
import { supabase } from "../services/supabase";
import { getLevelInfo } from "../utils/xp";
import Avatar from "../components/Avatar";

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

// ── Row components ────────────────────────────────────────────────────────────
const RankingRowXP = ({ entry, isSelf, onClick, selfLabel, verifiedLabel }) => {
  const pos = Number(entry.rank_pos);
  const { levelName } = getLevelInfo(Number(entry.total_xp));
  return (
    <div onClick={onClick} style={rowStyle(isSelf, pos, true)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#888" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: "#111" }}>
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#d4af37", marginLeft: 8 }}>{selfLabel}</span>}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>{levelName}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#b8941f" }}>
          ⭐ {Number(entry.total_xp).toLocaleString()} XP
        </div>
        <div style={{ fontSize: 11, color: "#aaa" }}>🍺 {entry.total_beers} {verifiedLabel}</div>
      </div>
    </div>
  );
};

const RankingRowBeers = ({ entry, isSelf, onClick, selfLabel, verifiedLabel }) => {
  const pos = Number(entry.rank_pos);
  return (
    <div onClick={onClick} style={rowStyle(isSelf, pos, true)}>
      <span style={{ fontSize: pos <= 3 ? 22 : 14, minWidth: 30, textAlign: "center", color: "#888" }}>
        {pos <= 3 ? MEDAL[pos - 1] : `#${pos}`}
      </span>
      <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: "#111" }}>
          {entry.nombre || "Usuario"}
          {isSelf && <span style={{ fontSize: 11, color: "#d4af37", marginLeft: 8 }}>{selfLabel}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e8449" }}>🍺 {entry.total_beers}</div>
        <div style={{ fontSize: 11, color: "#aaa" }}>{verifiedLabel}</div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Ranking = () => {
  const { t } = useTranslation();
  const {
    rankingTotal, rankingSemanal, rankingAmigos,
    rankingTotalBeers, rankingAmigosBeers,
    loading, currentUserId,
  } = useRanking();

  const navigate = useNavigate();
  const [scope, setScope]           = useState("total");
  const [dim, setDim]               = useState("xp");
  const [showConsent, setShowConsent] = useState(false);
  const [consentSession, setConsentSession] = useState(null);

  // Check if user needs to be asked about ranking consent
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

  if (loading) return <p style={{ padding: 24 }}>{t("ranking.loading")}</p>;

  return (
    <>
      {/* ── Consent modal ───────────────────────────────────────────── */}
      {showConsent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 20 }}>{t("ranking.consent.title")}</h3>
            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
              {t("ranking.consent.body")}
              <br /><br />
              {t("ranking.consent.settingsHint")}{" "}
              <strong>{t("ranking.consent.settingsLink")}</strong>.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => handleConsent(false)}
                style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #e0e0e0", background: "#fafafa", color: "#555", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {t("ranking.consent.btnPrivate")}
              </button>
              <button
                onClick={() => handleConsent(true)}
                style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "#d4af37", color: "#111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                {t("ranking.consent.btnPublic")} 🏅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px" }}>🏆 {t("ranking.title")}</h2>
        <p style={{ color: "#888", fontSize: 13, margin: "0 0 20px" }}>{t(subtitleKey)}</p>

        {/* Dimension switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {DIM_OPTIONS.map(({ key, emoji, tKey }) => (
            <button
              key={key}
              onClick={() => handleDimChange(key)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: dim === key ? "2px solid #b8941f" : "2px solid #e0e0e0",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                background: dim === key ? "#fffbee" : "#fafafa",
                color:      dim === key ? "#b8941f" : "#888",
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
                  background: disabled ? "#f0f0f0" : active ? "#d4af37" : "#f0f0f0",
                  color:      disabled ? "#ccc"    : active ? "#111"    : "#666",
                  opacity: disabled ? 0.5 : 1,
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
          <p style={{ color: "#999", textAlign: "center", padding: 40 }}>{t(emptyKey)}</p>
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

            {scope === "total" && !selfInList && selfEntry && (
              <>
                <div style={{ textAlign: "center", color: "#ccc", margin: "8px 0", fontSize: 13 }}>· · ·</div>
                <RowComp
                  entry={selfEntry}
                  isSelf
                  onClick={() => navigate(`/perfil/${selfEntry.id}`)}
                  selfLabel={selfLabel}
                  verifiedLabel={verifiedLabel}
                />
              </>
            )}

            {scope === "total" && !selfInList && !selfEntry && (
              <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
                {dim === "beers"
                  ? t("ranking.notInRankingBeers")
                  : t("ranking.notInRankingXP")}
              </p>
            )}

            {scope === "amigos" && list.length === 1 && (
              <p style={{ textAlign: "center", color: "#bbb", fontSize: 13, marginTop: 16 }}>
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
  background: isSelf ? "#fffbee" : "#fff",
  border: isSelf
    ? "2px solid #d4af37"
    : pos <= 3
    ? `2px solid ${["#ffd700", "#c0c0c0", "#cd7f32"][pos - 1]}`
    : "1px solid #eee",
  fontWeight: isSelf ? 700 : 400,
  cursor: clickable ? "pointer" : "default",
  transition: "box-shadow 0.15s",
});

export default Ranking;
