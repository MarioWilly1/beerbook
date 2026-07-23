import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";
import i18n from "./i18n";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { supabase } from "./services/supabase";
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
import LugarPage from "./pages/LugarPage";
import Chats from "./pages/Chats";
import ChatPage from "./pages/ChatPage";
import AdminPanel from "./pages/AdminPanel";
import Onboarding from "./components/Onboarding";

function App() {
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, setProfile } = useProfile(session);
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");

  // Sync language from user profile (cross-device preference)
  useEffect(() => {
    if (profile?.preferred_language) {
      i18n.changeLanguage(profile.preferred_language);
    }
  }, [profile?.preferred_language]);

  // Immersive fullscreen on native (status bar overlays WebView)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.hide().catch(() => {});
    const sub = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) StatusBar.hide().catch(() => {});
    });
    return () => { sub.then((h) => h.remove()); };
  }, []);

  // Handle OAuth deep link callback (native only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = async (url) => {
      if (!url || !url.includes("login-callback")) return;
      try {
        // Implicit flow: tokens arrive in the URL fragment (#access_token=...&refresh_token=...)
        const fragment = url.includes("#") ? url.split("#")[1] : "";
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token") || "";
          if (access_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            return;
          }
        }
        // PKCE flow fallback: code arrives as a query param (?code=...)
        const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get("code");
          if (code) await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (e) {
        console.error("OAuth callback error:", e);
      }
    };

    // Cold start: app launched via deep link before listener registered
    CapacitorApp.getLaunchUrl()
      .then(({ url } = {}) => { if (url) handleUrl(url); })
      .catch(() => {});

    let handle;
    CapacitorApp.addListener("appUrlOpen", ({ url }) => handleUrl(url))
      .then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, []);

  // Ruta pública /lugar/:id — accessible sin autenticación
  if (location.pathname.startsWith("/lugar/")) {
    return (
      <Routes>
        <Route path="/lugar/:id" element={<LugarPage />} />
      </Routes>
    );
  }

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

  // Perfil recién creado (o migrado) que todavía no vio el onboarding →
  // se muestra antes de entrar al Dashboard por primera vez.
  if (!profile.onboarding_visto) {
    return (
      <Onboarding
        userId={session.user.id}
        onFinish={() => setProfile((p) => ({ ...p, onboarding_visto: true }))}
      />
    );
  }

  // Fully authenticated → main app
  return (
    <>
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#1a1208",
          color: "#f0ead6",
          borderRadius: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          fontSize: "13px",
          fontWeight: "500",
          padding: "12px 16px",
          border: "1px solid rgba(212,175,55,0.2)",
          maxWidth: "370px",
        },
      }}
    />
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
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:id" element={<ChatPage />} />
        <Route path="/admin" element={<AdminPanel profile={profile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    </>
  );
}

export default App;
