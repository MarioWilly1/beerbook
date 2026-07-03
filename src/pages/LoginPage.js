import React, { useState } from "react";
import { supabase } from "../services/supabase";

const LoginPage = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { queryParams: { prompt: "select_account" } },
    });
  };

  const isInvalidCredentials =
    error.toLowerCase().includes("invalid login credentials") ||
    error.toLowerCase().includes("invalid email or password");

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "52px" }}>🍺</div>
          <h1 style={{ margin: "10px 0 4px", fontSize: "28px", color: "#111", fontWeight: 800 }}>
            BeerBook
          </h1>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            Tu catálogo personal de cervezas
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div style={errorBoxStyle}>
              {isInvalidCredentials ? (
                <>
                  Email o contraseña incorrectos.{" "}
                  <button
                    type="button"
                    onClick={() => onSwitchToRegister(email)}
                    style={inlineLinkStyle}
                  >
                    ¿No tenés cuenta? Registrate
                  </button>
                </>
              ) : (
                error
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <Divider />

        <button onClick={handleGoogle} style={googleBtnStyle}>
          <GoogleIcon />
          Continuar con Google
        </button>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "#888" }}>
          ¿No tenés cuenta?{" "}
          <button
            type="button"
            onClick={() => onSwitchToRegister(email)}
            style={inlineLinkStyle}
          >
            Registrate
          </button>
        </p>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
    <div style={{ flex: 1, height: "1px", background: "#e8e8e8" }} />
    <span style={{ color: "#bbb", fontSize: "13px" }}>o</span>
    <div style={{ flex: 1, height: "1px", background: "#e8e8e8" }} />
  </div>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: "10px", flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
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
  padding: "44px 40px",
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
  marginTop: "4px",
};

const googleBtnStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#fff",
  color: "#333",
  border: "1.5px solid #e0e0e0",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

export default LoginPage;
