import React from "react";
import { useTranslation } from "react-i18next";
import { getCountryName } from "../utils/countryDisplay";
import { XIcon, SearchIcon, FlameIcon } from "@primer/octicons-react";

const RANGE_CSS = `
  .bf-thumb {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    width: 100%;
    height: 24px;
    background: transparent;
    outline: none;
    margin: 0;
    padding: 0;
    pointer-events: none;
  }
  .bf-thumb::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #d4af37;
    border: 2px solid #1c1409;
    box-shadow: 0 1px 5px rgba(0,0,0,.5);
    cursor: pointer;
    pointer-events: all;
  }
  .bf-thumb::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #d4af37;
    border: 2px solid #1c1409;
    box-shadow: 0 1px 5px rgba(0,0,0,.5);
    cursor: pointer;
    pointer-events: all;
  }
  .bf-thumb::-webkit-slider-runnable-track { background: transparent; }
  .bf-thumb::-moz-range-track { background: transparent; }
`;

const Badge = ({ label, onRemove }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 6px 3px 10px",
      borderRadius: 999,
      background: "#d4af37",
      color: "#0d0a06",
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    {label}
    <button
      onClick={onRemove}
      style={{
        background: "rgba(0,0,0,0.18)",
        border: "none",
        cursor: "pointer",
        color: "#0d0a06",
        borderRadius: "50%",
        width: 16,
        height: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        padding: 0,
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      <XIcon size={10} />
    </button>
  </span>
);

const RangeSlider = ({ low, high, onChange }) => {
  const MIN = 0;
  const MAX = 15;
  const GAP = 0.5;
  const pct = (v) => `${((v - MIN) / (MAX - MIN)) * 100}%`;
  const rightPct = (v) => `${100 - ((v - MIN) / (MAX - MIN)) * 100}%`;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ position: "relative", height: 24 }}>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            height: 4,
            background: "#2e2215",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              height: "100%",
              background: "#d4af37",
              left: pct(low),
              right: rightPct(high),
              borderRadius: 2,
            }}
          />
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={0.5}
          value={low}
          onChange={(e) =>
            onChange(Math.min(Number(e.target.value), high - GAP), high)
          }
          className="bf-thumb"
          style={{ zIndex: low > high - 2 ? 3 : 1 }}
        />

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={0.5}
          value={high}
          onChange={(e) =>
            onChange(low, Math.max(Number(e.target.value), low + GAP))
          }
          className="bf-thumb"
          style={{ zIndex: 2 }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#9a7d62",
          marginTop: 2,
          fontWeight: 600,
        }}
      >
        <span>{low === 0 ? "0%" : `${low}%`}</span>
        <span>{high === 15 ? "15%" : `${high}%`}</span>
      </div>
    </div>
  );
};

const selectStyle = {
  flex: "1 1 140px",
  minWidth: 0,
  padding: "9px 10px",
  border: "1.5px solid #2e2215",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  background: "#2a1e0f",
  color: "#f0e4cc",
  cursor: "pointer",
};

// Desplegable compacto y siempre visible — reemplaza las nubes de chips
// que vivían adentro del panel colapsable "Filtros". Solo se muestra si
// hay opciones (dinámico según el catálogo actual, mismo criterio que
// antes con estilos/países).
const SelectFilter = ({ value, onChange, options, allLabel, getLabel }) => (
  <select
    value={value ?? "all"}
    onChange={(e) => onChange(e.target.value === "all" ? null : e.target.value)}
    style={selectStyle}
  >
    <option value="all">{allLabel}</option>
    {options.map((opt) => (
      <option key={opt} value={opt}>{getLabel ? getLabel(opt) : opt}</option>
    ))}
  </select>
);

