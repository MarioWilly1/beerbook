import { useState, useEffect } from "react";
import { useMyBeers } from "../hooks/useMyBeers";
import { supabase } from "../services/supabase";

const MiCuaderno = () => {
  const { beers, loading } = useMyBeers();
  const [editableBeers, setEditableBeers] = useState([]);
  const [showImage, setShowImage] = useState(null);

  useEffect(() => {
    setEditableBeers(
      beers.map((beer) => ({
        ...beer,
        times: beer.times || 0,
        comment: beer.comment || "",
        commercialized: beer.commercialized ?? true,
        user_photo_url: beer.user_photo_url || "",
      }))
    );
  }, [beers]);

  if (loading) return <p>Cargando tu cuaderno...</p>;
  if (editableBeers.length === 0)
    return <p>No has guardado ninguna cerveza aún.</p>;

  const handleChange = (id, field, value) => {
    setEditableBeers((prev) =>
      prev.map((beer) =>
        beer.id === id ? { ...beer, [field]: value } : beer
      )
    );
  };

  const handleSave = async (beer) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    await supabase
      .from("user_beers")
      .update({
        times: beer.times,
        comment: beer.comment,
        commercialized: beer.commercialized,
        user_photo_url: beer.user_photo_url,
      })
      .eq("user_id", session.user.id)
      .eq("beer_id", beer.id);

    alert("💾 Cambios guardados");
  };

  const handleDelete = async (beerId) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    if (!window.confirm("¿Seguro que quieres borrar esta cerveza?")) return;

    await supabase
      .from("user_beers")
      .delete()
      .eq("user_id", session.user.id)
      .eq("beer_id", beerId);

    setEditableBeers((prev) =>
      prev.filter((beer) => beer.id !== beerId)
    );
  };

  return (
    <div>
      <h2>📘 Mi Cuaderno</h2>

      {editableBeers.map((beer) => {
        const intensity = Math.min(beer.times / 100, 1);

        return (
          <div
            key={beer.id}
            style={{
              display: "flex",
              gap: "16px",
              padding: "16px",
              marginBottom: "16px",
              borderRadius: "10px",
              backgroundColor: `rgba(212,175,55,${intensity})`,
            }}
          >
            {/* IMAGEN CERVEZA */}
            <div
              onClick={() => setShowImage(beer.foto_url)}
              style={{
                width: "140px",
                height: "140px",
                cursor: "pointer",
                overflow: "hidden",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              <img
                src={beer.foto_url}
                alt={beer.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* INFO */}
            <div style={{ flex: 1 }}>
              <h3>{beer.nombre}</h3>

              <label>
                Veces probada:
                <input
                  type="number"
                  min="0"
                  value={beer.times}
                  onChange={(e) =>
                    handleChange(
                      beer.id,
                      "times",
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                  style={{ marginLeft: "10px", width: "60px" }}
                />
              </label>

              <div style={{ marginTop: "8px" }}>
                <label>
                  Comercializada:
                  <select
                    value={beer.commercialized ? "yes" : "no"}
                    onChange={(e) =>
                      handleChange(
                        beer.id,
                        "commercialized",
                        e.target.value === "yes"
                      )
                    }
                    style={{ marginLeft: "10px" }}
                  >
                    <option value="yes">Sí</option>
                    <option value="no">No</option>
                  </select>
                </label>
              </div>

              <textarea
                value={beer.comment}
                onChange={(e) =>
                  handleChange(beer.id, "comment", e.target.value)
                }
                rows={3}
                placeholder="Comentarios o anécdotas..."
                style={{ width: "100%", marginTop: "8px" }}
              />

              <input
                type="text"
                placeholder="URL de tu foto probándola"
                value={beer.user_photo_url}
                onChange={(e) =>
                  handleChange(beer.id, "user_photo_url", e.target.value)
                }
                style={{ width: "100%", marginTop: "6px" }}
              />

              {beer.user_photo_url && (
                <img
                  src={beer.user_photo_url}
                  alt="Prueba"
                  style={{
                    marginTop: "8px",
                    width: "100px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowImage(beer.user_photo_url)}
                />
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={() => handleSave(beer)}
                  style={{
                    padding: "8px",
                    background: "#8b6b2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                  }}
                >
                  💾 Guardar cambios
                </button>

                <button
                  onClick={() => handleDelete(beer.id)}
                  style={{
                    padding: "8px",
                    background: "#5a1e1e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                  }}
                >
                  🗑️ Borrar cerveza
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {showImage && (
        <div
          onClick={() => setShowImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <img
            src={showImage}
            alt="Vista ampliada"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
          />
        </div>
      )}
    </div>
  );
};

export default MiCuaderno;

