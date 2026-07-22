import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import Avatar from "./Avatar";

// Panel de REPASO (no de selección) para Configuración > Privacidad: lista
// las entradas del cuaderno que hoy están ocultas de algún amigo, con una
// X por amigo para sacarlo rápido. La selección en sí ("Ocultar de...")
// vive por entrada en Mi Cuaderno (HideEntryModal.jsx) — acá solo se
// audita/deshace, mismo rol que HiddenStoriesManager pero para stories.
const HiddenEntriesManager = ({ currentUserId }) => {
  const { t } = useTranslation();
  const [rows, setRows]       = useState([]); // [{ beer_id, beer_nombre, hidden: [{id,nombre,avatar_url}] }]
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null); // `${beer_id}:${hidden_user_id}` en transición

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: hiddenRows } = await supabase
      .from("entry_hidden_from")
      .select("beer_id, hidden_user_id, profiles!entry_hidden_from_hidden_user_id_fkey(id, nombre, avatar_url)")
      .eq("owner_id", currentUserId);

    if (!hiddenRows || hiddenRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const beerIds = [...new Set(hiddenRows.map((r) => r.beer_id))];
    const { data: beers } = await supabase.from("beers_new").select("id, nombre").in("id", beerIds);
    const beerNameMap = {};
    (beers || []).forEach((b) => { beerNameMap[b.id] = b.nombre; });

    const grouped = {};
    hiddenRows.forEach((r) => {
      if (!grouped[r.beer_id]) {
        grouped[r.beer_id] = { beer_id: r.beer_id, beer_nombre: beerNameMap[r.beer_id] || "?", hidden: [] };
      }
      if (r.profiles) grouped[r.beer_id].hidden.push(r.profiles);
    });

    setRows(Object.values(grouped));
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (beerId, hiddenUserId) => {
    const key = `${beerId}:${hiddenUserId}`;
    setRemoving(key);
    await supabase
      .from("entry_hidden_from")
      .delete()
      .eq("owner_id", currentUserId)
      .eq("beer_id", beerId)
      .eq("hidden_user_id", hiddenUserId);
    await load();
    setRemoving(null);
  };

  if (loading) {
    return <p style={{ color: "#5a4535", fontSize: 13, margin: 0 }}>{t("settings.privacy.hiddenEntries.loading")}</p>;
  }

  if (rows.length === 0) {
    return (
      <div style={emptyStyle}>
        <p style={{ color: "#5a4535", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          {t("settings.privacy.hiddenEntries.empty")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {rows.map((row) => (
        <div key={row.beer_id} style={rowStyle}>
          <span style={{ fontSize: 14, color: "#f0e4cc", fontWeight: 600, display: "block", marginBottom: 6 }}>
            🍺 {row.beer_nombre}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {row.hidden.map((f) => (
              <span key={f.id} style={chipStyle}>
                <Avatar avatarUrl={f.avatar_url} nombre={f.nombre} size={18} />
                {f.nombre}
                <button
                  onClick={() => handleRemove(row.beer_id, f.id)}
                  disabled={removing === `${row.beer_id}:${f.id}`}
                  style={chipRemoveBtn}
                  title={t("settings.privacy.hiddenEntries.unhide")}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const rowStyle = { padding: "10px 0", borderBottom: "1px solid #2e2215" };
const chipStyle = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "3px 6px 3px 4px", borderRadius: 20,
  background: "#2a1e0f", border: "1px solid #2e2215", fontSize: 12, color: "#9a7d62",
};
const chipRemoveBtn = {
  background: "none", border: "none", color: "#5a4535", cursor: "pointer",
  fontSize: 11, padding: 0, marginLeft: 2, lineHeight: 1,
};
const emptyStyle = { padding: "14px 16px", background: "#1c1409", borderRadius: 8, border: "1px solid #2e2215" };

export default HiddenEntriesManager;
