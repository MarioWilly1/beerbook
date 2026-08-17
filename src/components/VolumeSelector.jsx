import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// Tamaños típicos de servida — guardan siempre en ml (cantidad_ml en
// beer_tastings). Opcional: si no se toca nada, `value` sigue en null y
// la cata se guarda sin volumen, como cualquier otro campo opcional de
// este formulario.
export const VOLUME_OPTIONS = [
  { key: "cana",     ml: 200,  labelKey: "volume.cana" },
  { key: "quinto",   ml: 200,  labelKey: "volume.quinto" },
  { key: "botellin", ml: 250,  labelKey: "volume.botellin" },
  { key: "tercio",   ml: 330,  labelKey: "volume.tercio" },
  { key: "lata",     ml: 330,  labelKey: "volume.lata" },
  { key: "pinta",    ml: 500,  labelKey: "volume.pinta" },
  { key: "litro",    ml: 1000, labelKey: "volume.litro" },
];

export function formatMl(ml) {
  return ml >= 1000 ? `${ml / 1000}L` : `${ml / 10}cl`;
}

// `value`/`onChange` controlan cantidad_ml (integer|null) — el resto
// (qué pill está activa, el campo libre de "Otro") es estado interno,
// derivado de `value` solo al montar, para que el padre no tenga que
// saber nada de la UI de selección.
const VolumeSelector = ({ value, onChange }) => {
  const { t } = useTranslation();
  const preset = VOLUME_OPTIONS.find((o) => o.ml === value);
  const [selectedKey, setSelectedKey] = useState(() => (preset ? preset.key : (value ? "otro" : null)));
  const [customValue, setCustomValue] = useState(() => (preset ? "" : (value || "")));

  const selectPreset = (opt) => {
    setSelectedKey(opt.key);
    setCustomValue("");
    onChange(opt.ml);
  };

  const selectOtro = () => {
    setSelectedKey("otro");
    onChange(customValue ? Number(customValue) : null);
  };

  const handleCustomChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
    setCustomValue(raw);
    setSelectedKey("otro");
    onChange(raw ? Number(raw) : null);
  };

  return (
    <div>
      <label style={labelStyle}>{t("volume.label")}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {VOLUME_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => selectPreset(opt)}
            style={{ ...pillStyle, ...(selectedKey === opt.key ? pillActiveStyle : {}) }}
          >
            {t(opt.labelKey)} · {formatMl(opt.ml)}
          </button>
        ))}
        <button
          type="button"
          onClick={selectOtro}
          style={{ ...pillStyle, ...(selectedKey === "otro" ? pillActiveStyle : {}) }}
        >
          {t("volume.otro")}
        </button>
      </div>
      {selectedKey === "otro" && (
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="5000"
          value={customValue}
          onChange={handleCustomChange}
          placeholder={t("volume.otroPlaceholder")}
          style={customInputStyle}
        />
      )}
    </div>
  );
};

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#9a7d62",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
};
const pillStyle = {
  padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
  border: "1px solid #2e2215", background: "#1c1409", color: "#9a7d62",
};
const pillActiveStyle = {
  border: "1px solid #d4af37", background: "rgba(212,175,55,0.12)", color: "#d4af37",
};
const customInputStyle = {
  width: "100%", boxSizing: "border-box", marginTop: 8, padding: "8px 12px",
  border: "1px solid #2e2215", borderRadius: 8, fontSize: 13,
  background: "#2a1e0f", color: "#f0e4cc", outline: "none",
};

export default VolumeSelector;
