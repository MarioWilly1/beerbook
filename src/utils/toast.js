import toast from "react-hot-toast";
import i18n from "../i18n";

// Dark warm brand style — Spotify/Apple inspired
const base = {
  background: "#1a1208",
  color: "#f0ead6",
  borderRadius: "10px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
  fontSize: "13px",
  fontWeight: "500",
  padding: "12px 16px",
  border: "1px solid rgba(212,175,55,0.2)",
  maxWidth: "370px",
  lineHeight: "1.45",
};

const highlighted = {
  ...base,
  border: "1px solid rgba(212,175,55,0.55)",
};

export const toastSave = (xp, isComplete = false) => {
  const msg = i18n.t(isComplete ? "toast.savedComplete" : "toast.saved", { xp });
  toast.success(msg, {
    style: base,
    iconTheme: { primary: "#d4af37", secondary: "#1a1208" },
    duration: 2500,
  });
};

export const toastAchievements = (list) => {
  list.forEach((a, i) => {
    setTimeout(() => {
      toast(`${a.emoji}  ${a.nombre}  ·  +${a.xpBonus} XP`, {
        style: highlighted,
        duration: 4000,
      });
    }, i * 380);
  });
};

export const toastBadges = (list) => {
  list.forEach((b, i) => {
    setTimeout(() => {
      toast(`${b.icon}  ${b.nombre}  ·  ${b.tierLabel}  ·  +${b.xp} XP`, {
        style: highlighted,
        duration: 4000,
      });
    }, i * 380);
  });
};

export const toastPrestige = (n) => {
  toast(i18n.t("prestige.success", { n }), {
    style: {
      ...base,
      background: "#1f1500",
      border: "1px solid rgba(212,175,55,0.8)",
      fontWeight: "700",
      fontSize: "14px",
      color: "#d4af37",
    },
    icon: "⭐",
    duration: 5000,
  });
};

export const toastLevelUp = (levelName) => {
  toast(i18n.t("toast.levelUp", { levelName }), {
    style: {
      ...base,
      background: "#1f1500",
      border: "1px solid rgba(212,175,55,0.8)",
      fontWeight: "700",
      fontSize: "14px",
      color: "#d4af37",
    },
    icon: "★",
    duration: 5000,
  });
};
