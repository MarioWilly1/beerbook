-- Fix: sync_user_beers_from_tasting() pisaba user_beers."Rating" con el
-- rating de CADA cata nueva, incluida la cata rápida (que a partir de ahora
-- nunca pide puntuación — ver QuickTastingModal.jsx). Como la Puntuación es
-- un campo a nivel de la cerveza, no por cata, una cata sin rating no debe
-- borrar la que ya había.
--
-- Solo se ajusta la rama INSERT (catas nuevas, primera vez o repetida) con
-- COALESCE(NEW.rating, "Rating"). La rama UPDATE queda intacta a propósito:
-- ahí es donde el usuario edita su reseña actual desde el formulario
-- completo, y tiene que poder limpiar el rating a propósito si así lo
-- decide — no queremos que un UPDATE con rating=null quede sin efecto.
CREATE OR REPLACE FUNCTION public.sync_user_beers_from_tasting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_beers SET
      "XP"             = "XP" + NEW.xp_earned,
      "Rating"         = COALESCE(NEW.rating, "Rating"),
      comment          = COALESCE(NEW.comment, ''),
      user_photo_url   = NEW.user_photo_url,
      photo_hash       = NEW.photo_hash,
      location_lat     = NEW.location_lat,
      location_lng     = NEW.location_lng,
      location_name    = NEW.location_name,
      location_public  = NEW.location_public,
      price_paid       = NEW.price_paid
    WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id = (
      SELECT MAX(id) FROM public.beer_tastings
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id
    ) THEN
      UPDATE public.user_beers SET
        "Rating"         = NEW.rating,
        comment          = COALESCE(NEW.comment, ''),
        user_photo_url   = NEW.user_photo_url,
        photo_hash       = NEW.photo_hash,
        location_lat     = NEW.location_lat,
        location_lng     = NEW.location_lng,
        location_name    = NEW.location_name,
        location_public  = NEW.location_public,
        price_paid       = NEW.price_paid
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
