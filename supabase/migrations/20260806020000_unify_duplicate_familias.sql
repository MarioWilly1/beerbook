-- Unifica nombres de familia duplicados/inconsistentes en beers_new para que
-- los logros de "serie completa" (checkSeriesAchievements) puedan detectar
-- correctamente las familias completas. Se corrige por id, no por texto, para
-- evitar problemas de codificación de caracteres (ej. comillas tipográficas).

-- Chouffe: id 155 tenía la variante larga descriptiva, ids 73 y 112 ya usaban "Chouffe".
UPDATE public.beers_new SET familia = 'Chouffe' WHERE id = 155;

-- Chimay: id 168 tenía la variante larga descriptiva, ids 65 y 79 ya usaban "Chimay".
UPDATE public.beers_new SET familia = 'Chimay' WHERE id = 168;

-- Rambler's: id 134 usaba el carácter U+00B4 (acento agudo) y id 171 tenía la
-- variante larga descriptiva. Se unifican al nombre corto con apóstrofo recto,
-- consistente con el resto del catálogo (ej. "N'Ice Chouffe").
UPDATE public.beers_new SET familia = 'Rambler''s' WHERE id IN (134, 171);
