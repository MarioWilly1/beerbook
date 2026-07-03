import React from "react";
import { useUserStats } from "../hooks/useUserStats";
import { getLevelInfo } from "../utils/xp";

const UserLevelCard = () => {
  const { stats } = useUserStats();
  const { level, levelName, xpIntoLevel, xpNeeded, progressPct } = getLevelInfo(stats.xp);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#d4af37" }}>
          Nv. {level} · {levelName}
        </span>
        <span style={{ fontSize: "11px", color: "#aaa" }}>🍺 {stats.beers}</span>
      </div>

      <div style={{ height: "5px", background: "rgba(255,255,255,0.12)", borderRadius: "10px", overflow: "hidden", margin: "6px 0" }}>
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #b8941f, #f0d060)",
            borderRadius: "10px",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888" }}>
        <span>⭐ {stats.xp} XP</span>
        <span>{xpIntoLevel}/{xpNeeded} → Nv. {level + 1}</span>
      </div>

      {stats.currentStreak > 0 && (
        <div style={streakStyle}>
          🔥 {stats.currentStreak} día{stats.currentStreak !== 1 ? "s" : ""} seguido{stats.currentStreak !== 1 ? "s" : ""}
          {stats.longestStreak > stats.currentStreak && (
            <span style={{ color: "#777", marginLeft: 6 }}>· récord: {stats.longestStreak}</span>
          )}
        </div>
      )}
    </div>
  );
};

const cardStyle = {
  padding: "12px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(212,175,55,0.35)",
  borderRadius: "10px",
  marginBottom: "20px",
};

const streakStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#e07b39",
  fontWeight: "600",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: "6px",
};

export default UserLevelCard;
