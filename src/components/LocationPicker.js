import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix webpack mangling default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl:       require("leaflet/dist/images/marker-icon.png"),
  shadowUrl:     require("leaflet/dist/images/marker-shadow.png"),
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [map, lat, lng]);
  return null;
};

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "es", "User-Agent": "BeerBook/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const parts = [];
    const place = a.amenity || a.pub || a.bar || a.restaurant || a.cafe || a.tourism || a.leisure;
    if (place) parts.push(place);
    const area = a.neighbourhood || a.suburb || a.quarter;
    if (area) parts.push(area);
    const city = a.city || a.town || a.village || a.municipality;
    if (city && city !== area) parts.push(city);
    if (parts.length === 0) {
      return data.display_name?.split(",").slice(0, 3).join(",").trim() || null;
    }
    return parts.join(", ");
  } catch {
    return null;
  }
}

const LocationPicker = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState("idle"); // idle | loading | error

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error_support");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        onChange({ lat, lng, name: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, isPublic: true });
        setStatus("idle");
      },
      (err) => {
        setStatus(err.code === 1 ? "error_denied" : "error_timeout");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleRemove = () => {
    onChange(null);
    setStatus("idle");
  };

  if (status === "loading") {
    return (
      <div style={wrapperStyle}>
        <span style={{ fontSize: 13, color: "#888" }}>⏳ {t("location.getting")}</span>
      </div>
    );
  }

  if (!value) {
    return (
      <div style={wrapperStyle}>
        <button type="button" onClick={handleGetLocation} style={addBtnStyle}>
          📍 {t("location.addBtn")}
        </button>
        {status === "error_denied" && (
          <p style={errorStyle}>{t("location.errorDenied")}</p>
        )}
        {status === "error_timeout" && (
          <p style={errorStyle}>{t("location.errorTimeout")}</p>
        )}
        {status === "error_support" && (
          <p style={errorStyle}>{t("location.errorSupport")}</p>
        )}
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        📍 {value.name}
      </div>

      <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 8, border: "1px solid #e0e0e0" }}>
        <MapContainer
          center={[value.lat, value.lng]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: 130, width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap lat={value.lat} lng={value.lng} />
          <Marker position={[value.lat, value.lng]} />
        </MapContainer>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => onChange({ ...value, isPublic: !value.isPublic })}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{
            width: 36, height: 20, borderRadius: 10,
            background: value.isPublic ? "#1e8449" : "#ccc",
            position: "relative", display: "inline-block", flexShrink: 0,
            transition: "background 0.2s",
          }}>
            <span style={{
              position: "absolute", top: 2,
              left: value.isPublic ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#fff", transition: "left 0.2s",
            }} />
          </span>
          <span style={{ fontSize: 12, color: "#555" }}>
            {value.isPublic ? t("location.visibleFeed") : t("location.privateOnly")}
          </span>
        </button>
        <button type="button" onClick={handleRemove} style={removeBtnStyle}>
          ✕ {t("location.removeBtn")}
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: "#555", display: "block", marginBottom: 4 }}>
          💶 {t("location.pricePaid")}
        </label>
        <input
          type="number"
          min="0.01"
          max="200"
          step="0.01"
          inputMode="decimal"
          value={value.price ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange({ ...value, price: raw === "" ? null : Number(raw) });
          }}
          placeholder={t("location.pricePlaceholder")}
          style={priceInputStyle}
        />
      </div>
    </div>
  );
};

const wrapperStyle  = { paddingTop: 10, borderTop: "1px solid #f0f0f0", marginTop: 4 };
const addBtnStyle   = { padding: "7px 14px", border: "1px dashed #d4af37", background: "#fffbee", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#8b6b2e", fontWeight: 600 };
const removeBtnStyle = { fontSize: 11, color: "#c0392b", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" };
const errorStyle    = { margin: "6px 0 0", fontSize: 12, color: "#c0392b" };
const priceInputStyle = {
  width: "100%", maxWidth: 140, padding: "7px 10px", borderRadius: 8,
  border: "1px solid #e0e0e0", fontSize: 13, color: "#333",
  outline: "none", boxSizing: "border-box",
};

export default LocationPicker;
