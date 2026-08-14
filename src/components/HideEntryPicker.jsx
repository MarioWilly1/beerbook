import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMyBeers } from "../hooks/useMyBeers";

// Selector de cerveza para arrancar el flujo "Ocultar de..." desde
// Configuración > Privacidad — antes solo se podía abrir por cada tarjeta
// de Mi Cuaderno (ver punto movido a HideEntryModal.jsx, que sigue
// intacto: acá solo se elige DE QUÉ cerveza, después se delega en él).
const HideEntryPicker = ({ onPick, onClose }) => {
  const { t } = useTranslation();
  const { beers, loading } = useMyBeers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const norm = search.trim().toLowerCase();
    if (!norm) return beers;
    return beers.filter((b) => (b.nombre || "").toLowerCase().includes(norm));
  }, [beers, search]);

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#f0e4cc" }}>
          🙈 {t("hideEntry.pickBeerTitle")}
        </p>

        {loading ? (
          <p style={{ color: "#9a7d62", fontSize: 13 }}>{t("admin.loading")}</p>
        ) : beers.length === 0 ? (
          <p style={{ color: "#5a4535", fontSize: 13 }}>{t("hideEntry.noBeers")}</p>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("hideEntry.searchBeerPlaceholder")}
              style={inputStyle}
            />
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              {filtered.length === 0 ? (
                <p style={{ color: "#5a4535", fontSize: 13, textAlign: "center", margin: "10px 0" }}>
                  {t("hideEntry.noResults")}
                </p>
              ) : (
                filtered.map((b) => (
                  <button key={b.id} onClick={() => onPick(b)} style={rowBtnStyle}>
                    {b.nombre}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>
            {t("feed.report.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: "fixed", inset: 0, zIndex: 2000,
  background: "rgba(5,4,3,0.82)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 20,
};
const panelStyle = {
  width: "100%", maxWidth: 380, maxHeight: "75vh", display: "flex", flexDirection: "column",
  background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
  padding: "18px 16px",
};
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "8px 12px", marginBottom: 10,
  border: "1.5px solid #2e2215", borderRadius: 10, fontSize: 13,
  outline: "none", background: "#2a1e0f", color: "#f0e4cc",
};
const rowBtnStyle = {
  display: "block", width: "100%", textAlign: "left",
  padding: "9px 10px", borderRadius: 8, cursor: "pointer",
  background: "transparent", border: "none", color: "#f0e4cc", fontSize: 13,
};
const cancelBtnStyle = {
  padding: "9px 18px", borderRadius: 999, border: "1px solid #2e2215",
  background: "none", color: "#9a7d62", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

export default HideEntryPicker;
