import React, { useState } from "react";

const BeerFilters = ({
  search,
  setSearch,
  styleFilter,
  setStyleFilter,
  countryFilter,
  setCountryFilter,
  alcoholFilter,
  setAlcoholFilter,
}) => {
  const [open, setOpen] = useState(false);

  const chipStyle = (active) => ({
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    background: active ? "#d4af37" : "#fff",
    color: active ? "#111" : "#333",
    transition: "0.2s",
  });

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        background: "#fff",
        border: "1px solid #eaeaea",
        marginBottom: "20px",
      }}
    >
      {/* 🔍 SEARCH + MENU */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search beers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
            fontSize: "14px",
          }}
        />

        {/* ☰ BOTÓN FILTROS */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
            background: open ? "#d4af37" : "#fff",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "16px",
          }}
        >
          ☰
        </button>
      </div>

      {/* FILTROS DESPLEGABLES */}
      {open && (
        <div style={{ marginTop: "15px" }}>
          {/* STYLE */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>
              STYLE
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["ipa", "lager", "stout", "ale"].map((style) => (
                <button
                  key={style}
                  onClick={() =>
                    setStyleFilter(styleFilter === style ? null : style)
                  }
                  style={chipStyle(styleFilter === style)}
                >
                  {style.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* COUNTRY */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>
              COUNTRY
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["spain", "belgium", "germany"].map((country) => (
                <button
                  key={country}
                  onClick={() =>
                    setCountryFilter(countryFilter === country ? null : country)
                  }
                  style={chipStyle(countryFilter === country)}
                >
                  {country.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ALCOHOL */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>
              ALCOHOL
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { label: "≤5%", value: "low" },
                { label: "5–8%", value: "mid" },
                { label: "+8%", value: "high" },
              ].map((a) => (
                <button
                  key={a.value}
                  onClick={() =>
                    setAlcoholFilter(alcoholFilter === a.value ? null : a.value)
                  }
                  style={chipStyle(alcoholFilter === a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeerFilters;