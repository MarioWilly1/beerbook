import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { useUserStats } from "../hooks/useUserStats";
import { getLevelInfo } from "../utils/xp";
import { toastPrestige } from "../utils/toast";
import { celebrateLevel } from "../utils/celebrate";
import PrestigeBadge from "./PrestigeBadge";

const UserLevelCard = () => {
  const { t } = useTranslation();
  const { stats, refetch } = useUserStats();
  const { level, levelName, xpIntoLevel, xpNeeded, progressPct } = getLevelInfo(stats.xp);
  const [confirming, setConfirming] = useState(false);
  const [prestiging, setPrestiging] = useState(false);

  const handlePrestige = async () => {
    setPrestiging(true);
    const { data, error } = await supabase.rpc("do_prestige");
    setPrestiging(false);
    setConfirming(false);
    if (error) return;
    const newPrestige = data?.[0]?.new_prestige;
    if (newPrestige != null) {
      toastPrestige(newPrestige);
      celebrateLevel();
    }
    refetch();
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#d4af37", display: "flex", alignItems: "center", gap: 6 }}>
          Nv. {level} · {levelName}
          <PrestigeBadge prestige={stats.prestige} size="sm" />
        </span>
        <span style={{ fontSize: "11px", color: "#9a7d62" }}>🍺 {stats.beers}</span>
      </div>

      <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", margin: "6px 0" }}>
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #8b6b2e, #d4af37)",
            borderRadius: "10px",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#5a4535" }}>
        <span style={{ color: "#9a7d62" }}>⭐ {stats.xp} XP</span>
        <span>{xpIntoLevel}/{xpNeeded} → Nv. {level + 1}</span>
      </div>

      {stats.currentStreak > 0 && (
        <div style={streakStyle}>
          🔥 {stats.currentStreak} día{stats.currentStreak !== 1 ? "s" : ""} seguido{stats.currentStreak !== 1 ? "s" : ""}
          {stats.longestStreak > stats.currentStreak && (
            <span style={{ color: "#5a4535", marginLeft: 6 }}>· récord: {stats.longestStreak}</span>
          )}
        </div>
      )}

      {stats.canPrestige && !confirming && (
        <button onClick={() => setConfirming(true)} style={prestigeBtnStyle}>
          {t("prestige.cta")}
        </button>
      )}

      {confirming && (
        <div style={confirmBoxStyle}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#f0e4cc", lineHeight: 1.5 }}>
            {t("prestige.confirmBody", { n: stats.prestige + 1 })}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrestige} disabled={prestiging} style={confirmYesStyle}>
              {prestiging ? "…" : t("prestige.confirmYes")}
            </button>
            <button onClick={() => setConfirming(false)} disabled={prestiging} style={confirmNoStyle}>
              {t("prestige.confirmNo")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const cardStyle = {
  padding: "12px 14px",
  background: "rgba(44,30,15,0.55)",
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: "10px",
  marginBottom: "20px",
};

const streakStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#c07a3f",
  fontWeight: "600",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: "6px",
};

const prestigeBtnStyle = {
  width: "100%",
  marginTop: "10px",
  padding: "8px 0",
  borderRadius: "8px",
  border: "1px solid rgba(212,175,55,0.55)",
  background: "linear-gradient(90deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
  color: "#d4af37",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmBoxStyle = {
  marginTop: "10px",
  padding: "10px",
  borderRadius: "8px",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(212,175,55,0.3)",
};

const confirmYesStyle = {
  flex: 1,
  padding: "7px 0",
  borderRadius: "7px",
  border: "none",
  background: "#d4af37",
  color: "#0d0a06",
  fontSize: "11px",
  fontWeight: "700",
  cursor: "pointer",
};

const confirmNoStyle = {
  flex: 1,
  padding: "7px 0",
  borderRadius: "7px",
  border: "1px solid #2e2215",
  background: "transparent",
  color: "#9a7d62",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
};

export default UserLevelCard;
