BEGIN;

-- Varias familias tenían notas descriptivas internas pegadas al nombre
-- entre paréntesis (ej. "Affligem (línea que incluye también...)") — texto
-- irrelevante para el usuario, que además duplicaba de hecho la familia
-- ("La Corne" existía dos veces con distinta nota). Se recorta todo desde
-- el primer "(" en adelante, dejando solo el nombre limpio.
UPDATE beers_new
SET familia = trim(regexp_replace(familia, '\s*\(.*$', ''))
WHERE familia LIKE '%(%';

COMMIT;
