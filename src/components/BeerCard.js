import { useState } from "react";
import { supabase } from "../services/supabase";

const BeerCard = ({ beer, onSaved, isInMyBeers }) => {
  const [showImage, setShowImage] = useState(false);

  const handleAdd = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { error } = await supabase.from("user_beers").upsert({
      user_id: session.user.id,
      beer_id: beer.id,
      times: 1,
      comment: "",
    });

    if (!error) {
      onSaved && onSaved();
      alert("🍺 Añadida a tu cuaderno");
    } else {
      alert("❌ Error al guardar");
    }
  };

  return (
    <>
      <div
        style={{
          borderRadius: "12px",
          background: "#fdf6ec",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          overflow: "hidden",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow =
            "0 8px 20px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(0,0,0,0.1)";
        }}
      >
        {/* IMAGEN */}
        <div
          style={{
            width: "100%",
            height: "160px",
            overflow: "hidden",
            cursor: "pointer",
          }}
          onClick={() => setShowImage(true)}
        >
          <img
            src={beer.foto_url}
            alt={beer.nombre}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* INFO */}
        <div style={{ padding: "12px" }}>
          <h3>{beer.nombre}</h3>
          <p><strong>País:</strong> {beer.pais}</p>
          <p><strong>Estilo:</strong> {beer.estilo}</p>
          <p><strong>Alcohol:</strong> {beer.alcohol}%</p>

          <button
            onClick={handleAdd}
            disabled={isInMyBeers}
            style={{
              marginTop: "10px",
              width: "100%",
              padding: "8px",
              background: isInMyBeers ? "#ccc" : "#d4af37",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: isInMyBeers ? "default" : "pointer",
            }}
          >
            🍺 He probado esta cerveza
          </button>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {showImage && (
        <div
          onClick={() => setShowImage(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <img
            src={beer.foto_url}
            alt={beer.nombre}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: "10px",
            }}
          />
        </div>
      )}
    </>
  );
};

export default BeerCard;
