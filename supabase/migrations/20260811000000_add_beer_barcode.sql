BEGIN;

ALTER TABLE beers_new
  ADD COLUMN codigo_barras text UNIQUE;

COMMENT ON COLUMN beers_new.codigo_barras IS 'EAN-13/UPC-A del envase, usado para identificar la cerveza al escanear (Fase F1). Nullable: muchas cervezas de barril no tienen código visible.';

COMMIT;
