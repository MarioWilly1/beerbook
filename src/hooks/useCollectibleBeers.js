import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useCollectibleBeers = () => {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const [{ data: catalog }, { data: collection }] = await Promise.all([
      supabase
        .from("beers_new")
        .select("id, nombre, rareza, es_edicion_especial, motivo_edicion, foto_url, estilo, pais, familia")
        .or("rareza.in.(rara,epica,legendaria,mitica),es_edicion_especial.eq.true"),
      supabase
        .from("user_beers")
        .select("beer_id, condicion, fecha_adquisicion, notas_coleccion")
        .eq("user_id", session.user.id)
        .eq("en_coleccion", true),
    ]);

    const collectedMap = new Map((collection || []).map((r) => [r.beer_id, r]));
    const merged = (catalog || []).map((beer) => {
      const userBeer = collectedMap.get(beer.id);
      return { ...beer, owned: !!userBeer, userBeer: userBeer || null };
    });

    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { items, loading, refetch: fetchData };
};
