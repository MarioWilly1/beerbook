import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import UsernameField from "../components/UsernameField";

// Gate obligatorio para cuentas existentes (creadas antes de que
// profiles.username existiera) — mismo patrón que AgeVerificationPage/
// Onboarding: bloquea el resto de la app hasta completar el paso. Se
// muestra cuando App.js detecta profile.username == null, sin importar
// hace cuánto se creó la cuenta ni si ya vio el onboarding.
const ChooseUsernamePage = ({ session, onComplete }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [usernameValid, setUsernameValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameValid || loading) return;

    setError("");
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", session.user.id)
      // Sin "nombre" — columna restringida a nivel de Postgres (ver
      // 20260826000000_restrict_profiles_nombre_column.sql).
      .select("id, username")
      .single();

    if (error) {
      setError(error.code === "23505" ? t("username.taken") : t("username.saveError"));
      setLoading(false);
      return;
    }

    onComplete(data);
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "48px" }}>🍺</div>
          <h1 style={{ margin: "10px 0 6px", fontSize: "22px", color: "#111", fontWeight: 800 }}>
            {t("username.gate.title")}
          </h1>
          <p style={{ color: "#666", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
            {t("username.gate.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <UsernameField value={username} onChange={setUsername} onValidityChange={setUsernameValid} autoFocus />

          {error && <div style={errorBoxStyle}>{error}</div>}

          <button
            type="submit"
            disabled={!usernameValid || loading}
            style={{
              ...primaryBtnStyle,
              opacity: !usernameValid || loading ? 0.45 : 1,
              cursor: !usernameValid || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("username.gate.saving") : t("username.gate.saveBtn")}
          </button>
        </form>
      </div>
    </div>
  );
};

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

const errorBoxStyle = {
  background: "#fff5f5",
  border: "1px solid #fecaca",
  borderRadius: "10px",
  padding: "11px 14px",
  margin: "14px 0",
  fontSize: "14px",
  color: "#c0392b",
  lineHeight: "1.5",
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
  marginTop: "18px",
};

export default ChooseUsernamePage;
