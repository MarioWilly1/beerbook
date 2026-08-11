import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";
import BeerFilters from "../components/BeerFilters";
import { useUserStats } from "../hooks/useUserStats";
import OriginMapPanel from "../components/OriginMapPanel";
import { useIsMobile } from "../hooks/useIsMobile";
import { useTrendingBeers } from "../hooks/useTrendingBeers";
import ChallengesBellButton from "../components/ChallengesBellButton";
import NativePullToRefresh from "../components/NativePullToRefresh";
import BarcodeScanner from "../components/BarcodeScanner";
import SuggestBeerModal from "../components/SuggestBeerModal";
import { GlobeIcon, ChevronUpIcon, ChevronDownIcon, DeviceCameraIcon } from "@primer/octicons-react";
import { STYLE_KEYWORDS, normalizeStr } from "../utils/styleCategories";
import { toastInfo } from "../utils/toast";

// ── Modal: código de barras no encontrado ───────────────────────────────────
const BarcodeNotFoundModal = ({ onClose, onSuggest, t }) => {
  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  };
  const modalStyle = {
    background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
    padding: 28, width: "100%", maxWidth: 380, textAlign: "center",
  };
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 34, margin: "0 0 10px" }}>🔍</p>
        <p style={{ color: "#f0e4cc", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
          {t("barcode.notFoundTitle")}
        </p>
        <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 22px", lineHeight: 1.5 }}>
          {t("barcode.notFoundBody")}
        </p>
        <button onClick={onSuggest} style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: "#d4af37", color: "#0d0a06", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
          {t("barcode.suggestBtn")}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #2e2215", background: "none", color: "#9a7d62", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {t("barcode.closeBtn")}
        </button>
      </div>
    </div>
  );
};

