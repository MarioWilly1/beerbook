import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const useMyBeers = () => {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBeers = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setBeers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_beers")
        .select(`
          times,
          comment,
          "Rating",
          "XP",
          user_photo_url,
          commercialized,
          location_lat,
          location_lng,
          location_name,
          location_public,
          place_id,
          en_coleccion,
          condicion,
          fecha_adquisicion,
          notas_coleccion,
          beers_new (
            id,
            nombre,
            pais,
            estilo,
            alcohol,
            descripcion,
            foto_url,
            info_detallada,
            rareza,
            es_edicion_especial,
            motivo_edicion,
            origen_lat,
            origen_lng
          )
        `)
        .eq("user_id", session.user.id);

      if (!error && data) {
        const mapped = data.map((row) => ({
          ...row.beers_new,
          times: row.times,
          comment: row.comment,
          Rating: row.Rating,
          XP: row.XP,
          user_photo_url: row.user_photo_url,
          commercialized: row.commercialized,
          location_lat: row.location_lat,
          location_lng: row.location_lng,
          location_name: row.location_name,
          location_public: row.location_public,
          place_id: row.place_id,
          en_coleccion: row.en_coleccion ?? false,
          condicion: row.condicion ?? null,
          fecha_adquisicion: row.fecha_adquisicion ?? null,
          notas_coleccion: row.notas_coleccion ?? null,
        }));
        setBeers(mapped);
      }

      setLoading(false);
    };

    fetchMyBeers();
  }, []);

  return { beers, loading };
};
