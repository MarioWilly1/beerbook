import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../services/supabase";
import { STYLE_KEYWORDS, normalizeStr } from "../utils/styleCategories";
import { GrabberIcon, XIcon, PencilIcon, PlusIcon } from "@primer/octicons-react";

const MAX_PER_CATEGORY = 10;

// ── Fila arrastrable dentro del editor ──────────────────────────────────────
const SortableRow = ({ beer, rank, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: beer.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: 10, background: "#241a0e",
    border: "1px solid #2e2215", marginBottom: 6,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <span {...attributes} {...listeners} style={{ cursor: "grab", color: "#5a4535", display: "flex", touchAction: "none" }}>
        <GrabberIcon size={14} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#d4af37", width: 18, textAlign: "center" }}>{rank}</span>
      <img src={beer.foto_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#f0e4cc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {beer.nombre}
      </span>
      <button onClick={() => onRemove(beer.id)} style={{ background: "none", border: "none", color: "#9a7d62", cursor: "pointer", display: "flex", padding: 4 }}>
        <XIcon size={14} />
      </button>
    </div>
  );
};

// ── Modal de edición: elegir categoría, reordenar con drag & drop, agregar/quitar ──
const TopTierEditModal = ({ userId, pool, initialByCategory, categories, onClose }) => {
  const { t } = useTranslation();
  const [category, setCategory] = useState("global");
  const [byCategory, setByCategory] = useState(initialByCategory);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const currentIds = byCategory[category] || [];
  const currentBeers = currentIds.map((id) => pool.find((b) => b.id === id)).filter(Boolean);
  const availableBeers = pool
    .filter((b) => !currentIds.includes(b.id))
    .filter((b) => !search || normalizeStr(b.nombre).includes(normalizeStr(search)));

  const persist = useCallback(async (cat, ids) => {
    setSaving(true);
    const { error } = await supabase.rpc("set_top_beers", { p_category: cat, p_beer_ids: ids });
    setSaving(false);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("set_top_beers", error);
    }
  }, []);

  const updateCategory = (cat, ids) => {
    setByCategory((prev) => ({ ...prev, [cat]: ids }));
    persist(cat, ids);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentIds.indexOf(active.id);
    const newIndex = currentIds.indexOf(over.id);
    updateCategory(category, arrayMove(currentIds, oldIndex, newIndex));
  };

  const handleAdd = (beerId) => {
    if (currentIds.length >= MAX_PER_CATEGORY) return;
    updateCategory(category, [...currentIds, beerId]);
  };

  const handleRemove = (beerId) => {
    updateCategory(category, currentIds.filter((id) => id !== beerId));
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
          background: "#150f08", borderRadius: "18px 18px 0 0", border: "1px solid #2e2215",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#f0e4cc" }}>{t("topTier.editTitle")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a7d62", cursor: "pointer", display: "flex" }}>
            <XIcon size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: cat === category ? "1px solid #d4af37" : "1px solid #2e2215",
                background: cat === category ? "rgba(212,175,55,0.12)" : "transparent",
                color: cat === category ? "#d4af37" : "#9a7d62", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {cat === "global" ? t("topTier.categoryGlobal") : cat}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "#5a4535", margin: "0 0 10px" }}>
          {t("topTier.editHint", { max: MAX_PER_CATEGORY })}
        </p>

        {currentBeers.length === 0 ? (
          <p style={{ fontSize: 13, color: "#5a4535", margin: "0 0 16px" }}>{t("topTier.emptyCategory")}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={currentIds} strategy={verticalListSortingStrategy}>
              <div style={{ marginBottom: 16 }}>
                {currentBeers.map((beer, i) => (
                  <SortableRow key={beer.id} beer={beer} rank={i + 1} onRemove={handleRemove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {currentIds.length < MAX_PER_CATEGORY && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("topTier.searchPlaceholder")}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #2e2215",
                background: "#1c1409", color: "#f0e4cc", fontSize: 13, marginBottom: 8, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
              {availableBeers.map((beer) => (
                <button
                  key={beer.id}
                  onClick={() => handleAdd(beer.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8,
                    background: "transparent", border: "1px solid transparent", cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#241a0e")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <img src={beer.foto_url} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#f0e4cc", flex: 1 }}>{beer.nombre}</span>
                  <PlusIcon size={14} />
                </button>
              ))}
              {availableBeers.length === 0 && (
                <p style={{ fontSize: 12, color: "#5a4535", margin: "4px 0" }}>{t("topTier.noMoreBeers")}</p>
              )}
            </div>
          </>
        )}

        {saving && <p style={{ fontSize: 11, color: "#5a4535", marginTop: 10 }}>{t("topTier.saving")}</p>}
      </div>
    </div>
  );
};

// ── Sección de solo lectura mostrada en el perfil ───────────────────────────
const TopTierSection = ({ userId, isSelf }) => {
  const { t } = useTranslation();
  const [byCategory, setByCategory] = useState({});
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_user_top_beers", { p_user_id: userId });
    const grouped = {};
    (data || []).forEach((row) => {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    });
    setByCategory(grouped);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSelf) return;
    const loadPool = async () => {
      const { data } = await supabase
        .from("user_beers")
        .select("beers_new (id, nombre, foto_url, estilo)")
        .eq("user_id", userId);
      setPool((data || []).map((r) => r.beers_new).filter(Boolean));
    };
    loadPool();
  }, [userId, isSelf]);

  const hasAnyTop = Object.keys(byCategory).length > 0;
  if (loading) return null;
  if (!hasAnyTop && !isSelf) return null;

  const categories = ["global", ...STYLE_KEYWORDS.filter((kw) =>
    pool.some((b) => normalizeStr(b.estilo).includes(normalizeStr(kw)))
  )];

  const initialByCategory = {};
  categories.forEach((cat) => {
    initialByCategory[cat] = (byCategory[cat] || []).map((r) => r.beer_id);
  });

  return (
    <div style={{ background: "#1c1409", borderRadius: 14, border: "1px solid #2e2215", padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#5a4535", textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {t("topTier.label")}
        </p>
        {isSelf && (
          <button
            onClick={() => setEditing(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #2e2215", borderRadius: 8, padding: "4px 10px", color: "#9a7d62", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            <PencilIcon size={12} /> {t("topTier.edit")}
          </button>
        )}
      </div>

      {!hasAnyTop ? (
        <p style={{ fontSize: 13, color: "#5a4535", margin: 0 }}>{t("topTier.emptyOwn")}</p>
      ) : (
        Object.entries(byCategory)
          .sort(([a], [b]) => (a === "global" ? -1 : b === "global" ? 1 : a.localeCompare(b)))
          .map(([cat, rows]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#d4af37", margin: "0 0 8px" }}>
                {cat === "global" ? t("topTier.categoryGlobal") : cat}
              </p>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {rows.map((row, i) => (
                  <div key={row.beer_id} style={{ flexShrink: 0, width: 72, textAlign: "center" }}>
                    <div style={{ position: "relative" }}>
                      <img src={row.foto_url} alt={row.nombre} title={row.nombre} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: "1px solid #2e2215" }} />
                      <span style={{
                        position: "absolute", top: -6, left: -6, width: 20, height: 20, borderRadius: "50%",
                        background: "#d4af37", color: "#0d0a06", fontSize: 11, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {i + 1}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: "#9a7d62", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.nombre}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      {editing && (
        <TopTierEditModal
          userId={userId}
          pool={pool}
          initialByCategory={initialByCategory}
          categories={categories}
          onClose={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
};

export default TopTierSection;