const Dashboard = ({ tabsSlot }) => {
  const isNative = Capacitor.isNativePlatform();
  const { t } = useTranslation();
  const { beers, loading, error, refetch: refetchBeers } = useBeers();
  const { userBeers, refetch } = useUserBeers();
  const { stats, refetch: refetchStats } = useUserStats();
  const { trendingIds, rankOf } = useTrendingBeers();
  const isMobile = useIsMobile();

  const [refresh, setRefresh] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [focusBeer, setFocusBeer] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanNotFound, setScanNotFound] = useState(false);
  const [scanMatchId, setScanMatchId] = useState(null);
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [familiaFilter, setFamiliaFilter] = useState(null);
  const [alcoholFilter, setAlcoholFilter] = useState([0, 15]);
  const [trendingFilter, setTrendingFilter] = useState(false);

  useEffect(() => {
    if (refresh) {
      refetch();
      refetchStats();
      setRefresh(false);
    }
  }, [refresh, refetch, refetchStats]);

  const handleBarcodeDetected = useCallback((code) => {
    setShowScanner(false);
    const match = beers.find((b) => b.codigo_barras === code);
    if (!match) { setScanNotFound(true); return; }
    // Reset de filtros: si el match está oculto por un filtro activo (ej.
    // una búsqueda de texto previa), igual queremos mostrar su ficha.
    setSearch(""); setStyleFilter(null); setCountryFilter(null);
    setFamiliaFilter(null); setAlcoholFilter([0, 15]); setTrendingFilter(false);
    setScanMatchId(match.id);
    toastInfo(`✓ ${match.nombre}`);
  }, [beers]);

  const countries = useMemo(() => {
    if (!beers.length) return [];
    const paises = [...new Set(beers.map((b) => b.pais).filter(Boolean))];
    const roots = new Set();
    for (const p of paises) {
      const parent = paises.find((other) => other !== p && p.includes(other));
      roots.add(parent !== undefined ? parent : p.split("(")[0].trim() || p);
    }
    return [...roots].sort();
  }, [beers]);

  const styles = useMemo(
    () =>
      STYLE_KEYWORDS.filter((kw) =>
        beers.some((b) => normalizeStr(b.estilo).includes(normalizeStr(kw)))
      ),
    [beers]
  );

  const familias = useMemo(
    () => [...new Set(beers.map((b) => b.familia).filter(Boolean))].sort(),
    [beers]
  );

  if (loading) return <p style={{ color: "#9a7d62" }}>{t("dashboard.loading")}</p>;
  if (error) return <p style={{ color: "#8b2020" }}>Error: {error}</p>;

  const [minAlc, maxAlc] = alcoholFilter;

  const filteredBeers = beers
    .filter((beer) => !search || normalizeStr(beer.nombre).includes(normalizeStr(search)))
    .filter((beer) => !styleFilter || normalizeStr(beer.estilo).includes(normalizeStr(styleFilter)))
    .filter((beer) => !countryFilter || beer.pais?.includes(countryFilter))
    .filter((beer) => !familiaFilter || beer.familia === familiaFilter)
    .filter((beer) => {
      if (minAlc === 0 && maxAlc === 15) return true;
      const alc = Number(beer.alcohol) || 0;
      return alc >= minAlc && alc <= maxAlc;
    })
    .filter((beer) => !trendingFilter || trendingIds.has(beer.id))
    .sort((a, b) => {
      if (!trendingFilter) return 0;
      return rankOf(a.id) - rankOf(b.id);
    });

  return (
    <NativePullToRefresh onRefresh={() => refetchBeers({ silent: true })}>
    <div>
      {/* En la app nativa el header de NativeShell ya muestra la marca
          "RiBeer's" en todas las pantallas — repetir el título acá es
          redundante y ocupa espacio, así que se omite solo ahí. */}
      {!isNative && <h1 style={{ color: "#f0e4cc" }}>🍺 {t("dashboard.title")}</h1>}

      {/* Map toggle + suggest row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowMap((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            border: `1px solid ${showMap ? "#d4af37" : "#2e2215"}`,
            background: showMap ? "rgba(212,175,55,0.1)" : "#1c1409",
            color: showMap ? "#d4af37" : "#9a7d62",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <GlobeIcon size={14} /> {t("dashboard.mapBtn")} {showMap ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </button>
        <button
          onClick={() => setShowScanner(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            border: "1px solid #2e2215", background: "#1c1409",
            color: "#9a7d62", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <DeviceCameraIcon size={14} /> {t("barcode.scanBtn")}
        </button>
        <button
          onClick={() => setShowSuggest(true)}
          style={{
            background: "none", border: "none", color: "#8b6b2e",
            fontSize: 13, cursor: "pointer", padding: 0,
            textDecoration: "underline", textDecorationColor: "#5a4535",
          }}
        >
          {t("dashboard.suggestBeer")}
        </button>
      </div>

      {showMap && (
        <OriginMapPanel
          beers={beers}
          focusBeer={focusBeer}
          onFocusConsumed={() => setFocusBeer(null)}
        />
      )}
      {showSuggest && <SuggestBeerModal onClose={() => setShowSuggest(false)} t={t} />}
      {showScanner && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}
      {scanNotFound && (
        <BarcodeNotFoundModal
          t={t}
          onClose={() => setScanNotFound(false)}
          onSuggest={() => { setScanNotFound(false); setShowSuggest(true); }}
        />
      )}

      <BeerFilters
        search={search}
        setSearch={setSearch}
        styleFilter={styleFilter}
        setStyleFilter={setStyleFilter}
        countryFilter={countryFilter}
        setCountryFilter={setCountryFilter}
        familiaFilter={familiaFilter}
        setFamiliaFilter={setFamiliaFilter}
        alcoholFilter={alcoholFilter}
        setAlcoholFilter={setAlcoholFilter}
        trendingFilter={trendingFilter}
        setTrendingFilter={setTrendingFilter}
        styles={styles}
        countries={countries}
        familias={familias}
      />

      {/* Solo se recibe en la app nativa (LaBarra.js) — en web tabsSlot es
          undefined y este bloque no renderiza nada, cero cambio visual. */}
      {tabsSlot}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <p style={{ color: "#5a4535", fontSize: 13, margin: 0 }}>
          {t("dashboard.collectionProgressShort", { count: stats.beers, total: beers.length })}
        </p>
        <ChallengesBellButton />
      </div>

      {/* Grilla uniforme — el detalle de BeerCard se abre como overlay
          flotante (ver overlayStyle en BeerCard.js), no empuja el layout,
          así que no hace falta multi-columna acá. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "10px",
        }}
      >
        {filteredBeers.map((beer) => (
          <BeerCard
            key={beer.id}
            beer={beer}
            myBeerData={userBeers.find((b) => b.beer_id === beer.id)}
            onSaved={() => setRefresh(true)}
            isInMyBeers={!!userBeers.find((b) => b.beer_id === beer.id)}
            inCuaderno={false}
            onVerMapa={beer.origen_lat != null ? () => { setFocusBeer(beer); setShowMap(true); } : null}
            isTrending={trendingIds.has(beer.id)}
            autoOpen={beer.id === scanMatchId}
            onAutoOpened={() => setScanMatchId(null)}
          />
        ))}
      </div>
    </div>
    </NativePullToRefresh>
  );
};

export default Dashboard;
