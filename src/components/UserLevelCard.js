import React from "react";
import { useUserStats } from "../hooks/useUserStats";

const UserLevelCard = () => {
  const { stats } = useUserStats();

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        background: "#111",
        color: "#fff",
        marginBottom: "20px",
      }}
    >
      <h3>🏆 Tu nivel cervecero</h3>

      <p>🍺 Cervezas: {stats.totalBeers}</p>
      <p>⭐ XP total: {stats.totalXP}</p>
      <p>🔥 Nivel: {stats.level}</p>

      <div
        style={{
          height: "8px",
          background: "#333",
          borderRadius: "10px",
          overflow: "hidden",
          marginTop: "10px",
        }}
      >
        <div
          style={{
            width: `${(stats.totalXP % 100)}%`,
            height: "100%",
            background: "#d4af37",
          }}
        />
      </div>
    </div>
  );
};

export default UserLevelCard;