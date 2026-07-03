import React, { useState, useMemo, useEffect } from "react";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";
import BeerFilters from "../components/BeerFilters";
import { useUserStats } from "../hooks/useUserStats";

const STYLE_KEYWORDS = ["IPA", "Lager", "Stout", "Ale", "Porter", "Saison", "Sour", "Dubbel", "Tripel"];

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
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();
  const { stats, refetch: refetchStats } = useUserStats();

  const [refresh, setRefresh] = useState(false);
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

  // Derive unique root countries from actual DB data.
  // If a shorter pais is a substring of another ("España" in "España (A Coruña)" or "Madrid (España)"),
  // the shorter one becomes the canonical chip value used for filtering.
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

  // Only show style keywords that actually appear in the loaded beers.
  const styles = useMemo(
    () =>
      STYLE_KEYWORDS.filter((kw) =>
        beers.some((b) => normalizeStr(b.estilo).includes(normalizeStr(kw)))
      ),
    [beers]
  );

  if (loading) return <p>Cargando cervezas...</p>;
  if (error) return <p>Error: {error}</p>;

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
      <h1>🍺 Catálogo de Cervezas</h1>

      <div
        style={{
          padding: "10px",
          marginBottom: "15px",
          background: "#111",
          color: "#fff",
          borderRadius: "10px",
          fontSize: "14px",
        }}
      >
        🏆 Nivel: {stats.level} | ⭐ XP: {stats.xp} | 🍺 {stats.beers} cervezas ({stats.verifiedBeers} verificadas)
      </div>

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

      <p style={{ color: "#999", fontSize: 13, margin: "0 0 14px" }}>
        {filteredBeers.length} cerveza{filteredBeers.length !== 1 ? "s" : ""} encontrada
        {filteredBeers.length !== 1 ? "s" : ""}
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
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
