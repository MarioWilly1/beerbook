import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { getCountryName } from "../utils/countryDisplay";

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

const Chip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: 999,
      border: `1.5px solid ${active ? "#d4af37" : "#2e2215"}`,
      cursor: "pointer",
      fontWeight: active ? 700 : 500,
      fontSize: 13,
      background: active ? "rgba(212,175,55,0.15)" : "#2a1e0f",
      color: active ? "#d4af37" : "#9a7d62",
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
          fontSize: 12,
          color: "#9a7d62",
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
  color: "#5a4535",
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
  trendingFilter,
  setTrendingFilter,
  styles,
  countries,
}) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const [low, high] = alcoholFilter;
  const alcActive = low > 0 || high < 15;
  const activeCount = [styleFilter, countryFilter, alcActive || null, trendingFilter || null].filter(
    Boolean
  ).length;

  const clearAll = () => {
    setStyleFilter(null);
    setCountryFilter(null);
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
              color: "#5a4535",
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
              border: "1.5px solid #2e2215",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              background: "#2a1e0f",
              color: "#f0e4cc",
            }}
          />
        </div>

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
          }}
        >
          🔥 {t("filters.trending")}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            border: `1.5px solid ${open || activeCount > 0 ? "#d4af37" : "#2e2215"}`,
            background: open ? "#d4af37" : activeCount > 0 ? "rgba(212,175,55,0.12)" : "#2a1e0f",
            color: open ? "#0d0a06" : "#9a7d62",
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
                color: "#0d0a06",
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
      {(styleFilter || countryFilter || alcActive || trendingFilter) && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            padding: "0 14px 12px",
          }}
        >
          {trendingFilter && (
            <Badge label={`🔥 ${t("filters.trending")}`} onRemove={() => setTrendingFilter(false)} />
          )}
          {styleFilter && (
            <Badge label={styleFilter} onRemove={() => setStyleFilter(null)} />
          )}
          {countryFilter && (
            <Badge
              label={getCountryName(countryFilter, i18n.language)}
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
            borderTop: "1px solid #2e2215",
            padding: "16px 14px",
          }}
        >
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

          {countries.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={sectionLabel}>{t("filters.countrySection")}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {countries.map((c) => (
                  <Chip
                    key={c}
                    label={getCountryName(c, i18n.language)}
                    active={countryFilter === c}
                    onClick={() =>
                      setCountryFilter(countryFilter === c ? null : c)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <p style={sectionLabel}>{t("filters.alcoholSection")}</p>
            <RangeSlider
              low={low}
              high={high}
              onChange={(l, h) => setAlcoholFilter([l, h])}
            />
          </div>

          {(styleFilter || countryFilter || alcActive || trendingFilter) && (
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
                  border: "1px solid #2e2215",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 13,
                  color: "#5a4535",
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
