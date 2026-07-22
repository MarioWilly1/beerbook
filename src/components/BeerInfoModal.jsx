import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import { getCountryName, resolveSupportedLocale } from "../utils/countryDisplay";

// Descripción según el idioma activo, con fallback a español si la
// traducción automática (MyMemory, ver utils/translate.js) no existe o
// falló al cargar/editar la cerveza — nunca queda vacío mientras haya
// texto en español.
function descriptionFor(beer, locale) {
  const lang = resolveSupportedLocale(locale);
  if (lang === "en") return beer.info_detallada_en || beer.info_detallada;
  if (lang === "de") return beer.info_detallada_de || beer.info_detallada;
  return beer.info_detallada;
}

const BeerInfoModal = ({ beer, onClose, onVerMapa }) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={titleStyle}>{beer.nombre}</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span style={tagStyle}>{beer.estilo}</span>
              <span style={tagStyle}>{getCountryName(beer.pais, i18n.language)}</span>
              {beer.alcohol && (
                <span style={{ ...tagStyle, color: "#c07a3f", borderColor: "rgba(192,122,63,0.4)" }}>
                  {beer.alcohol}% ABV
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Cerrar">✕</button>
        </div>

        <div style={dividerStyle} />

        {/* Etiqueta sección */}
        <p style={sectionLabelStyle}>{t("beerInfo.sectionLabel")}</p>

        {/* Descripción */}
        <p style={bodyStyle}>
          {descriptionFor(beer, i18n.language) || t("beerInfo.unavailable")}
        </p>

        {onVerMapa && beer.origen_lat != null && (
          <>
            <div style={dividerStyle} />
            <button
              onClick={() => { onClose(); onVerMapa(); }}
              style={mapBtnStyle}
            >
              🗺️ Ver en el mapa de origen
            </button>
          </>
        )}

      </div>
    </div>,
    document.body
  );
};

const overlayStyle = {
  position:        "fixed",
  inset:           0,
  background:      "rgba(0,0,0,0.72)",
  zIndex:          9998,
  display:         "flex",
  alignItems:      "center",
  justifyContent:  "center",
  padding:         "16px",
};

const panelStyle = {
  background:   "#1c1409",
  border:       "1px solid #2e2215",
  borderRadius: 16,
  padding:      "22px 20px 24px",
  width:        "100%",
  maxWidth:     460,
  maxHeight:    "80dvh",
  overflowY:    "auto",
  boxShadow:    "0 8px 40px rgba(0,0,0,0.6)",
};

const titleStyle = {
  margin:     0,
  fontSize:   17,
  fontWeight: 700,
  color:      "#f0e4cc",
  fontFamily: "'Playfair Display', serif",
  lineHeight: 1.3,
};

const tagStyle = {
  fontSize:    11,
  fontWeight:  600,
  color:       "#d4af37",
  background:  "rgba(212,175,55,0.1)",
  border:      "1px solid rgba(212,175,55,0.25)",
  borderRadius: 20,
  padding:     "2px 10px",
  whiteSpace:  "nowrap",
};

const closeBtnStyle = {
  background:   "none",
  border:       "none",
  color:        "rgba(240,228,204,0.5)",
  fontSize:     18,
  cursor:       "pointer",
  padding:      "2px 4px",
  lineHeight:   1,
  flexShrink:   0,
};

const dividerStyle = {
  borderTop: "1px solid #2e2215",
  margin:    "16px 0 12px",
};

const sectionLabelStyle = {
  margin:         "0 0 10px",
  fontSize:       10,
  fontWeight:     700,
  color:          "#8b6b2e",
  textTransform:  "uppercase",
  letterSpacing:  "0.8px",
};

const bodyStyle = {
  margin:     0,
  fontSize:   14,
  color:      "#d4c4a8",
  lineHeight: 1.7,
};

const mapBtnStyle = {
  display:      "flex",
  alignItems:   "center",
  gap:          6,
  padding:      "9px 14px",
  background:   "rgba(212,175,55,0.08)",
  border:       "1px solid rgba(212,175,55,0.25)",
  borderRadius: 10,
  color:        "#d4af37",
  fontSize:     13,
  fontWeight:   600,
  cursor:       "pointer",
  width:        "100%",
  marginTop:    4,
};

export default BeerInfoModal;
