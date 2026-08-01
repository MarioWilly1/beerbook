import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchWeeklyChallengeProgress, checkAndAwardWeeklyChallenge } from "../utils/weeklyChallenge";

// Card de un reto activo — arriba de todo en el Dashboard. Todo el cálculo
// (progreso, vigencia, condición real) vive server-side; acá solo se pinta
// lo que get_weekly_challenge_progress() devuelve. compact = true para
// "diario" (más chico/rápido de leer que el semanal).
const ChallengeCard = ({ progress, compact }) => {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((progress.progress / progress.threshold) * 100));
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(`${progress.fecha_fin}T23:59:59Z`) - new Date()) / 86_400_000)
  );

  return (
    <div style={{
      background: "linear-gradient(135deg, #1c1409 0%, #241a0d 100%)",
      border: `1px solid ${progress.completed ? "#2a6b3a" : "#2e2215"}`,
      borderRadius: compact ? 10 : 14,
      padding: compact ? "10px 14px" : "16px 20px",
      display: "flex", flexDirection: "column", gap: compact ? 4 : 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: compact ? 14 : 18 }}>{compact ? "⚡" : "🎯"}</span>
          <span style={{
            fontWeight: 700, color: "#f0e4cc", fontFamily: "'Playfair Display', serif",
            fontSize: compact ? 13 : 16,
          }}>
            {progress.nombre}
          </span>
        </div>
        {progress.completed ? (
          <span style={{ fontSize: compact ? 11 : 12, fontWeight: 800, color: "#4caf50" }}>
            ✓ {t("weeklyChallenge.completed", { xp: progress.xp_bonus })}
          </span>
        ) : (
          <span style={{ fontSize: compact ? 11 : 12, color: "#9a7d62" }}>
            {progress.duration_type === "diario"
              ? t("weeklyChallenge.endsToday")
              : t("weeklyChallenge.daysLeft", { count: daysLeft })}
          </span>
        )}
      </div>

      {!compact && progress.descripcion && (
        <p style={{ margin: 0, fontSize: 13, color: "#9a7d62" }}>{progress.descripcion}</p>
      )}

      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", color: "#d4af37", fontWeight: 700,
          fontSize: compact ? 11 : 12, marginBottom: compact ? 2 : 4,
        }}>
          <span>{progress.progress}/{progress.threshold}</span>
          {!progress.completed && <span>+{progress.xp_bonus} XP</span>}
        </div>
        <div style={{ height: compact ? 5 : 8, borderRadius: 4, background: "#2a1e0f", overflow: "hidden" }}>
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

// Puede haber hasta 2 retos activos a la vez (uno diario + uno semanal,
// nunca dos del mismo duration_type) — se auto-otorgan de forma
// independiente, sin botón "reclamar".
const WeeklyChallengeBanner = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await fetchWeeklyChallengeProgress();
    setChallenges(list);
    setLoading(false);

    for (const p of list) {
      if (!p.completed && p.progress >= p.threshold) {
        const awarded = await checkAndAwardWeeklyChallenge(p);
        if (awarded) {
          setChallenges((prev) =>
            prev.map((c) => (c.challenge_id === p.challenge_id ? { ...c, completed: true } : c))
          );
        }
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || challenges.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
      {challenges.map((c) => (
        <ChallengeCard key={c.challenge_id} progress={c} compact={c.duration_type === "diario"} />
      ))}
    </div>
  );
};

export default WeeklyChallengeBanner;
