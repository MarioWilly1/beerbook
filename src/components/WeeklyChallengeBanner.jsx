import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchWeeklyChallengeProgress, checkAndAwardWeeklyChallenge } from "../utils/weeklyChallenge";

// Banner del reto semanal activo — arriba de todo en el Dashboard.
// Todo el cálculo (progreso, vigencia, condición real) vive server-side;
// acá solo se pinta lo que get_weekly_challenge_progress() devuelve, y se
// dispara el intento de completar cuando el progreso ya alcanza el umbral
// (el trigger de la base es quien de verdad decide si se acepta).
const WeeklyChallengeBanner = () => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = await fetchWeeklyChallengeProgress();
    setProgress(p);
    setLoading(false);

    if (p && !p.completed && p.progress >= p.threshold) {
      const awarded = await checkAndAwardWeeklyChallenge(p);
      if (awarded) {
        setProgress((prev) => (prev ? { ...prev, completed: true } : prev));
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !progress) return null;

  const pct = Math.min(100, Math.round((progress.progress / progress.threshold) * 100));
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(`${progress.fecha_fin}T23:59:59Z`) - new Date()) / 86_400_000)
  );

  return (
    <div style={{
      background: "linear-gradient(135deg, #1c1409 0%, #241a0d 100%)",
      border: `1px solid ${progress.completed ? "#2a6b3a" : "#2e2215"}`,
      borderRadius: 14, padding: "16px 20px", marginBottom: 20,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <span style={{ fontWeight: 700, color: "#f0e4cc", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>
            {progress.nombre}
          </span>
        </div>
        {progress.completed ? (
          <span style={{ fontSize: 12, fontWeight: 800, color: "#4caf50" }}>
            ✓ {t("weeklyChallenge.completed", { xp: progress.xp_bonus })}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#9a7d62" }}>
            {t("weeklyChallenge.daysLeft", { count: daysLeft })}
          </span>
        )}
      </div>

      {progress.descripcion && (
        <p style={{ margin: 0, fontSize: 13, color: "#9a7d62" }}>{progress.descripcion}</p>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#d4af37", marginBottom: 4, fontWeight: 700 }}>
          <span>{progress.progress}/{progress.threshold}</span>
          {!progress.completed && <span>+{progress.xp_bonus} XP</span>}
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#2a1e0f", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 4,
            background: progress.completed ? "#2a6b3a" : "#d4af37",
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>
    </div>
  );
};

export default WeeklyChallengeBanner;
