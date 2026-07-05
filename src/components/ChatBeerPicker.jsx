import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMyBeers } from "../hooks/useMyBeers";

const ChatBeerPicker = ({ onSelect, onClose }) => {
  const { t } = useTranslation();
  const { beers, loading } = useMyBeers();
  const [search, setSearch] = useState("");

  const filtered = beers.filter((b) => {
    const q = search.toLowerCase();
    return b.nombre?.toLowerCase().includes(q) || b.estilo?.toLowerCase().includes(q);
  });

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "#f0e4cc", fontSize: 16, fontFamily: "'Playfair Display', serif" }}>
            🍺 {t("chat.shareBeer")}
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("chat.searchBeer")}
          style={searchStyle}
          autoFocus
        />

        <div style={{ overflowY: "auto", maxHeight: 340, marginTop: 8 }}>
          {loading ? (
            <p style={{ color: "#9a7d62", textAlign: "center", padding: 20, margin: 0 }}>
              {t("chat.loading")}
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#5a4535", textAlign: "center", padding: 20, margin: 0, fontSize: 13 }}>
              {t("chat.noBeerResults")}
            </p>
          ) : (
            filtered.map((beer) => (
              <div key={beer.id} style={beerRowStyle} onClick={() => onSelect(beer)}>
                {(beer.user_photo_url || beer.foto_url) ? (
                  <img
                    src={beer.user_photo_url || beer.foto_url}
                    alt=""
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: "#2a1e0f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                    🍺
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#f0e4cc", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {beer.nombre}
                  </div>
                  {(beer.estilo || beer.pais) && (
                    <div style={{ fontSize: 11, color: "#9a7d62", marginTop: 2 }}>
                      {[beer.estilo, beer.pais].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "flex-end", justifyContent: "center",
  zIndex: 9999, padding: "0 0 0 0",
};
const modalStyle = {
  background: "#1c1409", border: "1px solid #2e2215",
  borderRadius: "16px 16px 0 0",
  padding: "20px 20px 28px",
  width: "100%", maxWidth: 540,
  maxHeight: "70dvh", display: "flex", flexDirection: "column",
  boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
};
const closeBtnStyle = {
  background: "none", border: "none", fontSize: 18,
  cursor: "pointer", color: "#5a4535", lineHeight: 1, padding: "2px 6px",
};
const searchStyle = {
  width: "100%", padding: "9px 14px",
  background: "#0d0a06", color: "#f0e4cc",
  border: "1px solid #2e2215", borderRadius: 20,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const beerRowStyle = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "10px 4px",
  borderBottom: "1px solid #2e2215",
  cursor: "pointer",
  borderRadius: 8,
  transition: "background 0.12s",
};

export default ChatBeerPicker;
