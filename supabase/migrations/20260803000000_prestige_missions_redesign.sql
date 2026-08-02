-- ============================================================
-- Rediseño de las misiones de prestigio: de requisitos dispares (1-4
-- por tier) a 3 requisitos por tier (5 en el tier tope), tabla
-- confirmada por el usuario. No requiere cambios en do_prestige()
-- (ya itera dinámicamente sobre prestige_missions por tier) ni en
-- compute_metric_for_user() (todos los metrics ya existían:
-- totalBeers se usaba en otros contextos pero no en misiones de
-- prestigio hasta ahora).
-- ============================================================

DELETE FROM public.prestige_missions;

INSERT INTO public.prestige_missions (tier, metric, min_required) VALUES
  (1, 'verifiedDistinctStyles', 5),
  (1, 'verifiedDistinctCountries', 3),
  (1, 'totalBeers', 15),
  (2, 'verifiedDistinctStyles', 8),
  (2, 'verifiedDistinctCountries', 6),
  (2, 'friendCount', 2),
  (3, 'verifiedDistinctStyles', 12),
  (3, 'verifiedDistinctCountries', 10),
  (3, 'coleccionCount', 3),
  (4, 'verifiedDistinctStyles', 16),
  (4, 'verifiedDistinctCountries', 14),
  (4, 'friendCount', 5),
  (5, 'verifiedDistinctStyles', 20),
  (5, 'verifiedDistinctCountries', 18),
  (5, 'coleccionCount', 6),
  (5, 'friendCount', 8),
  (5, 'suggestedApprovedCount', 1);
