BEGIN;

-- Fix: sync_user_beers_from_tasting() pisaba user_beers.comment con '' en
-- CADA cata nueva que no trajera comentario propio (comment = COALESCE(NEW.
-- comment, '')) — el mismo bug que 20260810000000 ya había arreglado para
-- "Rating" (COALESCE(NEW.rating, "Rating")), pero nunca se aplicó a comment.
--
-- Quedó dormido porque QuickTastingModal (la re-cata de siempre) exige
-- comentario obligatorio, así que nunca insertaba con comment=null. La rama
-- "ya la tenés en el cuaderno" de QuickRegisterModal es la primera que
-- inserta una cata repetida sin comentario, y ahí se manifestó: confirmado
-- en vivo, un comentario real quedó vacío después de un Registro Rápido
-- sobre una cerveza que ya tenía reseña.
--
-- Solo se ajusta la rama INSERT (catas nuevas, primera vez o repetida) con
-- COALESCE(NEW.comment, comment). La rama UPDATE queda intacta a propósito
-- — igual criterio que ya usa "Rating" ahí: es donde el usuario edita su
-- reseña actual desde el formulario completo, y tiene que poder borrar el
-- comentario a propósito si así lo decide.
CREATE OR REPLACE FUNCTION public.sync_user_beers_from_tasting()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_beers SET
      "XP"               = "XP" + NEW.xp_earned,
      "Rating"           = COALESCE(NEW.rating, "Rating"),
      comment            = COALESCE(NEW.comment, comment),
      user_photo_url     = NEW.user_photo_url,
      photo_hash         = NEW.photo_hash,
      selfie_photo_url   = NEW.selfie_photo_url,
      selfie_photo_hash  = NEW.selfie_photo_hash,
      location_lat       = NEW.location_lat,
      location_lng       = NEW.location_lng,
      location_name      = NEW.location_name,
      location_public    = NEW.location_public,
      price_paid         = NEW.price_paid
    WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id = (
      SELECT MAX(id) FROM public.beer_tastings
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id
    ) THEN
      UPDATE public.user_beers SET
        "Rating"           = NEW.rating,
        comment            = COALESCE(NEW.comment, ''),
        user_photo_url     = NEW.user_photo_url,
        photo_hash         = NEW.photo_hash,
        selfie_photo_url   = NEW.selfie_photo_url,
        selfie_photo_hash  = NEW.selfie_photo_hash,
        location_lat       = NEW.location_lat,
        location_lng       = NEW.location_lng,
        location_name      = NEW.location_name,
        location_public    = NEW.location_public,
        price_paid         = NEW.price_paid
      WHERE user_id = NEW.user_id AND beer_id = NEW.beer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
