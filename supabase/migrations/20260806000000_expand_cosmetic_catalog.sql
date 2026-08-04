-- ============================================================
-- Expansión del catálogo de la Tienda: 5 tags + 5 frames (Fase 1) se
-- sentían escasos para cubrir tanto al usuario casual como al que
-- farmea Chapas a largo plazo. Se agregan 13 etiquetas y 6 marcos
-- nuevos, con costos escalados según el ritmo real de ganancia
-- (level_for_xp: ~10 Chapas/nivel + 40 por cada decena cruzada; retos
-- ~3-10 Chapas c/u; prestige 300-1000 según tier — ver
-- 20260804000000_chapas_cosmetics.sql). Texto/i18n vive en
-- src/locales/{es,en,de}/translation.json bajo shop.item.<slug>.
--
-- Dos ideas de la lista original NO se agregan por ser duplicados
-- conceptuales de ítems ya existentes (evita dos "chapas" idénticas
-- compitiendo por el mismo nicho):
--   - "Cazador de Rarezas" (250) ya existe como tag_cazador_rarezas (300)
--   - "Aro de bronce simple" (150) ya existe como frame_bronce (180)
-- ============================================================

INSERT INTO public.cosmetic_items (slug, category, rarity, cost, active) VALUES
  -- Tags — entrada barata para el casual, escalando hasta el fanático
  ('tag_recien_llegado',     'tag', 'comun',      50,  true),
  ('tag_sediento',           'tag', 'comun',      90,  true),
  ('tag_sofa',               'tag', 'comun',      120, true),
  ('tag_ultima_cuenta',      'tag', 'poco_comun', 220, true),
  ('tag_alma_barril',        'tag', 'rara',       320, true),
  ('tag_sin_hielo',          'tag', 'rara',       380, true),
  ('tag_doctor_lupulo',      'tag', 'epica',      650, true),
  ('tag_nunca_falla_ronda',  'tag', 'epica',      800, true),
  ('tag_mas_espuma',         'tag', 'legendaria', 950, true),
  ('tag_coleccionista',      'tag', 'legendaria', 1000, true),
  ('tag_leyenda_liquida',    'tag', 'legendaria', 1500, true),
  ('tag_maestro_cervecero',  'tag', 'mitica',     1800, true),
  ('tag_bebi_antes_cool',    'tag', 'mitica',     2000, true),

  -- Frames
  ('frame_corcho',           'frame', 'comun',      60,   true),
  ('frame_hojas_lupulo',     'frame', 'poco_comun', 260,  true),
  ('frame_espuma_fresca',    'frame', 'epica',      600,  true),
  ('frame_corona_espigas',   'frame', 'legendaria', 900,  true),
  ('frame_espuma_animada',   'frame', 'legendaria', 1600, true),
  ('frame_gemas',            'frame', 'mitica',     2500, true)
ON CONFLICT (slug) DO NOTHING;
