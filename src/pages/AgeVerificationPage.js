import React, { useState } from "react";
import { supabase } from "../services/supabase";
import DateInput from "../components/DateInput";

const isOver18 = (dateStr) => {
  if (!dateStr) return true;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
};

// Mismo patrón de hover que SidebarLink (Layout.js): useState local +
// onMouseEnter/onMouseLeave, no CSS :hover.
const HoverTitle = ({ children, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <h1
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...style, color: hovered ? "#8b6b2e" : style.color, transition: "color 0.15s" }}
    >
      {children}
    </h1>
  );
};

const AgeCheckboxLabel = ({ ageConfirmed, onChange }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer",
        borderRadius: "8px", padding: "4px", margin: "-4px",
        background: hovered ? "rgba(212,175,55,0.08)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={ageConfirmed}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: "2px", width: "17px", height: "17px", accentColor: "#d4af37", cursor: "pointer", flexShrink: 0 }}
      />
      <span style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
        <strong>Confirmo que soy mayor de 18 años</strong> y entiendo que
        RiBeer's es una app sobre consumo de alcohol.
      </span>
    </label>
  );
};

// Botón "salir" (menor de edad): hover en tono rojizo — es una acción de
// salida/negativa, tiene que distinguirse del resto.
const ExitButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...exitBtnStyle,
        color: hovered ? "#c0392b" : "#bbb",
        background: hovered ? "rgba(192,57,43,0.08)" : "none",
        borderRadius: "8px",
        transition: "all 0.15s",
      }}
    >
      No soy mayor de edad — salir
    </button>
  );
};

const AgeVerificationPage = ({ session, onComplete }) => {
  const suggestedName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.nombre ||
    "";

  const [nombre, setNombre] = useState(suggestedName);
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!ageConfirmed) {
      setError("Debés confirmar que eres mayor de 18 años para continuar.");
      return;
    }

    if (fechaNacimiento && !isOver18(fechaNacimiento)) {
      setError("Según tu fecha de nacimiento, no eres mayor de 18 años.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, nombre: nombre.trim() || "Usuario" })
      .select("id, nombre")
      .single();

    if (error) {
      setError("No pudimos guardar tu perfil. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    onComplete(data);
  };

  const handleExit = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "48px" }}>🍺</div>
          <HoverTitle style={{ margin: "10px 0 6px", fontSize: "22px", color: "#111", fontWeight: 800 }}>
            Bienvenido/a a RiBeer's
          </HoverTitle>
          <p style={{ color: "#666", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
            Antes de continuar, necesitamos confirmar que eres mayor de edad.
            RiBeer's es una app sobre cerveza y consumo de alcohol.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="¿Cómo quieres que te llamemos?">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="auth-input"
              style={inputStyle}
            />
          </Field>

          <Field
            label="Fecha de nacimiento"
            hint="Opcional · Mayor seguridad legal"
          >
            <DateInput onChange={setFechaNacimiento} />
          </Field>

          <div style={ageBannerStyle}>
            <AgeCheckboxLabel ageConfirmed={ageConfirmed} onChange={setAgeConfirmed} />
          </div>

          {error && <div style={errorBoxStyle}>{error}</div>}

          <button
            type="submit"
            disabled={!ageConfirmed || loading}
            style={{
              ...primaryBtnStyle,
              opacity: !ageConfirmed || loading ? 0.45 : 1,
              cursor: !ageConfirmed || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Entrando..." : "Entrar a RiBeer's"}
          </button>

          <ExitButton onClick={handleExit} />
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={labelStyle}>
      {label}
      {hint && (
        <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0, marginLeft: "6px", fontSize: "12px" }}>
          {hint}
        </span>
      )}
    </label>
    {children}
  </div>
);

/* ── Styles ── */

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1c1410",
  padding: "20px",
};

const cardStyle = {
  background: "#fff",
  borderRadius: "20px",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#444",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e0e0e0",
  borderRadius: "10px",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  color: "#111",
  background: "#fff",
};

const ageBannerStyle = {
  padding: "14px 16px",
  background: "#fffbee",
  border: "1.5px solid #f0d060",
  borderRadius: "12px",
  marginBottom: "18px",
};

const primaryBtnStyle = {
  width: "100%",
  padding: "13px",
  background: "#d4af37",
  color: "#111",
  border: "none",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
};

const errorBoxStyle = {
  background: "#fff5f5",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "11px 14px",
  marginBottom: "14px",
  fontSize: "14px",
  color: "#c0392b",
  lineHeight: "1.5",
};

const exitBtnStyle = {
  width: "100%",
  padding: "10px",
  background: "none",
  border: "none",
  color: "#bbb",
  cursor: "pointer",
  fontSize: "13px",
  marginTop: "10px",
};

export default AgeVerificationPage;
