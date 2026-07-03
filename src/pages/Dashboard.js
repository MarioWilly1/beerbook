import React, { useState, useEffect } from "react";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";
import BeerFilters from "../components/BeerFilters";
import { useUserStats } from "../hooks/useUserStats";

const Dashboard = () => {
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();
  const { stats, refetch: refetchStats } = useUserStats();

  const [refresh, setRefresh] = useState(false);

  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [alcoholFilter, setAlcoholFilter] = useState(null);

  useEffect(() => {
    if (refresh) {
      refetch();
      refetchStats();
      setRefresh(false);
    }
  }, [refresh, refetch, refetchStats]);

  if (loading) return <p>Cargando cervezas...</p>;
  if (error) return <p>Error: {error}</p>;

  const filteredBeers = beers
    .filter((beer) =>
      beer.nombre?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((beer) =>
      !styleFilter || beer.estilo?.toLowerCase().includes(styleFilter)
    )
    .filter((beer) =>
      !countryFilter || beer.pais?.toLowerCase().includes(countryFilter)
    )
    .filter((beer) => {
      if (!alcoholFilter) return true;
      if (alcoholFilter === "low") return beer.alcohol <= 5;
      if (alcoholFilter === "mid") return beer.alcohol > 5 && beer.alcohol <= 8;
      if (alcoholFilter === "high") return beer.alcohol > 8;
      return true;
    });

  return (
    <div>
      <h1>🍺 Catálogo de Cervezas</h1>

      {/* 🏆 MINI PANEL DE JUEGO */}
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
        🏆 Nivel: {stats.level} | ⭐ XP: {stats.xp} | 🍺 Cervezas: {stats.beers}
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
      />

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