import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MiCuaderno from "./pages/MiCuaderno";
import Logros from "./pages/Logros";
import Ranking from "./pages/Ranking";
import Feed from "./pages/Feed";
import Amigos from "./pages/Amigos";
import SobreNosotros from "./pages/SobreNosotros";
import Configuracion from "./pages/Configuracion";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AgeVerificationPage from "./pages/AgeVerificationPage";

function App() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, setProfile } = useProfile(session);
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");

  // Show a minimal spinner while auth state is being resolved
  if (authLoading || (session && profileLoading)) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1410",
        fontSize: "40px",
      }}>
        🍺
      </div>
    );
  }

  // Not logged in → login or register
  if (!session) {
    if (showRegister) {
      return (
        <RegisterPage
          initialEmail={registerEmail}
          onSwitchToLogin={() => setShowRegister(false)}
          onProfileCreated={setProfile}
        />
      );
    }
    return (
      <LoginPage
        onSwitchToRegister={(email) => {
          setRegisterEmail(email);
          setShowRegister(true);
        }}
      />
    );
  }

  // Logged in but no profile → age verification
  if (!profile) {
    return <AgeVerificationPage session={session} onComplete={setProfile} />;
  }

  // Fully authenticated → main app
  return (
    <Layout session={session} profile={profile} onAvatarChange={(url) => setProfile((p) => ({ ...p, avatar_url: url }))}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cuaderno" element={<MiCuaderno />} />
        <Route path="/logros" element={<Logros />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/amigos" element={<Amigos />} />
        <Route path="/sobre-nosotros" element={<SobreNosotros />} />
        <Route path="/configuracion" element={<Configuracion onProfileChange={(changes) => setProfile((p) => ({ ...p, ...changes }))} />} />
        <Route path="/perfil/:userId" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
