import React from "react";

// Título de contenido de cada sección nativa — a propósito distinto del
// nombre de la pestaña en la barra inferior (ver NativeShell.js: "Barra",
// "Bitácora", "Taberna"), para no repetir la misma palabra dos veces en
// pantalla. Tocarlo vuelve a la vista principal de la sección (mismo
// patrón que ya usa PerfilHub.js con su fila de avatar+nombre) — útil
// sobre todo si estás en una pestaña interna secundaria (Comunidad,
// Colección, Amigos/Chat) y querés volver de un toque.
const NativeSectionTitle = ({ children, onClick }) => (
  <button onClick={onClick} style={titleStyle}>{children}</button>
);

const titleStyle = {
  display: "block", width: "100%", background: "none", border: "none", padding: 0,
  margin: "0 0 16px", cursor: "pointer", textAlign: "left",
  fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
  color: "#f0e4cc",
};

export default NativeSectionTitle;
