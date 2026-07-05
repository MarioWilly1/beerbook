import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";

// Custom gold marker — shows beer count when > 1
function makeIcon(count) {
  const label = count > 1
    ? `<span style="font-size:12px;font-weight:800;letter-spacing:-0.5px;">${count}</span><span style="font-size:10px;">🍺</span>`
    : `<span style="font-size:16px;">🍺</span>`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;
      background:#d4af37;border:2.5px solid #0d0a06;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.55);
      cursor:pointer;user-select:none;gap:1px;
    ">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Selected marker — copper color to distinguish
function makeSelectedIcon(count) {
  const label = count > 1
    ? `<span style="font-size:12px;font-weight:800;">${count}</span><span style="font-size:10px;">🍺</span>`
    : `<span style="font-size:16px;">🍺</span>`;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;
      background:#c07a3f;border:2.5px solid #d4af37;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 12px rgba(212,175,55,0.5);
      cursor:pointer;user-select:none;gap:1px;
    ">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// ── Beer row in location list ─────────────────────────────────────────────────
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
      <img
        src={beer.foto_url} alt={beer.nombre}
        style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
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

// ── User chip in "tried by" list ──────────────────────────────────────────────
const UserChip = ({ ub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10 }}>
    {ub.profiles?.avatar_url ? (
      <img src={ub.profiles.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👤</div>
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0e4cc" }}>{ub.profiles?.nombre || "—"}</div>
      {ub.rating > 0 && (
        <div style={{ fontSize: 11, color: "#d4af37" }}>{"★".repeat(ub.rating)}{"☆".repeat(5 - ub.rating)}</div>
      )}
    </div>
    {ub.times > 1 && <div style={{ marginLeft: "auto", fontSize: 11, color: "#9a7d62", flexShrink: 0 }}>×{ub.times}</div>}
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────────────
const OriginMapPanel = ({ beers }) => {
  const { t } = useTranslation();
  const [selectedLoc, setSelectedLoc]   = useState(null);
  const [selectedBeer, setSelectedBeer] = useState(null);
  const [triedBy, setTriedBy]           = useState([]);
  const [triedLoading, setTriedLoading] = useState(false);

  // Group beers by exact origin coordinates
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

  // Load "who tried it" respecting privacy
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

  useEffect(() => { loadTriedBy(selectedBeer); }, [selectedBeer, loadTriedBy]);

  const handleMarkerClick = (loc) => {
    if (selectedLoc && selectedLoc.lat === loc.lat && selectedLoc.lng === loc.lng) {
      setSelectedLoc(null);
      setSelectedBeer(null);
    } else {
      setSelectedLoc(loc);
      setSelectedBeer(null);
    }
  };

  const handleBeerClick = (beer) => {
    setSelectedBeer((prev) => (prev?.id === beer.id ? null : beer));
  };

  const withCoords = locationGroups.length;

  return (
    <div style={{ margin: "0 0 24px", borderRadius: 14, overflow: "hidden", border: "1px solid #2e2215" }}>
      {/* Map */}
      <div style={{ position: "relative" }}>
        {withCoords === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, pointerEvents: "none" }}>
            <p style={{ background: "rgba(13,10,6,0.75)", color: "#9a7d62", padding: "8px 16px", borderRadius: 8, fontSize: 13 }}>
              {t("map.noCoords")}
            </p>
          </div>
        )}
        <MapContainer
          center={[46, 10]}
          zoom={4}
          style={{ height: 400, width: "100%", background: "#0d0a06" }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {locationGroups.map((loc) => {
            const key = `${loc.lat},${loc.lng}`;
            const isSelected = selectedLoc?.lat === loc.lat && selectedLoc?.lng === loc.lng;
            return (
              <Marker
                key={key}
                position={[loc.lat, loc.lng]}
                icon={isSelected ? makeSelectedIcon(loc.beers.length) : makeIcon(loc.beers.length)}
                eventHandlers={{ click: () => handleMarkerClick(loc) }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Stats strip */}
      <div style={{ padding: "8px 14px", background: "#1c1409", borderTop: "1px solid #2e2215", fontSize: 12, color: "#5a4535" }}>
        🍺 {t("map.beerCount", { count: beers.filter(b => b.origen_lat != null).length })} · {withCoords} {t("map.locations")}
        {selectedLoc && (
          <span style={{ color: "#8b6b2e", marginLeft: 12 }}>
            📍 {selectedLoc.pais} — {selectedLoc.beers.length === 1 ? t("map.beerCount_one", { count: 1 }) : t("map.beerCount_other", { count: selectedLoc.beers.length })}
          </span>
        )}
      </div>

      {/* Selected location: beer list */}
      {selectedLoc && (
        <div style={{ padding: "16px 14px 4px", background: "#0d0a06", borderTop: "1px solid #2e2215" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            {t("map.beersHere")}
          </p>
          {selectedLoc.beers.map((beer) => (
            <BeerRow
              key={beer.id}
              beer={beer}
              isSelected={selectedBeer?.id === beer.id}
              onClick={() => handleBeerClick(beer)}
            />
          ))}
        </div>
      )}

      {/* Selected beer: tried by */}
      {selectedBeer && (
        <div style={{ padding: "14px 14px 16px", background: "#0d0a06", borderTop: "1px solid #2e2215" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9a7d62", textTransform: "uppercase", letterSpacing: "0.4px", flex: 1 }}>
              👥 {t("map.triedByTitle")} — {selectedBeer.nombre}
            </p>
            <button onClick={() => setSelectedBeer(null)} style={{ background: "none", border: "none", color: "#5a4535", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>✕</button>
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
      )}
    </div>
  );
};

export default OriginMapPanel;
