import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

// Mismo patrón que useCollectibleBeers.js, pero acá TODO el catálogo de
// copas es "coleccionable" (no hay filtro por rareza como en cervezas —
// el catálogo de copas es chico y cada una vale la pena mostrarla).
// "owned" requiere una fila en user_glasses, que solo se crea junto con
// la foto de verificación (no existe un "logueo sin foto" como en
// cervezas — coleccionar una copa ES subir la foto).
export const useCollectibleGlasses = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const [{ data: catalog }, { data: userGlasses }] = await Promise.all([
      supabase
        .from("glasses")
        .select("id, nombre, marca, descripcion, foto_url, rareza, beer_id"),
      supabase
        .from("user_glasses")
        .select("glass_id, user_photo_url")
        .eq("user_id", session.user.id),
    ]);

    const ownedMap = new Map((userGlasses || []).map((r) => [r.glass_id, r.user_photo_url]));
    const merged = (catalog || []).map((glass) => ({
      ...glass,
      owned: ownedMap.has(glass.id),
      userPhotoUrl: ownedMap.get(glass.id) || null,
    }));

    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { items, loading, refetch: fetchData };
};
