import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFriends } from "../hooks/useFriends";
import { supabase } from "../services/supabase";
import Avatar from "./Avatar";

// "Ocultar esta cerveza de..." — a diferencia de HiddenStoriesManager
// (toggle inmediato por fila), acá se junta la selección con checkboxes
// + buscador y se guarda todo de una — pensado para no ser tedioso con
// muchos amigos, ya que se abre por cada entrada del cuaderno.
const HideEntryModal = ({ userId, beerId, beerNombre, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { friends, loading: friendsLoading } = useFriends();
  const [hiddenLoaded, setHiddenLoaded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch]     = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    supabase
      .from("entry_hidden_from")
      .select("hidden_user_id")
      .eq("owner_id", userId)
      .eq("beer_id", beerId)
      .then(({ data }) => {
        setSelected(new Set((data || []).map((r) => r.hidden_user_id)));
        setHiddenLoaded(true);
      });
  }, [userId, beerId]);

  const filteredFriends = useMemo(() => {
    const norm = search.trim().toLowerCase();
    if (!norm) return friends;
    return friends.filter((f) => (f.nombre || "").toLowerCase().includes(norm));
  }, [friends, search]);

  const toggle = (friendId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: currentRows } = await supabase
      .from("entry_hidden_from")
      .select("hidden_user_id")
      .eq("owner_id", userId)
      .eq("beer_id", beerId);
    const current = new Set((currentRows || []).map((r) => r.hidden_user_id));

    const toAdd    = [...selected].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !selected.has(id));

    await Promise.all([
      toAdd.length > 0
        ? supabase.from("entry_hidden_from").insert(
            toAdd.map((hidden_user_id) => ({ owner_id: userId, beer_id: beerId, hidden_user_id }))
          )
        : Promise.resolve(),
      toRemove.length > 0
        ? supabase.from("entry_hidden_from")
            .delete()
            .eq("owner_id", userId)
            .eq("beer_id", beerId)
            .in("hidden_user_id", toRemove)
        : Promise.resolve(),
    ]);

    setSaving(false);
    onSaved && onSaved(selected.size);
    onClose();
  };

  const loading = friendsLoading || !hiddenLoaded;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(5,4,3,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380, maxHeight: "75vh", display: "flex", flexDirection: "column",
          background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
          padding: "18px 16px",
        }}
      >
        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#f0e4cc" }}>
          🙈 {t("hideEntry.title")}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#9a7d62" }}>
          {t("hideEntry.subtitle", { beer: beerNombre })}
        </p>

        {loading ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("admin.loading")}</p>
        ) : friends.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>{t("hideEntry.noFriends")}</p>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("hideEntry.searchPlaceholder")}
              style={{
                width: "100%", boxSizing: "border-box", padding: "8px 12px", marginBottom: 10,
                border: "1.5px solid #2e2215", borderRadius: 10, fontSize: 13,
                outline: "none", background: "#2a1e0f", color: "#f0e4cc",
              }}
            />
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              {filteredFriends.length === 0 ? (
                <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", margin: "10px 0" }}>
                  {t("hideEntry.noResults")}
                </p>
              ) : (
                filteredFriends.map((f) => (
                  <label
                    key={f.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 8px", borderRadius: 8, cursor: "pointer",
                      background: selected.has(f.id) ? "rgba(212,175,55,0.1)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggle(f.id)}
                      style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                    />
                    <Avatar avatarUrl={f.avatar_url} nombre={f.nombre} size={28} />
                    <span style={{ fontSize: 13, color: "#f0e4cc", flex: 1 }}>{f.nombre}</span>
                  </label>
                ))
              )}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px", borderRadius: 999, border: "1px solid #2e2215",
              background: "none", color: "#9a7d62", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t("feed.report.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            style={{
              padding: "9px 18px", borderRadius: 999, border: "1px solid #d4af3788",
              background: "#d4af371e", color: "#f0e4cc", fontSize: 13, fontWeight: 700,
              cursor: loading || saving ? "default" : "pointer", opacity: loading || saving ? 0.6 : 1,
            }}
          >
            {saving ? "…" : t("hideEntry.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HideEntryModal;
