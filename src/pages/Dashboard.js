import React, { useState, useEffect } from "react";
import { useBeers } from "../hooks/useBeers";
import { useUserBeers } from "../hooks/useUserBeers";
import BeerCard from "../components/BeerCard";

const Dashboard = () => {
  const { beers, loading, error } = useBeers();
  const { userBeers, refetch } = useUserBeers();
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (refresh) {
      refetch();
      setRefresh(false);
    }
  }, [refresh, refetch]);

  if (loading) return <p>Cargando cervezas...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Catálogo de Cervezas</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        {beers.map((beer) => {
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

