import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export const useCollectibleBeers = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Owned = cualquier cerveza que el usuario tenga registrada en su cuaderno
    const [{ data: catalog }, { data: userBeers }] = await Promise.all([
      supabase
        .from("beers_new")
        .select("id, nombre, rareza, es_edicion_especial, motivo_edicion, foto_url, estilo, pais, familia")
        .or("rareza.in.(rara,epica,legendaria,mitica),es_edicion_especial.eq.true"),
      supabase
        .from("user_beers")
        .select("beer_id")
        .eq("user_id", session.user.id),
    ]);

    const ownedSet = new Set((userBeers || []).map((r) => r.beer_id));
    const merged = (catalog || []).map((beer) => ({
      ...beer,
      owned: ownedSet.has(beer.id),
      userBeer: null,
    }));

    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { items, loading, refetch: fetchData };
};
