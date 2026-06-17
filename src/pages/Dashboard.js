import React, { useState, useEffect } from "react";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";

const Dashboard = () => {
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();

  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (refresh) {
      refetch();
      setRefresh(false);
    }
  }, [refresh, refetch]);

  if (loading) return <p>Cargando cervezas...</p>;
  if (error) return <p>Error: {error}</p>;

  // 🔍 FILTRO DE BÚSQUEDA
  const filteredBeers = beers.filter((beer) =>
    beer.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    beer.pais?.toLowerCase().includes(search.toLowerCase()) ||
    beer.estilo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1>Catálogo de Cervezas</h1>

      {/* 🔍 SEARCH BAR */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="🔍 Buscar cerveza, país o estilo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        {filteredBeers.map((beer) => {
          const myBeerData = userBeers.find((b) => b.beer_id === beer.id);
          const isInMyBeers = !!myBeerData;

          return (
            <BeerCard
              key={beer.id}
              beer={beer}
              myBeerData={myBeerData}
              onSaved={() => setRefresh(true)}
              isInMyBeers={isInMyBeers}
              inCuaderno={false} // catálogo no editable
            />
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
