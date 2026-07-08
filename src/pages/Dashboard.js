import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";
import BeerFilters from "../components/BeerFilters";
import { useUserStats } from "../hooks/useUserStats";
import { supabase } from "../services/supabase";
import OriginMapPanel from "../components/OriginMapPanel";

const STYLE_KEYWORDS = ["IPA", "Lager", "Stout", "Ale", "Porter", "Saison", "Sour", "Dubbel", "Tripel"];

// ── Modal: Sugerir cerveza ─────────────────────────────────────────────────────
const SuggestBeerModal = ({ onClose, t }) => {
  const [nombre, setNombre]   = useState("");
  const [estilo, setEstilo]   = useState("");
  const [pais, setPais]       = useState("");
  const [reason, setReason]   = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSend = useCallback(async () => {
    if (!nombre.trim()) { setError(t("suggest.errorNombre")); return; }
    setSending(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("nombre").eq("id", user.id).single();
    await supabase.from("beer_suggestions").insert({
      user_id:            user.id,
      sugerida_por_nombre: profile?.nombre || null,
      nombre:             nombre.trim(),
      estilo:             estilo.trim() || null,
      pais:               pais.trim()   || null,
      reason:             reason.trim() || null,
    });
    setSent(true);
    setSending(false);
  }, [nombre, estilo, pais, reason, t]);

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  };
  const modalStyle = {
    background: "#1c1409", border: "1px solid #2e2215", borderRadius: 16,
    padding: 28, width: "100%", maxWidth: 440,
  };
  const inputStyle = {
    width: "100%", padding: "9px 12px", marginBottom: 14, borderRadius: 8,
    background: "#0d0a06", border: "1px solid #2e2215", color: "#f0e4cc",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#9a7d62",
    textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0, flex: 1, fontFamily: "'Playfair Display', serif", color: "#f0e4cc", fontSize: 20 }}>
            💡 {t("suggest.title")}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a4535", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ color: "#9a7d62", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          {t("suggest.subtitle")}
        </p>

        {sent ? (
          <p style={{ color: "#4caf50", fontWeight: 600, fontSize: 15, textAlign: "center", padding: "20px 0" }}>
            ✓ {t("suggest.sent")}
          </p>
        ) : (
          <>
            <label style={labelStyle}>{t("suggest.nombreLabel")} *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 100))} placeholder={t("suggest.nombrePlaceholder")} style={inputStyle} />
            {error && <p style={{ color: "#c07a3f", fontSize: 12, margin: "-10px 0 10px" }}>{error}</p>}

            <label style={labelStyle}>{t("suggest.estiloLabel")}</label>
            <input value={estilo} onChange={(e) => setEstilo(e.target.value.slice(0, 80))} placeholder={t("suggest.estiloPlaceholder")} style={inputStyle} />

            <label style={labelStyle}>{t("suggest.paisLabel")}</label>
            <input value={pais} onChange={(e) => setPais(e.target.value.slice(0, 80))} placeholder={t("suggest.paisPlaceholder")} style={inputStyle} />

            <label style={labelStyle}>{t("suggest.reasonLabel")}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={t("suggest.reasonPlaceholder")}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif", marginBottom: 20 }}
            />

            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: sending ? "#2a1e0f" : "#d4af37",
                color: sending ? "#5a4535" : "#0d0a06",
                fontWeight: 700, fontSize: 15,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              {sending ? t("suggest.sending") : t("suggest.sendBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

function normalizeStr(str) {
  if (!str) return "";
  const nfd = str.normalize("NFD");
  let out = "";
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) out += nfd[i];
  }
  return out.toLowerCase();
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();
  const { stats, refetch: refetchStats } = useUserStats();

  const [refresh, setRefresh] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [focusBeer, setFocusBeer] = useState(null);
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [alcoholFilter, setAlcoholFilter] = useState([0, 15]);

  useEffect(() => {
    if (refresh) {
      refetch();
      refetchStats();
      setRefresh(false);
    }
  }, [refresh, refetch, refetchStats]);

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

  if (loading) return <p style={{ color: "#9a7d62" }}>{t("dashboard.loading")}</p>;
  if (error) return <p style={{ color: "#8b2020" }}>Error: {error}</p>;

  const [minAlc, maxAlc] = alcoholFilter;

  const filteredBeers = beers
    .filter((beer) => !search || normalizeStr(beer.nombre).includes(normalizeStr(search)))
    .filter((beer) => !styleFilter || normalizeStr(beer.estilo).includes(normalizeStr(styleFilter)))
    .filter((beer) => !countryFilter || beer.pais?.includes(countryFilter))
    .filter((beer) => {
      if (minAlc === 0 && maxAlc === 15) return true;
      const alc = Number(beer.alcohol) || 0;
      return alc >= minAlc && alc <= maxAlc;
    });

  return (
    <div>
      <h1 style={{ color: "#f0e4cc" }}>🍺 {t("dashboard.title")}</h1>

      <div
        style={{
          padding: "10px 14px",
          marginBottom: "15px",
          background: "#1c1409",
          border: "1px solid #2e2215",
          borderRadius: "10px",
          fontSize: "14px",
          color: "#9a7d62",
        }}
      >
        {t("dashboard.statsBar", { level: stats.level, xp: stats.xp, beers: stats.beers, verified: stats.verifiedBeers })}
      </div>

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
          🗺️ {t("dashboard.mapBtn")} {showMap ? "▲" : "▼"}
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

      <BeerFilters
        search={search}
        setSearch={setSearch}
        styleFilter={styleFilter}
        setStyleFilter={setStyleFilter}
        countryFilter={countryFilter}
        setCountryFilter={setCountryFilter}
        alcoholFilter={alcoholFilter}
        setAlcoholFilter={setAlcoholFilter}
        styles={styles}
        countries={countries}
      />

      <p style={{ color: "#5a4535", fontSize: 13, margin: "0 0 14px" }}>
        {t("dashboard.found", { count: filteredBeers.length })}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
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
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
