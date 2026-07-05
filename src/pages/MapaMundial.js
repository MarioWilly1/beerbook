import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useTranslation } from "react-i18next";
import { useBeers } from "../hooks/useBeers";
import { supabase } from "../services/supabase";
import { paisToIso, ISO_TO_ID, ISO_DISPLAY } from "../utils/paisToIso";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Reverse lookup: worldAtlas numeric id → ISO alpha-2
const ID_TO_ISO = Object.fromEntries(Object.entries(ISO_TO_ID).map(([k, v]) => [v, k]));

// ── Sub-component: Beer row in country panel ───────────────────────────────────
const BeerRow = ({ beer, isSelected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
      borderRadius: 10, cursor: "pointer", marginBottom: 6,
      background: isSelected ? "#2a1e0f" : "transparent",
      border: `1px solid ${isSelected ? "#d4af37" : "#2e2215"}`,
      transition: "all 0.15s",
    }}
  >
    {beer.foto_url ? (
      <img
        src={beer.foto_url} alt={beer.nombre}
        style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    ) : (
      <div style={{ width: 40, height: 40, borderRadius: 6, background: "#2a1e0f", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
        🍺
      </div>
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#f0e4cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {beer.nombre}
      </div>
      <div style={{ fontSize: 11, color: "#9a7d62", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {beer.estilo}
      </div>
    </div>
    <div style={{ marginLeft: "auto", flexShrink: 0, fontSize: 11, color: "#5a4535" }}>👥</div>
  </div>
);

// ── Sub-component: Avatar chip in "tried by" list ─────────────────────────────
const UserChip = ({ ub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10 }}>
    {ub.profiles?.avatar_url ? (
      <img src={ub.profiles.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
    )}
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0e4cc" }}>{ub.profiles?.nombre || "—"}</div>
      {ub.rating > 0 && (
        <div style={{ fontSize: 11, color: "#d4af37" }}>{"★".repeat(ub.rating)}{"☆".repeat(5 - ub.rating)}</div>
      )}
    </div>
    {ub.times > 1 && (
      <div style={{ marginLeft: "auto", fontSize: 11, color: "#9a7d62" }}>×{ub.times}</div>
    )}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────
const MapaMundial = () => {
  const { t } = useTranslation();
  const { beers, loading } = useBeers();

  const [zoom, setZoom]         = useState(1);
  const [center, setCenter]     = useState([10, 20]);
  const [selectedIso, setSelectedIso] = useState(null);
  const [selectedBeer, setSelectedBeer] = useState(null);
  const [triedBy, setTriedBy]   = useState([]);
  const [triedLoading, setTriedLoading] = useState(false);

  // Group catalog beers by ISO code
  const beersByIso = useMemo(() => {
    const map = {};
    for (const beer of beers) {
      const iso = paisToIso(beer.pais);
      if (!iso) continue;
      if (!map[iso]) map[iso] = [];
      map[iso].push(beer);
    }
    return map;
  }, [beers]);

  // Set of numeric world-atlas IDs that have beers
  const highlightedIds = useMemo(
    () => new Set(Object.keys(beersByIso).map((iso) => ISO_TO_ID[iso]).filter(Boolean)),
    [beersByIso]
  );

  const countryBeers = selectedIso ? (beersByIso[selectedIso] || []) : [];

  // Load "who tried this beer" respecting privacy
  const loadTriedBy = useCallback(async (beer) => {
    if (!beer) { setTriedBy([]); return; }
    setTriedLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: ubData }, { data: friendsData }] = await Promise.all([
      supabase
        .from("user_beers")
        .select("user_id, rating, times, profiles(nombre, avatar_url, perfil_publico)")
        .eq("beer_id", beer.id),
      user
        ? supabase.from("friendships").select("friend_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

    const friendIds = new Set((friendsData || []).map((f) => f.friend_id));
    const visible = (ubData || []).filter(
      (ub) => ub.profiles?.perfil_publico || (user && friendIds.has(ub.user_id))
    );
    setTriedBy(visible);
    setTriedLoading(false);
  }, []);

  useEffect(() => {
    loadTriedBy(selectedBeer);
  }, [selectedBeer, loadTriedBy]);

  const handleGeoClick = (geo) => {
    const iso = ID_TO_ISO[String(geo.id)];
    if (!iso || !highlightedIds.has(String(geo.id))) return;
    setSelectedBeer(null);
    setSelectedIso((prev) => (prev === iso ? null : iso));
  };

  const handleBeerClick = (beer) => {
    setSelectedBeer((prev) => (prev?.id === beer.id ? null : beer));
  };

  const handleZoom = (delta) => setZoom((z) => Math.min(8, Math.max(1, z + delta)));
  const handleReset = () => { setZoom(1); setCenter([10, 20]); };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const wrapStyle = {
    margin: "-28px", height: "calc(100vh - 60px)",
    position: "relative", overflow: "hidden", background: "#0d0a06",
    display: "flex",
  };
  const mapAreaStyle = {
    flex: 1, position: "relative",
  };
  const panelStyle = {
    width: 320, flexShrink: 0,
    background: "#0d0a06", borderLeft: "1px solid #2e2215",
    display: "flex", flexDirection: "column",
    overflowY: "auto",
  };
  const panelHeaderStyle = {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #2e2215",
    position: "sticky", top: 0, background: "#0d0a06", zIndex: 1,
  };
  const triedPanelStyle = {
    position: "absolute", inset: 0, background: "rgba(13,10,6,0.96)",
    zIndex: 10, display: "flex", flexDirection: "column", overflowY: "auto", padding: 20,
  };
  const zoomBtnBase = {
    width: 34, height: 34, borderRadius: 6,
    background: "#1c1409", border: "1px solid #2e2215",
    color: "#d4af37", fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1,
  };

  if (loading) {
    return (
      <div style={{ ...wrapStyle, alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#9a7d62" }}>{t("dashboard.loading")}</p>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {/* ── Map area ── */}
      <div style={mapAreaStyle}>
        {/* Zoom controls */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 5, display: "flex", flexDirection: "column", gap: 4 }}>
          <button style={zoomBtnBase} onClick={() => handleZoom(0.5)}>+</button>
          <button style={zoomBtnBase} onClick={() => handleZoom(-0.5)}>−</button>
          <button style={{ ...zoomBtnBase, fontSize: 12, color: "#9a7d62" }} onClick={handleReset} title={t("map.resetZoom")}>⌂</button>
        </div>

        {/* Hint when nothing selected */}
        {!selectedIso && (
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(28,20,9,0.85)", border: "1px solid #2e2215",
            borderRadius: 20, padding: "6px 16px", color: "#9a7d62", fontSize: 13, pointerEvents: "none",
            whiteSpace: "nowrap", zIndex: 5,
          }}>
            {t("map.hint")}
          </div>
        )}

        <ComposableMap
          projectionConfig={{ scale: 140, center: [10, 20] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates); setZoom(z); }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const id = String(geo.id);
                  const iso = ID_TO_ISO[id];
                  const isHighlighted = highlightedIds.has(id);
                  const isSelected = iso === selectedIso;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleGeoClick(geo)}
                      style={{
                        default: {
                          fill: isSelected ? "#c07a3f" : isHighlighted ? "#d4af37" : "#1c1409",
                          stroke: "#0d0a06",
                          strokeWidth: 0.4,
                          outline: "none",
                          cursor: isHighlighted ? "pointer" : "default",
                        },
                        hover: {
                          fill: isSelected ? "#c07a3f" : isHighlighted ? "#e8c84a" : "#2a1e0f",
                          stroke: "#0d0a06",
                          strokeWidth: 0.4,
                          outline: "none",
                          cursor: isHighlighted ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* ── Country side panel ── */}
      {selectedIso && (
        <div style={panelStyle}>
          {/* Panel header */}
          <div style={panelHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, flex: 1, fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#f0e4cc" }}>
                {ISO_DISPLAY[selectedIso] || selectedIso}
              </h2>
              <button
                onClick={() => { setSelectedIso(null); setSelectedBeer(null); }}
                style={{ background: "none", border: "none", color: "#5a4535", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
              >✕</button>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9a7d62" }}>
              {t("map.beerCount", { count: countryBeers.length })}
            </p>
          </div>

          {/* Beer list */}
          <div style={{ flex: 1, padding: "12px 12px", position: "relative" }}>
            {countryBeers.length === 0 ? (
              <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                {t("map.noBeers")}
              </p>
            ) : (
              countryBeers.map((beer) => (
                <BeerRow
                  key={beer.id}
                  beer={beer}
                  isSelected={selectedBeer?.id === beer.id}
                  onClick={() => handleBeerClick(beer)}
                />
              ))
            )}

            {/* "Tried by" overlay */}
            {selectedBeer && (
              <div style={triedPanelStyle}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
                  {selectedBeer.foto_url && (
                    <img
                      src={selectedBeer.foto_url} alt=""
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#f0e4cc", marginBottom: 2 }}>{selectedBeer.nombre}</div>
                    <div style={{ fontSize: 12, color: "#9a7d62" }}>{selectedBeer.estilo}</div>
                  </div>
                  <button
                    onClick={() => setSelectedBeer(null)}
                    style={{ background: "none", border: "none", color: "#5a4535", fontSize: 20, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
                  >✕</button>
                </div>

                <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {t("map.triedByTitle")}
                </p>

                {triedLoading ? (
                  <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("map.triedByLoading")}</p>
                ) : triedBy.length === 0 ? (
                  <p style={{ color: "#5a4535", fontSize: 13 }}>{t("map.triedByEmpty")}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {triedBy.map((ub) => (
                      <UserChip key={ub.user_id} ub={ub} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaMundial;
