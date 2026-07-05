import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

// ── Marker icons ───────────────────────────────────────────────────────────────
function makeIcon(count, selected = false) {
  const size   = selected ? 36 : 32;
  const bg     = selected ? "#c07a3f" : "#d4af37";
  const border = selected ? "2.5px solid #d4af37" : "2.5px solid #0d0a06";
  const shadow = selected
    ? "0 3px 12px rgba(212,175,55,0.55)"
    : "0 2px 8px rgba(0,0,0,0.5)";
  const label  = count > 1
    ? `<span style="font-size:11px;font-weight:800;">${count}</span><span style="font-size:10px;">🍺</span>`
    : `<span style="font-size:15px;">🍺</span>`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};border:${border};border-radius:50%;
      display:flex;align-items:center;justify-content:center;gap:1px;
      box-shadow:${shadow};cursor:pointer;user-select:none;
    ">${label}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const BeerRow = ({ beer, isSelected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 10, cursor: "pointer",
      border: `1px solid ${isSelected ? "#d4af37" : "#2e2215"}`,
      background: isSelected ? "#2a1e0f" : "#1c1409",
      transition: "all 0.15s", marginBottom: 6,
    }}
  >
    {beer.foto_url ? (
      <img src={beer.foto_url} alt={beer.nombre}
        style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
      <div style={{ width: 38, height: 38, borderRadius: 6, background: "#2a1e0f", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍺</div>
    )}
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#f0e4cc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{beer.nombre}</div>
      <div style={{ fontSize: 11, color: "#9a7d62", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{beer.estilo}</div>
    </div>
    <div style={{ fontSize: 11, color: "#5a4535", flexShrink: 0 }}>👥</div>
  </div>
);

const UserChip = ({ ub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10 }}>
    {ub.profiles?.avatar_url ? (
      <img src={ub.profiles.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👤</div>
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0e4cc" }}>{ub.profiles?.nombre || "—"}</div>
      {ub.Rating > 0 && (
        <div style={{ fontSize: 11, color: "#d4af37" }}>{"★".repeat(ub.Rating)}{"☆".repeat(5 - ub.Rating)}</div>
      )}
    </div>
    {ub.times > 1 && <div style={{ marginLeft: "auto", fontSize: 11, color: "#9a7d62", flexShrink: 0 }}>×{ub.times}</div>}
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────────────
const OriginMapPanel = ({ beers }) => {
  const { t } = useTranslation();
  const [expanded,    setExpanded]    = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [selectedBeer, setSelectedBeer] = useState(null);
  const [triedBy,     setTriedBy]     = useState([]);
  const [triedLoading, setTriedLoading] = useState(false);

  // Group beers by exact origin coordinate pair
  const locationGroups = useMemo(() => {
    const groups = {};
    for (const beer of beers) {
      if (beer.origen_lat == null || beer.origen_lng == null) continue;
      const key = `${beer.origen_lat},${beer.origen_lng}`;
      if (!groups[key]) groups[key] = { lat: beer.origen_lat, lng: beer.origen_lng, beers: [], pais: beer.pais };
      groups[key].beers.push(beer);
    }
    return Object.values(groups);
  }, [beers]);

  const loadTriedBy = useCallback(async (beer) => {
    if (!beer) { setTriedBy([]); return; }
    setTriedLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: ubData }, { data: friendsData }] = await Promise.all([
      supabase
        .from("user_beers")
        .select(`user_id, "Rating", times, profiles(nombre, avatar_url, perfil_publico)`)
        .eq("beer_id", beer.id),
      user
        ? supabase.from("friendships").select("friend_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    const friendIds = new Set((friendsData || []).map((f) => f.friend_id));
    setTriedBy(
      (ubData || []).filter(
        (ub) => ub.profiles?.perfil_publico || (user && friendIds.has(ub.user_id))
      )
    );
    setTriedLoading(false);
  }, []);

  useEffect(() => { loadTriedBy(selectedBeer); }, [selectedBeer, loadTriedBy]);

  const handleMarkerClick = (loc) => {
    const same = selectedLoc?.lat === loc.lat && selectedLoc?.lng === loc.lng;
    setSelectedLoc(same ? null : loc);
    setSelectedBeer(null);
  };

  const handleBeerClick = (beer) => {
    setSelectedBeer((prev) => (prev?.id === beer.id ? null : beer));
  };

  const withCoords    = beers.filter((b) => b.origen_lat != null).length;
  const locCount      = locationGroups.length;
  const statsText     = `🍺 ${withCoords} ${t("map.beerCount_other", { count: withCoords }).replace(/^\d+ /, "")} · ${locCount} ${t("map.locations")}`;
  const selectedLabel = selectedLoc
    ? ` · 📍 ${selectedLoc.pais} (${selectedLoc.beers.length === 1 ? "1 cerveza" : `${selectedLoc.beers.length} cervezas`})`
    : "";

  // ── Shared marker layer ────────────────────────────────────────────────────
  const markers = locationGroups.map((loc) => {
    const isSelected = selectedLoc?.lat === loc.lat && selectedLoc?.lng === loc.lng;
    return (
      <Marker
        key={`${loc.lat},${loc.lng}`}
        position={[loc.lat, loc.lng]}
        icon={makeIcon(loc.beers.length, isSelected)}
        eventHandlers={{ click: () => handleMarkerClick(loc) }}
      />
    );
  });

  // ── Info panels (reused in both inline and fullscreen) ─────────────────────
  const beerListPanel = selectedLoc && (
    <div style={{ padding: "14px 14px 4px" }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {t("map.beersHere")}
      </p>
      {selectedLoc.beers.map((beer) => (
        <BeerRow key={beer.id} beer={beer}
          isSelected={selectedBeer?.id === beer.id}
          onClick={() => handleBeerClick(beer)} />
      ))}
    </div>
  );

  const triedByPanel = selectedBeer && (
    <div style={{ padding: "14px 14px 16px", borderTop: "1px solid #2e2215" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px", flex: 1 }}>
          👥 {t("map.triedByTitle")} — {selectedBeer.nombre}
        </p>
        <button onClick={() => setSelectedBeer(null)}
          style={{ background: "none", border: "none", color: "#5a4535", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
      {triedLoading ? (
        <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("map.triedByLoading")}</p>
      ) : triedBy.length === 0 ? (
        <p style={{ color: "#5a4535", fontSize: 13 }}>{t("map.triedByEmpty")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {triedBy.map((ub) => <UserChip key={ub.user_id} ub={ub} />)}
        </div>
      )}
    </div>
  );

  const statsStrip = (
    <div style={{ padding: "7px 14px", background: "#1c1409", fontSize: 12, color: "#5a4535", borderTop: "1px solid #2e2215", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span>{statsText}{selectedLabel}</span>
      <button
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? t("map.collapse") : t("map.expand")}
        style={{ background: "none", border: "1px solid #2e2215", borderRadius: 6, color: "#8b6b2e", fontSize: 14, cursor: "pointer", padding: "2px 8px", lineHeight: 1.4 }}
      >
        {expanded ? "⊡" : "⛶"}
      </button>
    </div>
  );

  // ── Fullscreen modal ───────────────────────────────────────────────────────
  if (expanded) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0d0a06", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #2e2215", background: "#1c1409", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: "#f0e4cc", flex: 1 }}>
            🗺️ {t("dashboard.mapBtn")}
          </span>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: "none", border: "1px solid #2e2215", borderRadius: 6, color: "#9a7d62", fontSize: 13, cursor: "pointer", padding: "4px 10px" }}
          >
            {t("map.collapse")} ✕
          </button>
        </div>

        {/* Two-column layout: map left, panels right */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Map */}
          <div style={{ flex: 1 }}>
            <MapContainer center={[46, 10]} zoom={4}
              style={{ height: "100%", width: "100%", background: "#0d0a06" }}
              scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              {markers}
            </MapContainer>
          </div>

          {/* Right panel */}
          <div style={{ width: 340, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid #2e2215", background: "#0d0a06" }}>
            {!selectedLoc ? (
              <p style={{ color: "#5a4535", fontSize: 13, padding: 20, textAlign: "center" }}>
                {t("map.hint")}
              </p>
            ) : (
              <>
                {beerListPanel}
                {triedByPanel}
              </>
            )}
          </div>
        </div>

        {/* Stats footer */}
        <div style={{ padding: "7px 14px", background: "#1c1409", fontSize: 12, color: "#5a4535", borderTop: "1px solid #2e2215" }}>
          {statsText}{selectedLabel}
        </div>
      </div>
    );
  }

  // ── Inline panel ───────────────────────────────────────────────────────────
  return (
    <div style={{ margin: "0 0 24px", borderRadius: 14, overflow: "hidden", border: "1px solid #2e2215" }}>
      <MapContainer center={[46, 10]} zoom={4}
        style={{ height: 400, width: "100%", background: "#0d0a06" }}
        scrollWheelZoom>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        {markers}
      </MapContainer>

      {statsStrip}

      {selectedLoc && (
        <div style={{ background: "#0d0a06", borderTop: "1px solid #2e2215" }}>
          {beerListPanel}
          {triedByPanel}
        </div>
      )}
    </div>
  );
};

export default OriginMapPanel;
