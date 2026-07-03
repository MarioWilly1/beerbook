import React from "react";
import { useFeed } from "../hooks/useFeed";
import Avatar from "../components/Avatar";

const ACTION_LABEL = {
  register: "registró",
  rate:     "valoró",
  comment:  "comentó sobre",
  photo:    "subió una foto de",
};

const ACTION_EMOJI = {
  register: "🍺",
  rate:     "⭐",
  comment:  "✍️",
  photo:    "📸",
};

function timeAgo(dateStr) {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  if (minutes < 1)  return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24)   return `hace ${hours}h`;
  if (days < 7)     return `hace ${days} día${days !== 1 ? "s" : ""}`;
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

const FeedEntry = ({ entry }) => {
  const emoji = ACTION_EMOJI[entry.action] || "🍺";
  const label = ACTION_LABEL[entry.action] || "interactuó con";

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar avatarUrl={entry.avatar_url} nombre={entry.nombre} size={40} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#222" }}>{entry.nombre}</span>
          {" "}
          <span style={{ fontSize: 14, color: "#555" }}>{emoji} {label}</span>
          {" "}
          <span style={{ fontWeight: 700, fontSize: 14, color: "#8b6b2e" }}>{entry.beer_nombre}</span>
        </div>
        <span style={{ fontSize: 12, color: "#bbb", flexShrink: 0 }}>{timeAgo(entry.created_at)}</span>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {entry.beer_foto_url && (
          <img
            src={entry.beer_foto_url}
            alt={entry.beer_nombre}
            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1 }}>
          {entry.rating != null && Number(entry.rating) > 0 && (
            <div style={{ fontSize: 13, color: "#d4af37", fontWeight: 600, marginBottom: 4 }}>
              ⭐ {Number(entry.rating).toFixed(1)} / 5
            </div>
          )}
          {entry.comment?.trim() && (
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "#555", fontStyle: "italic" }}>
              "{entry.comment.trim()}"
            </p>
          )}
          {entry.user_photo_url?.trim() && (
            <img
              src={entry.user_photo_url}
              alt="Foto del usuario"
              style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Feed = () => {
  const { feed, loading } = useFeed();

  if (loading) return <p style={{ padding: 24 }}>Cargando feed...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px" }}>📡 Feed</h2>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px" }}>
        Actividad reciente de tus amigos
      </p>

      {feed.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>🍺</p>
          <p style={{ margin: 0, fontWeight: 600, color: "#555" }}>Nada por aquí todavía</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#999" }}>
            Agregá amigos en <strong>Amigos</strong> para ver su actividad.
          </p>
        </div>
      ) : (
        feed.map((entry, i) => (
          <FeedEntry key={`${entry.user_id}-${entry.beer_id}-${i}`} entry={entry} />
        ))
      )}
    </div>
  );
};

const cardStyle  = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" };
const emptyStyle = { textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #eee", borderRadius: 12 };

export default Feed;
