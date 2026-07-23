import { supabase } from "../services/supabase";

// Trae el reto activo de esta semana + progreso del usuario actual.
// Todo el cálculo (qué cuenta como "verificada", ventana de fechas, etc.)
// vive server-side en get_weekly_challenge_progress() / compute_metric_for_user()
// — acá no se recalcula nada, solo se pinta lo que la RPC ya devolvió.
// Devuelve null si no hay ningún reto activo hoy.
export async function fetchWeeklyChallengeProgress() {
  const { data, error } = await supabase.rpc("get_weekly_challenge_progress");
  if (error || !data || data.length === 0) return null;
  return data[0];
}

// Si el progreso ya alcanzó el umbral y todavía no se reclamó, inserta la
// fila de completado. El trigger validate_challenge_completion() vuelve a
// validar todo server-side (vigencia, XP, condición real) antes de aceptar
// el insert — este helper no "decide" nada, solo dispara el intento.
export async function checkAndAwardWeeklyChallenge(progress) {
  if (!progress || progress.completed) return false;
  if (progress.progress < progress.threshold) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("user_challenge_completions").insert({
    user_id: user.id,
    challenge_id: progress.challenge_id,
    xp_awarded: progress.xp_bonus,
  });

  return !error;
}
