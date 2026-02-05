import React from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../services/supabase";

const Layout = ({ children }) => {
  const [session, setSession] = React.useState(null);

  React.useEffect(() => {
    // Obtener sesión actual
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };

    getSession();

    // Escuchar cambios de sesión
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const username =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Invitado";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleLogin = async () => {
    const method = prompt(
      "Elige método de inicio de sesión:\n1 = Email/Contraseña\n2 = Google"
    );

    if (method === "1") {
      const email = prompt("Introduce tu correo:");
      const password = prompt("Introduce tu contraseña:");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) alert("❌ Error al iniciar sesión: " + error.message);
    } else if (method === "2") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) alert("❌ Error al iniciar sesión con Google: " + error.message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: "260px",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('/wood.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 16px",
        }}
      >
        {/* TOP */}
        <div>
          <h1
            style={{
              fontSize: "22px",
              marginBottom: "6px",
              textAlign: "center",
              letterSpacing: "1px",
            }}
          >
            🍺 BeerBook
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              opacity: 0.85,
              marginBottom: "24px",
            }}
          >
            👤 {username}
          </p>

          <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <SidebarLink to="/" label="Catálogo" />
            <SidebarLink to="/cuaderno" label="Mi Cuaderno" />
            <SidebarLink to="/sobre-nosotros" label="Sobre nosotros" />
          </nav>
        </div>

        {/* BOTTOM */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <SidebarButton
            label="⚙️ Configuración"
            onClick={() => alert("Sección de configuración")}
          />
          <SidebarButton
            label={session ? "🚪 Cerrar sesión" : "🔐 Iniciar sesión"}
            onClick={session ? handleLogout : handleLogin}
          />
        </div>
      </aside>

      {/* CONTENIDO */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px",
          background: "#faf8f4",
        }}
      >
        {children}
      </main>
    </div>
  );
};

/* ---------------- COMPONENTES AUX ---------------- */

const SidebarLink = ({ to, label }) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      padding: "14px 16px",
      borderRadius: "10px",
      textDecoration: "none",
      color: isActive ? "#1e8449" : "#f5f5f5",
      background: isActive ? "#d5f5e3" : "rgba(255,255,255,0.08)",
      fontSize: "16px",
      fontWeight: "600",
      transition: "all 0.2s",
    })}
  >
    {label}
  </NavLink>
);

const SidebarButton = ({ label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: "12px 16px",
      borderRadius: "10px",
      background: "rgba(255,255,255,0.08)",
      color: "#f5f5f5",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

export default Layout;
