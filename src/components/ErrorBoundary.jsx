import React from "react";
import { logDebug } from "../utils/debugLog";

// Esta app no tenía NINGÚN Error Boundary en ningún lado — cualquier
// excepción no capturada durante un render o un useEffect (ej. el de
// autoOpen en BeerCard.js, disparado por el escaneo de código de barras)
// hacía que React desmontara TODO el árbol sin dejar rastro, mostrando
// pantalla en blanco/gris sin ningún indicio de qué pasó. Se agrega este
// límite en la raíz (ver index.js) para que, en vez de eso, se vea el
// error real — con alert() porque la depuración remota no está
// conectando en el dispositivo de prueba, mismo criterio que el resto de
// los alerts temporales de diagnóstico.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logDebug(
      "❌ ERROR NO CAPTURADO: " + error.message +
      " | componente: " + (info?.componentStack || "").trim().split("\n")[1]?.trim()
    );
    // eslint-disable-next-line no-alert
    alert(
      "[DEBUG] Error no capturado: " + error.message +
      "\n\nStack:\n" + (error.stack || "(sin stack)").slice(0, 600) +
      "\n\nComponente:\n" + (info?.componentStack || "").slice(0, 400)
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#f0e4cc", background: "#0d0a06", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h2 style={{ color: "#c07a3f", margin: "0 0 12px" }}>Ocurrió un error</h2>
          <p style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "10px 20px", background: "#d4af37", color: "#0d0a06", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
