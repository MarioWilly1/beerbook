import React, { useState, useEffect } from "react";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";
import BeerFilters from "../components/BeerFilters";

const Dashboard = () => {
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();

  const [refresh, setRefresh] = useState(false);

  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState(null);
  const [countryFilter, setCountryFilter] = useState(null);
  const [alcoholFilter, setAlcoholFilter] = useState(null);

  useEffect(() => {
    if (refresh) {
      refetch();
      setRefresh(false);
    }
  }, [refresh, refetch]);

  if (loading) return <p>Cargando cervezas...</p>;
  if (error) return <p>Error: {error}</p>;

  const filteredBeers = beers
    .filter((beer) =>
      beer.nombre?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((beer) => !styleFilter || beer.estilo?.toLowerCase().includes(styleFilter))
    .filter((beer) => !countryFilter || beer.pais?.toLowerCase().includes(countryFilter))
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

      {/* 🔥 ESTO DEBE APARECER SI O SI */}
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

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "15px"
      }}>
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