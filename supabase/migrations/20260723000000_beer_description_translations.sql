-- ============================================================
-- Traducción automática de info_detallada (MyMemory Translate API,
-- llamada client-side desde AdminPanel al cargar/editar una cerveza).
-- Columnas nullable: si la traducción falla, quedan en NULL y el
-- fallback a español se resuelve en BeerInfoModal.jsx al mostrar,
-- no acá.
-- ============================================================

ALTER TABLE public.beers_new
  ADD COLUMN IF NOT EXISTS info_detallada_en text,
  ADD COLUMN IF NOT EXISTS info_detallada_de text;
