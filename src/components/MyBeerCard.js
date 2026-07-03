import { useState } from "react";
import { supabase } from "../services/supabase";
import Lightbox from "./Lightbox";

const MyBeerCard = ({ beer, onUpdated, onDeleted }) => {
  const [times, setTimes] = useState(beer.times || 0);
  const [comment, setComment] = useState(beer.comment || "");
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const handleSave = async () => {
    const { error } = await supabase
      .from("user_beers")
      .update({ times, comment })
      .eq("id", beer.user_beer_id);

    if (!error) {
      onUpdated && onUpdated();
      alert("💾 Cambios guardados");
    } else {
      alert("❌ Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar esta cerveza de tu cuaderno?")) return;

    const { error } = await supabase
      .from("user_beers")
      .delete()
      .eq("id", beer.user_beer_id);

    if (!error) {
      onDeleted && onDeleted();
    }
  };

  const intensity = Math.min(times / 100, 1);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "12px",
          borderRadius: "10px",
          background: `rgba(212, 175, 55, ${intensity})`,
          marginBottom: "14px",
        }}
      >
        {/* IMAGEN */}
        <img
          src={beer.foto_url}
          alt={beer.nombre}
          onClick={() => beer.foto_url && setLightboxSrc(beer.foto_url)}
          style={{
            width: "120px",
            height: "120px",
            objectFit: "cover",
            borderRadius: "8px",
            cursor: "zoom-in",
          }}
        />

        {/* INFO */}
        <div style={{ flex: 1 }}>
          <h3>{beer.nombre}</h3>

          <label>
            Veces probada:
            <input
              type="number"
              value={times}
              min="0"
              onChange={(e) => setTimes(Number(e.target.value))}
              style={{ marginLeft: "8px", width: "60px" }}
            />
          </label>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario o anécdota"
            rows={3}
            style={{ width: "100%", marginTop: "8px" }}
          />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                background: "#8c6d1f",
                color: "white",
                border: "none",
                padding: "6px",
                borderRadius: "6px",
              }}
            >
              💾 Guardar cambios
            </button>

            <button
              onClick={handleDelete}
              style={{
                background: "#b23b3b",
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: "6px",
              }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      <Lightbox src={lightboxSrc} alt={beer.nombre} onClose={() => setLightboxSrc(null)} />
    </>
  );
};

export default MyBeerCard;
