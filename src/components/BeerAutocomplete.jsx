import React, { useMemo, useState } from "react";
import { normalizeStr } from "../utils/styleCategories";

// Buscador de cerveza por nombre con dropdown de resultados — filtra
// client-side sobre la lista ya cargada por useBeers() (mismo patrón ya
// probado en Dashboard.js/BeerFilters.js, sin round-trip nuevo al server).
const BeerAutocomplete = ({ beers, onSelect, placeholder, autoFocus }) => {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return beers
      .filter((b) => normalizeStr(b.nombre).includes(normalizeStr(q)))
      .slice(0, 20);
  }, [beers, query]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={inputStyle}
      />
      {results.length > 0 && (
        <div style={dropdownStyle}>
          {results.map((b) => (
            <div
              key={b.id}
              onClick={() => { onSelect(b); setQuery(""); }}
              style={rowStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2a1e0f"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <strong>{b.nombre}</strong>
              {b.estilo && <span style={{ color: "#9a7d62", marginLeft: 8, fontSize: 12 }}>{b.estilo}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
const dropdownStyle = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, marginTop: 4,
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 10,
  maxHeight: 260, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
};
const rowStyle = {
  padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #2e2215",
  fontSize: 14, color: "#f0e4cc", transition: "background 0.1s",
};

export default BeerAutocomplete;
