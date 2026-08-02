import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { HourglassIcon, CalendarIcon } from "@primer/octicons-react";
import { fetchWeeklyChallengeProgress, checkAndAwardWeeklyChallenge } from "../utils/weeklyChallenge";
import { celebrateAchievement } from "../utils/celebrate";

// Card de un reto activo — arriba de todo en el Dashboard. Todo el cálculo
// (progreso, vigencia, condición real) vive server-side; acá solo se pinta
// lo que get_weekly_challenge_progress() devuelve. compact = true para
// "diario" (más chico/rápido de leer que el semanal).
//
// Diferenciación diario/semanal: ícono (reloj de arena vs calendario) +
// franja de acento a la izquierda (cobre para diario, dorado para semanal)
// — se mantiene visible incluso completado, así se sigue distinguiendo qué
// tipo de reto era.
const ChallengeCard = ({ progress, compact }) => {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((progress.progress / progress.threshold) * 100));
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(`${progress.fecha_fin}T23:59:59Z`) - new Date()) / 86_400_000)
  );
  const accentColor = compact ? "#c07a3f" : "#d4af37";
  const TypeIcon = compact ? HourglassIcon : CalendarIcon;
  const isUrgent = !progress.completed && (progress.duration_type === "diario" || daysLeft <= 1);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1c1409 0%, #241a0d 100%)",
      border: `1px solid ${progress.completed ? "#2a6b3a" : "#2e2215"}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: compact ? 10 : 14,
      padding: compact ? "10px 14px" : "16px 20px",
      display: "flex", flexDirection: "column", gap: compact ? 4 : 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", color: accentColor, flexShrink: 0 }}>
            <TypeIcon size={compact ? 14 : 18} />
          </span>
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
          <span style={{
            fontSize: isUrgent ? (compact ? 13 : 15) : (compact ? 11 : 12),
            fontWeight: isUrgent ? 800 : 400,
            color: isUrgent ? "#c07a3f" : "#9a7d62",
            animation: isUrgent ? "pulse 1.8s ease-in-out infinite" : "none",
          }}>
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
        <div style={{ height: compact ? 6 : 8, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 10,
            background: progress.completed
              ? "linear-gradient(90deg, #2a6b3a, #4a9e6a)"
              : "linear-gradient(90deg, #8b6b2e, #d4af37)",
            transition: "width 0.6s ease",
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
          celebrateAchievement();
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
