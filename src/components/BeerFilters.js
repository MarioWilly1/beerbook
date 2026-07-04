import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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
    border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.25);
    cursor: pointer;
    pointer-events: all;
  }
  .bf-thumb::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #d4af37;
    border: 2px solid #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,.25);
    cursor: pointer;
    pointer-events: all;
  }
  .bf-thumb::-webkit-slider-runnable-track { background: transparent; }
  .bf-thumb::-moz-range-track { background: transparent; }
`;

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: 999,
      border: `1.5px solid ${active ? "#d4af37" : "#e2e2e2"}`,
      cursor: "pointer",
      fontWeight: active ? 700 : 500,
      fontSize: 13,
      background: active ? "#fffbee" : "#f8f8f8",
      color: active ? "#8b6b2e" : "#555",
      transition: "all 0.15s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const Badge = ({ label, onRemove }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 6px 3px 10px",
      borderRadius: 999,
      background: "#d4af37",
      color: "#111",
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
        color: "#111",
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
      ✕
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
    <div>
      <div style={{ position: "relative", height: 24 }}>
        {/* Custom track */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            height: 4,
            background: "#ebebeb",
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

        {/* Low thumb */}
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

        {/* High thumb */}
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
          fontSize: 12,
          color: "#888",
          marginTop: 4,
          fontWeight: 600,
        }}
      >
        <span>{low === 0 ? "0%" : `${low}%`}</span>
        <span>{high === 15 ? "15%" : `${high}%`}</span>
      </div>
    </div>
  );
};

const sectionLabel = {
  margin: "0 0 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "#b0b0b0",
  letterSpacing: "0.8px",
};

const BeerFilters = ({
  search,
  setSearch,
  styleFilter,
  setStyleFilter,
  countryFilter,
  setCountryFilter,
  alcoholFilter,
  setAlcoholFilter,
  styles,
  countries,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [low, high] = alcoholFilter;
  const alcActive = low > 0 || high < 15;
  const activeCount = [styleFilter, countryFilter, alcActive || null].filter(
    Boolean
  ).length;

  const clearAll = () => {
    setStyleFilter(null);
    setCountryFilter(null);
    setAlcoholFilter([0, 15]);
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eaeaea",
        borderRadius: 14,
        marginBottom: 20,
      }}
    >
      <style>{RANGE_CSS}</style>

      {/* Search + filter toggle */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 14px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 15,
              color: "#c8c8c8",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px 10px 36px",
              border: "1.5px solid #ebebeb",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              background: "#fafafa",
              color: "#111",
            }}
          />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            border: `1.5px solid ${open || activeCount > 0 ? "#d4af37" : "#ebebeb"}`,
            background: open
              ? "#d4af37"
              : activeCount > 0
              ? "#fffbee"
              : "#fafafa",
            color: open ? "#111" : "#555",
            fontWeight: 600,
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          ⚙️ {t("filters.filtersBtn")}
          {activeCount > 0 && (
            <span
              style={{
                background: open ? "rgba(0,0,0,0.18)" : "#d4af37",
                color: "#111",
                borderRadius: "50%",
                width: 18,
                height: 18,
                fontSize: 11,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter badges */}
      {(styleFilter || countryFilter || alcActive) && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            padding: "0 14px 12px",
          }}
        >
          {styleFilter && (
            <Badge label={styleFilter} onRemove={() => setStyleFilter(null)} />
          )}
          {countryFilter && (
            <Badge
              label={countryFilter}
              onRemove={() => setCountryFilter(null)}
            />
          )}
          {alcActive && (
            <Badge
              label={`${low}–${high}% alc.`}
              onRemove={() => setAlcoholFilter([0, 15])}
            />
          )}
        </div>
      )}

      {/* Collapsible filter panel */}
      {open && (
        <div
          style={{
            borderTop: "1px solid #f0f0f0",
            padding: "16px 14px",
          }}
        >
          {/* Style */}
          {styles.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={sectionLabel}>{t("filters.styleSection")}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {styles.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    active={styleFilter === s}
                    onClick={() =>
                      setStyleFilter(styleFilter === s ? null : s)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Country */}
          {countries.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={sectionLabel}>{t("filters.countrySection")}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {countries.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={countryFilter === c}
                    onClick={() =>
                      setCountryFilter(countryFilter === c ? null : c)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Alcohol range slider */}
          <div style={{ marginBottom: 8 }}>
            <p style={sectionLabel}>{t("filters.alcoholSection")}</p>
            <RangeSlider
              low={low}
              high={high}
              onChange={(l, h) => setAlcoholFilter([l, h])}
            />
          </div>

          {/* Clear all */}
          {(styleFilter || countryFilter || alcActive) && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                onClick={clearAll}
                style={{
                  background: "none",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  color: "#aaa",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t("filters.clearBtn")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BeerFilters;
