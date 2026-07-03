import React, { useState } from "react";
import { supabase } from "../services/supabase";

const isOver18 = (dateStr) => {
  if (!dateStr) return true;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
};

const RegisterPage = ({ initialEmail = "", onSwitchToLogin, onProfileCreated }) => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!ageConfirmed) {
      setError("Debés confirmar que sos mayor de 18 años para crear una cuenta.");
      return;
    }

    if (fechaNacimiento && !isOver18(fechaNacimiento)) {
      setError("Según tu fecha de nacimiento, no sos mayor de 18 años.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, age_verified: true } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Email confirmation disabled — user is logged in immediately
      const { data: profileData } = await supabase
        .from("profiles")
        .upsert({ id: data.session.user.id, nombre: nombre.trim() || "Usuario" })
        .select("id, nombre")
        .single();

      if (profileData) onProfileCreated(profileData);
    } else {
      // Email confirmation required
      setPendingConfirmation(true);
    }

    setLoading(false);
  };

  if (pendingConfirmation) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "52px" }}>📬</div>
            <h2 style={{ color: "#111", margin: "16px 0 10px", fontSize: "22px" }}>
              ¡Revisá tu email!
            </h2>
            <p style={{ color: "#666", lineHeight: "1.7", fontSize: "15px" }}>
              Te enviamos un link de confirmación a{" "}
              <strong style={{ color: "#111" }}>{email}</strong>.
              <br />
              Hacé clic en el link para activar tu cuenta.
            </p>
            <button
              onClick={onSwitchToLogin}
              style={{ ...primaryBtnStyle, marginTop: "28px" }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "44px" }}>🍺</div>
          <h1 style={{ margin: "10px 0 4px", fontSize: "24px", color: "#111", fontWeight: 800 }}>
            Crear cuenta
          </h1>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            Únite a BeerBook
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Nombre *">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Tu nombre"
              style={inputStyle}
            />
          </Field>

          <Field label="Email *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Contraseña *">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              style={inputStyle}
            />
          </Field>

          <Field
            label="Fecha de nacimiento"
            hint="Opcional · Mayor seguridad legal"
          >
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={inputStyle}
            />
          </Field>

          <div style={ageBannerStyle}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                style={{ marginTop: "2px", width: "17px", height: "17px", accentColor: "#d4af37", cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
                <strong>Confirmo que soy mayor de 18 años</strong> y entiendo que
                BeerBook es una app sobre consumo de alcohol.
              </span>
            </label>
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#888" }}>
          ¿Ya tenés cuenta?{" "}
          <button type="button" onClick={onSwitchToLogin} style={inlineLinkStyle}>
            Iniciá sesión
          </button>
        </p>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={labelStyle}>
      {label}
      {hint && <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0, marginLeft: "6px", fontSize: "12px" }}>{hint}</span>}
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
  maxWidth: "440px",
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

const inlineLinkStyle = {
  background: "none",
  border: "none",
  color: "#d4af37",
  cursor: "pointer",
  fontWeight: "700",
  padding: 0,
  fontSize: "inherit",
  textDecoration: "underline",
};

export default RegisterPage;
