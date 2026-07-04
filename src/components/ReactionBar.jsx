import React, { useState } from "react";

const REACTIONS = [
  { key: "salud",   emoji: "🍺", label: "Salud"     },
  { key: "fuego",   emoji: "🔥", label: "Fuego"     },
  { key: "envidia", emoji: "🤤", label: "La quiero" },
  { key: "maestro", emoji: "🤌", label: "Maestro"   },
];

const ReactionBar = ({
  activityUserId,
  activityBeerId,
  data,
  currentUserId,
  onToggle,
}) => {
  const [tooltip, setTooltip] = useState(null);

  const isSelf   = activityUserId === currentUserId;
  const counts   = data?.counts || {};
  const mine     = data?.mine   || null;
  const names    = data?.names  || {};
  const hasAny   = Object.values(counts).some((c) => c > 0);

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginTop: 10,
        flexWrap: "wrap",
        opacity: isSelf && !hasAny ? 0 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {REACTIONS.map(({ key, emoji, label }) => {
        const count        = counts[key] || 0;
        const active       = mine === key;
        const reactorNames = names[key] || [];

        const tooltipText =
          reactorNames.length === 0
            ? label
            : reactorNames.length <= 2
            ? reactorNames.join(", ")
            : `${reactorNames.slice(0, 2).join(", ")} +${reactorNames.length - 2}`;

        if (isSelf && count === 0) return null;

        return (
          <div key={key} style={{ position: "relative" }}>
            <button
              onClick={() => !isSelf && onToggle(activityUserId, activityBeerId, key)}
              onMouseEnter={() => setTooltip(key)}
              onMouseLeave={() => setTooltip(null)}
              disabled={isSelf}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: count > 0 ? "4px 10px" : "4px 8px",
                borderRadius: 20,
                border: `1.5px solid ${
                  active ? "#d4af37" : count > 0 ? "#2e2215" : "#1e1208"
                }`,
                background: active
                  ? "rgba(212,175,55,0.15)"
                  : count > 0
                  ? "#1c1409"
                  : "transparent",
                cursor: isSelf ? "default" : "pointer",
                fontSize: 14,
                color: active ? "#d4af37" : count > 0 ? "#9a7d62" : "#5a4535",
                fontWeight: active ? 700 : 400,
                transition: "all 0.15s",
                lineHeight: 1,
              }}
            >
              <span role="img" aria-label={label}>{emoji}</span>
              {count > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
              )}
            </button>

            {tooltip === key && (count > 0 || !isSelf) && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#2a1e0f",
                  border: "1px solid #2e2215",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  color: "#f0e4cc",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  pointerEvents: "none",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                }}
              >
                {tooltipText}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReactionBar;