const BeerFilters = ({
  search,
  setSearch,
  styleFilter,
  setStyleFilter,
  countryFilter,
  setCountryFilter,
  familiaFilter,
  setFamiliaFilter,
  alcoholFilter,
  setAlcoholFilter,
  trendingFilter,
  setTrendingFilter,
  styles,
  countries,
  familias = [],
  showTrending = true,
}) => {
  const { t, i18n } = useTranslation();

  const [low, high] = alcoholFilter;
  const alcActive = low > 0 || high < 15;
  const hasActive = styleFilter || countryFilter || familiaFilter || alcActive || trendingFilter;

  const clearAll = () => {
    setStyleFilter(null);
    setCountryFilter(null);
    setFamiliaFilter(null);
    setAlcoholFilter([0, 15]);
    setTrendingFilter(false);
  };

  return (
    <div
      style={{
        background: "#1c1409",
        border: "1px solid #2e2215",
        borderRadius: 14,
        marginBottom: 20,
        padding: "12px 14px",
      }}
    >
      <style>{RANGE_CSS}</style>

      {/* Buscador + Trending */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 220px", position: "relative", minWidth: 0 }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#5a4535",
              pointerEvents: "none",
              display: "flex",
            }}
          >
            <SearchIcon size={15} />
          </span>
          <input
            type="text"
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 32px 10px 36px",
              border: "1.5px solid #2e2215",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              background: "#2a1e0f",
              color: "#f0e4cc",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#5a4535",
                cursor: "pointer", lineHeight: 1, display: "flex",
              }}
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        {showTrending && (
          <button
            onClick={() => setTrendingFilter(!trendingFilter)}
            title={t("filters.trendingHint")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              border: `1.5px solid ${trendingFilter ? "#d4af37" : "#2e2215"}`,
              background: trendingFilter ? "#d4af37" : "#2a1e0f",
              color: trendingFilter ? "#0d0a06" : "#9a7d62",
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            <FlameIcon size={14} /> {t("filters.trending")}
          </button>
        )}
      </div>

      {/* País / Estilo / Familia — siempre visibles, combinables entre sí */}
      {(countries.length > 0 || styles.length > 0 || familias.length > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {countries.length > 0 && (
            <SelectFilter
              value={countryFilter}
              onChange={setCountryFilter}
              options={countries}
              allLabel={t("filters.allCountries")}
              getLabel={(c) => getCountryName(c, i18n.language)}
            />
          )}
          {styles.length > 0 && (
            <SelectFilter
              value={styleFilter}
              onChange={setStyleFilter}
              options={styles}
              allLabel={t("filters.allStyles")}
            />
          )}
          {familias.length > 0 && (
            <SelectFilter
              value={familiaFilter}
              onChange={setFamiliaFilter}
              options={familias}
              allLabel={t("filters.allFamilies")}
            />
          )}
        </div>
      )}

      {/* Alcohol — slider fino, siempre visible (no se reduce bien a un select) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5a4535", flexShrink: 0 }}>
          {t("filters.alcoholLabel")}
        </span>
        <RangeSlider low={low} high={high} onChange={(l, h) => setAlcoholFilter([l, h])} />
      </div>

      {/* Chips de filtros activos + limpiar todo */}
      {hasActive && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #2e2215",
          }}
        >
          {trendingFilter && (
            <Badge label={<><FlameIcon size={12} /> {t("filters.trending")}</>} onRemove={() => setTrendingFilter(false)} />
          )}
          {countryFilter && (
            <Badge label={getCountryName(countryFilter, i18n.language)} onRemove={() => setCountryFilter(null)} />
          )}
          {styleFilter && (
            <Badge label={styleFilter} onRemove={() => setStyleFilter(null)} />
          )}
          {familiaFilter && (
            <Badge label={familiaFilter} onRemove={() => setFamiliaFilter(null)} />
          )}
          {alcActive && (
            <Badge label={`${low}–${high}% alc.`} onRemove={() => setAlcoholFilter([0, 15])} />
          )}
          <button
            onClick={clearAll}
            style={{
              background: "none",
              border: "1px solid #2e2215",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 12,
              color: "#5a4535",
              cursor: "pointer",
              fontWeight: 600,
              marginLeft: "auto",
            }}
          >
            {t("filters.clearBtn")}
          </button>
        </div>
      )}
    </div>
  );
};

export default BeerFilters;
