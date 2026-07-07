import { Capacitor } from "@capacitor/core";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

const AuthButton = () => {
  const { session } = useAuth();

  const login = async () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      const { data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "com.mariowilly.beerbook://login-callback",
          skipBrowserRedirect: true,
        },
      });
      if (data?.url) window.open(data.url, "_system");
    } else {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return session ? (
    <button onClick={logout} style={styles.btn}>
      🚪 Cerrar sesión
    </button>
  ) : (
    <button onClick={login} style={styles.btn}>
      🔐 Iniciar sesión
    </button>
  );
};

const styles = {
  btn: {
    marginTop: "8px",
    padding: "6px 10px",
    background: "#8b6b2e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
  },
};

export default AuthButton;
