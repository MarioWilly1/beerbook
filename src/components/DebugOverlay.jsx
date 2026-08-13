import React, { useEffect, useState } from "react";
import { subscribeDebugLog } from "../utils/debugLog";

// Overlay de diagnóstico temporal — panel fijo abajo con el log en vivo, sin
// bloquear nada (a diferencia de alert()). Se monta una sola vez en
// index.js, afuera del ErrorBoundary, para seguir visible aunque el resto
// de la app se caiga.
const DebugOverlay = () => {
  const [entries, setEntries] = useState([]);
  useEffect(() => subscribeDebugLog(setEntries), []);

  if (entries.length === 0) return null;

  return (
    <div style={overlayStyle}>
      {entries.map((e, i) => (
        <div key={i}>
          {new Date(e.t).toLocaleTimeString()} — {e.msg}
        </div>
      ))}
    </div>
  );
};

const overlayStyle = {
  position: "fixed", bottom: 0, left: 0, right: 0, maxHeight: "45vh",
  overflowY: "auto", background: "rgba(0,0,0,0.92)", color: "#5eff5e",
  fontSize: 11, fontFamily: "monospace", padding: "8px 10px",
  zIndex: 999999, whiteSpace: "pre-wrap", lineHeight: 1.5,
  borderTop: "2px solid #5eff5e",
};

export default DebugOverlay;
